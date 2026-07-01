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

## Concerns / follow-ups

- **Box deploy:** run same dogfood on MS-S1 (`/etc/curxor/*`); set `CURXOR_ONBOARDING_CUTOVER` if ship date moves.
- **Legacy grandfather:** FRE provisioned before cutover skips `/welcome`; set `CURXOR_ONBOARDING_LEGACY_GRANDFATHER=1` to force-skip in dev.
- **Connections status** in welcome step uses heuristic mapping from `/api/shell/connectors` — refine when connector IDs stabilize.
