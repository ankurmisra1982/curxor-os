# Flight Command demo pack

Screenshots and copy for storefront, pitch deck, and investor collateral.

## Capture screenshots

1. Start the dashboard with dev-qa seed data (PowerShell):

```powershell
cd pillar-4-dashboard
$env:CURXOR_FRE_STATE_PATH="$PWD\scripts\dev-qa\fre-state.json"
$env:CURXOR_USER_SETTINGS_PATH="$PWD\scripts\dev-qa\user-settings.json"
$env:CURXOR_APP_FRE_DIR="$PWD\scripts\dev-qa\app-fre"
$env:CURXOR_CONTENT_QUEUE_PATH="$PWD\scripts\dev-qa\content-queue.json"
$env:CURXOR_CHANNELS_PATH="$PWD\scripts\dev-qa\channels"
npm run dev
```

Bash equivalent:

```bash
cd pillar-4-dashboard
export CURXOR_FRE_STATE_PATH=$PWD/scripts/dev-qa/fre-state.json
export CURXOR_USER_SETTINGS_PATH=$PWD/scripts/dev-qa/user-settings.json
export CURXOR_APP_FRE_DIR=$PWD/scripts/dev-qa/app-fre
export CURXOR_CONTENT_QUEUE_PATH=$PWD/scripts/dev-qa/content-queue.json
export CURXOR_CHANNELS_PATH=$PWD/scripts/dev-qa/channels
npm run dev
```

2. Install Playwright Chromium (first time only):

```bash
npx playwright install chromium
```

3. Capture all routes:

```bash
node scripts/capture-marketing-flows.mjs
# or: node scripts/capture-marketing-flows.mjs --base http://127.0.0.1:3080
```

Legacy single-route script (still works):

```bash
node scripts/capture-demo-screenshots.mjs
node scripts/capture-one-demo.mjs /my-work 07-unified-inbox.png "Comms desk"
```

Output: `docs/demo-pack/screenshots/` (+ `screenshots/creator/` for Creator Claw flows)

### Core Claw (screenshots/)

| File | Route | Use |
|------|-------|-----|
| `01-home.png` | `/home` | Landing hero, day-one story (includes recent conversations) |
| `02-settings.png` | `/settings` | User freedom — Claws, intelligence, appearance |
| `03-capital-claw.png` | `/my-capital` | Capital Claw desk (Setup Wizard · Analytics · Go Live) |
| `04-forge.png` | `/claw-forge` | Create-to-earn |
| `05-vital-claw.png` | `/my-vital` | Life & family — longevity desk |
| `06-kin-claw.png` | `/my-family` | Life & family — household profiles |
| `07-unified-inbox.png` | `/my-work` | Unified comms — Outreach Claw comms desk |
| `08-creator-claw.png` | `/my-content` | Creator Claw — Go Live checklist + queue |

### Creator Claw flows (screenshots/creator/)

| File | Focus | Use |
|------|-------|-----|
| `09-go-live-checklist.png` | Go Live panel | Day-one onboarding · bridge checklist |
| `10-content-calendar.png` | Content Calendar | Scheduling · learned best times |
| `11-publish-recovery.png` | Publish Recovery | Failed publish retry UX |
| `12-creation-wizard.png` | Creation wizard modal | First-post guided flow |
| `13-bridge-health.png` | Bridge Health | OAuth / digital.env status |
| `14-analytics-funnel.png` | Analytics | Funnel · metrics · recommendations |
| `15-engage-inbox.png` | Engage inbox | Comment → reply → publish loop |
| `16-content-planner.png` | Content Planner | Gap detection · fill week |

Copy these into `curxor storefront/public/demo/` when updating GTM assets.

### Capital Claw flows (screenshots/capital/)

| File | Focus | Use |
|------|-------|-----|
| `17-setup-wizard.png` | Setup Wizard modal | Day-one onboarding |
| `18-analytics-tab.png` | Analytics workspace tab | Standard+ scorecard |
| `19-capital-go-live.png` | Go Live checklist | Demo vs paper path |

Capture Capital-only assets:

```bash
npm run demo:capture:capital
# or: node scripts/capture-capital-demo.mjs --base http://127.0.0.1:3080
```

Set `experienceLevel` to `standard` in `user-settings.json` before capture if Analytics tab is gated.

## Walkthrough video (~90s)

Record Creator Claw scroll tour for storefront `/creator`:

```bash
node scripts/record-creator-walkthrough.mjs
# or: node scripts/record-creator-walkthrough.mjs --base http://127.0.0.1:3080
```

Output: `docs/demo-pack/creator-walkthrough.webm` → auto-copied to `curxor storefront/public/demo/creator-walkthrough.webm`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/my-vital` shows Home hub | Sync `selectedApps` in `scripts/dev-qa/user-settings.json` with `fre-state.json` — middleware and `DesktopRouteGuard` read different files |
| Unified inbox empty | Set `CURXOR_CHANNELS_PATH` to `scripts/dev-qa/channels` and ensure `config.json` has `"enabled": true` |
| Page stuck on "Loading … Claw" | Wait for Next.js compile to finish; do not capture during hot reload |
| Blank or tiny PNG (~7KB) | Stop dev server, delete `pillar-4-dashboard/.next`, restart with env vars above |
| Playwright timeout on `networkidle` | Do not use `networkidle` — SSE streams on `/api/stream/*` never idle. Use `capture-one-demo.mjs` (domcontentloaded + wait) |
| Redirect to `/setup` | Ensure `fre-state.json` has `"initialized": true` and `/api/setup/status` returns 200 before capture |
| `--base` ignored in capture | Pass `--base` last: `… "Go Live" --base http://127.0.0.1:3080` |
| Creator panels show "Standard/Expert feature" gates | Set `experienceLevel` to `beginner` for Go Live screenshot; `standard` for calendar/recovery captures |

## PDF documentation

From repo root (Linux/WSL with pandoc):

```bash
./docs/scripts/export-guides-pdf.sh
# Release bundle:
./docs/scripts/export-guides-pdf.sh --release
```

Output: `docs/pdf/`
