# CurXor Onboarding Plan

Locked decisions for first-login operator onboarding (Your Box) and Essential experience tier.

## Decisions

| Topic | Choice |
|-------|--------|
| Default tier | **Essential** for new operators (below Beginner) |
| Human wizard | **Your Box** — subtitle *Setup*, route **`/welcome`** |
| Appliance wizard | **`/setup`** — thin FRE provision (quick check + job pick + finish) |
| Privacy (v1) | Soft gate on step 1: Continue (acks) or **Remind me later** |
| Privacy (v2 / ONB-4) | **Hard gate** before outbound connector link + egress UI |
| Address (v1) | City + timezone only; defer street address |
| Day-one scope | Skip MCP / Build Plane in Your Box |

## Experience tiers

```
Essential → Beginner → Standard → Expert
```

## Two wizards

1. **`/setup`** — appliance FRE: quick check → pick jobs → finish → **`/welcome`**.
2. **`/welcome`** — human profile: Your metal → About you → Connections (optional) → Your team → Home.

## Middleware chain

```
!initialized → /setup
initialized && !welcomeCompleted → /welcome
else → app routes
```

## Phasing

| ID | Scope | Status |
|----|-------|--------|
| ONB-0 | Essential mode in settings, UiModeProvider, Home, header, Settings picker | Done |
| ONB-1 | `operatorProfile`, `/welcome` skeleton, status API, middleware, provision redirect | Done |
| ONB-2 | Connections catalog in Your Box (`WelcomeConnectionsStep`, day-one subset) | Done |
| ONB-3 | Thin Essential `/setup` (plain copy, essential handshake + provision UI) | Done |
| ONB-4 | Privacy hard gate before egress (`egress-policy`, connector link 403, Settings panel) | Done |

## Key files

- `lib/experience-level.ts` — tier types
- `lib/user-settings-types.ts` — `operatorProfile`, default `essential`
- `lib/onboarding.ts` — welcome + privacy ack helpers
- `lib/egress-policy.ts` — privacy + eno2 combined egress state
- `lib/welcome-connections-catalog.ts` — day-one connector subset
- `components/welcome/YourBoxWizard.tsx`, `WelcomeConnectionsStep.tsx`
- `components/settings/PrivacyAcknowledgmentPanel.tsx`
- `app/api/onboarding/privacy-ack/route.ts`, `app/api/onboarding/status/route.ts`
- `middleware.ts` — welcome gate after FRE
- `components/setup/SetupWizard.tsx` — thin Essential appliance wizard

## Ship status (2026-07-01)

| Item | Status |
|------|--------|
| ONB-0–4 code | Merged via [PR #6](https://github.com/ankurmisra1982/curxor-os/pull/6) on `master` |
| Laptop QA | `npm run qa:local` green with `--rebuild` after code changes; use `--port 3081` if 3080 busy |
| CI | `qa-smoke.mjs` seeds `POST /api/onboarding/privacy-ack` before egress-gated tests |
| Demo tour | `lib/content-demo-tour.ts` — direct `publishPostToBridge` when bridge unconfigured |
| MS-S1 box | Deployed 2026-07-01 · `welcomeCompleted` + `privacyAcknowledged` · dashboard **active** |

### Dogfood (laptop)

```powershell
cd pillar-4-dashboard
# .env.local: NEXT_PUBLIC_CURXOR_SHELL_V2=1
npm run dev   # http://127.0.0.1:3080 → /setup or /welcome or /home
```

**Reset for full path:** `fre-state.json` → `initialized: false`; remove `operatorProfile` from `user-settings.json`.

### Box deploy

```powershell
cd C:\Users\ankur\curxor-os
.\scripts\deploy-to-box.ps1 -SshHost curxor
```

Enter sudo when prompted (~5–8 min build). If CRLF breaks `post-update.sh`, see `FOUNDER-PATCH-RUNBOOK.md` — **PowerShell trap** under CRLF.

**Agent handoff:** [ONBOARDING-OPS-HANDOFF.md](./ONBOARDING-OPS-HANDOFF.md)

## Concerns / follow-ups

- **Legacy grandfather:** FRE provisioned before cutover skips `/welcome`; set `CURXOR_ONBOARDING_LEGACY_GRANDFATHER=1` to force-skip in dev. CI/smoke must ack privacy separately (grandfather sets `privacyDeferred` only).
- **Connections status** in welcome step uses heuristic mapping from `/api/shell/connectors` — refine when connector IDs stabilize.
- **Cutover date:** set `CURXOR_ONBOARDING_CUTOVER` env if ship date moves from `2026-07-01`.
