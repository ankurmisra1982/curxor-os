# CurXor OS — Audit Report (2026-06-20, pass 4)

Full audit, debug, optimization, and QA after storefront ↔ appliance naming alignment (Digital Wealth paradigm).

## Executive summary

| Area | Status |
|------|--------|
| Storefront ↔ appliance naming | **Aligned** — `ootb-apps.ts` canonical; sync + UI headers + assist copy |
| Agent skills → mesh | **Wired** — physical/digital skills via `mesh-publish.ts` + `/api/mesh/*` |
| Claw Forge multimodal | **Wired** — `/api/claw/assist` + `ForgeAssistProvider` |
| FRE `selectedApps` | **Enforced** — nav, client guard, middleware |
| SSE streams | **Deduped** — vision, motor, digital (receipt id dedup in pass 4) |
| Forge wizard UX | **Stable** — `?new=1` one-shot, no double-open on skill tick |
| System Health | **Compute metrics** widget mounted |
| Build / CI | **npm + package-lock.json**; typecheck + build both pillars |
| QA automation | **`npm run qa:smoke`** — 14 API checks (all 8 app agents) |

---

## Fixes applied (pass 4)

### P1 — Copy & positioning consistency

1. **`MyWorkApp`** — Outreach Claw copy in tasks, queue empty state, workspace default
2. **`app-agent-catalog.ts`** — Outreach Desk default, lane labels, Arbitrage/Engage FRE leads, `attach_vision` → `plan` kind
3. **`SetupWizard`** — default module selection: Capital + Creator + Outreach (digital-employee GTM)

### P2 — Runtime quality

4. **`TelemetryProvider`** — dedupe digital receipts by `id` (prevents duplicate panel entries on SSE replay)
5. **`scripts/qa-smoke.mjs`** — cross-platform smoke (14 tests, all 8 `appId`s)
6. **`scripts/dev-qa/`** — seeded FRE + claw profiles for local Windows/macOS/Linux dev QA
7. **`package.json`** — `npm run qa:smoke` script
8. **`qa-smoke.sh`** — stricter setup status JSON check

---

## QA results (pass 4)

```text
npm run typecheck && npm run build   # pillar-4-dashboard ✅
npm run typecheck && npm run build   # pillar-2-engine ✅
npm run build                        # curxor storefront ✅

# Dev server with local FRE seed:
CURXOR_FRE_STATE_PATH=scripts/dev-qa/fre-state.json
CURXOR_CLAW_PROFILES_PATH=scripts/dev-qa/claw-profiles.json
CURXOR_MESH_BROKER_IP=127.0.0.1
npm run dev   # :3080

npm run qa:smoke   # 14/14 passed
```

| Test | Result |
|------|--------|
| `/api/setup/status` | PASS |
| `/api/app-agent/assist` × 8 apps | PASS |
| `/api/claw/assist` | PASS |
| `/api/mesh/motor` | PASS |
| `/api/mesh/digital` | PASS |
| `/api/metrics/compute` | PASS |
| `/api/claw/profiles` | PASS |

---

## Architecture (verified)

- **8 domain agents** + **The Forge** (always enabled)
- **Canonical names** in `lib/ootb-apps.ts` → nav, workspace headers, storefront sync
- **Mesh publish** — dashboard PUB → XSUB `:9200`
- **Mesh subscribe** — SSE via `/api/stream/*` + `zmq-bridge.ts`
- **Digital bridges** — eno2 only; LLM never egresses

---

## Remaining recommendations

| Priority | Item |
|----------|------|
| P2 | LAN auth on mutating routes (`/api/mesh/*`, `/api/setup/provision`, `/api/claw/create`, `/api/app-fre/*`) | ✅ `lib/lan-auth.ts` · optional `CURXOR_LAN_AUTH_TOKEN` |
| P2 | CI job: start production server + `qa:smoke` | ✅ `pillar-4-qa-smoke` job in build.yml |
| P3 | Pass workspace selection into skill mesh payloads | ✅ Capital rule · Shop order · Work task |
| P3 | Extend local LLM chat to Outreach / Arbitrage apps | ✅ `my-work` + `my-shop` in `LLM_CHAT_APPS` |

---

## Manual UI QA (hardware / browser)

- [ ] Setup wizard → lands on first **selected** app
- [ ] Direct URL to deselected app → middleware redirect
- [ ] Physical skill → activity log shows `motor_out seq N`
- [ ] Capital **Execute Trade** → digital receipt panel (bridge running)
- [ ] Claw Forge: photo + chat → wizard opens once; close works on `?new=1`
- [ ] System Health → compute metrics + OTA log
- [ ] All 8 nav labels match storefront (Capital Claw, Outreach Claw, …)

---

## File index (pass 4)

| Path | Role |
|------|------|
| `lib/ootb-apps.ts` | Canonical app names, routes, descriptions |
| `scripts/qa-smoke.mjs` | Cross-platform API smoke (14 tests) |
| `scripts/dev-qa/fre-state.json` | Local dev FRE seed (initialized) |
| `components/telemetry/TelemetryProvider.tsx` | SSE + digital receipt dedup |
| `components/setup/SetupWizard.tsx` | Digital-wealth default module picks |
| `docs/AUDIT-REPORT.md` | This report |

---

## Pass 5 — overnight polish (2026-06-20)

| Item | Change |
|------|--------|
| LAN auth | `lib/lan-auth.ts` · optional `CURXOR_LAN_AUTH_TOKEN` |
| Workspace → mesh | Capital rule · Shop order · Work task via `updateWorkspaceContext` |
| LLM chat | Outreach + Arbitrage added to `LLM_CHAT_APPS` |
| CI | `pillar-4-qa-smoke` job in `.github/workflows/build.yml` |
| Local QA | `npm run qa:local` · `scripts/qa-local.mjs` · dev-qa `app-fre/` seeds (8 apps) |
| OTA docs | `config/ota/README.md` production checklist |
