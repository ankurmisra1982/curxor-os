# Creator Claw — Day-One Sprint (v0.3.0)

Completed overnight sprint aligning Creator Claw for appliance day-one launch.

## Shipped

| Item | Change |
|------|--------|
| **Creation Wizard** | 5 steps: Channel → Draft → Media (upload / AI / skip) → Pre-flight → Schedule with `useBestTime` |
| **Go Live semantics** | `ready` requires all FRE bridges **ready** + public base probe OK; `partiallyReady` for scheduled-but-blocked states |
| **Public base probe** | HEAD/GET ping to `/api/content/asset?file=__curxor_probe__` when `CURXOR_CONTENT_PUBLIC_BASE` set |
| **dashboard_bootstrap** | Single API action replaces ~12 parallel loads on Creator mount |
| **Beginner default** | Creator FRE completion nudges experience level to Beginner unless user explicitly chose Expert |
| **Signal feed** | Hidden when feed empty (no Signal Claw noise on day-one) |
| **Wizard → Pre-flight** | Auto-scroll to `#creator-preflight-section` after schedule |
| **QA** | +5 smoke checks (create, preflight, schedule, bootstrap, go_live fields) + creator user flow |
| **Demo seed** | `user-settings.json` experienceLevel `beginner` for screenshot capture |
| **Version** | `0.3.0` · release notes · FEATURE-FUNCTION · GETTING-STARTED updated |

## Validate locally

```powershell
cd pillar-4-dashboard
$env:CURXOR_FRE_STATE_PATH="$PWD\scripts\dev-qa\fre-state.json"
$env:CURXOR_USER_SETTINGS_PATH="$PWD\scripts\dev-qa\user-settings.json"
$env:CURXOR_APP_FRE_DIR="$PWD\scripts\dev-qa\app-fre"
$env:CURXOR_CONTENT_QUEUE_PATH="$PWD\scripts\dev-qa\content-queue.json"
npm run dev
# separate terminal:
npm run qa:local -- --port 3080
```

Demo screenshot:

```bash
node scripts/capture-one-demo.mjs /my-content 08-creator-claw.png "Creator Claw Go Live"
```

## Deferred (post day-one)

- Tabbed MyContentApp shell (Plan · Create · Publish · Engage · Analytics)
- Default `requirePublishApproval: true` on first appliance boot
- Signal feed UI when Signal Claw ships populated feed
- E2E Playwright UI test for wizard modal (API flow covered in qa-user-flows)

## Morning checklist

1. Confirm `npm run qa:local` green (smoke + user flows + build)
2. Open `/my-content` in Beginner mode — verify Go Live + wizard path
3. Capture `08-creator-claw.png` for storefront if not auto-captured
4. Pick next v0.3 parallel-track app (Forge or Capital recommended)

## Micro-bundle (pre-bed polish)

- **Beginner lazy-load** — `loadGrowthData` deferred until Standard+ experience level
- **Wizard reset** — fresh state each time the Creation wizard opens
- **Dead code** — removed unused `loadGoLive` (bootstrap covers it)
- **Demo capture** — `capture-one-demo.mjs` supports `--base`; `08-creator-claw.png` re-captured with Go Live panel
