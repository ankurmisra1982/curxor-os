# Creator Claw — Getting Started

Operator guide for day-one setup on a CurXor appliance.

## 1. Open Creator Claw

After First Run Experience (FRE), open **Creator Claw** from the Flight Command desktop (`/my-content`).

Use **Settings → Appearance → Experience level** to pick Beginner, Standard, or Expert. Beginner shows the **Go Live** checklist and Creation Wizard first.

## 2. Go Live checklist

The **Go Live** panel at the top tracks:

| Step | What to do |
|------|------------|
| Channels configured | Complete Creator Claw FRE — pick TikTok, Instagram, X, YouTube, etc. |
| Publish bridges ready | Add OAuth tokens to `/etc/curxor/digital.env` (see Bridge Health panel for missing keys) |
| Public media URL | Set `CURXOR_CONTENT_PUBLIC_BASE` in `dashboard.env` if you publish to Instagram, Pinterest, or TikTok with local images |
| Operator notifications | Optional but recommended: `CURXOR_APPROVAL_TELEGRAM_CHAT_IDS` for `/approve` and publish-failure alerts |
| First post scheduled | Run **Creation Wizard** → draft → attach media → schedule |

The **Today** strip shows next scheduled post, pending approvals, failed publishes, and crisis pause state.

## 3. Bridge credentials (`digital.env`)

Each live platform needs credentials on the **digital bridge** (eno2). Common keys:

| Platform | Required env keys |
|----------|-------------------|
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` |
| LinkedIn | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN` |
| Instagram / Threads / Facebook | `META_ACCESS_TOKEN`, `META_IG_USER_ID` (or Page ID) |
| YouTube | `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| TikTok | `TIKTOK_ACCESS_TOKEN` or refresh flow keys |
| Pinterest | `PINTEREST_ACCESS_TOKEN`, `PINTEREST_DEFAULT_BOARD_ID` |
| Bluesky | `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` |

Open **Bridge Health** in Creator Claw for per-platform status, token expiry hints, and fix suggestions.

### Public image URLs

Instagram and Pinterest require a **public `image_url`** in the publish payload. On the appliance:

```bash
# dashboard.env or systemd Environment=
CURXOR_CONTENT_PUBLIC_BASE=https://your-appliance.example.com
```

Local assets are served at `/api/content/asset?file=…` once this base URL is reachable from the platform API.

## 4. First post (recommended path)

1. Click **Creation wizard** (or use Go Live → Creation wizard).
2. Pick channel and write a draft (local LLM — no outbound call on publish).
3. **Attach media from disk** (JPG/PNG/MP4) or capture a vision thumbnail / render video.
4. Run **Pre-flight** — fix char limits, brand kit, bridge readiness.
5. **Schedule** (drag on calendar or “Schedule at best time”).
6. Optional: enable **Require approval before publish** in FRE — approve via dashboard, Telegram (`/approve POST-001`), or Slack.

## 5. Telegram & Slack operators

### Approval commands (Telegram)

Set chat IDs:

```bash
CURXOR_APPROVAL_TELEGRAM_CHAT_IDS=123456789
```

Commands: `/approvals`, `/approve POST-001`, `/reject POST-001 reason`, `/pause`, `/resume`.

### Publish failure alerts

When a bridge publish fails, Creator Claw notifies the same Telegram chats (and Slack channels if configured). Disable with:

```bash
CURXOR_PUBLISH_FAILURE_NOTIFY=false
```

Or in FRE: `notifyPublishFailureOnTelegram: false`.

Failed posts appear in **Publish Recovery** — fix credentials or media, then **Retry publish**.

## 6. Local development / demo seed

```powershell
cd pillar-4-dashboard
$env:CURXOR_FRE_STATE_PATH="$PWD\scripts\dev-qa\fre-state.json"
$env:CURXOR_USER_SETTINGS_PATH="$PWD\scripts\dev-qa\user-settings.json"
$env:CURXOR_APP_FRE_DIR="$PWD\scripts\dev-qa\app-fre"
$env:CURXOR_CONTENT_QUEUE_PATH="$PWD\scripts\dev-qa\content-queue.json"
$env:CURXOR_CHANNELS_PATH="$PWD\scripts\dev-qa\channels"
npm run dev
```

Capture a demo screenshot:

```bash
node scripts/capture-demo-screenshots.mjs
# includes 08-creator-claw.png at /my-content
```

## 7. API & automation

All actions are available via `POST /api/content/status` with an `action` field. Examples:

- `go_live` — checklist report
- `create`, `update_draft`, `schedule`, `publish`
- `recovery_list`, `recovery_retry`
- `attach` via `POST /api/content/upload` (multipart: `postId`, `kind`, `file`)

REST tools catalog: `/api/content/tools`.

## 8. Heartbeat jobs

The appliance heartbeat daemon runs:

- Social engage poll (comments/mentions)
- Metrics pull (live platform stats)
- Evergreen recycle
- Weekly ops digest (Telegram)

No separate job worker unit is required for day-one operation.

---

See [RELEASE-NEXT.md](./RELEASE-NEXT.md) for the full feature list and deferred roadmap.
