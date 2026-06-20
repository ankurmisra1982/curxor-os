"""
Digital action bridges — sole HTTPS egress for CurXor OS.

The local LLM / engine NEVER calls Alpaca or X directly. It publishes JSON intents
to telemetry/digital_out (motor proxy ingress :9200 / egress :9201). These workers
execute REST calls and publish receipts to telemetry/digital_in (vision :9100/:9101).
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any

import zmq
import zmq.asyncio

from curxor_broker.config import BrokerConfig
from curxor_broker.digital_protocol import DigitalIntent, DigitalReceipt
from curxor_broker.network import resolve_mesh_bind_ip

LOG = logging.getLogger("curxor.digital")

DEFAULT_ENV_PATH = "/etc/curxor/digital.env"

TOOL_EXECUTE_TRADE = "capital.execute_trade"
TOOL_PUBLISH_POST = "content.publish_post"


def load_digital_env(path: str = DEFAULT_ENV_PATH) -> None:
    """Load key=value pairs from /etc/curxor/digital.env into os.environ."""
    env_path = Path(path)
    if not env_path.is_file():
        LOG.warning("Digital credentials file missing: %s (bridges idle until configured)", path)
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


class AlpacaTradeWorker:
    """Alpaca Paper Trading API — capital.execute_trade intents."""

    def __init__(self) -> None:
        self._key = os.environ.get("ALPACA_API_KEY_ID", "").strip()
        self._secret = os.environ.get("ALPACA_API_SECRET_KEY", "").strip()
        self._base = os.environ.get("ALPACA_PAPER_BASE_URL", "https://paper-api.alpaca.markets").rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self._key and self._secret)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "Alpaca credentials not configured in /etc/curxor/digital.env")

        ticker = str(intent.payload.get("ticker", "")).upper().strip()
        action = str(intent.payload.get("action", "")).lower().strip()
        try:
            qty = float(intent.payload.get("qty", 0))
        except (TypeError, ValueError):
            return DigitalReceipt.failure(intent, "Invalid qty")

        if not ticker:
            return DigitalReceipt.failure(intent, "Missing ticker")
        if action not in {"buy", "sell"}:
            return DigitalReceipt.failure(intent, "action must be buy or sell")
        if qty <= 0:
            return DigitalReceipt.failure(intent, "qty must be positive")

        side = "buy" if action == "buy" else "sell"
        body = {
            "symbol": ticker,
            "qty": str(qty),
            "side": side,
            "type": "market",
            "time_in_force": "day",
        }

        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")

        url = f"{self._base}/v2/orders"
        headers = {
            "APCA-API-KEY-ID": self._key,
            "APCA-API-SECRET-KEY": self._secret,
            "Content-Type": "application/json",
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers, timeout=30) as resp:
                    data: dict[str, Any] = await resp.json(content_type=None)
                    if resp.status >= 400:
                        msg = data.get("message") or data.get("error") or resp.reason or str(resp.status)
                        return DigitalReceipt.failure(intent, f"Alpaca error: {msg}", {"status": resp.status})

                    filled_price = data.get("filled_avg_price") or data.get("limit_price")
                    return DigitalReceipt.success(
                        intent,
                        {
                            "order_id": data.get("id"),
                            "status": data.get("status"),
                            "symbol": data.get("symbol", ticker),
                            "qty": data.get("qty", str(qty)),
                            "side": data.get("side", side),
                            "filled_price": filled_price,
                            "submitted_at": data.get("submitted_at"),
                        },
                    )
        except Exception as exc:
            LOG.exception("Alpaca trade failed")
            return DigitalReceipt.failure(intent, str(exc))


class XPublishWorker:
    """X (Twitter) API v2 via Tweepy — content.publish_post intents."""

    def __init__(self) -> None:
        self._bearer = os.environ.get("X_BEARER_TOKEN", "").strip()
        self._api_key = os.environ.get("X_API_KEY", "").strip()
        self._api_secret = os.environ.get("X_API_SECRET", "").strip()
        self._access_token = os.environ.get("X_ACCESS_TOKEN", "").strip()
        self._access_secret = os.environ.get("X_ACCESS_TOKEN_SECRET", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._access_token and self._access_secret and self._api_key and self._api_secret)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "X API credentials not configured in /etc/curxor/digital.env")

        text = str(intent.payload.get("text", "")).strip()
        if not text:
            return DigitalReceipt.failure(intent, "Missing text")
        if len(text) > 280:
            return DigitalReceipt.failure(intent, "text exceeds 280 characters")

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, self._post_sync, text)
            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("X publish failed")
            return DigitalReceipt.failure(intent, str(exc))

    def _post_sync(self, text: str) -> dict[str, Any]:
        import tweepy

        client = tweepy.Client(
            consumer_key=self._api_key,
            consumer_secret=self._api_secret,
            access_token=self._access_token,
            access_token_secret=self._access_secret,
            bearer_token=self._bearer or None,
        )
        response = client.create_tweet(text=text)
        tweet_id = response.data.get("id") if response.data else None
        post_url = f"https://x.com/i/web/status/{tweet_id}" if tweet_id else None
        return {"post_id": tweet_id, "post_url": post_url, "text": text}


class DigitalBridgeRuntime:
    """Subscribe digital_out, dispatch to workers, publish digital_in receipts."""

    def __init__(self, config: BrokerConfig) -> None:
        self._config = config
        self._bind_ip = resolve_mesh_bind_ip(config.mesh_iface, config.mesh_bind_ip)
        self._topic_out = os.environ.get("CURXOR_TOPIC_DIGITAL_OUT", "telemetry/digital_out")
        self._topic_in = os.environ.get("CURXOR_TOPIC_DIGITAL_IN", "telemetry/digital_in")
        self._alpaca = AlpacaTradeWorker()
        self._x = XPublishWorker()
        self._ctx = zmq.asyncio.Context.instance()
        self._running = True

    async def run(self) -> None:
        sub = self._ctx.socket(zmq.SUB)
        pub = self._ctx.socket(zmq.PUB)
        sub.setsockopt(zmq.RCVHWM, 64)
        sub.setsockopt(zmq.LINGER, 0)
        sub.setsockopt(zmq.TCP_NODELAY, 1)
        pub.setsockopt(zmq.SNDHWM, 64)
        pub.setsockopt(zmq.LINGER, 0)
        pub.setsockopt(zmq.IMMEDIATE, 1)
        pub.setsockopt(zmq.TCP_NODELAY, 1)

        sub.connect(f"tcp://{self._bind_ip}:{self._config.motor_xpub_port}")
        pub.connect(f"tcp://{self._bind_ip}:{self._config.vision_xsub_port}")
        sub.setsockopt(zmq.SUBSCRIBE, self._topic_out.encode())

        LOG.info(
            "Digital bridges online — SUB %s:%s topic=%r → PUB %s:%s topic=%r",
            self._bind_ip,
            self._config.motor_xpub_port,
            self._topic_out,
            self._bind_ip,
            self._config.vision_xsub_port,
            self._topic_in,
        )
        LOG.info("Alpaca worker: %s", "enabled" if self._alpaca.enabled else "disabled (no creds)")
        LOG.info("X publish worker: %s", "enabled" if self._x.enabled else "disabled (no creds)")

        await asyncio.sleep(0.25)

        try:
            while self._running:
                parts = await sub.recv_multipart()
                try:
                    intent = DigitalIntent.from_multipart([p if isinstance(p, bytes) else p.tobytes() for p in parts])
                except Exception as exc:
                    LOG.warning("Invalid digital intent: %s", exc)
                    continue

                receipt = await self._dispatch(intent)
                await pub.send_multipart([self._topic_in.encode(), receipt.to_json_bytes()])
                LOG.info("Receipt %s ok=%s tool=%s", receipt.id, receipt.ok, receipt.tool)
        finally:
            sub.close(linger=0)
            pub.close(linger=0)

    async def _dispatch(self, intent: DigitalIntent) -> DigitalReceipt:
        if intent.tool == TOOL_EXECUTE_TRADE:
            return await self._alpaca.handle(intent)
        if intent.tool == TOOL_PUBLISH_POST:
            return await self._x.handle(intent)
        return DigitalReceipt.failure(intent, f"Unknown digital tool: {intent.tool}")

    def stop(self) -> None:
        self._running = False


async def run_digital_bridges(config: BrokerConfig) -> None:
    load_digital_env(os.environ.get("CURXOR_DIGITAL_ENV", DEFAULT_ENV_PATH))
    runtime = DigitalBridgeRuntime(config)
    await runtime.run()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="[%(name)s] %(message)s",
        stream=sys.stderr,
    )
    try:
        config = BrokerConfig.from_env()
        asyncio.run(run_digital_bridges(config))
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as exc:
        LOG.error("fatal: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
