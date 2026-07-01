# Onboarding & deploy ops handoff

> **Audience:** Build-chat agents · ONB-0–4, dogfood, QA, box deploy  
> **Also:** local copy at `.cursor/rules/onboarding-ops-handoff.mdc` (gitignored — this file is canonical in repo)

Use when touching `/welcome`, `/setup`, Essential mode, privacy gates, or `deploy-to-box.ps1`.

## Flow (shipped ONB-0–4)

```
!initialized → /setup → /welcome → /home
```

- Default tier: **Essential** (`experience-level.ts`, `DEFAULT_USER_SETTINGS`)
- Privacy: hard gate before egress (`egress-policy.ts`, `POST /api/onboarding/privacy-ack`)
- Legacy: FRE before `2026-07-01` skips `/welcome` but sets `privacyDeferred` only — smoke/CI must ack privacy

## Dogfood (laptop)

```powershell
cd pillar-4-dashboard
# .env.local: NEXT_PUBLIC_CURXOR_SHELL_V2=1
npm run dev   # http://127.0.0.1:3080
```

**Reset full path:** `scripts/dev-qa/fre-state.json` → `initialized: false`; remove `operatorProfile` from `user-settings.json`.

## QA

```powershell
npm run qa:local -- --rebuild --port 3081   # if 3080 busy
```

- Stale `.next` hides fixes — always `--rebuild` after tour/onboarding code changes
- `qa-smoke.mjs` seeds privacy ack before connector/firecrawl/OAuth tests

## Box deploy (Windows → MS-S1)

```powershell
cd C:\Users\ankur\curxor-os
.\scripts\deploy-to-box.ps1 -SshHost curxor
```

**CRLF trap:** never put `sed 's/\r$//'` in a PowerShell double-quoted SSH string — `\r` becomes a real CR. Fixed script uses `$shCrLfStrip = 's/\r$//'` and script-dir-only `find`.

**Recovery:** `sudo find /opt/curxor/scripts /opt/curxor/pillar-4-dashboard/scripts /opt/curxor/pillar-2-engine -name '*.sh' -exec sed -i 's/\r$//' {} + && sudo bash /opt/curxor/scripts/post-update.sh`

Detail: [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) — CRLF section.

## Key files

| Area | Paths |
|------|-------|
| Plan | `ONBOARDING-PLAN.md` |
| Onboarding | `pillar-4-dashboard/lib/onboarding.ts`, `middleware.ts`, `components/welcome/*` |
| Privacy | `lib/egress-policy.ts`, `components/settings/PrivacyAcknowledgmentPanel.tsx` |
| Deploy | `scripts/deploy-to-box.ps1`, `scripts/post-update.sh` |
