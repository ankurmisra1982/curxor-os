# Kin Claw — Growth Leveling

L1–L5 leveling UX shipped (mirrors Creator/Work pattern) inside Tier C preview shell.

**Freeze:** [FREEZE.md](./FREEZE.md) · **Implementation plan:** [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md)  
**Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
**Code:** `lib/kin-growth.ts` · `lib/kin-level-gates.ts` · `components/apps/kin/*`

## Persona labels

| Level | Label | Default tab |
|-------|-------|-------------|
| L1 | Member | Members |
| L2 | Helper | Profile |
| L3 | Coordinator | Mesh |
| L4 | Steward | Settings |
| L5 | Elder | Settings |

## FRE intent

Kin FRE asks **"What best describes your household role?"** — maps to `growthIntent` → `growthLevel` on save.

Settings → Appearance → **Kin Claw growth level** overrides FRE for demos and QA.

## QA

```bash
npm run qa:kin-levels
```
