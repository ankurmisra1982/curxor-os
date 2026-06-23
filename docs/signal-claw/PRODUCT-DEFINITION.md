# Signal Claw — Product Definition

**Status:** Preview module (Tier C) · Humanoid Home Hub shipped in software · hardware pairing pending  
**Route:** `/optimus` · **Appliance ID:** `tesla-optimus-engine`  
**Display name:** Signal Claw · **Workspace title:** Humanoid Home Hub

---

## North star

Signal Claw is the **neural link between your sovereign appliance and the humanoid (and later, other robots) in your home.**

Primary job today (preview):

1. **Instruct** — house rules, routines, safety boundaries  
2. **Pass knowledge** — package Kin, Vital, and relationship context via CCP  
3. **Relate** — name, tone, guest mode, how the robot addresses the operator  

Secondary (horizon): ambient world context feeds digital Claws; future humanoids may react to home-relevant signals.

---

## One Claw, five tabs

| Tab | Purpose |
|-----|---------|
| **Home** | Setup journey, neural link readiness, relationship |
| **Fleet** | Multi-robot unit list + **pair-day wizard** (preview) |
| **Knowledge** | Kin-aware policies, house rules, pair-day audit, push to robot memory |
| **Routines** | Instruction templates + NL compose · armed for pair day |
| **Control** | Motor mesh preview for humanoid-class hardware |

Robot kinds: `humanoid` · `mobile` · `arm` · `custom` (up to 6 units)

### Pair-day wizard (preview)

Simulated flow: **Discover** (BLE + mesh scan) → **Safety** → **Load knowledge** → **Mesh handshake** → **Finish preview pair**

Marks unit `paired_preview` and completes setup step `pair_hardware`. Live motion remains hardware-gated.

---

## Data & API

| Store | Path | Role |
|-------|------|------|
| Humanoid hub | `humanoid-hub.json` | Units, rules, routines, relationship |
| CCP hardware | claw-context mesh | `humanoid.knowledge`, `optimus.status` |
| CCP family | claw-context mesh | `humanoid.policies` (Kin-aware per-member) |
| Kin / Vital | existing stores | Upstream context |

`GET/POST /api/humanoid/hub` — `sync_knowledge`, `add_rule`, `update_kin_policy`, `knowledge_audit`, `compose_routine`, fleet/pair actions, etc.

Skills: **Push Knowledge**, **Sync Context** → publish hub package to mesh.

---

## Preview honesty

- No live humanoid motion or pair handshake in this release  
- Control tab = mesh demo only  
- “Notify when live” = local flag  
- Coming Soon badge + preview system prompt  

---

## References

- GTM demo: [EXIT-DEMO.md](./EXIT-DEMO.md)  
- Kin integration: [../guides/17-kin-claw-family.md](../guides/17-kin-claw-family.md)  
- CCP: [../guides/15-claw-context-protocol.md](../guides/15-claw-context-protocol.md)
