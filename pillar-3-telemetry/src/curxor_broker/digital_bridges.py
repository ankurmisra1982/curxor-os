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
from curxor_broker import capital_oauth

LOG = logging.getLogger("curxor.digital")

DEFAULT_ENV_PATH = "/etc/curxor/digital.env"

TOOL_EXECUTE_TRADE = "capital.execute_trade"
TOOL_EXECUTE_TRADE_ROBINHOOD = "capital.execute_trade_robinhood"
TOOL_PUBLISH_POST = "content.publish_post"
TOOL_PUBLISH_THREADS = "content.publish_threads"
TOOL_PUBLISH_FACEBOOK = "content.publish_facebook"
TOOL_PUBLISH_INSTAGRAM = "content.publish_instagram"
TOOL_PUBLISH_TIKTOK = "content.publish_tiktok"
TOOL_PUBLISH_YOUTUBE = "content.publish_youtube"
TOOL_PUBLISH_LINKEDIN = "content.publish_linkedin"
TOOL_PUBLISH_BLUESKY = "content.publish_bluesky"
TOOL_PUBLISH_REDDIT = "content.publish_reddit"
TOOL_PUBLISH_PINTEREST = "content.publish_pinterest"
TOOL_PUBLISH_SNAPCHAT = "content.publish_snapchat"
TOOL_PUBLISH_REPLY = "content.publish_reply"
TOOL_HEALTH_SYNC = "health.sync_wearables"
TOOL_TELEGRAM_SEND = "channel.telegram.send"
TOOL_SLACK_SEND = "channel.slack.send"
TOOL_DISCORD_SEND = "channel.discord.send"
TOOL_WHATSAPP_SEND = "channel.whatsapp.send"
TOOL_IMESSAGE_SEND = "channel.imessage.send"
TOOL_BROWSER_FETCH = "browser.fetch_page"
TOOL_BROWSER_AUTOMATE = "browser.automate"
TOOL_COMMERCE_SHOPIFY_PRODUCTS_LIST = "commerce.shopify.products.list"
TOOL_COMMERCE_SHOPIFY_ORDERS_LIST = "commerce.shopify.orders.list"
TOOL_COMMERCE_SHOPIFY_CATALOG_SYNC = "commerce.shopify.catalog.sync"
TOOL_COMMERCE_EBAY_ORDERS_LIST = "commerce.ebay.orders.list"
TOOL_COMMERCE_EBAY_FULFILLMENT_SYNC = "commerce.ebay.fulfillment.sync"
TOOL_COMMERCE_PRINTIFY_PRODUCTS_LIST = "commerce.printify.products.list"
TOOL_COMMERCE_PRINTIFY_CATALOG_SYNC = "commerce.printify.catalog.sync"
TOOL_WORK_EMAIL_SEND = "work.email.send"
TOOL_WORK_EMAIL_FETCH = "work.email.fetch"

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
        self._data_base = os.environ.get("ALPACA_DATA_BASE_URL", "https://data.alpaca.markets").rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self._key and self._secret)

    async def _fetch_reference_price(
        self,
        session: Any,
        symbol: str,
        override: float | None = None,
    ) -> float | None:
        if override and override > 0:
            return override
        sym = symbol.replace("-", "")
        headers = {
            "APCA-API-KEY-ID": self._key,
            "APCA-API-SECRET-KEY": self._secret,
        }
        url = f"{self._data_base}/v2/stocks/{sym}/trades/latest"
        try:
            async with session.get(url, headers=headers, timeout=20) as resp:
                data = await resp.json(content_type=None)
                if resp.status < 400 and isinstance(data, dict):
                    trade = data.get("trade") if isinstance(data.get("trade"), dict) else data
                    price = trade.get("p") if isinstance(trade, dict) else None
                    if price is not None:
                        return float(price)
        except Exception:
            pass
        return None

    def _apply_bracket(
        self,
        body: dict[str, Any],
        side: str,
        symbol: str,
        ref_price: float,
        intent: DigitalIntent,
    ) -> None:
        tp_price = intent.payload.get("take_profit_price")
        sl_price = intent.payload.get("stop_loss_price")
        tp_pct = intent.payload.get("take_profit_pct")
        sl_pct = intent.payload.get("stop_loss_pct")

        try:
            if tp_price is None and tp_pct is not None and float(tp_pct) > 0:
                mult = 1 + float(tp_pct) / 100 if side == "buy" else 1 - float(tp_pct) / 100
                tp_price = ref_price * mult
            if sl_price is None and sl_pct is not None and float(sl_pct) > 0:
                mult = 1 - float(sl_pct) / 100 if side == "buy" else 1 + float(sl_pct) / 100
                sl_price = ref_price * mult
        except (TypeError, ValueError):
            tp_price = sl_price = None

        if tp_price is None and sl_price is None:
            return

        body["order_class"] = "bracket"
        if tp_price is not None and float(tp_price) > 0:
            body["take_profit"] = {"limit_price": capital_oauth.round_trade_price(float(tp_price), symbol)}
        if sl_price is not None and float(sl_price) > 0:
            body["stop_loss"] = {"stop_price": capital_oauth.round_trade_price(float(sl_price), symbol)}

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
        client_order_id = str(intent.payload.get("client_order_id") or intent.payload.get("trade_id") or "").strip()
        body: dict[str, Any] = {
            "symbol": ticker,
            "qty": str(qty),
            "side": side,
            "type": "market",
            "time_in_force": "day",
        }
        if client_order_id:
            body["client_order_id"] = client_order_id[:48]

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

        ref_override = intent.payload.get("reference_price")
        try:
            ref_override_f = float(ref_override) if ref_override is not None else None
        except (TypeError, ValueError):
            ref_override_f = None

        try:
            async with aiohttp.ClientSession() as session:
                ref_price = await self._fetch_reference_price(session, ticker, ref_override_f)
                if ref_price:
                    self._apply_bracket(body, side, ticker, ref_price, intent)

                async with session.post(url, json=body, headers=headers, timeout=30) as resp:
                    data: dict[str, Any] = await resp.json(content_type=None)
                    if resp.status >= 400:
                        msg = data.get("message") or data.get("error") or resp.reason or str(resp.status)
                        return DigitalReceipt.failure(intent, f"Alpaca error: {msg}", {"status": resp.status})

                    filled_price = data.get("filled_avg_price") or data.get("limit_price") or ref_price
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
                            "order_class": body.get("order_class"),
                        },
                    )
        except Exception as exc:
            LOG.exception("Alpaca trade failed")
            return DigitalReceipt.failure(intent, str(exc))


class WebullTradeWorker:
    """Webull OAuth OpenAPI — capital.execute_trade broker_id=webull."""

    def __init__(self) -> None:
        self._api_base = os.environ.get("WEBULL_OAUTH_API_BASE", "https://us-oauth-open-api.uat.webullbroker.com").rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(os.environ.get("WEBULL_CLIENT_ID", "").strip())

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        access = await capital_oauth.resolve_webull_access_token()
        if not access:
            return DigitalReceipt.failure(intent, "Webull not linked — POST /api/capital/webull to authorize")

        ticker = str(intent.payload.get("ticker", "")).upper().strip().replace("-", "")
        action = str(intent.payload.get("action", "")).lower().strip()
        try:
            qty = float(intent.payload.get("qty", 0))
        except (TypeError, ValueError):
            return DigitalReceipt.failure(intent, "Invalid qty")
        if not ticker or action not in {"buy", "sell"} or qty <= 0:
            return DigitalReceipt.failure(intent, "Invalid ticker/qty/action")

        try:
            import aiohttp
            import uuid
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")

        headers = {"Authorization": f"Bearer {access}", "accept": "application/json", "Content-Type": "application/json"}
        client_order_id = str(intent.payload.get("client_order_id") or intent.payload.get("trade_id") or uuid.uuid4().hex)

        try:
            async with aiohttp.ClientSession() as session:
                account_id = str(intent.payload.get("account_id") or "").strip()
                if not account_id:
                    async with session.get(f"{self._api_base}/oauth-openapi/account/list", headers=headers, timeout=30) as resp:
                        acct_data = await resp.json(content_type=None)
                        if resp.status >= 400:
                            return DigitalReceipt.failure(intent, f"Webull account list failed: {acct_data}")
                        accounts = acct_data if isinstance(acct_data, list) else acct_data.get("data") or acct_data.get("accounts") or []
                        if isinstance(accounts, list) and accounts:
                            first = accounts[0]
                            account_id = str(first.get("account_id") or first.get("accountId") or first.get("id") or "")
                if not account_id:
                    return DigitalReceipt.failure(intent, "Webull account_id not found")

                order_body = {
                    "new_orders": [
                        {
                            "combo_type": "NORMAL",
                            "client_order_id": client_order_id[:32],
                            "symbol": ticker,
                            "instrument_type": "EQUITY",
                            "market": "US",
                            "order_type": "MARKET",
                            "quantity": str(int(qty) if qty == int(qty) else qty),
                            "support_trading_session": "CORE",
                            "side": "BUY" if action == "buy" else "SELL",
                            "time_in_force": "DAY",
                            "entrust_type": "QTY",
                        }
                    ]
                }
                place_url = f"{self._api_base}/oauth-openapi/trade/order/place?account_id={account_id}"
                async with session.post(place_url, json=order_body, headers=headers, timeout=30) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status >= 400:
                        return DigitalReceipt.failure(intent, f"Webull order failed: {data}")
                    order_id = None
                    if isinstance(data, dict):
                        order_id = data.get("order_id") or data.get("orderId") or data.get("client_order_id")
                    return DigitalReceipt.success(
                        intent,
                        {
                            "order_id": order_id or client_order_id,
                            "status": "submitted",
                            "symbol": ticker,
                            "qty": str(qty),
                            "side": action,
                            "broker": "webull",
                        },
                    )
        except Exception as exc:
            LOG.exception("Webull trade failed")
            return DigitalReceipt.failure(intent, str(exc))


class RobinhoodMcpTradeWorker:
    """Robinhood Agentic Trading MCP — capital.execute_trade_robinhood."""

    MCP_URL = "https://agent.robinhood.com/mcp/trading"

    def __init__(self) -> None:
        self._token = os.environ.get("ROBINHOOD_MCP_ACCESS_TOKEN", "").strip()
        flag = os.environ.get("ROBINHOOD_MCP_ENABLED", "").strip().lower()
        self._flag_enabled = flag in {"1", "true", "yes"}
        self._oauth_path = Path(
            os.environ.get("CURXOR_CAPITAL_ROBINHOOD_MCP_PATH", "/etc/curxor/capital-robinhood-mcp.json")
        )

    @property
    def enabled(self) -> bool:
        if self._token:
            return True
        return self._flag_enabled and self._oauth_path.is_file()

    async def _mcp_call(self, session: Any, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        body = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": args},
        }
        async with session.post(self.MCP_URL, headers=headers, json=body, timeout=45) as resp:
            text = await resp.text()
            try:
                data = json.loads(text)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"MCP non-JSON ({resp.status}): {text[:200]}") from exc
            if resp.status >= 400 or data.get("error"):
                err = data.get("error") or {}
                msg = err.get("message") if isinstance(err, dict) else str(err)
                raise RuntimeError(msg or f"MCP HTTP {resp.status}")
            return data.get("result") if isinstance(data, dict) else {}

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "Robinhood MCP not linked — enable ROBINHOOD_MCP_ENABLED and mark connected",
            )
        ticker = str(intent.payload.get("ticker", "")).upper().strip().replace("-", "")
        action = str(intent.payload.get("action", "")).lower().strip()
        try:
            qty = int(float(intent.payload.get("qty", 0)))
        except (TypeError, ValueError):
            return DigitalReceipt.failure(intent, "Invalid qty")
        if not ticker or action not in {"buy", "sell"} or qty <= 0:
            return DigitalReceipt.failure(intent, "Invalid ticker/qty/action")

        side = "buy" if action == "buy" else "sell"
        order_args = {
            "symbol": ticker,
            "side": side,
            "quantity": qty,
            "order_type": "market",
            "time_in_force": "gfd",
        }
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")

        try:
            async with aiohttp.ClientSession() as session:
                await self._mcp_call(session, "review_equity_order", order_args)
                result = await self._mcp_call(session, "place_equity_order", order_args)
                order_id = None
                if isinstance(result, dict):
                    order_id = result.get("order_id") or result.get("id")
                    content = result.get("content")
                    if not order_id and isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get("order_id"):
                                order_id = block.get("order_id")
                return DigitalReceipt.success(
                    intent,
                    {
                        "order_id": order_id or intent.payload.get("trade_id"),
                        "status": "submitted",
                        "symbol": ticker,
                        "qty": str(qty),
                        "side": action,
                        "broker": "robinhood_mcp",
                    },
                )
        except Exception as exc:
            LOG.exception("Robinhood MCP trade failed")
            return DigitalReceipt.failure(intent, str(exc))


class EtradeTradeWorker:
    """E*TRADE OAuth 1.0a — capital.execute_trade broker_id=etrade."""

    def __init__(self) -> None:
        self._consumer_key = os.environ.get("ETRADE_CONSUMER_KEY", "").strip()
        self._consumer_secret = os.environ.get("ETRADE_CONSUMER_SECRET", "").strip()
        sandbox = os.environ.get("ETRADE_SANDBOX", "").strip().lower() in {"1", "true", "yes"}
        self._api_base = "https://apisb.etrade.com" if sandbox else "https://api.etrade.com"

    @property
    def enabled(self) -> bool:
        return bool(self._consumer_key and self._consumer_secret)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        tokens = capital_oauth.resolve_etrade_tokens()
        if not tokens:
            return DigitalReceipt.failure(intent, "E*TRADE not linked — POST /api/capital/etrade to authorize")
        access_token, access_secret = tokens

        ticker = str(intent.payload.get("ticker", "")).upper().strip().replace("-", "")
        action = str(intent.payload.get("action", "")).lower().strip()
        try:
            qty = int(float(intent.payload.get("qty", 0)))
        except (TypeError, ValueError):
            return DigitalReceipt.failure(intent, "Invalid qty")
        if not ticker or action not in {"buy", "sell"} or qty <= 0:
            return DigitalReceipt.failure(intent, "Invalid ticker/qty/action")

        order_action = "BUY" if action == "buy" else "SELL"
        client_order_id = str(intent.payload.get("client_order_id") or intent.payload.get("trade_id") or "curxor")[:20]

        try:
            import aiohttp
            import xml.etree.ElementTree as ET
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")

        try:
            async with aiohttp.ClientSession() as session:
                list_url = f"{self._api_base}/v1/accounts/list.json"
                list_auth = capital_oauth.oauth1_auth_header(
                    "GET", list_url, self._consumer_key, self._consumer_secret, access_token, access_secret
                )
                async with session.get(list_url, headers={"Authorization": list_auth}, timeout=30) as resp:
                    list_data = await resp.json(content_type=None)
                    if resp.status >= 400:
                        return DigitalReceipt.failure(intent, f"E*TRADE accounts failed: {list_data}")
                accounts = (
                    list_data.get("AccountListResponse", {}).get("Accounts", {}).get("Account", [])
                    if isinstance(list_data, dict)
                    else []
                )
                if isinstance(accounts, dict):
                    accounts = [accounts]
                if not accounts:
                    return DigitalReceipt.failure(intent, "E*TRADE account not found")
                account_id = str(accounts[0].get("accountIdKey") or accounts[0].get("accountId") or "")
                if not account_id:
                    return DigitalReceipt.failure(intent, "E*TRADE accountIdKey missing")

                preview_xml = f"""<PreviewOrderRequest>
  <orderType>EQ</orderType>
  <clientOrderId>{client_order_id}</clientOrderId>
  <Order>
    <allOrNone>false</allOrNone>
    <priceType>MARKET</priceType>
    <orderTerm>GOOD_FOR_DAY</orderTerm>
    <marketSession>REGULAR</marketSession>
    <Instrument>
      <Product>
        <securityType>EQ</securityType>
        <symbol>{ticker}</symbol>
      </Product>
      <orderAction>{order_action}</orderAction>
      <quantityType>QUANTITY</quantityType>
      <quantity>{qty}</quantity>
    </Instrument>
  </Order>
</PreviewOrderRequest>"""

                preview_url = f"{self._api_base}/v1/accounts/{account_id}/orders/preview.json"
                preview_auth = capital_oauth.oauth1_auth_header(
                    "POST", preview_url, self._consumer_key, self._consumer_secret, access_token, access_secret
                )
                async with session.post(
                    preview_url,
                    data=preview_xml,
                    headers={"Authorization": preview_auth, "Content-Type": "application/xml"},
                    timeout=30,
                ) as resp:
                    preview_text = await resp.text()
                    if resp.status >= 400:
                        return DigitalReceipt.failure(intent, f"E*TRADE preview failed: {preview_text[:300]}")

                root = ET.fromstring(preview_text)
                preview_id = None
                for elem in root.iter():
                    if elem.tag.endswith("previewId") and elem.text:
                        preview_id = elem.text
                        break
                if not preview_id:
                    return DigitalReceipt.failure(intent, "E*TRADE previewId missing")

                place_xml = f"""<PlaceOrderRequest>
  <orderType>EQ</orderType>
  <clientOrderId>{client_order_id}</clientOrderId>
  <PreviewIds><previewId>{preview_id}</previewId></PreviewIds>
  <Order>
    <allOrNone>false</allOrNone>
    <priceType>MARKET</priceType>
    <orderTerm>GOOD_FOR_DAY</orderTerm>
    <marketSession>REGULAR</marketSession>
    <Instrument>
      <Product>
        <securityType>EQ</securityType>
        <symbol>{ticker}</symbol>
      </Product>
      <orderAction>{order_action}</orderAction>
      <quantityType>QUANTITY</quantityType>
      <quantity>{qty}</quantity>
    </Instrument>
  </Order>
</PlaceOrderRequest>"""

                place_url = f"{self._api_base}/v1/accounts/{account_id}/orders/place.json"
                place_auth = capital_oauth.oauth1_auth_header(
                    "POST", place_url, self._consumer_key, self._consumer_secret, access_token, access_secret
                )
                async with session.post(
                    place_url,
                    data=place_xml,
                    headers={"Authorization": place_auth, "Content-Type": "application/xml"},
                    timeout=30,
                ) as resp:
                    place_text = await resp.text()
                    if resp.status >= 400:
                        return DigitalReceipt.failure(intent, f"E*TRADE place failed: {place_text[:300]}")

                order_id = client_order_id
                try:
                    place_root = ET.fromstring(place_text)
                    for elem in place_root.iter():
                        if elem.tag.endswith("orderId") and elem.text:
                            order_id = elem.text
                            break
                except Exception:
                    pass

                return DigitalReceipt.success(
                    intent,
                    {
                        "order_id": order_id,
                        "status": "submitted",
                        "symbol": ticker,
                        "qty": str(qty),
                        "side": action,
                        "broker": "etrade",
                        "preview_id": preview_id,
                    },
                )
        except Exception as exc:
            LOG.exception("E*TRADE trade failed")
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


class MetaPublishWorker:
    """Meta Graph — Threads text, Facebook Page feed, Instagram feed (image + caption)."""

    def __init__(self) -> None:
        self._token = os.environ.get("META_ACCESS_TOKEN", "").strip()
        self._threads_user = os.environ.get("META_THREADS_USER_ID", "").strip()
        self._page_id = os.environ.get("META_PAGE_ID", "").strip()
        self._ig_user = os.environ.get("META_IG_USER_ID", "").strip()
        self._graph_ver = os.environ.get("META_GRAPH_VERSION", "v21.0").strip()

    def threads_enabled(self) -> bool:
        return bool(self._token and self._threads_user)

    def facebook_enabled(self) -> bool:
        return bool(self._token and self._page_id)

    def instagram_enabled(self) -> bool:
        return bool(self._token and self._ig_user)

    @property
    def enabled(self) -> bool:
        return self.threads_enabled() or self.facebook_enabled() or self.instagram_enabled()

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        text = str(intent.payload.get("text", "")).strip()
        if not text:
            return DigitalReceipt.failure(intent, "Missing text")

        try:
            if intent.tool == TOOL_PUBLISH_THREADS:
                if not self.threads_enabled():
                    return DigitalReceipt.failure(intent, "Threads not configured (META_ACCESS_TOKEN + META_THREADS_USER_ID)")
                if len(text) > 500:
                    return DigitalReceipt.failure(intent, "text exceeds 500 characters for Threads")
                result = await self._publish_threads(text)
            elif intent.tool == TOOL_PUBLISH_FACEBOOK:
                if not self.facebook_enabled():
                    return DigitalReceipt.failure(intent, "Facebook Page not configured (META_ACCESS_TOKEN + META_PAGE_ID)")
                result = await self._publish_facebook(text)
            elif intent.tool == TOOL_PUBLISH_INSTAGRAM:
                if not self.instagram_enabled():
                    return DigitalReceipt.failure(intent, "Instagram not configured (META_ACCESS_TOKEN + META_IG_USER_ID)")
                image_url = str(intent.payload.get("image_url", "")).strip()
                if not image_url:
                    return DigitalReceipt.failure(
                        intent,
                        "Instagram feed requires image_url in publish payload — attach thumbnail or vision frame URL",
                    )
                if len(text) > 2200:
                    return DigitalReceipt.failure(intent, "caption exceeds 2200 characters for Instagram")
                result = await self._publish_instagram(text, image_url)
            else:
                return DigitalReceipt.failure(intent, f"Unknown Meta tool: {intent.tool}")

            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("Meta publish failed tool=%s", intent.tool)
            return DigitalReceipt.failure(intent, str(exc))

    async def _publish_threads(self, text: str) -> dict[str, Any]:
        import aiohttp

        base = "https://graph.threads.net/v1.0"
        params = {"media_type": "TEXT", "text": text, "access_token": self._token}
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{base}/{self._threads_user}/threads", params=params, timeout=60) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(data))
                creation_id = data.get("id")
            if not creation_id:
                raise RuntimeError("Threads API did not return creation id")
            async with session.post(
                f"{base}/{self._threads_user}/threads_publish",
                params={"creation_id": creation_id, "access_token": self._token},
                timeout=60,
            ) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(data))
                post_id = data.get("id")
                return {
                    "platform": "threads",
                    "post_id": post_id,
                    "post_url": f"https://www.threads.net/@me/post/{post_id}" if post_id else None,
                    "text": text,
                }

    async def _publish_facebook(self, text: str) -> dict[str, Any]:
        import aiohttp

        url = f"https://graph.facebook.com/{self._graph_ver}/{self._page_id}/feed"
        params = {"message": text, "access_token": self._token}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params, timeout=60) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(data))
                post_id = data.get("id")
                return {
                    "platform": "facebook",
                    "post_id": post_id,
                    "post_url": f"https://www.facebook.com/{post_id}" if post_id else None,
                    "text": text,
                }

    async def _publish_instagram(self, caption: str, image_url: str) -> dict[str, Any]:
        import aiohttp

        base = f"https://graph.facebook.com/{self._graph_ver}/{self._ig_user}"
        create_params = {"image_url": image_url, "caption": caption, "access_token": self._token}
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{base}/media", params=create_params, timeout=90) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(data))
                creation_id = data.get("id")
            if not creation_id:
                raise RuntimeError("Instagram media container missing id")
            async with session.post(
                f"{base}/media_publish",
                params={"creation_id": creation_id, "access_token": self._token},
                timeout=90,
            ) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(data))
                post_id = data.get("id")
                return {
                    "platform": "instagram",
                    "post_id": post_id,
                    "post_url": f"https://www.instagram.com/p/{post_id}/" if post_id else None,
                    "caption": caption,
                    "image_url": image_url,
                }


def _meta_error(data: Any) -> str:
    if isinstance(data, dict):
        err = data.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or err)
    return str(data)


def _tiktok_error(data: Any) -> str:
    if isinstance(data, dict):
        err = data.get("error")
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])
        if data.get("message"):
            return str(data["message"])
    return str(data)


class TikTokPublishWorker:
    """TikTok Content Posting API — direct post or inbox draft via PULL_FROM_URL / FILE_UPLOAD."""

    _API = "https://open.tiktokapis.com/v2/post/publish"
    _TERMINAL_OK = frozenset({"PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"})
    _TERMINAL_FAIL = frozenset({"FAILED", "CANCELLED"})

    def __init__(self) -> None:
        self._access_token = os.environ.get("TIKTOK_ACCESS_TOKEN", "").strip()
        self._privacy = os.environ.get("TIKTOK_DEFAULT_PRIVACY", "SELF_ONLY").strip()
        self._publish_mode = os.environ.get("TIKTOK_PUBLISH_MODE", "direct").strip().lower()

    @property
    def enabled(self) -> bool:
        return bool(self._access_token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "TikTok not configured (TIKTOK_ACCESS_TOKEN in digital.env)")

        caption = str(intent.payload.get("text", "")).strip()
        video_url = str(intent.payload.get("video_url", "")).strip()
        video_path = str(intent.payload.get("video_path", "") or intent.payload.get("local_video_path", "")).strip()
        privacy = str(intent.payload.get("privacy_level", self._privacy)).strip() or "SELF_ONLY"
        mode = str(intent.payload.get("publish_mode", self._publish_mode)).strip().lower() or "direct"

        if not video_url and not video_path:
            return DigitalReceipt.failure(
                intent,
                "TikTok requires video_url (verified PULL_FROM_URL) or video_path on appliance",
            )
        if len(caption) > 2200:
            return DigitalReceipt.failure(intent, "caption exceeds 2200 characters for TikTok")

        try:
            if video_path and not video_url:
                result = await self._publish_file_upload(caption, video_path, mode, privacy)
            else:
                result = await self._publish_pull_from_url(caption, video_url, mode, privacy)
            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("TikTok publish failed")
            return DigitalReceipt.failure(intent, str(exc))

    async def _publish_pull_from_url(self, caption: str, video_url: str, mode: str, privacy: str) -> dict[str, Any]:
        import aiohttp

        init_url = (
            f"{self._API}/video/init/"
            if mode == "direct"
            else f"{self._API}/inbox/video/init/"
        )
        body: dict[str, Any] = {
            "source_info": {"source": "PULL_FROM_URL", "video_url": video_url},
        }
        if mode == "direct":
            body["post_info"] = {
                "title": caption,
                "privacy_level": privacy,
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
            }

        async with aiohttp.ClientSession() as session:
            data = await self._post_json(session, init_url, body)
            publish_id = data.get("publish_id")
            if not publish_id:
                raise RuntimeError("TikTok init missing publish_id")
            status = await self._poll_status(session, publish_id)
            return {
                "platform": "tiktok",
                "publish_id": publish_id,
                "status": status.get("status"),
                "post_url": status.get("publicaly_available_post_id") or status.get("share_url"),
                "caption": caption,
                "video_url": video_url,
                "mode": mode,
            }

    async def _publish_file_upload(self, caption: str, video_path: str, mode: str, privacy: str) -> dict[str, Any]:
        import aiohttp

        path = Path(video_path)
        if not path.is_file():
            raise RuntimeError(f"video_path not found: {video_path}")

        video_size = path.stat().st_size
        if video_size <= 0:
            raise RuntimeError("video file is empty")

        chunk_size = min(10_000_000, video_size)
        total_chunk_count = max(1, (video_size + chunk_size - 1) // chunk_size)

        init_url = (
            f"{self._API}/video/init/"
            if mode == "direct"
            else f"{self._API}/inbox/video/init/"
        )
        body: dict[str, Any] = {
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": video_size,
                "chunk_size": chunk_size,
                "total_chunk_count": total_chunk_count,
            },
        }
        if mode == "direct":
            body["post_info"] = {
                "title": caption,
                "privacy_level": privacy,
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
            }

        async with aiohttp.ClientSession() as session:
            data = await self._post_json(session, init_url, body)
            publish_id = data.get("publish_id")
            upload_url = data.get("upload_url")
            if not publish_id or not upload_url:
                raise RuntimeError("TikTok FILE_UPLOAD init missing publish_id or upload_url")

            await self._upload_file(session, upload_url, path, video_size, chunk_size)
            status = await self._poll_status(session, publish_id)
            return {
                "platform": "tiktok",
                "publish_id": publish_id,
                "status": status.get("status"),
                "post_url": status.get("publicaly_available_post_id") or status.get("share_url"),
                "caption": caption,
                "video_path": str(path),
                "mode": mode,
            }

    async def _post_json(self, session: Any, url: str, body: dict[str, Any]) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        }
        async with session.post(url, json=body, headers=headers, timeout=120) as resp:
            payload = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_tiktok_error(payload))
            if isinstance(payload, dict):
                err = payload.get("error")
                if isinstance(err, dict) and err.get("code") not in (None, "ok", ""):
                    raise RuntimeError(_tiktok_error(payload))
                inner = payload.get("data")
                if isinstance(inner, dict):
                    return inner
            raise RuntimeError(_tiktok_error(payload))

    async def _upload_file(
        self,
        session: Any,
        upload_url: str,
        path: Path,
        video_size: int,
        chunk_size: int,
    ) -> None:
        sent = 0
        with path.open("rb") as fh:
            while sent < video_size:
                chunk = fh.read(chunk_size)
                if not chunk:
                    break
                end = sent + len(chunk) - 1
                headers = {
                    "Content-Type": "video/mp4",
                    "Content-Range": f"bytes {sent}-{end}/{video_size}",
                }
                async with session.put(upload_url, data=chunk, headers=headers, timeout=300) as resp:
                    if resp.status not in (200, 201, 206):
                        text = await resp.text()
                        raise RuntimeError(f"TikTok upload failed HTTP {resp.status}: {text[:200]}")
                sent += len(chunk)

    async def _poll_status(self, session: Any, publish_id: str, max_wait: int = 180) -> dict[str, Any]:
        import asyncio
        import time

        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        }
        body = {"publish_id": publish_id}
        deadline = time.time() + max_wait
        while time.time() < deadline:
            async with session.post(
                f"{self._API}/status/fetch/",
                json=body,
                headers=headers,
                timeout=60,
            ) as resp:
                payload = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_tiktok_error(payload))
                err = payload.get("error") if isinstance(payload, dict) else None
                if isinstance(err, dict) and err.get("code") not in (None, "ok", ""):
                    raise RuntimeError(_tiktok_error(payload))
                inner = payload.get("data") if isinstance(payload, dict) else {}
                if not isinstance(inner, dict):
                    inner = {}
                status = str(inner.get("status") or "")
                if status in self._TERMINAL_OK:
                    return inner
                if status in self._TERMINAL_FAIL:
                    raise RuntimeError(inner.get("fail_reason") or f"TikTok publish {status}")
            await asyncio.sleep(2)
        raise RuntimeError("TikTok publish timed out waiting for status")


def _google_error(data: Any) -> str:
    if isinstance(data, dict):
        err = data.get("error")
        if isinstance(err, dict):
            msg = err.get("message")
            if msg:
                return str(msg)
        if data.get("error_description"):
            return str(data["error_description"])
    return str(data)


class YouTubePublishWorker:
    """YouTube Data API v3 — resumable video upload with OAuth refresh token."""

    _TOKEN_URL = "https://oauth2.googleapis.com/token"
    _UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3/videos"

    def __init__(self) -> None:
        self._client_id = os.environ.get("YOUTUBE_CLIENT_ID", "").strip()
        self._client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET", "").strip()
        self._refresh_token = os.environ.get("YOUTUBE_REFRESH_TOKEN", "").strip()
        self._privacy = os.environ.get("YOUTUBE_DEFAULT_PRIVACY", "private").strip() or "private"
        self._category = os.environ.get("YOUTUBE_CATEGORY_ID", "22").strip() or "22"

    @property
    def enabled(self) -> bool:
        return bool(self._client_id and self._client_secret and self._refresh_token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "YouTube not configured (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)",
            )

        text = str(intent.payload.get("text", "")).strip()
        title_override = str(intent.payload.get("title", "")).strip()
        video_url = str(intent.payload.get("video_url", "")).strip()
        video_path = str(intent.payload.get("video_path", "") or intent.payload.get("local_video_path", "")).strip()
        privacy = str(intent.payload.get("privacy_status", self._privacy)).strip() or "private"
        fmt = str(intent.payload.get("format", "")).strip().lower()
        is_short = bool(intent.payload.get("is_short")) or fmt in ("short", "reel")

        if not video_url and not video_path:
            return DigitalReceipt.failure(
                intent,
                "YouTube requires video_url or video_path on appliance — Shorts and long-form need video",
            )

        temp_path: Path | None = None
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                access_token = await self._fetch_access_token(session)
                upload_path = Path(video_path) if video_path else None
                if not upload_path or not upload_path.is_file():
                    if not video_url:
                        return DigitalReceipt.failure(intent, f"video_path not found: {video_path}")
                    temp_path = await self._download_video(session, video_url)
                    upload_path = temp_path

                title, description = self._metadata(text, title_override, is_short)
                if len(description) > 5000:
                    return DigitalReceipt.failure(intent, "description exceeds 5000 characters for YouTube")

                result = await self._resumable_upload(
                    session,
                    access_token,
                    upload_path,
                    title,
                    description,
                    privacy,
                    is_short,
                )
                return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("YouTube publish failed")
            return DigitalReceipt.failure(intent, str(exc))
        finally:
            if temp_path and temp_path.is_file():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    def _metadata(self, text: str, title_override: str, is_short: bool) -> tuple[str, str]:
        if title_override:
            title = title_override[:100]
            description = text[:5000] if text else title
        elif text:
            parts = text.split("\n", 1)
            title = parts[0][:100]
            description = text[:5000]
        else:
            title = "CurXor Creator Claw upload"
            description = ""

        blob = f"{title}\n{description}".lower()
        if is_short and "#shorts" not in blob:
            description = f"{description}\n\n#Shorts".strip() if description else "#Shorts"

        return title, description

    async def _fetch_access_token(self, session: Any) -> str:
        body = {
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "refresh_token": self._refresh_token,
            "grant_type": "refresh_token",
        }
        async with session.post(self._TOKEN_URL, data=body, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_google_error(data))
            token = data.get("access_token") if isinstance(data, dict) else None
            if not token:
                raise RuntimeError("YouTube OAuth missing access_token")
            return str(token)

    async def _download_video(self, session: Any, video_url: str) -> Path:
        import tempfile

        async with session.get(video_url, timeout=300) as resp:
            if resp.status >= 400:
                text = await resp.text()
                raise RuntimeError(f"video_url fetch failed HTTP {resp.status}: {text[:200]}")
            fd, tmp = tempfile.mkstemp(suffix=".mp4", prefix="curxor-yt-")
            os.close(fd)
            path = Path(tmp)
            with path.open("wb") as fh:
                async for chunk in resp.content.iter_chunked(1024 * 1024):
                    fh.write(chunk)
            if path.stat().st_size <= 0:
                path.unlink(missing_ok=True)
                raise RuntimeError("downloaded video is empty")
            return path

    async def _resumable_upload(
        self,
        session: Any,
        access_token: str,
        path: Path,
        title: str,
        description: str,
        privacy: str,
        is_short: bool,
    ) -> dict[str, Any]:
        if not path.is_file():
            raise RuntimeError(f"video file not found: {path}")

        video_size = path.stat().st_size
        metadata: dict[str, Any] = {
            "snippet": {
                "title": title,
                "description": description,
                "categoryId": self._category,
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
            },
        }

        init_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": str(video_size),
        }
        init_url = f"{self._UPLOAD_BASE}?uploadType=resumable&part=snippet,status"
        async with session.post(init_url, json=metadata, headers=init_headers, timeout=120) as resp:
            if resp.status not in (200, 201):
                body = await resp.json(content_type=None)
                raise RuntimeError(_google_error(body))
            upload_url = resp.headers.get("Location")
            if not upload_url:
                raise RuntimeError("YouTube resumable upload missing Location header")

        video_bytes = path.read_bytes()
        upload_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "video/mp4",
            "Content-Length": str(video_size),
        }
        async with session.put(upload_url, data=video_bytes, headers=upload_headers, timeout=600) as resp:
            body = await resp.json(content_type=None)
            if resp.status not in (200, 201):
                raise RuntimeError(_google_error(body))
            if not isinstance(body, dict):
                raise RuntimeError("YouTube upload returned invalid response")
            video_id = body.get("id")
            return {
                "platform": "youtube",
                "video_id": video_id,
                "post_url": f"https://www.youtube.com/watch?v={video_id}" if video_id else None,
                "title": title,
                "description": description[:200],
                "privacy_status": privacy,
                "is_short": is_short,
            }


def _linkedin_error(data: Any, status: int = 0) -> str:
    if isinstance(data, dict):
        msg = data.get("message")
        if msg:
            return str(msg)
        err = data.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or err)
        if isinstance(err, str):
            return err
    if status:
        return f"HTTP {status}: {data}"
    return str(data)


class LinkedInPublishWorker:
    """LinkedIn UGC Posts API — text posts for member or organization."""

    _UGC_URL = "https://api.linkedin.com/v2/ugcPosts"
    _USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
    _TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"

    def __init__(self) -> None:
        self._client_id = os.environ.get("LINKEDIN_CLIENT_ID", "").strip()
        self._client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET", "").strip()
        self._access_token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()
        self._refresh_token = os.environ.get("LINKEDIN_REFRESH_TOKEN", "").strip()
        self._author_urn = os.environ.get("LINKEDIN_AUTHOR_URN", "").strip()
        self._visibility = os.environ.get("LINKEDIN_DEFAULT_VISIBILITY", "PUBLIC").strip() or "PUBLIC"

    @property
    def enabled(self) -> bool:
        return bool(
            self._access_token
            or (self._client_id and self._client_secret and self._refresh_token)
        )

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "LinkedIn not configured (LINKEDIN_ACCESS_TOKEN or refresh token trio in digital.env)",
            )

        text = str(intent.payload.get("text", "")).strip()
        if not text:
            return DigitalReceipt.failure(intent, "Missing text")
        if len(text) > 3000:
            return DigitalReceipt.failure(intent, "text exceeds 3000 characters for LinkedIn")

        visibility = str(intent.payload.get("visibility", self._visibility)).strip() or "PUBLIC"
        author = str(intent.payload.get("author_urn", self._author_urn)).strip()

        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                token = await self._resolve_access_token(session)
                if not author:
                    author = await self._resolve_author_urn(session, token)

                body = {
                    "author": author,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": text},
                            "shareMediaCategory": "NONE",
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
                    },
                }
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                }
                async with session.post(self._UGC_URL, json=body, headers=headers, timeout=60) as resp:
                    restli_id = resp.headers.get("X-RestLi-Id") or resp.headers.get("x-restli-id")
                    raw = await resp.text()
                    payload: dict[str, Any] = {}
                    if raw.strip():
                        try:
                            payload = json.loads(raw)
                        except json.JSONDecodeError:
                            payload = {"raw": raw[:200]}
                    if resp.status not in (200, 201):
                        raise RuntimeError(_linkedin_error(payload, resp.status))

                    post_id = restli_id
                    if not post_id and isinstance(payload, dict):
                        post_id = payload.get("id")

                    return DigitalReceipt.success(
                        intent,
                        {
                            "platform": "linkedin",
                            "post_id": post_id,
                            "author_urn": author,
                            "visibility": visibility,
                            "text": text[:200],
                        },
                    )
        except Exception as exc:
            LOG.exception("LinkedIn publish failed")
            return DigitalReceipt.failure(intent, str(exc))

    async def _resolve_access_token(self, session: Any) -> str:
        if self._access_token:
            return self._access_token
        if not (self._client_id and self._client_secret and self._refresh_token):
            raise RuntimeError("LinkedIn access token missing and no refresh credentials")
        body = {
            "grant_type": "refresh_token",
            "refresh_token": self._refresh_token,
            "client_id": self._client_id,
            "client_secret": self._client_secret,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        async with session.post(self._TOKEN_URL, data=body, headers=headers, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_linkedin_error(data, resp.status))
            token = data.get("access_token") if isinstance(data, dict) else None
            if not token:
                raise RuntimeError("LinkedIn token refresh missing access_token")
            return str(token)

    async def _resolve_author_urn(self, session: Any, token: str) -> str:
        headers = {"Authorization": f"Bearer {token}"}
        async with session.get(self._USERINFO_URL, headers=headers, timeout=30) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(
                    _linkedin_error(data, resp.status)
                    + " — set LINKEDIN_AUTHOR_URN (urn:li:person:… or urn:li:organization:…)",
                )
            if not isinstance(data, dict):
                raise RuntimeError("LinkedIn userinfo returned invalid payload")
            sub = str(data.get("sub") or "").strip()
            if not sub:
                raise RuntimeError("LinkedIn userinfo missing sub — set LINKEDIN_AUTHOR_URN manually")
            if sub.startswith("urn:li:"):
                return sub
            return f"urn:li:person:{sub}"


def _bluesky_error(data: Any, status: int = 0) -> str:
    if isinstance(data, dict):
        msg = data.get("message") or data.get("error")
        if msg:
            return str(msg)
    if status:
        return f"HTTP {status}: {data}"
    return str(data)


class BlueskyPublishWorker:
    """Bluesky AT Protocol — app password session + com.atproto.repo.createRecord."""

    def __init__(self) -> None:
        self._handle = os.environ.get("BLUESKY_HANDLE", "").strip()
        self._password = os.environ.get("BLUESKY_APP_PASSWORD", "").strip()
        self._pds = os.environ.get("BLUESKY_PDS_URL", "https://bsky.social").strip().rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self._handle and self._password)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "Bluesky not configured (BLUESKY_HANDLE + BLUESKY_APP_PASSWORD in digital.env)",
            )

        text = str(intent.payload.get("text", "")).strip()
        if not text:
            return DigitalReceipt.failure(intent, "Missing text")
        if len(text) > 300:
            return DigitalReceipt.failure(intent, "text exceeds 300 characters for Bluesky")

        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                auth = await self._create_session(session)
                result = await self._create_post(session, auth, text)
                return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("Bluesky publish failed")
            return DigitalReceipt.failure(intent, str(exc))

    async def _create_session(self, session: Any) -> dict[str, str]:
        url = f"{self._pds}/xrpc/com.atproto.server.createSession"
        body = {"identifier": self._handle, "password": self._password}
        async with session.post(url, json=body, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_bluesky_error(data, resp.status))
            if not isinstance(data, dict):
                raise RuntimeError("Bluesky session returned invalid payload")
            did = str(data.get("did") or "").strip()
            token = str(data.get("accessJwt") or "").strip()
            handle = str(data.get("handle") or self._handle).strip()
            if not did or not token:
                raise RuntimeError("Bluesky session missing did or accessJwt")
            return {"did": did, "accessJwt": token, "handle": handle}

    async def _create_post(self, session: Any, auth: dict[str, str], text: str) -> dict[str, Any]:
        from datetime import datetime, timezone

        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        url = f"{self._pds}/xrpc/com.atproto.repo.createRecord"
        body: dict[str, Any] = {
            "repo": auth["did"],
            "collection": "app.bsky.feed.post",
            "record": {
                "$type": "app.bsky.feed.post",
                "text": text,
                "createdAt": created_at,
            },
        }
        headers = {"Authorization": f"Bearer {auth['accessJwt']}"}
        async with session.post(url, json=body, headers=headers, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_bluesky_error(data, resp.status))
            if not isinstance(data, dict):
                raise RuntimeError("Bluesky createRecord returned invalid payload")

        uri = str(data.get("uri") or "")
        cid = data.get("cid")
        rkey = uri.rsplit("/", 1)[-1] if uri else None
        profile = auth["handle"].lstrip("@")
        post_url = f"https://bsky.app/profile/{profile}/post/{rkey}" if rkey else None
        return {
            "platform": "bluesky",
            "uri": uri,
            "cid": cid,
            "post_url": post_url,
            "text": text,
        }


class ReplyPublishWorker:
    """Thread replies — content.publish_reply (X, Threads, LinkedIn, Bluesky)."""

    def __init__(self) -> None:
        self._x = XPublishWorker()
        self._meta = MetaPublishWorker()
        self._linkedin = LinkedInPublishWorker()
        self._bluesky = BlueskyPublishWorker()

    @property
    def enabled(self) -> bool:
        return (
            self._x.enabled
            or self._meta.threads_enabled()
            or self._linkedin.enabled
            or self._bluesky.enabled
        )

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        platform = str(intent.payload.get("platform", "x")).strip().lower()
        text = str(intent.payload.get("text", "")).strip()
        if not text:
            return DigitalReceipt.failure(intent, "Missing reply text")

        parent_id = str(intent.payload.get("parent_post_id", "")).strip()
        thread_url = str(intent.payload.get("thread_url", "")).strip()
        if not parent_id and thread_url:
            parent_id = _extract_parent_id(platform, thread_url)

        if not parent_id:
            return DigitalReceipt.failure(intent, "Missing parent_post_id or thread_url")

        try:
            if platform == "x":
                if not self._x.enabled:
                    return DigitalReceipt.failure(intent, "X API not configured")
                if len(text) > 280:
                    return DigitalReceipt.failure(intent, "reply exceeds 280 characters")
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, self._x_reply_sync, text, parent_id)
            elif platform == "threads":
                if not self._meta.threads_enabled():
                    return DigitalReceipt.failure(intent, "Threads not configured")
                if len(text) > 500:
                    return DigitalReceipt.failure(intent, "reply exceeds 500 characters for Threads")
                result = await self._meta_reply_threads(text, parent_id)
            elif platform == "linkedin":
                if not self._linkedin.enabled:
                    return DigitalReceipt.failure(intent, "LinkedIn not configured")
                if len(text) > 1250:
                    return DigitalReceipt.failure(intent, "reply exceeds 1250 characters for LinkedIn")
                result = await self._linkedin_comment(text, parent_id)
            elif platform == "bluesky":
                if not self._bluesky.enabled:
                    return DigitalReceipt.failure(intent, "Bluesky not configured")
                parent_uri = str(intent.payload.get("parent_uri", "")).strip()
                parent_cid = str(intent.payload.get("parent_cid", "")).strip()
                root_uri = str(intent.payload.get("root_uri", parent_uri)).strip()
                root_cid = str(intent.payload.get("root_cid", parent_cid)).strip()
                if not parent_uri or not parent_cid:
                    return DigitalReceipt.failure(
                        intent,
                        "Bluesky reply requires parent_uri and parent_cid from publish receipt",
                    )
                result = await self._bluesky_reply(text, root_uri, root_cid, parent_uri, parent_cid)
            else:
                return DigitalReceipt.failure(intent, f"Reply not supported for platform: {platform}")

            result["platform"] = platform
            result["parent_post_id"] = parent_id
            if intent.payload.get("reply_id"):
                result["reply_id"] = intent.payload.get("reply_id")
            if intent.payload.get("post_id"):
                result["post_id"] = intent.payload.get("post_id")
            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("Reply publish failed platform=%s", platform)
            return DigitalReceipt.failure(intent, str(exc))

    def _x_reply_sync(self, text: str, in_reply_to_tweet_id: str) -> dict[str, Any]:
        import tweepy

        client = tweepy.Client(
            consumer_key=self._x._api_key,
            consumer_secret=self._x._api_secret,
            access_token=self._x._access_token,
            access_token_secret=self._x._access_secret,
            bearer_token=self._x._bearer or None,
        )
        response = client.create_tweet(text=text, in_reply_to_tweet_id=in_reply_to_tweet_id)
        tweet_id = response.data.get("id") if response.data else None
        post_url = f"https://x.com/i/web/status/{tweet_id}" if tweet_id else None
        return {"post_id": tweet_id, "post_url": post_url, "text": text, "kind": "reply"}

    async def _meta_reply_threads(self, text: str, reply_to_id: str) -> dict[str, Any]:
        import aiohttp

        base = "https://graph.threads.net/v1.0"
        token = self._meta._token
        user = self._meta._threads_user
        params = {
            "media_type": "TEXT",
            "text": text,
            "reply_to_id": reply_to_id,
            "access_token": token,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{base}/{user}/threads", params=params, timeout=60) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(data))
                container_id = data.get("id") if isinstance(data, dict) else None
            if not container_id:
                raise RuntimeError("Threads reply container missing id")
            publish_params = {"creation_id": container_id, "access_token": token}
            async with session.post(f"{base}/{user}/threads_publish", params=publish_params, timeout=60) as resp:
                pub = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_meta_error(pub))
                post_id = pub.get("id") if isinstance(pub, dict) else None
                post_url = f"https://www.threads.net/@me/post/{post_id}" if post_id else None
                return {"post_id": post_id, "post_url": post_url, "text": text, "kind": "reply"}

    async def _linkedin_comment(self, text: str, parent_urn: str) -> dict[str, Any]:
        import aiohttp

        urn = parent_urn if parent_urn.startswith("urn:li:") else f"urn:li:ugcPost:{parent_urn}"
        encoded = urllib.parse.quote(urn, safe="")
        async with aiohttp.ClientSession() as session:
            token = await self._linkedin._resolve_access_token(session)
            author = self._linkedin._author_urn
            if not author:
                author = await self._linkedin._resolve_author_urn(session, token)
            url = f"https://api.linkedin.com/v2/socialActions/{encoded}/comments"
            body = {
                "actor": author,
                "message": {"text": text},
            }
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            }
            async with session.post(url, json=body, headers=headers, timeout=60) as resp:
                raw = await resp.text()
                payload: dict[str, Any] = {}
                if raw.strip():
                    try:
                        payload = json.loads(raw)
                    except json.JSONDecodeError:
                        payload = {"raw": raw[:200]}
                if resp.status not in (200, 201):
                    raise RuntimeError(_linkedin_error(payload, resp.status))
                comment_id = payload.get("id") or resp.headers.get("X-RestLi-Id")
                return {
                    "post_id": comment_id,
                    "post_url": None,
                    "text": text,
                    "kind": "reply",
                    "parent_urn": urn,
                }

    async def _bluesky_reply(
        self,
        text: str,
        root_uri: str,
        root_cid: str,
        parent_uri: str,
        parent_cid: str,
    ) -> dict[str, Any]:
        import aiohttp
        from datetime import datetime, timezone

        async with aiohttp.ClientSession() as session:
            auth = await self._bluesky._create_session(session)
            created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
            url = f"{self._bluesky._pds}/xrpc/com.atproto.repo.createRecord"
            body: dict[str, Any] = {
                "repo": auth["did"],
                "collection": "app.bsky.feed.post",
                "record": {
                    "$type": "app.bsky.feed.post",
                    "text": text,
                    "createdAt": created_at,
                    "reply": {
                        "root": {"uri": root_uri, "cid": root_cid},
                        "parent": {"uri": parent_uri, "cid": parent_cid},
                    },
                },
            }
            headers = {"Authorization": f"Bearer {auth['accessJwt']}"}
            async with session.post(url, json=body, headers=headers, timeout=60) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(_bluesky_error(data, resp.status))
            uri = str(data.get("uri") or "") if isinstance(data, dict) else ""
            cid = data.get("cid") if isinstance(data, dict) else None
            rkey = uri.rsplit("/", 1)[-1] if uri else None
            profile = auth["handle"].lstrip("@")
            post_url = f"https://bsky.app/profile/{profile}/post/{rkey}" if rkey else None
            return {"uri": uri, "cid": cid, "post_url": post_url, "text": text, "kind": "reply"}


def _extract_parent_id(platform: str, thread_url: str) -> str:
    import re

    if platform == "x":
        m = re.search(r"status/(\d+)", thread_url)
        return m.group(1) if m else ""
    if platform == "threads":
        m = re.search(r"/post/([^/?#]+)", thread_url)
        return m.group(1) if m else ""
    if platform == "linkedin":
        if "urn:li:" in thread_url:
            return thread_url
        m = re.search(r"ugcPost[/-](\d+)", thread_url)
        if m:
            return f"urn:li:ugcPost:{m.group(1)}"
    if platform == "bluesky":
        m = re.search(r"/post/([^/?#]+)", thread_url)
        return m.group(1) if m else ""
    return ""


def _reddit_error(data: Any, status: int = 0) -> str:
    if isinstance(data, dict):
        nested = data.get("json")
        if isinstance(nested, dict):
            errors = nested.get("errors")
            if errors:
                return str(errors)
        msg = data.get("message") or data.get("error")
        if msg:
            return str(msg)
    if status:
        return f"HTTP {status}: {data}"
    return str(data)


class RedditPublishWorker:
    """Reddit OAuth — text (self) posts via /api/submit."""

    _TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
    _API_BASE = "https://oauth.reddit.com"

    def __init__(self) -> None:
        self._client_id = os.environ.get("REDDIT_CLIENT_ID", "").strip()
        self._client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
        self._refresh_token = os.environ.get("REDDIT_REFRESH_TOKEN", "").strip()
        self._subreddit = os.environ.get("REDDIT_DEFAULT_SUBREDDIT", "").strip()
        self._user_agent = os.environ.get("REDDIT_USER_AGENT", "CurXorOS/0.1").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._client_id and self._client_secret and self._refresh_token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "Reddit not configured (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN)",
            )

        text = str(intent.payload.get("text", "")).strip()
        title_override = str(intent.payload.get("title", "")).strip()
        subreddit = str(intent.payload.get("subreddit", self._subreddit)).strip()

        if not text and not title_override:
            return DigitalReceipt.failure(intent, "Missing text or title")
        if not subreddit:
            return DigitalReceipt.failure(
                intent,
                "Reddit requires subreddit — set REDDIT_DEFAULT_SUBREDDIT or pass subreddit in payload",
            )

        title, body = self._split_title_body(text, title_override)
        if not title:
            return DigitalReceipt.failure(intent, "Missing post title")

        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                token = await self._fetch_access_token(session)
                result = await self._submit_self_post(session, token, subreddit, title, body)
                return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("Reddit publish failed")
            return DigitalReceipt.failure(intent, str(exc))

    def _split_title_body(self, text: str, title_override: str) -> tuple[str, str]:
        if title_override:
            return title_override[:300], text[:40000]
        if not text:
            return "", ""
        parts = text.split("\n", 1)
        title = parts[0].strip()[:300]
        body = parts[1].strip()[:40000] if len(parts) > 1 else ""
        return title, body

    async def _fetch_access_token(self, session: Any) -> str:
        import base64

        auth = base64.b64encode(f"{self._client_id}:{self._client_secret}".encode()).decode("ascii")
        headers = {
            "Authorization": f"Basic {auth}",
            "User-Agent": self._user_agent,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        body = {"grant_type": "refresh_token", "refresh_token": self._refresh_token}
        async with session.post(self._TOKEN_URL, headers=headers, data=body, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_reddit_error(data, resp.status))
            token = data.get("access_token") if isinstance(data, dict) else None
            if not token:
                raise RuntimeError("Reddit token refresh missing access_token")
            return str(token)

    async def _submit_self_post(
        self,
        session: Any,
        token: str,
        subreddit: str,
        title: str,
        body: str,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": self._user_agent,
        }
        form = {
            "kind": "self",
            "sr": subreddit,
            "title": title,
            "text": body,
            "api_type": "json",
        }
        async with session.post(f"{self._API_BASE}/api/submit", headers=headers, data=form, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_reddit_error(data, resp.status))
            if not isinstance(data, dict):
                raise RuntimeError("Reddit submit returned invalid payload")
            nested = data.get("json")
            if isinstance(nested, dict):
                errors = nested.get("errors") or []
                if errors:
                    raise RuntimeError(_reddit_error(data))
                post_data = nested.get("data") or {}
                if isinstance(post_data, dict):
                    return {
                        "platform": "reddit",
                        "subreddit": subreddit,
                        "post_id": post_data.get("id") or post_data.get("name"),
                        "post_url": post_data.get("url"),
                        "title": title,
                    }
            raise RuntimeError(_reddit_error(data))


def _pinterest_error(data: Any, status: int = 0) -> str:
    if isinstance(data, dict):
        msg = data.get("message") or data.get("error")
        if msg:
            return str(msg)
    if status:
        return f"HTTP {status}: {data}"
    return str(data)


class PinterestPublishWorker:
    """Pinterest API v5 — image pins via POST /pins."""

    _API_BASE = "https://api.pinterest.com/v5"
    _TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"

    def __init__(self) -> None:
        self._client_id = os.environ.get("PINTEREST_APP_ID", "").strip()
        self._client_secret = os.environ.get("PINTEREST_APP_SECRET", "").strip()
        self._access_token = os.environ.get("PINTEREST_ACCESS_TOKEN", "").strip()
        self._refresh_token = os.environ.get("PINTEREST_REFRESH_TOKEN", "").strip()
        self._board_id = os.environ.get("PINTEREST_DEFAULT_BOARD_ID", "").strip()
        self._default_link = os.environ.get("PINTEREST_DEFAULT_LINK", "").strip()

    @property
    def enabled(self) -> bool:
        if self._access_token:
            return True
        return bool(self._client_id and self._client_secret and self._refresh_token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "Pinterest not configured (PINTEREST_ACCESS_TOKEN or APP_ID+SECRET+REFRESH_TOKEN)",
            )

        text = str(intent.payload.get("text", "")).strip()
        title_override = str(intent.payload.get("title", "")).strip()
        image_url = str(intent.payload.get("image_url", "")).strip()
        board_id = str(intent.payload.get("board_id", self._board_id)).strip()
        link = str(intent.payload.get("link", self._default_link)).strip()

        if not image_url:
            return DigitalReceipt.failure(
                intent,
                "Pinterest requires image_url in publish payload — attach thumbnail or vision frame URL",
            )
        if not board_id:
            return DigitalReceipt.failure(
                intent,
                "Pinterest requires board_id — set PINTEREST_DEFAULT_BOARD_ID or pass board_id in payload",
            )
        if not text and not title_override:
            return DigitalReceipt.failure(intent, "Missing text or title")

        title, description = self._split_title_description(text, title_override)
        if not title:
            return DigitalReceipt.failure(intent, "Missing pin title")

        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                token = await self._resolve_access_token(session)
                result = await self._create_pin(session, token, board_id, title, description, image_url, link)
                return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("Pinterest publish failed")
            return DigitalReceipt.failure(intent, str(exc))

    def _split_title_description(self, text: str, title_override: str) -> tuple[str, str]:
        if title_override:
            return title_override[:100], text[:800] if text else ""
        if not text:
            return "", ""
        parts = text.split("\n", 1)
        title = parts[0].strip()[:100]
        description = parts[1].strip()[:800] if len(parts) > 1 else ""
        return title, description

    async def _resolve_access_token(self, session: Any) -> str:
        if self._access_token:
            return self._access_token
        if not (self._client_id and self._client_secret and self._refresh_token):
            raise RuntimeError("Pinterest access token missing and no refresh credentials")
        import base64

        auth = base64.b64encode(f"{self._client_id}:{self._client_secret}".encode()).decode("ascii")
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        body = {"grant_type": "refresh_token", "refresh_token": self._refresh_token}
        async with session.post(self._TOKEN_URL, headers=headers, data=body, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_pinterest_error(data, resp.status))
            token = data.get("access_token") if isinstance(data, dict) else None
            if not token:
                raise RuntimeError("Pinterest token refresh missing access_token")
            return str(token)

    async def _create_pin(
        self,
        session: Any,
        token: str,
        board_id: str,
        title: str,
        description: str,
        image_url: str,
        link: str,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        body: dict[str, Any] = {
            "board_id": board_id,
            "title": title,
            "media_source": {
                "source_type": "image_url",
                "url": image_url,
            },
        }
        if description:
            body["description"] = description
        if link:
            body["link"] = link

        async with session.post(f"{self._API_BASE}/pins", json=body, headers=headers, timeout=90) as resp:
            data = await resp.json(content_type=None)
            if resp.status not in (200, 201):
                raise RuntimeError(_pinterest_error(data, resp.status))
            if not isinstance(data, dict):
                raise RuntimeError("Pinterest create pin returned invalid payload")

            pin_id = data.get("id")
            pin_url = None
            if pin_id:
                pin_url = f"https://www.pinterest.com/pin/{pin_id}/"

            return {
                "platform": "pinterest",
                "pin_id": pin_id,
                "pin_url": pin_url,
                "board_id": board_id,
                "title": title,
                "image_url": image_url,
            }


def _snap_error(data: Any, status: int = 0) -> str:
    if isinstance(data, dict):
        msg = data.get("display_message") or data.get("debug_message") or data.get("error")
        if msg:
            return str(msg)
    if status:
        return f"HTTP {status}: {data}"
    return str(data)


def _snap_require_success(data: Any, status: int = 0) -> dict[str, Any]:
    if status >= 400:
        raise RuntimeError(_snap_error(data, status))
    if not isinstance(data, dict):
        raise RuntimeError("Snapchat API returned invalid payload")
    if data.get("request_status") != "SUCCESS":
        raise RuntimeError(_snap_error(data, status))
    return data


class SnapchatPublishWorker:
    """Snapchat Public Profile API — Spotlight or Story via encrypted multipart upload."""

    _API_BASE = "https://businessapi.snapchat.com"
    _TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token"
    _CHUNK_SIZE = 32 * 1024 * 1024

    def __init__(self) -> None:
        self._client_id = os.environ.get("SNAP_CLIENT_ID", "").strip()
        self._client_secret = os.environ.get("SNAP_CLIENT_SECRET", "").strip()
        self._refresh_token = os.environ.get("SNAP_REFRESH_TOKEN", "").strip()
        self._redirect_uri = os.environ.get("SNAP_REDIRECT_URI", "").strip()
        self._profile_id = os.environ.get("SNAP_PUBLIC_PROFILE_ID", "").strip()
        self._locale = os.environ.get("SNAP_DEFAULT_LOCALE", "en_US").strip() or "en_US"
        self._default_format = os.environ.get("SNAP_DEFAULT_FORMAT", "spotlight").strip().lower() or "spotlight"

    @property
    def enabled(self) -> bool:
        return bool(self._client_id and self._client_secret and self._refresh_token and self._redirect_uri)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(
                intent,
                "Snapchat not configured (SNAP_CLIENT_ID, SNAP_CLIENT_SECRET, SNAP_REFRESH_TOKEN, SNAP_REDIRECT_URI)",
            )

        description = str(intent.payload.get("text", "")).strip()[:160]
        video_url = str(intent.payload.get("video_url", "")).strip()
        video_path = str(intent.payload.get("video_path", "") or intent.payload.get("local_video_path", "")).strip()
        profile_id = str(intent.payload.get("profile_id", self._profile_id)).strip()
        post_format = str(intent.payload.get("format", self._default_format)).strip().lower() or "spotlight"
        locale = str(intent.payload.get("locale", self._locale)).strip() or "en_US"

        if post_format in ("short", "reel"):
            post_format = "spotlight"
        if post_format not in ("spotlight", "story"):
            post_format = "spotlight"

        if not profile_id:
            return DigitalReceipt.failure(
                intent,
                "Snapchat requires public profile — set SNAP_PUBLIC_PROFILE_ID or pass profile_id in payload",
            )
        if not video_url and not video_path:
            return DigitalReceipt.failure(
                intent,
                "Snapchat requires video_url or video_path — attach render output (mp4, 6–60s, 9:16)",
            )

        temp_paths: list[Path] = []
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                token = await self._fetch_access_token(session)
                source_path = await self._resolve_video_path(session, video_path, video_url, temp_paths)
                encrypted_path, key, iv = self._encrypt_video(source_path, temp_paths)
                media = await self._create_media(session, token, profile_id, source_path.name, key, iv)
                await self._multipart_upload(session, token, encrypted_path, media)
                if post_format == "story":
                    result = await self._post_story(session, token, profile_id, media["media_id"])
                else:
                    result = await self._post_spotlight(
                        session,
                        token,
                        profile_id,
                        media["media_id"],
                        description,
                        locale,
                    )
                result["platform"] = "snapchat"
                result["format"] = post_format
                result["profile_id"] = profile_id
                if description:
                    result["description"] = description
                return DigitalReceipt.success(intent, result)
        except Exception as exc:
            LOG.exception("Snapchat publish failed")
            return DigitalReceipt.failure(intent, str(exc))
        finally:
            for path in temp_paths:
                try:
                    path.unlink(missing_ok=True)
                except OSError:
                    pass

    async def _resolve_video_path(
        self,
        session: Any,
        video_path: str,
        video_url: str,
        temp_paths: list[Path],
    ) -> Path:
        if video_path:
            path = Path(video_path)
            if not path.is_file():
                raise RuntimeError(f"video_path not found: {video_path}")
            return path
        import tempfile

        tmp = Path(tempfile.mktemp(suffix=".mp4"))
        temp_paths.append(tmp)
        async with session.get(video_url, timeout=300) as resp:
            if resp.status >= 400:
                text = await resp.text()
                raise RuntimeError(f"Failed to download video_url HTTP {resp.status}: {text[:200]}")
            tmp.write_bytes(await resp.read())
        if tmp.stat().st_size <= 0:
            raise RuntimeError("Downloaded video is empty")
        return tmp

    def _encrypt_video(self, source_path: Path, temp_paths: list[Path]) -> tuple[Path, bytes, bytes]:
        import subprocess
        import tempfile

        key = os.urandom(32)
        iv = os.urandom(16)
        encrypted_path = Path(tempfile.mktemp(suffix=".enc.mp4"))
        temp_paths.append(encrypted_path)
        cmd = [
            "openssl",
            "enc",
            "-aes-256-cbc",
            "-nosalt",
            "-e",
            "-in",
            str(source_path),
            "-out",
            str(encrypted_path),
            "-K",
            key.hex(),
            "-iv",
            iv.hex(),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout or "openssl encrypt failed").strip()
            raise RuntimeError(detail[:300])
        if not encrypted_path.is_file() or encrypted_path.stat().st_size <= 0:
            raise RuntimeError("Encrypted video file is empty")
        return encrypted_path, key, iv

    async def _fetch_access_token(self, session: Any) -> str:
        body = {
            "grant_type": "refresh_token",
            "refresh_token": self._refresh_token,
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "redirect_uri": self._redirect_uri,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        async with session.post(self._TOKEN_URL, data=body, headers=headers, timeout=60) as resp:
            data = await resp.json(content_type=None)
            if resp.status >= 400:
                raise RuntimeError(_snap_error(data, resp.status))
            token = data.get("access_token") if isinstance(data, dict) else None
            if not token:
                raise RuntimeError("Snapchat token refresh missing access_token")
            return str(token)

    async def _create_media(
        self,
        session: Any,
        token: str,
        profile_id: str,
        name: str,
        key: bytes,
        iv: bytes,
    ) -> dict[str, Any]:
        import base64

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        body = {
            "type": "VIDEO",
            "name": name[:120] or "curxor-upload",
            "key": base64.b64encode(key).decode("ascii"),
            "iv": base64.b64encode(iv).decode("ascii"),
        }
        url = f"{self._API_BASE}/v1/public_profiles/{profile_id}/media"
        async with session.post(url, json=body, headers=headers, timeout=90) as resp:
            data = await resp.json(content_type=None)
            payload = _snap_require_success(data, resp.status)
            media_id = payload.get("media_id")
            add_path = payload.get("add_path")
            finalize_path = payload.get("finalize_path")
            if not media_id or not add_path or not finalize_path:
                raise RuntimeError("Snapchat create media missing media_id or upload paths")
            return {
                "media_id": str(media_id),
                "add_path": str(add_path),
                "finalize_path": str(finalize_path),
            }

    async def _multipart_upload(
        self,
        session: Any,
        token: str,
        encrypted_path: Path,
        media: dict[str, str],
    ) -> None:
        chunks = self._read_chunks(encrypted_path)
        add_url = f"{self._API_BASE}{media['add_path']}"
        headers = {"Authorization": f"Bearer {token}"}

        for part_number, chunk in enumerate(chunks, start=1):
            import aiohttp

            form = aiohttp.FormData()
            form.add_field("action", "ADD")
            form.add_field("file", chunk, filename=f"part{part_number}.enc", content_type="application/octet-stream")
            form.add_field("part_number", str(part_number))
            async with session.post(add_url, data=form, headers=headers, timeout=300) as resp:
                data = await resp.json(content_type=None)
                _snap_require_success(data, resp.status)

        finalize_url = f"{self._API_BASE}{media['finalize_path']}"
        form = aiohttp.FormData()
        form.add_field("action", "FINALIZE")
        async with session.post(finalize_url, data=form, headers=headers, timeout=120) as resp:
            data = await resp.json(content_type=None)
            _snap_require_success(data, resp.status)

    def _read_chunks(self, path: Path) -> list[bytes]:
        chunks: list[bytes] = []
        with path.open("rb") as fh:
            while True:
                data = fh.read(self._CHUNK_SIZE)
                if not data:
                    break
                chunks.append(data)
        if not chunks:
            raise RuntimeError("Encrypted video has no content")
        return chunks

    async def _post_spotlight(
        self,
        session: Any,
        token: str,
        profile_id: str,
        media_id: str,
        description: str,
        locale: str,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        body: dict[str, Any] = {
            "media_id": media_id,
            "locale": locale,
            "skip_save_to_profile": False,
        }
        if description:
            body["description"] = description
        url = f"{self._API_BASE}/v1/public_profiles/{profile_id}/spotlights"
        async with session.post(url, json=body, headers=headers, timeout=90) as resp:
            data = await resp.json(content_type=None)
            payload = _snap_require_success(data, resp.status)
            return {
                "spotlight_id": payload.get("spotlight_id"),
                "media_id": media_id,
            }

    async def _post_story(
        self,
        session: Any,
        token: str,
        profile_id: str,
        media_id: str,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        body = {"media_id": media_id}
        url = f"{self._API_BASE}/v1/public_profiles/{profile_id}/stories"
        async with session.post(url, json=body, headers=headers, timeout=90) as resp:
            data = await resp.json(content_type=None)
            _snap_require_success(data, resp.status)
            return {"media_id": media_id, "story_posted": True}


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
        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")

        callback_query_id = str(intent.payload.get("callback_query_id", "")).strip()
        callback_answer = str(intent.payload.get("callback_answer", "")).strip()
        if callback_query_id:
            url = f"https://api.telegram.org/bot{self._token}/answerCallbackQuery"
            body: dict = {"callback_query_id": callback_query_id}
            if callback_answer:
                body["text"] = callback_answer[:200]
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, json=body, timeout=30) as resp:
                        data = await resp.json(content_type=None)
                        if resp.status >= 400 or not data.get("ok"):
                            return DigitalReceipt.failure(intent, str(data.get("description") or resp.reason))
                        return DigitalReceipt.success(intent, {"answered": True})
            except Exception as exc:
                return DigitalReceipt.failure(intent, str(exc))

        chat_id = str(intent.payload.get("chat_id", "")).strip()
        text = str(intent.payload.get("text", "")).strip()
        if not chat_id or not text:
            return DigitalReceipt.failure(intent, "Missing chat_id or text")
        url = f"https://api.telegram.org/bot{self._token}/sendMessage"
        body = {"chat_id": chat_id, "text": text[:4096]}
        reply_markup = intent.payload.get("reply_markup")
        if isinstance(reply_markup, dict):
            body["reply_markup"] = reply_markup
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


class DiscordSendWorker:
    """Outbound Discord — channel.discord.send intents (bot posts to guild channel)."""

    _API_BASE = "https://discord.com/api/v10"

    def __init__(self) -> None:
        self._token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
        self._channel_id = os.environ.get("DISCORD_CHANNEL_ID", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self._token)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "DISCORD_BOT_TOKEN not configured in digital.env")

        channel_id = str(intent.payload.get("channel_id", self._channel_id)).strip()
        text = str(intent.payload.get("text", "")).strip()
        image_url = str(intent.payload.get("image_url", "")).strip()

        if not channel_id:
            return DigitalReceipt.failure(
                intent,
                "Missing channel_id — set DISCORD_CHANNEL_ID or pass channel_id in payload",
            )
        if not text and not image_url:
            return DigitalReceipt.failure(intent, "Missing text or image_url")

        body: dict[str, Any] = {}
        if text:
            body["content"] = text[:2000]
        if image_url:
            embed: dict[str, Any] = {"image": {"url": image_url}}
            if text:
                embed["description"] = text[:4096]
                body.pop("content", None)
            body["embeds"] = [embed]

        try:
            import aiohttp
        except ImportError:
            return DigitalReceipt.failure(intent, "aiohttp not installed")

        url = f"{self._API_BASE}/channels/{channel_id}/messages"
        headers = {
            "Authorization": f"Bot {self._token}",
            "Content-Type": "application/json",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers, timeout=30) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status >= 400:
                        msg = data.get("message") if isinstance(data, dict) else None
                        return DigitalReceipt.failure(intent, str(msg or resp.reason))
                    message_id = data.get("id") if isinstance(data, dict) else None
                    return DigitalReceipt.success(
                        intent,
                        {
                            "platform": "discord",
                            "message_id": message_id,
                            "channel_id": channel_id,
                        },
                    )
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


class WorkEmailSendWorker:
    """Outbound email — work.email.send intents via SMTP."""

    def __init__(self) -> None:
        self._host = os.environ.get("SMTP_HOST", "").strip()
        self._port = int(os.environ.get("SMTP_PORT", "587") or "587")
        self._user = os.environ.get("SMTP_USER", "").strip()
        self._password = os.environ.get("SMTP_PASS", "").strip()
        self._from = os.environ.get("SMTP_FROM", "").strip()
        self._use_tls = os.environ.get("SMTP_USE_TLS", "1").strip().lower() not in ("0", "false", "no")

    @property
    def enabled(self) -> bool:
        return bool(self._host and self._from)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "SMTP_HOST and SMTP_FROM not configured in digital.env")
        to_addr = str(intent.payload.get("to", "")).strip()
        subject = str(intent.payload.get("subject", "")).strip()
        body = str(intent.payload.get("body", "")).strip()
        if not to_addr or not subject:
            return DigitalReceipt.failure(intent, "Missing to or subject")
        from_addr = str(intent.payload.get("from", "")).strip() or self._from

        def _send_sync() -> dict[str, Any]:
            import smtplib
            from email.message import EmailMessage

            msg = EmailMessage()
            msg["Subject"] = subject[:998]
            msg["From"] = from_addr
            msg["To"] = to_addr
            msg.set_content(body)
            with smtplib.SMTP(self._host, self._port, timeout=30) as smtp:
                if self._use_tls:
                    smtp.starttls()
                if self._user and self._password:
                    smtp.login(self._user, self._password)
                smtp.send_message(msg)
            return {"to": to_addr, "subject": subject[:120]}

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, _send_sync)
            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


class WorkEmailFetchWorker:
    """Inbound email — work.email.fetch intents via IMAP."""

    def __init__(self) -> None:
        self._host = os.environ.get("IMAP_HOST", "").strip()
        self._port = int(os.environ.get("IMAP_PORT", "993") or "993")
        self._user = os.environ.get("IMAP_USER", "").strip()
        self._password = os.environ.get("IMAP_PASS", "").strip()
        self._use_tls = os.environ.get("IMAP_USE_TLS", "1").strip().lower() not in ("0", "false", "no")

    @property
    def enabled(self) -> bool:
        return bool(self._host and self._user and self._password)

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        if not self.enabled:
            return DigitalReceipt.failure(intent, "IMAP_HOST, IMAP_USER, IMAP_PASS not configured in digital.env")
        limit = int(intent.payload.get("limit", 25) or 25)

        def _fetch_sync() -> dict[str, Any]:
            import email as email_lib
            import imaplib

            if self._use_tls:
                conn = imaplib.IMAP4_SSL(self._host, self._port)
            else:
                conn = imaplib.IMAP4(self._host, self._port)
            conn.login(self._user, self._password)
            conn.select("INBOX")
            _, data = conn.search(None, "ALL")
            ids = data[0].split()[-limit:] if data and data[0] else []
            messages: list[dict[str, Any]] = []
            for mid in ids:
                _, msg_data = conn.fetch(mid, "(RFC822)")
                if not msg_data or not msg_data[0]:
                    continue
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)
                subj = str(msg.get("Subject", ""))
                frm = str(msg.get("From", ""))
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            payload = part.get_payload(decode=True)
                            if payload:
                                body = payload.decode(errors="ignore")[:500]
                            break
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        body = payload.decode(errors="ignore")[:500]
                messages.append(
                    {
                        "id": mid.decode() if isinstance(mid, bytes) else str(mid),
                        "from": frm,
                        "subject": subj,
                        "snippet": body[:200],
                        "body": body,
                    }
                )
            conn.logout()
            return {"messages": messages, "count": len(messages)}

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, _fetch_sync)
            return DigitalReceipt.success(intent, result)
        except Exception as exc:
            return DigitalReceipt.failure(intent, str(exc))


COMMERCE_SHOPIFY_PATH = os.environ.get("CURXOR_COMMERCE_SHOPIFY_PATH", "/etc/curxor/commerce-shopify.json")
SHOPIFY_DEFAULT_API_VERSION = "2025-01"

SHOPIFY_CATALOG_QUERY = """
query ShopCatalogSync($productCount: Int!, $orderCount: Int!) {
  products(first: $productCount) {
    edges {
      node {
        id
        title
        handle
        variants(first: 10) {
          edges {
            node {
              id
              sku
              price
              inventoryItem {
                unitCost {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
  orders(first: $orderCount, sortKey: PROCESSED_AT, reverse: true) {
    edges {
      node {
        id
        name
        processedAt
        lineItems(first: 10) {
          edges {
            node {
              sku
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


def _load_commerce_shopify_creds() -> dict[str, Any] | None:
    path = Path(COMMERCE_SHOPIFY_PATH)
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("accessToken") and data.get("shopDomain"):
                return data
        except Exception:
            pass
    domain = os.environ.get("SHOPIFY_SHOP_DOMAIN", "").strip()
    token = os.environ.get("SHOPIFY_ACCESS_TOKEN", "").strip()
    if domain and token:
        return {
            "shopDomain": domain,
            "accessToken": token,
            "apiVersion": os.environ.get("SHOPIFY_API_VERSION", SHOPIFY_DEFAULT_API_VERSION),
        }
    return None


class ShopifyCommerceWorker:
    """Shopify Admin GraphQL — commerce.shopify.* read intents on eno2."""

    def _creds(self) -> dict[str, Any] | None:
        return _load_commerce_shopify_creds()

    @property
    def enabled(self) -> bool:
        return self._creds() is not None

    def _endpoint(self, creds: dict[str, Any]) -> str:
        domain = str(creds.get("shopDomain", "")).strip().replace("https://", "").replace("http://", "").rstrip("/")
        if not domain.endswith(".myshopify.com"):
            alt = str(creds.get("myshopifyDomain") or creds.get("shopSlug") or "").strip()
            if alt:
                domain = alt if alt.endswith(".myshopify.com") else f"{alt}.myshopify.com"
            elif "." not in domain:
                domain = f"{domain}.myshopify.com"
            else:
                raise RuntimeError(
                    "Shopify Admin API requires *.myshopify.com — set shopDomain to your myshopify host, not a custom storefront domain"
                )
        version = str(creds.get("apiVersion") or SHOPIFY_DEFAULT_API_VERSION).strip()
        return f"https://{domain}/admin/api/{version}/graphql.json"

    async def _graphql(self, creds: dict[str, Any], query: str, variables: dict[str, Any]) -> dict[str, Any]:
        try:
            import aiohttp
        except ImportError:
            raise RuntimeError("aiohttp not installed")

        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": str(creds["accessToken"]),
        }
        body = {"query": query, "variables": variables}
        async with aiohttp.ClientSession() as session:
            async with session.post(self._endpoint(creds), json=body, headers=headers, timeout=45) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    msg = data.get("errors") if isinstance(data, dict) else resp.reason
                    raise RuntimeError(f"Shopify HTTP {resp.status}: {msg}")
                if isinstance(data, dict) and data.get("errors"):
                    raise RuntimeError(f"Shopify GraphQL: {data['errors']}")
                if not isinstance(data, dict):
                    raise RuntimeError("Invalid Shopify response")
                return data.get("data") or {}

    @staticmethod
    def _normalize_products(data: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        products = ((data.get("products") or {}).get("edges")) or []
        for edge in products:
            node = edge.get("node") if isinstance(edge, dict) else None
            if not isinstance(node, dict):
                continue
            title = str(node.get("title") or "")
            handle = str(node.get("handle") or "")
            for variant_edge in ((node.get("variants") or {}).get("edges")) or []:
                variant = variant_edge.get("node") if isinstance(variant_edge, dict) else None
                if not isinstance(variant, dict):
                    continue
                sku = str(variant.get("sku") or handle or variant.get("id") or "").strip()
                if not sku:
                    continue
                try:
                    sell = float(variant.get("price") or 0)
                except (TypeError, ValueError):
                    sell = 0.0
                buy = 0.0
                inv = variant.get("inventoryItem")
                if isinstance(inv, dict):
                    unit_cost = inv.get("unitCost")
                    if isinstance(unit_cost, dict) and unit_cost.get("amount") is not None:
                        try:
                            buy = float(unit_cost["amount"])
                        except (TypeError, ValueError):
                            buy = 0.0
                margin_pct = ((sell - buy) / sell * 100) if sell > 0 and buy > 0 else 0.0
                rows.append(
                    {
                        "sku": sku,
                        "label": title,
                        "channelBuy": "Unit cost" if buy > 0 else "COGS unset",
                        "channelSell": "Shopify",
                        "buyPrice": buy,
                        "sellPrice": sell,
                        "marginPct": round(margin_pct, 1),
                        "alert": margin_pct >= 15,
                        "source": "shopify",
                    }
                )
        return rows

    @staticmethod
    def _normalize_orders(data: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        orders = ((data.get("orders") or {}).get("edges")) or []
        for edge in orders:
            node = edge.get("node") if isinstance(edge, dict) else None
            if not isinstance(node, dict):
                continue
            order_name = str(node.get("name") or node.get("id") or "")
            for item_edge in ((node.get("lineItems") or {}).get("edges")) or []:
                item = item_edge.get("node") if isinstance(item_edge, dict) else None
                if not isinstance(item, dict):
                    continue
                sku = str(item.get("sku") or item.get("title") or order_name).strip()
                qty = item.get("quantity")
                try:
                    sell = float(((item.get("originalUnitPriceSet") or {}).get("shopMoney") or {}).get("amount") or 0)
                except (TypeError, ValueError):
                    sell = 0.0
                rows.append(
                    {
                        "orderName": order_name,
                        "sku": sku,
                        "title": str(item.get("title") or ""),
                        "quantity": qty,
                        "sellPrice": sell,
                        "processedAt": node.get("processedAt"),
                    }
                )
        return rows

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        creds = self._creds()
        if not creds:
            return DigitalReceipt.failure(
                intent,
                "Shopify not linked — set /etc/curxor/commerce-shopify.json or SHOPIFY_* in digital.env",
            )

        try:
            product_count = int(intent.payload.get("productCount") or 20)
        except (TypeError, ValueError):
            product_count = 20
        try:
            order_count = int(intent.payload.get("orderCount") or 10)
        except (TypeError, ValueError):
            order_count = 10
        product_count = max(1, min(product_count, 50))
        order_count = max(1, min(order_count, 25))

        try:
            if intent.tool == TOOL_COMMERCE_SHOPIFY_PRODUCTS_LIST:
                data = await self._graphql(
                    creds,
                    """
                    query Products($count: Int!) {
                      products(first: $count) {
                        edges {
                          node {
                            id title handle
                            variants(first: 10) {
                              edges {
                                node {
                                  id sku price
                                  inventoryItem { unitCost { amount } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    """,
                    {"count": product_count},
                )
                spreads = self._normalize_products(data)
                return DigitalReceipt.success(
                    intent,
                    {
                        "shopDomain": creds.get("shopDomain"),
                        "productCount": len(spreads),
                        "spreads": spreads,
                    },
                )

            if intent.tool == TOOL_COMMERCE_SHOPIFY_ORDERS_LIST:
                data = await self._graphql(
                    creds,
                    """
                    query Orders($count: Int!) {
                      orders(first: $count, sortKey: PROCESSED_AT, reverse: true) {
                        edges {
                          node {
                            id name processedAt
                            lineItems(first: 10) {
                              edges {
                                node {
                                  sku title quantity
                                  originalUnitPriceSet { shopMoney { amount } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    """,
                    {"count": order_count},
                )
                orders = self._normalize_orders(data)
                return DigitalReceipt.success(
                    intent,
                    {
                        "shopDomain": creds.get("shopDomain"),
                        "orderLineCount": len(orders),
                        "orders": orders,
                    },
                )

            if intent.tool == TOOL_COMMERCE_SHOPIFY_CATALOG_SYNC:
                data = await self._graphql(
                    creds,
                    SHOPIFY_CATALOG_QUERY,
                    {"productCount": product_count, "orderCount": order_count},
                )
                spreads = self._normalize_products(data)
                orders = self._normalize_orders(data)
                return DigitalReceipt.success(
                    intent,
                    {
                        "shopDomain": creds.get("shopDomain"),
                        "productCount": len(spreads),
                        "orderLineCount": len(orders),
                        "spreads": spreads,
                        "orders": orders,
                    },
                )

            return DigitalReceipt.failure(intent, f"Unsupported Shopify tool: {intent.tool}")
        except Exception as exc:
            LOG.exception("Shopify commerce bridge failed")
            return DigitalReceipt.failure(intent, str(exc))


COMMERCE_EBAY_PATH = os.environ.get("CURXOR_COMMERCE_EBAY_PATH", "/etc/curxor/commerce-ebay.json")
COMMERCE_PRINTIFY_PATH = os.environ.get("CURXOR_COMMERCE_PRINTIFY_PATH", "/etc/curxor/commerce-printify.json")


def _load_commerce_ebay_creds() -> dict[str, Any] | None:
    path = Path(COMMERCE_EBAY_PATH)
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("accessToken"):
                return data
        except Exception:
            pass
    token = os.environ.get("EBAY_ACCESS_TOKEN", "").strip()
    if token:
        env = os.environ.get("EBAY_ENVIRONMENT", "production").strip().lower()
        return {
            "accessToken": token,
            "environment": "sandbox" if env == "sandbox" else "production",
        }
    return None


def _load_commerce_printify_creds() -> dict[str, Any] | None:
    path = Path(COMMERCE_PRINTIFY_PATH)
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("accessToken") and data.get("shopId"):
                return data
        except Exception:
            pass
    token = os.environ.get("PRINTIFY_API_TOKEN", "").strip()
    shop_id = os.environ.get("PRINTIFY_SHOP_ID", "").strip()
    if token and shop_id:
        return {"accessToken": token, "shopId": shop_id}
    return None


class EbayCommerceWorker:
    """eBay Sell Fulfillment API — commerce.ebay.* read intents on eno2."""

    def _creds(self) -> dict[str, Any] | None:
        return _load_commerce_ebay_creds()

    @property
    def enabled(self) -> bool:
        return self._creds() is not None

    def _api_base(self, creds: dict[str, Any]) -> str:
        env = str(creds.get("environment") or "production").lower()
        if env == "sandbox":
            return "https://api.sandbox.ebay.com"
        return "https://api.ebay.com"

    async def _get_orders(self, creds: dict[str, Any], limit: int) -> dict[str, Any]:
        try:
            import aiohttp
        except ImportError:
            raise RuntimeError("aiohttp not installed")

        url = f"{self._api_base(creds)}/sell/fulfillment/v1/order?limit={limit}"
        headers = {
            "Authorization": f"Bearer {creds['accessToken']}",
            "Content-Type": "application/json",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=45) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(f"eBay HTTP {resp.status}: {data}")
                if not isinstance(data, dict):
                    raise RuntimeError("Invalid eBay response")
                return data

    @staticmethod
    def _map_stage(status: str) -> str:
        s = str(status or "").upper()
        if s == "FULFILLED":
            return "SHIP"
        if s == "IN_PROGRESS":
            return "PICK"
        return "INGEST"

    def _normalize(self, data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        order_lines: list[dict[str, Any]] = []
        spreads: list[dict[str, Any]] = []
        pipeline: list[dict[str, Any]] = []
        orders = data.get("orders") if isinstance(data.get("orders"), list) else []
        for order in orders:
            if not isinstance(order, dict):
                continue
            order_id = str(order.get("orderId") or order.get("legacyOrderId") or "").strip()
            status = str(order.get("orderFulfillmentStatus") or "NOT_STARTED")
            stage = self._map_stage(status)
            line_items = order.get("lineItems") if isinstance(order.get("lineItems"), list) else []
            for item in line_items:
                if not isinstance(item, dict):
                    continue
                sku = str(item.get("sku") or item.get("title") or order_id).strip()
                if not sku:
                    continue
                qty = item.get("quantity")
                sell = 0.0
                cost = item.get("lineItemCost")
                if isinstance(cost, dict) and cost.get("value") is not None:
                    try:
                        sell = float(cost["value"])
                    except (TypeError, ValueError):
                        sell = 0.0
                order_lines.append(
                    {
                        "orderId": order_id,
                        "sku": sku,
                        "title": str(item.get("title") or ""),
                        "quantity": qty,
                        "sellPrice": sell,
                        "fulfillmentStatus": status,
                    }
                )
                spreads.append(
                    {
                        "sku": sku,
                        "label": str(item.get("title") or sku),
                        "channelBuy": "Acquisition cost",
                        "channelSell": "eBay",
                        "buyPrice": 0.0,
                        "sellPrice": sell,
                        "marginPct": 0.0,
                        "alert": False,
                        "source": "ebay",
                    }
                )
                pipeline.append(
                    {
                        "id": f"{order_id}-{sku}" if order_id else sku,
                        "sku": sku,
                        "stage": stage,
                        "eta": "shipped" if status == "FULFILLED" else "live",
                        "source": "ebay",
                    }
                )
        return order_lines, spreads, pipeline

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        creds = self._creds()
        if not creds:
            return DigitalReceipt.failure(
                intent,
                "eBay not linked — set /etc/curxor/commerce-ebay.json or EBAY_* in digital.env",
            )
        try:
            limit = int(intent.payload.get("orderLimit") or 25)
        except (TypeError, ValueError):
            limit = 25
        limit = max(1, min(limit, 50))
        try:
            data = await self._get_orders(creds, limit)
            order_lines, spreads, pipeline = self._normalize(data)
            env = str(creds.get("environment") or "production")
            if intent.tool == TOOL_COMMERCE_EBAY_ORDERS_LIST:
                return DigitalReceipt.success(
                    intent,
                    {
                        "environment": env,
                        "orderLineCount": len(order_lines),
                        "orders": order_lines,
                    },
                )
            if intent.tool == TOOL_COMMERCE_EBAY_FULFILLMENT_SYNC:
                return DigitalReceipt.success(
                    intent,
                    {
                        "environment": env,
                        "orderLineCount": len(order_lines),
                        "orders": order_lines,
                        "spreads": spreads,
                        "pipelineOrders": pipeline,
                    },
                )
            return DigitalReceipt.failure(intent, f"Unsupported eBay tool: {intent.tool}")
        except Exception as exc:
            LOG.exception("eBay commerce bridge failed")
            return DigitalReceipt.failure(intent, str(exc))


class PrintifyCommerceWorker:
    """Printify REST catalog — commerce.printify.* read intents on eno2."""

    def _creds(self) -> dict[str, Any] | None:
        return _load_commerce_printify_creds()

    @property
    def enabled(self) -> bool:
        return self._creds() is not None

    @staticmethod
    def _cents_to_dollars(value: Any) -> float:
        try:
            n = float(value or 0)
        except (TypeError, ValueError):
            return 0.0
        if n <= 0:
            return 0.0
        return n / 100.0

    def _normalize_products(self, data: Any) -> list[dict[str, Any]]:
        products = data if isinstance(data, list) else (data.get("data") if isinstance(data, dict) else [])
        if not isinstance(products, list):
            products = []
        spreads: list[dict[str, Any]] = []
        for product in products:
            if not isinstance(product, dict):
                continue
            title = str(product.get("title") or "")
            variants = product.get("variants") if isinstance(product.get("variants"), list) else []
            for variant in variants:
                if not isinstance(variant, dict):
                    continue
                sku = str(variant.get("sku") or variant.get("id") or title).strip()
                if not sku:
                    continue
                sell = self._cents_to_dollars(variant.get("price"))
                buy = self._cents_to_dollars(variant.get("cost") or variant.get("production_cost"))
                margin_pct = round((sell - buy) / sell * 100, 1) if sell > 0 and buy > 0 else 0.0
                spreads.append(
                    {
                        "sku": sku,
                        "label": title,
                        "channelBuy": "Printify production" if buy > 0 else "Cost pending",
                        "channelSell": "Printify retail",
                        "buyPrice": buy,
                        "sellPrice": sell,
                        "marginPct": margin_pct,
                        "alert": margin_pct >= 15,
                        "source": "printify",
                    }
                )
        return spreads

    async def _get_products(self, creds: dict[str, Any], limit: int) -> Any:
        try:
            import aiohttp
        except ImportError:
            raise RuntimeError("aiohttp not installed")

        shop_id = str(creds.get("shopId") or "").strip()
        url = f"https://api.printify.com/v1/shops/{shop_id}/products.json?limit={limit}"
        headers = {
            "Authorization": f"Bearer {creds['accessToken']}",
            "Content-Type": "application/json",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=45) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(f"Printify HTTP {resp.status}: {data}")
                return data

    async def handle(self, intent: DigitalIntent) -> DigitalReceipt:
        creds = self._creds()
        if not creds:
            return DigitalReceipt.failure(
                intent,
                "Printify not linked — set /etc/curxor/commerce-printify.json or PRINTIFY_* in digital.env",
            )
        try:
            limit = int(intent.payload.get("productLimit") or 20)
        except (TypeError, ValueError):
            limit = 20
        limit = max(1, min(limit, 50))
        shop_id = str(creds.get("shopId") or "")
        try:
            data = await self._get_products(creds, limit)
            spreads = self._normalize_products(data)
            if intent.tool == TOOL_COMMERCE_PRINTIFY_PRODUCTS_LIST:
                return DigitalReceipt.success(
                    intent,
                    {"shopId": shop_id, "productCount": len(spreads), "spreads": spreads},
                )
            if intent.tool == TOOL_COMMERCE_PRINTIFY_CATALOG_SYNC:
                return DigitalReceipt.success(
                    intent,
                    {
                        "shopId": shop_id,
                        "shopTitle": creds.get("shopTitle"),
                        "productCount": len(spreads),
                        "spreads": spreads,
                    },
                )
            return DigitalReceipt.failure(intent, f"Unsupported Printify tool: {intent.tool}")
        except Exception as exc:
            LOG.exception("Printify commerce bridge failed")
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
        self._webull = WebullTradeWorker()
        self._etrade = EtradeTradeWorker()
        self._robinhood = RobinhoodMcpTradeWorker()
        self._x = XPublishWorker()
        self._meta = MetaPublishWorker()
        self._tiktok = TikTokPublishWorker()
        self._youtube = YouTubePublishWorker()
        self._linkedin = LinkedInPublishWorker()
        self._bluesky = BlueskyPublishWorker()
        self._reddit = RedditPublishWorker()
        self._pinterest = PinterestPublishWorker()
        self._snapchat = SnapchatPublishWorker()
        self._reply = ReplyPublishWorker()
        self._health = HealthSyncWorker()
        self._telegram = TelegramSendWorker()
        self._slack = SlackSendWorker()
        self._discord = DiscordSendWorker()
        self._whatsapp = WhatsAppSendWorker()
        self._imessage = IMessageSendWorker()
        self._browser = BrowserFetchWorker()
        self._browser_auto = BrowserAutomateWorker()
        self._work_email = WorkEmailSendWorker()
        self._work_email_fetch = WorkEmailFetchWorker()
        self._shopify = ShopifyCommerceWorker()
        self._ebay = EbayCommerceWorker()
        self._printify = PrintifyCommerceWorker()
        self._ctx = zmq.asyncio.Context.instance()
        self._running = True

    async def run(self) -> None:
        sub = self._ctx.socket(zmq.SUB)
        pub = self._ctx.socket(zmq.PUB)
        sub.setsockopt(zmq.RCVHWM, 64)
        sub.setsockopt(zmq.LINGER, 0)
        pub.setsockopt(zmq.SNDHWM, 64)
        pub.setsockopt(zmq.LINGER, 0)
        pub.setsockopt(zmq.IMMEDIATE, 1)

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
        LOG.info("Webull worker: %s", "enabled" if self._webull.enabled else "disabled (no creds)")
        LOG.info("E*TRADE worker: %s", "enabled" if self._etrade.enabled else "disabled (no creds)")
        LOG.info("X publish worker: %s", "enabled" if self._x.enabled else "disabled (no creds)")
        LOG.info(
            "Meta publish worker: %s (threads=%s fb=%s ig=%s)",
            "enabled" if self._meta.enabled else "disabled",
            self._meta.threads_enabled(),
            self._meta.facebook_enabled(),
            self._meta.instagram_enabled(),
        )
        LOG.info("TikTok publish worker: %s", "enabled" if self._tiktok.enabled else "disabled (no creds)")
        LOG.info("YouTube publish worker: %s", "enabled" if self._youtube.enabled else "disabled (no creds)")
        LOG.info("LinkedIn publish worker: %s", "enabled" if self._linkedin.enabled else "disabled (no creds)")
        LOG.info("Bluesky publish worker: %s", "enabled" if self._bluesky.enabled else "disabled (no creds)")
        LOG.info("Reddit publish worker: %s", "enabled" if self._reddit.enabled else "disabled (no creds)")
        LOG.info("Pinterest publish worker: %s", "enabled" if self._pinterest.enabled else "disabled (no creds)")
        LOG.info("Snapchat publish worker: %s", "enabled" if self._snapchat.enabled else "disabled (no creds)")
        LOG.info("Reply publish worker: %s", "enabled" if self._reply.enabled else "disabled (no creds)")
        LOG.info("Health sync worker: %s", "enabled" if self._health.enabled else "disabled (no creds)")
        LOG.info("Telegram worker: %s", "enabled" if self._telegram.enabled else "disabled (no creds)")
        LOG.info("Slack worker: %s", "enabled" if self._slack.enabled else "disabled (no creds)")
        LOG.info("Discord worker: %s", "enabled" if self._discord.enabled else "disabled (no creds)")
        LOG.info("WhatsApp worker: %s", "enabled" if self._whatsapp.enabled else "disabled (no creds)")
        LOG.info("iMessage worker: %s", "enabled" if self._imessage.enabled else "disabled (no creds)")
        LOG.info("Shopify commerce worker: %s", "enabled" if self._shopify.enabled else "disabled (no creds)")
        LOG.info("eBay commerce worker: %s", "enabled" if self._ebay.enabled else "disabled (no creds)")
        LOG.info("Printify commerce worker: %s", "enabled" if self._printify.enabled else "disabled (no creds)")

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
        if intent.tool == TOOL_EXECUTE_TRADE_ROBINHOOD:
            return await self._robinhood.handle(intent)
        if intent.tool == TOOL_EXECUTE_TRADE:
            broker = str(intent.payload.get("broker_id", "alpaca")).lower().strip()
            if broker == "robinhood_mcp":
                return await self._robinhood.handle(intent)
            if broker == "webull":
                return await self._webull.handle(intent)
            if broker == "etrade":
                return await self._etrade.handle(intent)
            return await self._alpaca.handle(intent)
        if intent.tool == TOOL_PUBLISH_POST:
            return await self._x.handle(intent)
        if intent.tool in (TOOL_PUBLISH_THREADS, TOOL_PUBLISH_FACEBOOK, TOOL_PUBLISH_INSTAGRAM):
            return await self._meta.handle(intent)
        if intent.tool == TOOL_PUBLISH_TIKTOK:
            return await self._tiktok.handle(intent)
        if intent.tool == TOOL_PUBLISH_YOUTUBE:
            return await self._youtube.handle(intent)
        if intent.tool == TOOL_PUBLISH_LINKEDIN:
            return await self._linkedin.handle(intent)
        if intent.tool == TOOL_PUBLISH_BLUESKY:
            return await self._bluesky.handle(intent)
        if intent.tool == TOOL_PUBLISH_REDDIT:
            return await self._reddit.handle(intent)
        if intent.tool == TOOL_PUBLISH_PINTEREST:
            return await self._pinterest.handle(intent)
        if intent.tool == TOOL_PUBLISH_SNAPCHAT:
            return await self._snapchat.handle(intent)
        if intent.tool == TOOL_PUBLISH_REPLY:
            return await self._reply.handle(intent)
        if intent.tool == TOOL_HEALTH_SYNC:
            return await self._health.handle(intent)
        if intent.tool == TOOL_TELEGRAM_SEND:
            return await self._telegram.handle(intent)
        if intent.tool == TOOL_SLACK_SEND:
            return await self._slack.handle(intent)
        if intent.tool == TOOL_DISCORD_SEND:
            return await self._discord.handle(intent)
        if intent.tool == TOOL_WHATSAPP_SEND:
            return await self._whatsapp.handle(intent)
        if intent.tool == TOOL_IMESSAGE_SEND:
            return await self._imessage.handle(intent)
        if intent.tool == TOOL_BROWSER_FETCH:
            return await self._browser.handle(intent)
        if intent.tool == TOOL_BROWSER_AUTOMATE:
            return await self._browser_auto.handle(intent)
        if intent.tool == TOOL_WORK_EMAIL_SEND:
            return await self._work_email.handle(intent)
        if intent.tool == TOOL_WORK_EMAIL_FETCH:
            return await self._work_email_fetch.handle(intent)
        if intent.tool in (
            TOOL_COMMERCE_SHOPIFY_PRODUCTS_LIST,
            TOOL_COMMERCE_SHOPIFY_ORDERS_LIST,
            TOOL_COMMERCE_SHOPIFY_CATALOG_SYNC,
        ):
            return await self._shopify.handle(intent)
        if intent.tool in (
            TOOL_COMMERCE_EBAY_ORDERS_LIST,
            TOOL_COMMERCE_EBAY_FULFILLMENT_SYNC,
        ):
            return await self._ebay.handle(intent)
        if intent.tool in (
            TOOL_COMMERCE_PRINTIFY_PRODUCTS_LIST,
            TOOL_COMMERCE_PRINTIFY_CATALOG_SYNC,
        ):
            return await self._printify.handle(intent)
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
