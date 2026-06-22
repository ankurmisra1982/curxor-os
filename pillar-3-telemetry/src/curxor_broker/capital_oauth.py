"""Capital broker OAuth token helpers — shared by digital bridge trade workers."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

WEBULL_OAUTH_PATH = os.environ.get("CURXOR_CAPITAL_WEBULL_OAUTH_PATH", "/etc/curxor/capital-webull-oauth.json")
ETRADE_OAUTH_PATH = os.environ.get("CURXOR_CAPITAL_ETRADE_OAUTH_PATH", "/etc/curxor/capital-etrade-oauth.json")


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_oauth_file(path: str) -> dict[str, Any] | None:
    p = Path(path)
    if not p.is_file():
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _save_oauth_file(path: str, state: dict[str, Any]) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    state["updatedAt"] = _iso_now()
    p.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def _token_expired(tokens: dict[str, Any]) -> bool:
    exp = tokens.get("expiresAt")
    if not exp:
        return False
    try:
        dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
        return dt.timestamp() <= time.time() + 60
    except Exception:
        return True


async def resolve_webull_access_token() -> str | None:
    state = _load_oauth_file(WEBULL_OAUTH_PATH)
    if not state:
        return None
    tokens = state.get("tokens") if isinstance(state.get("tokens"), dict) else None
    if not tokens:
        return None
    access = str(tokens.get("accessToken") or "").strip()
    if not access:
        return None
    if not _token_expired(tokens):
        return access

    refresh = str(tokens.get("refreshToken") or "").strip()
    client_id = os.environ.get("WEBULL_CLIENT_ID", "").strip()
    client_secret = os.environ.get("WEBULL_CLIENT_SECRET", "").strip()
    api_base = os.environ.get("WEBULL_OAUTH_API_BASE", "https://us-oauth-open-api.uat.webullbroker.com").rstrip("/")
    if not refresh or not client_id or not client_secret:
        return access

    try:
        import aiohttp
    except ImportError:
        return access

    body = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh,
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{api_base}/oauth-openapi/oauth/token",
                data=body,
                timeout=30,
            ) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400 or not isinstance(data, dict):
                    return access
                new_access = str(data.get("access_token") or "").strip()
                if not new_access:
                    return access
                new_tokens = {
                    "accessToken": new_access,
                    "refreshToken": str(data.get("refresh_token") or refresh),
                    "accessTokenSecret": None,
                    "expiresAt": (
                        datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expires_in") or 1800))
                    ).isoformat(),
                    "accountId": tokens.get("accountId"),
                    "scope": tokens.get("scope"),
                    "updatedAt": _iso_now(),
                }
                state["tokens"] = new_tokens
                state["linked"] = True
                _save_oauth_file(WEBULL_OAUTH_PATH, state)
                return new_access
    except Exception:
        return access


def resolve_etrade_tokens() -> tuple[str, str] | None:
    state = _load_oauth_file(ETRADE_OAUTH_PATH)
    if not state:
        return None
    tokens = state.get("tokens") if isinstance(state.get("tokens"), dict) else None
    if not tokens:
        return None
    access = str(tokens.get("accessToken") or "").strip()
    secret = str(tokens.get("accessTokenSecret") or "").strip()
    if not access or not secret:
        return None
    return access, secret


def oauth1_auth_header(
    method: str,
    url: str,
    consumer_key: str,
    consumer_secret: str,
    token: str = "",
    token_secret: str = "",
    extra_params: dict[str, str] | None = None,
    verifier: str | None = None,
) -> str:
    import base64
    import hashlib
    import hmac
    import secrets
    from urllib.parse import quote, urlparse

    def pct(s: str) -> str:
        return quote(s, safe="")

    oauth_params: dict[str, str] = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0",
    }
    if token:
        oauth_params["oauth_token"] = token
    if verifier:
        oauth_params["oauth_verifier"] = verifier

    all_params = {**oauth_params, **(extra_params or {})}
    param_string = "&".join(f"{pct(k)}={pct(v)}" for k, v in sorted(all_params.items()))
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    base_string = "&".join([method.upper(), pct(base_url), pct(param_string)])
    signing_key = f"{pct(consumer_secret)}&{pct(token_secret)}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    ).decode()
    oauth_params["oauth_signature"] = signature
    return "OAuth " + ", ".join(f'{pct(k)}="{pct(v)}"' for k, v in sorted(oauth_params.items()))


def round_trade_price(value: float, symbol: str) -> str:
    decimals = 4 if "-" in symbol or "/" in symbol else 2
    return f"{value:.{decimals}f}"
