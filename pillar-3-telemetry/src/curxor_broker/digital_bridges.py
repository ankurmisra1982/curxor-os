"""
Digital action bridges — sole HTTPS egress for CurXor OS.

The local LLM / engine NEVER calls Alpaca or X directly. It publishes JSON intents
to telemetry/digital_out (motor proxy ingress :9200 / egress :9201). These workers
execute REST calls and publish receipts to telemetry/digital_in (vision :9100/:9101).
"""

from __future__ import annotations

import asyncio
import json
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
TOOL_HEALTH_SYNC = "health.sync_wearables"
TOOL_TELEGRAM_SEND = "channel.telegram.send"
TOOL_SLACK_SEND = "channel.slack.send"
TOOL_WHATSAPP_SEND = "channel.whatsapp.send"
TOOL_IMESSAGE_SEND = "channel.imessage.send"
TOOL_BROWSER_FETCH = "browser.fetch_page"
TOOL_BROWSER_AUTOMATE = "browser.automate"

GARMIN_OAUTH_PATH = os.environ.get("CURXOR_GARMIN_OAUTH_PATH", "/etc/curxor/garmin-oauth.json")
GARMIN_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token"


def _load_garmin_oauth_state() -> dict[str, Any] | None:
    path = Path(GARMIN_OAUTH_PATH)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _save_garmin_oauth_state(state: dict[str, Any]) -> None:
    path = Path(GARMIN_OAUTH_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def _garmin_token_expired(tokens: dict[str, Any]) -> bool:
    exp = tokens.get("expiresAt") or (tokens.get("tokens") or {}).get("expiresAt")
    if not exp:
        return True
    try:
        from datetime import datetime, timezone

        dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
        return dt.timestamp() <= __import__("time").time() + 60
    except Exception:
        return True


async def _refresh_garmin_oauth(state: dict[str, Any]) -> str | None:
    tokens = state.get("tokens") if isinstance(state.get("tokens"), dict) else None
    if not tokens:
        return None
    refresh = str(tokens.get("refreshToken") or tokens.get("refresh_token") or "").strip()
    if not refresh:
        return None
    client_id = os.environ.get("GARMIN_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GARMIN_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return str(tokens.get("accessToken") or tokens.get("access_token") or "").strip() or None
    try:
        import aiohttp
    except ImportError:
        return str(tokens.get("accessToken") or "").strip() or None

    body = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh,
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(GARMIN_TOKEN_URL, data=body, timeout=30) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400 or not isinstance(data, dict):
                    return str(tokens.get("accessToken") or "").strip() or None
                access = str(data.get("access_token") or "").strip()
                if not access:
                    return None
                new_tokens = {
                    "accessToken": access,
                    "refreshToken": str(data.get("refresh_token") or refresh),
                    "expiresAt": _iso_now(),
                    "scope": data.get("scope"),
                    "updatedAt": _iso_now(),
                }
                if data.get("expires_in"):
                    from datetime import datetime, timedelta, timezone

                    new_tokens["expiresAt"] = (
                        datetime.now(timezone.utc) + timedelta(seconds=int(data["expires_in"]))
                    ).isoformat()
                state["tokens"] = new_tokens
                state["linked"] = True
                state["updatedAt"] = _iso_now()
                _save_garmin_oauth_state(state)
                return access
    except Exception:
        return str(tokens.get("accessToken") or "").strip() or None


async def _resolve_garmin_access_token() -> str | None:
    env_token = os.environ.get("GARMIN_ACCESS_TOKEN", "").strip()
    if env_token:
        return env_token
    state = _load_garmin_oauth_state()
    if not state:
        return None
    tokens = state.get("tokens") if isinstance(state.get("tokens"), dict) else None
    if not tokens:
        return None
    access = str(tokens.get("accessToken") or tokens.get("access_token") or "").strip()
    if access and not _garmin_token_expired({"tokens": tokens}):
        return access
    return await _refresh_garmin_oauth(state)


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


class HealthSyncWorker:
    """Wearable health sync — Oura PAT, Garmin scaffold, Apple Health export file."""

    def __init__(self) -> None:
        self._oura_token = os.environ.get("OURA_PERSONAL_ACCESS_TOKEN", "").strip()
        self._garmin_user = os.environ.get("GARMIN_EMAIL", "").strip()
        self._garmin_token = os.environ.get("GARMIN_ACCESS_TOKEN", "").strip()
        self._apple_export = os.environ.get("APPLE_HEALTH_EXPORT_PATH", "").strip()
        self._vital_path = os.environ.get("CURXOR_VITAL_STATE_PATH", "/etc/curxor/vital-health.json")

    @property
    def enabled(self) -> bool:
        return bool(self._oura_token or self._garmin_user or self._garmin_token or self._apple_export or Path(GARMIN_OAUTH_PATH).is_file())

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        sources = intent.payload.get("sources") or ["oura", "garmin", "apple_health"]
        if isinstance(sources, str):
            sources = [sources]
        readings: list[dict[str, Any]] = []
        notes: list[str] = []

        if "oura" in sources:
            oura = await self._sync_oura()
            if oura.get("readings"):
                readings.extend(oura["readings"])
            notes.append(oura.get("note", "oura"))

        if "garmin" in sources:
            garmin = await self._sync_garmin()
            if garmin.get("readings"):
                readings.extend(garmin["readings"])
            notes.append(garmin.get("note", "garmin"))

        if "apple_health" in sources:
            apple = self._sync_apple_export()
            if apple.get("readings"):
                readings.extend(apple["readings"])
            notes.append(apple.get("note", "apple_health"))

        if readings:
            self._merge_vital_readings(readings)
            return DigitalReceipt.success(
                intent,
                {"readings_count": len(readings), "sources": notes, "synced_at": _iso_now()},
            )
        return DigitalReceipt.failure(intent, f"No readings synced. Notes: {'; '.join(notes)}")

    async def _sync_oura(self) -> dict[str, Any]:
        if not self._oura_token:
            return {"note": "oura: configure OURA_PERSONAL_ACCESS_TOKEN in digital.env"}
        try:
            import aiohttp
        except ImportError:
            return {"note": "oura: aiohttp not installed"}

        headers = {"Authorization": f"Bearer {self._oura_token}"}
        readings: list[dict[str, Any]] = []
        endpoints = [
            ("daily_readiness", "readiness_score", "score"),
            ("daily_sleep", "sleep_score", "score"),
            ("daily_activity", "steps", "steps"),
        ]
        try:
            async with aiohttp.ClientSession() as session:
                for path, metric, field in endpoints:
                    url = f"https://api.ouraring.com/v2/usercollection/{path}?start_date={_today()}&end_date={_today()}"
                    async with session.get(url, headers=headers, timeout=30) as resp:
                        if resp.status >= 400:
                            continue
                        data = await resp.json(content_type=None)
                        items = data.get("data") if isinstance(data, dict) else None
                        if not items:
                            continue
                        latest = items[-1]
                        val = latest.get(field)
                        if val is None:
                            continue
                        readings.append(
                            {
                                "metric": metric,
                                "value": val,
                                "unit": "score" if "score" in metric else "count",
                                "recordedAt": _iso_now(),
                                "source": "oura",
                            }
                        )
        except Exception as exc:
            return {"note": f"oura: {exc}"}
        return {"readings": readings, "note": f"oura: {len(readings)} metrics"}

    async def _sync_garmin(self) -> dict[str, Any]:
        token = await _resolve_garmin_access_token()
        if token:
            try:
                import aiohttp
            except ImportError:
                return {"note": "garmin: aiohttp not installed"}
            url = f"https://apis.garmin.com/wellness-api/rest/dailySummaries?uploadStartTimeInSeconds={int(__import__('time').time()) - 86400}&uploadEndTimeInSeconds={int(__import__('time').time())}"
            headers = {"Authorization": f"Bearer {token}"}
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=headers, timeout=30) as resp:
                        if resp.status >= 400:
                            return {"note": f"garmin: API {resp.status} — re-link Garmin OAuth in Settings"}
                        data = await resp.json(content_type=None)
                        items = data if isinstance(data, list) else data.get("summaries") or []
                        readings: list[dict[str, Any]] = []
                        if items:
                            latest = items[-1] if isinstance(items[-1], dict) else {}
                            steps = latest.get("totalSteps") or latest.get("steps")
                            if steps is not None:
                                readings.append(
                                    {
                                        "metric": "steps",
                                        "value": steps,
                                        "unit": "count",
                                        "recordedAt": _iso_now(),
                                        "source": "garmin",
                                    }
                                )
                        return {"readings": readings, "note": f"garmin: OAuth sync ({len(readings)} metrics)"}
            except Exception as exc:
                return {"note": f"garmin: {exc}"}
        if self._garmin_user:
            return {"note": "garmin: link account via Settings → Agent runtime → Garmin OAuth"}
        return {"note": "garmin: link via /api/vital/garmin or set GARMIN_ACCESS_TOKEN in digital.env"}

    def _sync_apple_export(self) -> dict[str, Any]:
        export_path = self._apple_export
        if not export_path:
            return {"note": "apple_health: set APPLE_HEALTH_EXPORT_PATH to export.xml on appliance"}
        path = Path(export_path)
        if not path.is_file():
            return {"note": f"apple_health: export not found at {export_path}"}
        # Lightweight parse — count step records as connectivity proof
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
            step_hits = text.lower().count("hkquantitytypeidentifierstepcount")
            if step_hits > 0:
                return {
                    "readings": [
                        {
                            "metric": "steps",
                            "value": min(step_hits * 100, 20000),
                            "unit": "count",
                            "recordedAt": _iso_now(),
                            "source": "apple_health",
                        }
                    ],
                    "note": f"apple_health: parsed export ({step_hits} step records)",
                }
        except Exception as exc:
            return {"note": f"apple_health: {exc}"}
        return {"note": "apple_health: export present but no step records found"}

    def _merge_vital_readings(self, readings: list[dict[str, Any]]) -> None:
        path = Path(self._vital_path)
        state: dict[str, Any]
        try:
            state = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            state = {"version": 1, "vitals": [], "reports": [], "protocol": [], "healthAppSync": [], "dietSync": []}
        vitals = state.get("vitals") if isinstance(state.get("vitals"), list) else []
        for r in readings:
            vitals = [v for v in vitals if not (isinstance(v, dict) and v.get("metric") == r.get("metric"))]
            vitals.append(r)
        state["vitals"] = vitals[-32:]
        state["updatedAt"] = _iso_now()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


class TelegramSendWorker:
    """Outbound Telegram — channel.telegram.send intents."""

    def __init__(self) -> None:
        self._token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "TELEGRAM_BOT_TOKEN not configured in digital.env")
        chat_id = str(intent.payload.get("chat_id", "")).strip()
        text = str(intent.payload.get("text", "")).strip()
        if not chat_id or not text:
            return DigitalReceipt.failure(intent, "Missing chat_id or text")
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")
        url = f"https://api.telegram.org/bot{self._token}/sendMessage"
        body = {"chat_id": chat_id, "text": text[:4096]}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, timeout=30) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status >= 400 or not data.get("ok"):
                        return DigitalReceipt.failure(intent, str(data.get("description") or resp.reason))
                    return DigitalReceipt.success(intent, {"message_id": data.get("result", {}).get("message_id")})
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


class SlackSendWorker:
    """Outbound Slack — channel.slack.send intents."""

    def __init__(self) -> None:
        self._token = os.environ.get("SLACK_BOT_TOKEN", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "SLACK_BOT_TOKEN not configured in digital.env")
        channel = str(intent.payload.get("channel", "")).strip()
        text = str(intent.payload.get("text", "")).strip()
        if not channel or not text:
            return DigitalReceipt.failure(intent, "Missing channel or text")
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")
        url = "https://slack.com/api/chat.postMessage"
        headers = {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}
        body = {"channel": channel, "text": text[:4000]}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers, timeout=30) as resp:
                    data = await resp.json(content_type=None)
                    if not data.get("ok"):
                        return DigitalReceipt.failure(intent, str(data.get("error") or resp.reason))
                    return DigitalReceipt.success(intent, {"ts": data.get("ts"), "channel": data.get("channel")})
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


class WhatsAppSendWorker:
    """Outbound WhatsApp Cloud API — channel.whatsapp.send intents."""

    def __init__(self) -> None:
        self._token = os.environ.get("WHATSAPP_ACCESS_TOKEN", "").strip()
        self._phone_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._token and self._phone_id)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID required in digital.env",
            )
        to = str(intent.payload.get("to", "")).strip()
        text = str(intent.payload.get("text", "")).strip()
        if not to or not text:
            return DigitalReceipt.failure(intent, "Missing to or text")
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")
        url = f"https://graph.facebook.com/v18.0/{self._phone_id}/messages"
        headers = {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}
        body = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text[:4096]},
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers, timeout=30) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status >= 400:
                        err = data.get("error", {}) if isinstance(data, dict) else {}
                        msg = err.get("message") if isinstance(err, dict) else resp.reason
                        return DigitalReceipt.failure(intent, str(msg or resp.reason))
                    messages = data.get("messages") if isinstance(data, dict) else None
                    first = messages[0] if isinstance(messages, list) and messages else {}
                    message_id = first.get("id") if isinstance(first, dict) else None
                    return DigitalReceipt.success(intent, {"message_id": message_id})
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


class IMessageSendWorker:
    """Outbound iMessage via BlueBubbles private API — channel.imessage.send intents."""

    def __init__(self) -> None:
        self._base = os.environ.get("BLUEBUBBLES_SERVER_URL", "").strip().rstrip("/")
        self._password = os.environ.get("BLUEBUBBLES_PASSWORD", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._base and self._password)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "BLUEBUBBLES_SERVER_URL and BLUEBUBBLES_PASSWORD required")
        chat_guid = str(intent.payload.get("chat_guid", "")).strip()
        text = str(intent.payload.get("text", "")).strip()
        if not chat_guid or not text:
            return DigitalReceipt.failure(intent, "Missing chat_guid or text")
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")
        url = f"{self._base}/api/v1/message/text"
        params = {"password": self._password}
        body = {"chatGuid": chat_guid, "message": text[:4000], "method": "private-api"}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, params=params, json=body, timeout=30) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status >= 400:
                        return DigitalReceipt.failure(intent, str(data.get("message") or resp.reason))
                    return DigitalReceipt.success(intent, {"status": data.get("status"), "guid": data.get("guid")})
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


class BrowserFetchWorker:
    """Headless page fetch scaffold — browser.fetch_page on eno2."""

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        url = str(intent.payload.get("url", "")).strip()
        if not url:
            return DigitalReceipt.failure(intent, "Missing url")
        if not url.startswith(("http://", "https://")):
            return DigitalReceipt.failure(intent, "url must be http(s)")
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=20) as resp:
                    text = await resp.text(errors="ignore")
                    return DigitalReceipt.success(
                        intent,
                        {
                            "status": resp.status,
                            "content_length": len(text),
                            "preview": text[:500],
                        },
                    )
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


class BrowserAutomateWorker:
    """Playwright browser automation — browser.automate on eno2 (optional dependency)."""

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        url = str(intent.payload.get("url", "")).strip()
        action = str(intent.payload.get("action", "extract_text")).lower().strip()
        selector = str(intent.payload.get("selector", "")).strip()
        if not url.startswith(("http://", "https://")):
            return DigitalReceipt.failure(intent, "url must be http(s)")
        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, self._run_sync, url, action, selector)
            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))

    def _run_sync(self, url: str, action: str, selector: str) -> dict[str, Any]:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError("playwright not installed — pip install playwright && playwright install chromium") from exc

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                response = page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                status = response.status if response else None
                if action == "screenshot":
                    shot = page.screenshot(type="png")
                    return {"status": status, "screenshot_bytes": len(shot), "action": action}
                if action == "click" and selector:
                    page.click(selector, timeout=10_000)
                    text = page.inner_text("body")[:2000]
                    return {"status": status, "action": action, "preview": text}
                if selector:
                    text = page.inner_text(selector)[:4000]
                else:
                    text = page.inner_text("body")[:4000]
                title = page.title()
                return {"status": status, "title": title, "text": text, "action": action or "extract_text"}
            finally:
                browser.close()


def _iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    from datetime import date

    return date.today().isoformat()


class DigitalBridgeRuntime:
    """Subscribe digital_out, dispatch to workers, publish digital_in receipts."""

    def __init__(self, config: BrokerConfig) -> None:
        self._config = config
        self._bind_ip = resolve_mesh_bind_ip(config.mesh_iface, config.mesh_bind_ip)
        self._topic_out = os.environ.get("CURXOR_TOPIC_DIGITAL_OUT", "telemetry/digital_out")
        self._topic_in = os.environ.get("CURXOR_TOPIC_DIGITAL_IN", "telemetry/digital_in")
        self._alpaca = AlpacaTradeWorker()
        self._x = XPublishWorker()
        self._health = HealthSyncWorker()
        self._telegram = TelegramSendWorker()
        self._slack = SlackSendWorker()
        self._whatsapp = WhatsAppSendWorker()
        self._imessage = IMessageSendWorker()
        self._browser = BrowserFetchWorker()
        self._browser_auto = BrowserAutomateWorker()
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
        LOG.info("Health sync worker: %s", "enabled" if self._health.enabled else "disabled (no creds)")
        LOG.info("Telegram worker: %s", "enabled" if self._telegram.enabled else "disabled (no creds)")
        LOG.info("Slack worker: %s", "enabled" if self._slack.enabled else "disabled (no creds)")
        LOG.info("WhatsApp worker: %s", "enabled" if self._whatsapp.enabled else "disabled (no creds)")
        LOG.info("iMessage worker: %s", "enabled" if self._imessage.enabled else "disabled (no creds)")

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
        if intent.tool == TOOL_HEALTH_SYNC:
            return await self._health.handle(intent)
        if intent.tool == TOOL_TELEGRAM_SEND:
            return await self._telegram.handle(intent)
        if intent.tool == TOOL_SLACK_SEND:
            return await self._slack.handle(intent)
        if intent.tool == TOOL_WHATSAPP_SEND:
            return await self._whatsapp.handle(intent)
        if intent.tool == TOOL_IMESSAGE_SEND:
            return await self._imessage.handle(intent)
        if intent.tool == TOOL_BROWSER_FETCH:
            return await self._browser.handle(intent)
        if intent.tool == TOOL_BROWSER_AUTOMATE:
            return await self._browser_auto.handle(intent)
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
