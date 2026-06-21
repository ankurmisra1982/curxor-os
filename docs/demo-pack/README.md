# Flight Command demo pack

Screenshots and copy for storefront, pitch deck, and investor collateral.

## Capture screenshots

1. Start the dashboard with dev-qa seed data:

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

3. Capture:

```bash
node scripts/capture-demo-screenshots.mjs
# or: node scripts/capture-demo-screenshots.mjs --base http://127.0.0.1:3081
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

## PDF documentation

From repo root (Linux/WSL with pandoc):

```bash
./docs/scripts/export-guides-pdf.sh
# Release bundle:
./docs/scripts/export-guides-pdf.sh --release
```

Output: `docs/pdf/`
