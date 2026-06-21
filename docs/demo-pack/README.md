# Flight Command demo pack

Screenshots and copy for storefront, pitch deck, and investor collateral.

## Capture screenshots

1. Start the dashboard with dev-qa seed data (PowerShell):

```powershell
cd pillar-4-dashboard
$env:CURXOR_FRE_STATE_PATH="$PWD\scripts\dev-qa\fre-state.json"
$env:CURXOR_USER_SETTINGS_PATH="$PWD\scripts\dev-qa\user-settings.json"
$env:CURXOR_APP_FRE_DIR="$PWD\scripts\dev-qa\app-fre"
npm run dev
```

Bash equivalent:

```bash
cd pillar-4-dashboard
export CURXOR_FRE_STATE_PATH=$PWD/scripts/dev-qa/fre-state.json
export CURXOR_USER_SETTINGS_PATH=$PWD/scripts/dev-qa/user-settings.json
export CURXOR_APP_FRE_DIR=$PWD/scripts/dev-qa/app-fre
npm run dev
```

2. Install Playwright Chromium (first time only):

```bash
npx playwright install chromium
```

3. Capture all routes:

```bash
node scripts/capture-demo-screenshots.mjs
# or: node scripts/capture-demo-screenshots.mjs --base http://127.0.0.1:3080
```

Single route (waits for page text, 6s settle after load):

```bash
node scripts/capture-one-demo.mjs /my-vital 05-vital-claw.png "Longevity protocol desk"
node scripts/capture-one-demo.mjs /my-family 06-kin-claw.png "Household context hub"
```

Output: `docs/demo-pack/screenshots/`

| File | Route | Use |
|------|-------|-----|
| `01-home.png` | `/home` | Landing hero, day-one story |
| `02-settings.png` | `/settings` | User freedom — Claws, intelligence, appearance |
| `03-capital-claw.png` | `/my-capital` | Wealth Claw workspace |
| `04-forge.png` | `/claw-forge` | Create-to-earn |
| `05-vital-claw.png` | `/my-vital` | Life & family — longevity desk |
| `06-kin-claw.png` | `/my-family` | Life & family — household profiles |

Copy these into `curxor storefront/public/demo/` when updating GTM assets.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/my-vital` shows Home hub | Sync `selectedApps` in `scripts/dev-qa/user-settings.json` with `fre-state.json` — middleware and `DesktopRouteGuard` read different files |
| Page stuck on "Loading … Claw" | Wait for Next.js compile to finish; do not capture during hot reload |
| Blank or tiny PNG (~7KB) | Stop dev server, delete `pillar-4-dashboard/.next`, restart with env vars above |
| Playwright timeout on `networkidle` | Do not use `networkidle` — SSE streams on `/api/stream/*` never idle. Use `capture-one-demo.mjs` (domcontentloaded + wait) |
| Redirect to `/setup` | Ensure `fre-state.json` has `"initialized": true` and `/api/setup/status` returns 200 before capture |

## PDF documentation

From repo root (Linux/WSL with pandoc):

```bash
./docs/scripts/export-guides-pdf.sh
# Release bundle:
./docs/scripts/export-guides-pdf.sh --release
```

Output: `docs/pdf/`
