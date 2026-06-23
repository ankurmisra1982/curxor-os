# Dev QA seed data

Use these paths when running Flight Command locally (Windows, macOS, or Linux):

```bash
export CURXOR_FRE_STATE_PATH=$PWD/scripts/dev-qa/fre-state.json
export CURXOR_USER_SETTINGS_PATH=$PWD/scripts/dev-qa/user-settings.json
export CURXOR_LLM_CREDENTIALS_PATH=$PWD/scripts/dev-qa/llm-credentials.json
export CURXOR_CLAW_PROFILES_PATH=$PWD/scripts/dev-qa/claw-profiles.json
export CURXOR_APP_FRE_DIR=$PWD/scripts/dev-qa/app-fre
export CURXOR_AGENT_WORKSPACE_PATH=$PWD/scripts/dev-qa/agent-workspace
export CURXOR_FORGED_APPS_PATH=$PWD/scripts/dev-qa/forged-apps.json
export CURXOR_MESH_BROKER_IP=127.0.0.1
```

## One-command smoke

```bash
npm run qa:local              # production next start + full smoke (matches CI)
npm run qa:local -- --rebuild # clean .next + build first
npm run qa:local -- --port 3081
```

`qa:local` builds a production bundle when `.next/BUILD_ID` is missing, then runs `next start` (not `next dev`) so API routes are precompiled — avoids flaky 404/500 during on-demand compile.

## Contents

| File / dir | Purpose |
|------------|---------|
| `fre-state.json` | Global FRE initialized with all 7 selectable modules |
| `user-settings.json` | Claws, appearance, and intelligence preferences |
| `llm-credentials.json` | Created at runtime when connecting frontier providers (gitignored) |
| `claw-profiles.json` | Empty fleet registry |
| `forged-apps.json` | Forged desk registry (P2 framework mint) |
| `agent-workspace/` | Per-app SOUL/TOOLS/HEARTBEAT (OOTB + forged) |
| `app-fre/*.json` | Per-app FRE complete — skips wizard in each workspace |
| `content-queue.json` | Creator Claw demo queue — scheduled, published, and recovery candidate |

Do not commit secrets. Production uses `/etc/curxor/`.

## Forge QA pollution

`forge-checklist.mjs`, `qa-smoke.mjs`, and user flows mint forged desks at runtime. Those artifacts land under `agent-workspace/forged-*` and `app-fre/forged-*.json` — **gitignored**. After heavy local QA, trim JSON registries:

```bash
node scripts/prune-dev-qa-forge-pollution.mjs --dry-run
node scripts/prune-dev-qa-forge-pollution.mjs
```

Committed seed keeps only stable demo forged slugs: `demo-tour-desk`, `fabricator-work-desk`, `fabricator-creator-desk` (and `fabricator-capital-desk` when present). Their workspace dirs (`forged-demo-tour-desk`, etc.) and matching `app-fre/forged-*.json` **are** tracked; numbered checklist/smoke/flow artifacts are gitignored.
