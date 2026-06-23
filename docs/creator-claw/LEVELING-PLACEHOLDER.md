# Creator Claw — Growth Leveling

Full L1–L5 leveling UX shipped (mirrors Work Claw pattern).

**Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
**Code:** `lib/creator-growth.ts` · `lib/creator-level-gates.ts` · `components/apps/content/ContentWorkspaceTabs.tsx`

## Persona labels

| Level | Label | Default tab |
|-------|-------|-------------|
| L1 | Explorer | Plan |
| L2 | Maker | Create |
| L3 | Publisher | Publish |
| L4 | Brand | Engage |
| L5 | Studio | Analytics |

## FRE intent

Creator FRE asks **"What best describes you right now?"** — maps to `growthIntent` → `growthLevel` on save.

Settings → Appearance → **Creator Claw growth level** overrides FRE for demos and QA.

## QA

```bash
npm run qa:creator-levels
npm run qa:creator-checklist
```

## Agent workspace

`/etc/curxor/agent-workspace/my-content-creator/` — `SOUL.md`, `TOOLS.md`, `HEARTBEAT.md`, `skills/*.md`

Dev seed: `scripts/dev-qa/agent-workspace/my-content-creator/`
