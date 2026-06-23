# Kin Claw — Growth Leveling Build Plan

> **Audience:** L1–L4 core (Member → Steward) · L5 scaffolded  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Status:** Tier C preview + leveling UX shipped on dev · production orchestration deferred

## North star

Kin Claw is the **household context hub** — not a smart-home control panel on day one:

1. **Member** — one profile, traits, scopes on-box  
2. **Helper** — partner/roommate; channel handles + device bind  
3. **Coordinator** — mesh visibility; who reads family scope on CCP  
4. **Steward** — household defaults, child profiles, waitlist flag  
5. **Elder** — multigenerational delegation with Optimus guest mode (future)

Honest preview: profiles + CCP sync work locally; full device orchestration ships with Signal/Optimus family mode.

---

## Workspace tabs

| Tab | Min level | Panels |
|-----|-----------|--------|
| Members | L1 | Selector, add member |
| Profile | L1 | Role, traits, scopes; handles at L2+ |
| Devices | L2 | Bind phone/watch/robot (local registry) |
| Mesh | L3 | Kin publishes + subscribed Claws, resync |
| Settings | L4 | FRE defaults, notify-when-live stub |

**Code:** `components/apps/kin/*` · `lib/kin-level-gates.ts` · `MyFamilyApp.tsx`

---

## Persona matrix

| Level | Label | FRE intent | Default tab |
|-------|-------|------------|-------------|
| L1 | Member | `solo_member` | Members |
| L2 | Helper | `helper_roommate` | Profile |
| L3 | Coordinator | `household_coordinator` | Mesh |
| L4 | Steward | `family_steward` | Settings |
| L5 | Elder | `multigen_elder` | Settings |

---

## Tier C contract (preview)

- **Coming Soon** badge in header + FRE + expert nav suffix  
- Agent system prompt includes `previewAgentPromptBlock`  
- No Go Live · no mock smart-home pipelines  
- `notifyWhenLive` local flag on Settings tab  

Shared: `lib/claw-preview-apps.ts`

---

## QA

```bash
npm run qa:kin-levels
npm run qa:smoke
```

Settings → Appearance → **Kin Claw growth level** overrides FRE for demos.

---

## Next waves (post-preview)

- Role/scope editor per member (L4+)  
- Optimus guest-mode integration when Signal Claw exits preview  
- Claw Cafe XP from cross-member habits  
- Vital ↔ Kin scope negotiation UI
