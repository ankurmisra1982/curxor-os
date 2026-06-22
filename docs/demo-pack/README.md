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
| `04-forge.png` | `/claw-forge` | Create-to-earn · Agent Factory |
| `05-vital-claw.png` | `/my-vital` | Life & family — longevity desk |
| `06-kin-claw.png` | `/my-family` | Life & family — household profiles |
| `07-unified-inbox.png` | `/my-work` | Unified comms — Outreach Claw comms desk |
| `08-creator-claw.png` | `/my-content` | Creator Claw — Go Live checklist + queue |

### The Forge flows (screenshots/forge/)

| File | Focus | Use |
|------|-------|-----|
| `30-forge-fleet.png` | Fleet registry | L2 Builder · unified profiles + desks |
| `31-forge-templates.png` | Template catalog | L4 Fabricator · work-desk mint |
| `32-forge-ops.png` | Foundry ops | L5 governance · inference + export |

Capture Forge assets:

```bash
npm run demo:capture:forge
# or: node scripts/capture-forge-demo.mjs --base http://127.0.0.1:3080
```

Record exit-demo walkthrough:

```bash
npm run demo:record:forge:exit
# Output: pillar-4-dashboard/docs/demo-pack/forge-exit-walkthrough.webm
```

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

### Work Claw flows (screenshots/outreach/)

| File | Focus | Use |
|------|-------|-----|
| `20-go-live.png` | Go Live checklist | Start tab · demo vs live path |
| `21-pipeline.png` | Lead pipeline | Outreach tab |
| `22-sequences.png` | Sequences panel | Outreach tab |
| `23-analytics.png` | Analytics | Ops tab (Standard+) |
| `24-l1-start-home.png` | L1 Start home | People waiting · Explorer persona |
| `25-l1-templates.png` | L1 Message templates | Template packs · copy-to-draft |
| `26-l2-mini-sequence.png` | L2 Mini-sequence | Side Hustler persona |
| `27-l3-deliverability.png` | L3 Deliverability | Ops · domain health · warmup |
| `28-l3-approval.png` | L3 Send approval | Operator approval queue |
| `29-live-proof.png` | Live proof panel | Integrations · exit-demo path |

Capture core Work desk (20–23):

```bash
npm run demo:capture:work
# or: node scripts/capture-work-demo.mjs --base http://127.0.0.1:3080
```

Capture persona + live-proof assets (24–29, patches `workGrowthLevel` per level):

```bash
npm run demo:capture:work:levels
# or: node scripts/capture-gtm-phase2.mjs --base http://127.0.0.1:3080
```

Set `experienceLevel` to `expert` for Integrations connector vault screenshot.

Record exit-demo walkthrough (SMTP/OAuth live-ready runbook):

```bash
npm run demo:record:work:exit
# or: node scripts/record-work-exit-demo.mjs --base http://127.0.0.1:3080
```

Output: `docs/demo-pack/work-exit-walkthrough.webm`

## Walkthrough video (~90s)

Record Creator Claw scroll tour for storefront `/creator`:

```bash
node scripts/record-creator-walkthrough.mjs
# or: node scripts/record-creator-walkthrough.mjs --base http://127.0.0.1:3080
```

Output: `docs/demo-pack/creator-walkthrough.webm` → auto-copied to `curxor storefront/public/demo/creator-walkthrough.webm`

Record Capital Claw scroll tour for storefront `/capital`:

```bash
node scripts/record-capital-walkthrough.mjs
```

Output: `docs/demo-pack/capital-walkthrough.webm` → auto-copied to `curxor storefront/public/demo/capital-walkthrough.webm`

Record Work Claw scroll tour for storefront `/work` (Outreach desk):

```bash
npm run demo:record:work
# or: node scripts/record-outreach-walkthrough.mjs --base http://127.0.0.1:3080
```

Output: `docs/demo-pack/outreach-walkthrough.webm` → copy to `curxor storefront/public/demo/outreach-walkthrough.webm`

Capture Capital + Outreach phase-2 assets (screenshots → storefront `public/demo/`):

```bash
node scripts/capture-gtm-phase2.mjs
```

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
