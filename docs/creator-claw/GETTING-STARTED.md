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
| First post scheduled | Run **Run demo tour**, **Creation Wizard**, or draft → schedule your first post |

**Demo ready** (no bridge keys required): FRE complete + at least one post **scheduled or published**. Use **Run demo tour** in Go Live for a one-click path — draft → preflight → schedule → simulated publish (`demo://local`).

**Ready to publish** requires every FRE-enabled bridge to be **ready** (not merely warning). **Partially ready** means your first post is scheduled but bridges or public media URL still need attention.

See **[STARTUP-GUIDE.md](./STARTUP-GUIDE.md)** for demo-only policy and day-one quick start.

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

1. Click **Creation wizard** (or use Go Live → Start wizard).
2. **Channel** — pick primary platform from your FRE channels.
3. **Draft** — write copy (or leave blank and use Draft Post skill after).
4. **Media** — attach JPG/PNG/MP4 from disk, generate AI thumb, or skip (add in Creation Studio before IG/TikTok publish).
5. **Pre-flight** — fix blockers (char limits, brand kit, bridge readiness); warnings are OK to schedule.
6. **Schedule** — uses learned best time when **Use data-driven schedule** is on in FRE.
7. Wizard scrolls to **Pre-publish Preview** when done — run Publish skill when pre-flight is green.
8. Optional: enable **Require approval before publish** in FRE — approve via dashboard, Telegram (`/approve POST-001`), or Slack.

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

- `dashboard_bootstrap` — single load for Creator workspace (queue, Go Live, bridge health, calendar, approval)
- `go_live` — checklist report (`demoReady` · `ready` · `partiallyReady`)
- `run_demo_tour` — one-click demo: create X post → preflight → schedule → simulated publish when bridges unconfigured
- `create`, `update_draft`, `preflight_check`, `schedule`, `publish_now`, `publish`
- `recovery_list`, `recovery_retry`
- `attach` via `POST /api/content/upload` (multipart: `postId`, `kind`, `file`)

REST tools catalog: `/api/content/tools`.

## 8. Heartbeat & scheduled publish

The appliance **heartbeat daemon** (`scripts/heartbeat-daemon.mjs`, systemd `curxor-scheduler.service`) runs on a short interval and calls `POST /api/scheduler` with `action: run_due`. That executes due scheduler jobs — including Creator Claw **auto-publish** jobs created when you schedule a post (`content-{postId}` → skill `publish_post`).

```bash
# Local dev — run heartbeat alongside Next.js (separate terminal)
node scripts/heartbeat-daemon.mjs
```

Scheduled posts stay in **SCHEDULED** until the job fires; the daemon then invokes the same publish path as **Publish now** / the Publish skill. If **Require approval before publish** is on, scheduled jobs queue for approval instead of hitting the bridge immediately.

Other heartbeat tasks (same daemon):

- Social engage poll (comments/mentions)
- Metrics pull (live platform stats)
- Evergreen recycle
- Weekly ops digest (Telegram)

No separate job worker unit is required for day-one operation.

---

See [RELEASE-NEXT.md](./RELEASE-NEXT.md) for the full feature list and deferred roadmap.
