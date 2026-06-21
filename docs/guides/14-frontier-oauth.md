# Frontier LLM OAuth — CurXor OS

How optional cloud intelligence connects on the appliance (June 2026).

## Philosophy

CurXor defaults to **local inference**. Frontier models are **opt-in** and **user-owned**:

- API keys (validated on connect)
- OAuth PKCE subscription sign-in (where supported)
- Guided subscription attestation (Cursor, Anthropic when OAuth is unavailable)

Nothing is bundled. Tokens and keys stay on the appliance in `/etc/curxor/llm-credentials.json` (mode `0600`).

## Supported auth methods

| Provider | API key | OAuth PKCE | Guided link |
|----------|---------|------------|-------------|
| OpenAI | Yes | Yes (ChatGPT/Codex flow) | — |
| Google AI | Yes | Yes (when `CURXOR_GOOGLE_OAUTH_CLIENT_ID` set) | — |
| Anthropic | Yes | — | Yes |
| Cursor | Yes | — | Yes |
| OpenRouter | Yes | — | — |

## OpenAI OAuth flow

1. Settings → Intelligence → OpenAI → **Sign in with subscription (OAuth)**
2. Appliance creates a PKCE link session and opens `auth.openai.com`
3. User signs in; browser redirects to `localhost:1455` (OpenAI-registered URI)
4. User copies the full callback URL and pastes it on the link page
5. Appliance exchanges the code for access + refresh tokens
6. `inference-router.ts` uses the OAuth token (with refresh) for frontier chat

Public client ID matches the Codex CLI flow — no CurXor env vars required for OpenAI.

## Google OAuth (optional)

Set on the appliance:

```bash
CURXOR_GOOGLE_OAUTH_CLIENT_ID=...
CURXOR_GOOGLE_OAUTH_CLIENT_SECRET=...   # if confidential client
```

Redirect URI to register: `http://<appliance-host>:3080/api/settings/llm/oauth/callback`

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/settings/llm/link-session` | Start guided or OAuth link session |
| `POST /api/settings/llm/oauth/complete` | Complete OAuth via pasted callback URL |
| `GET /api/settings/llm/oauth/callback` | Google redirect callback |
| `POST /api/settings/llm/connect` | Save validated API key |
| `POST /api/settings/llm/disconnect` | Remove keys + OAuth tokens |

## Files

- `lib/oauth/` — PKCE, provider config, token exchange, auth resolution
- `lib/provider-link-sessions.ts` — session state + completion
- `lib/llm-credentials.ts` — keys + OAuth token storage
- `lib/inference-router.ts` — routes chat to local or frontier

## Security notes

- Link sessions expire after 30 minutes
- OAuth `state` is validated on callback
- LAN auth (`CURXOR_LAN_AUTH_TOKEN`) gates mutating routes in production
- Guided link is honor-system only — prefer OAuth or API keys when available
