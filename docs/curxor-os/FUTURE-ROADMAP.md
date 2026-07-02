# CurXor OS — Future Roadmap (ideas capture)

> **Room:** Vision & Strategy — **capture and structure ideas** · **no build** in this chat  
> **Build-ready / scoped (G1–G3):** [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md) — use that room for sprint order and handoffs  
> **Dream state:** [DREAM-STATE-OVERVIEW.md](./DREAM-STATE-OVERVIEW.md)  
> **Shipped history:** [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md)  
> **Owner:** Ankur (what matters) · CTO agent (structure + gates)  
> **Last updated:** July 2026

---

## How to use this doc

1. **Capture** — drop raw ideas under a lane; one idea = one block.
2. **Gate** — every idea needs a **trigger** (G0–G4).
3. **Scope** — when outcome + waves are clear, mark **scoped**.
4. **Promote** — scoped **G1–G3** work moves to [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md) for sprint order and build-chat handoff.
5. **Hand off** — execution only in **Agent build chats** · mark `handed-off` in CURRENT doc.

### Idea block template

```markdown
### [IDEA-XXX] Short title
- **Lane:** A–H (see lanes)
- **Priority:** P0 · P1 · P2 · P3
- **Trigger gate:** G0–G4
- **Outcome:** One sentence — done when…
- **Notes:** Dependencies · honest GTM · out of scope
- **Status:** captured | scoped | handed-off | shipped | dropped
```

### Build gates (reference)

| Gate | Meaning | Unlocks |
|------|---------|---------|
| **G0** | Dev `pre-unbox:gate` green | Bug fixes only |
| **G1** | On-device `qa-smoke` pass | Appliance fixes · golden-path docs |
| **G2** | **v1.0.0** tagged | OTA · runtime BP5 · HS/FC/OL — see **CURRENT** |
| **G3** | Appliance demo captures | Storefront · Loop UI · Patron Link MO0 |
| **G4** | Operator UAT smile | Tier C depth · Estate/Learn · SIG · rebrand |

**Current state:** G1 ✓ · **G2 in progress** — see [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md).

---

## Future programs (G4+ · and G3 items not yet in CURRENT)

| Program | ID | P | Gate | Spec |
|---------|-----|---|------|------|
| Signal AI Device Hub | **SIG** | P2 | G4 | [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md) |
| Display / VR surfaces | **AD** | P2 | G4+ | [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md) |
| Master AI horizontal | **MA-COS** | P2 | G4 | [PATRON-CHAT-UI.md](./PATRON-CHAT-UI.md) |
| Vital Insurance / Medicare | **VT-IN** | P2 | G4 | § [IDEA-E09](#idea-e09-vital--insurance--medicare-extension) |
| Estate Claw | **ES** | P2 | G4 | § [IDEA-ES0](#idea-es0-estate-claw--legal--property--tax) |
| Learn Claw | **LR** | P2 | G4 | § [IDEA-LR0](#idea-lr0-learn-claw--tutor-desk) |
| Tier C unlock | **TC** | P2 | G4 | IDEA-E01–E04 |
| Claw Commons / Clawverse | **CL** | P3 | G4→G5 | [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) |
| Gamer Claw depth | **GM** | P2 | G4+ | [GAMER-CLAW-VISION.md](./GAMER-CLAW-VISION.md) · GM1–GM8 |
| Forge Fusion v1 | **FF** | P2 | G4 | [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md) · FF2–FF5 |
| Inter-Claw full matrix | **HS** | P1 | G4–G5 | [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md) · H5–H6 |
| Firecrawl depth | **FC** | P1 | G4 | [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md) · FC5–FC6 |
| Grok depth | **GK** | P2 | G4 | GK5–GK6 |
| Compute ladder Pro/Studio | **HW** | P2–P3 | G4+ | [COMPUTE-LADDER.md](./COMPUTE-LADDER.md) · HW2–HW3 |
| GTM film full cut | **GTM-FILM** | P2 | G4 | FILM3 · SIG reveal |

**Active now (G1–G3):** all scoped sprint work → [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md).

---

## Lanes

| Lane | What belongs here |
|------|-------------------|
| **A — Hardware & golden path** | Install, ROCm, mesh, OTA, factory image |
| **B — Build Plane** | Cursor Bridge runtime · post-BP7 |
| **C — Claw Cafe & Master AI** | Spatial, ascension, patron, device arc |
| **D — Flagship claws** | Work · Creator · Capital · Forge depth |
| **E — Tier C** | Arbitrage · Signal · Swarm · Vital · Estate · Learn |
| **F — OS shell & infra** | FRE · Settings · CCP · security · CI |
| **G — GTM & storefront** | Copy · captures · pricing · founder page |
| **H — Strategic** | Custom hardware · partners · multi-year north star |
| **U — Universal OS** | [UNIVERSAL-OS-LAYER.md](./UNIVERSAL-OS-LAYER.md) |

---

## Captured ideas (future · not in CURRENT queue)

### A — Hardware

#### [IDEA-A04] Appliance exit-demo re-capture (G3 polish)
#### [IDEA-A05] On-box local display / kiosk polish (G4)

### B — Build Plane

#### [IDEA-B08] Delegation verify sub-loop (maker-checker) · after BP5 · G2+ captured

### C — Claw Cafe & Master AI

#### [IDEA-C01] Pixel sprite art pass · G3
#### [IDEA-C02] Master AI patron brief depth · G2 captured · content not shell
#### [IDEA-C03] Physical Claw dock zone (vision mesh) · G1 + cameras
#### [IDEA-C04] Infinity → device orchestration arc · G4 · multi-year
#### [IDEA-C06] VR Cafe — Meet Your Claws · G4+ · [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)
#### [IDEA-C07] Chief of Staff · Program **MA-COS** · G4+ · scoped

### D — Flagship

#### [IDEA-D05] Capital social alpha · G4 · [SOCIAL-ALPHA-BUILD-PLAN.md](../capital-claw/SOCIAL-ALPHA-BUILD-PLAN.md)

### E — Tier C (frozen until G4)

#### [IDEA-E01] Tier C unlock sequencing · scoped · G4
#### [IDEA-E02] Arbitrage commerce bridge · G4
#### [IDEA-E03] Swarm robotaxi live pairing · G4+
#### [IDEA-E04] Vital / Kin production orchestration · G4
#### [IDEA-E05] Signal AI Device Hub · Program **SIG** · scoped · G4+
#### [IDEA-E06] Smart home hub bridges · SIG4 · G4+
#### [IDEA-E07] Gamer Claw · GM1+ · G4+
#### [IDEA-E08] Patron Link MO2+ · G4+
#### [IDEA-E09] Vital Insurance / Medicare · Program **VT-IN** · scoped · G4+

#### [IDEA-ES0] Estate Claw — Legal · Property · Tax · scoped · G4

| Wave | Scope | Gate |
|------|-------|------|
| **ES0** | Route, FRE, 3 tabs, demo vault | G4 |
| **ES1** | Legal lane | G4+ |
| **ES2** | Property + Tax | G5 |

#### [IDEA-LR0] Learn Claw — tutor desk · scoped · G4

| Wave | Scope | Gate |
|------|-------|------|
| **LR0** | Shell + Kin learner picker | G4 |
| **LR1** | Curriculum + Cafe XP | G5 |

### F — OS shell

#### [IDEA-F01] Settings gamification label rename · G1 · P3
#### [IDEA-F03] LAN auth coverage audit · G2 captured
#### [IDEA-F13] Frontier spend observability · G2 captured

### G — GTM

#### [IDEA-G01] Appliance screenshot on storefront · G3 captured
#### [IDEA-G03] Founder page build-out · G3
#### [IDEA-G04] Claw Cafe rebrand decision · G4
#### [IDEA-G06] Forge Fusion FF2–FF3 · G4 · scoped
#### [IDEA-G07] Operate roster Estate + Learn · G4 · scoped
#### [IDEA-G09] GTM-ECON-02 API→OSS narrative · G3 deck · G4 storefront
#### [IDEA-G10] GTM-LIVE-01 honest appliance live status · G3+
#### [IDEA-G14] Operator Forum · G3 MVP · G4 mod · Program **CL**

### H — Strategic

#### [IDEA-H01] Custom branded hardware fundraise · G4+ traction
#### [IDEA-H02] Cursor / builder strategic optionality · G4+
#### [IDEA-H03] Master AI on personal server (device graph) · G4+ · years out
#### [IDEA-H04] Claw Commons / Clawverse · G4–G5 · Program **CL**
#### [IDEA-H05] Compute Ladder Pro/Studio · HW2–HW3 · G4+ · [COMPUTE-LADDER.md](./COMPUTE-LADDER.md)

---

## Parking lot (unscoped)

| Date | Idea | Notes |
|------|------|-------|
| Jun 2026 | HS: handshake streak badge | Post H3 delight |
| Jun 2026 | HS: Capital×Arbitrage arm-wrestle | Cafe easter egg |
| Jun 2026 | HS: couples / teen paths | Kin guardrails |
| Jun 2026 | FC: Firecrawl Agent autonomous gather | G4+ · high credit burn |
| Jun 2026 | GK: Skill Pack marketplace UI | After GK3 |
| Jun 2026 | AD: Quest native · VR Architect room | G5+ |
| Jun 2026 | SIG: Matter on eno1 · Home Assistant | SIG4 stretch |
| Jun 2026 | GM: Epic · Discord Rich Presence | GM6+ |
| Jun 2026 | BP: ACP adapter for Build workers | Post BP7 |
| Jun 2026 | GTM-FILM director's cut | G4 · after SIG desk truth |

---

## Dropped / rejected (keep honest)

| ID | Candidate | Disposition |
|----|-----------|-------------|
| **REJ-01** | Outreach split from Work | Rejected — Engage → Creator |
| **REJ-02** | Chief of Staff claw | **Redirected** → MA-COS on Master AI patron |
| **REJ-03** | Insurance / Medicare claw | **Redirected** → VT-IN Vital extension |
| **REJ-04** | Fundraise / IR claw | Rejected |
| **REJ-05** | RE + Tax + Legal as three claws | **One Estate Claw** three lanes |

### Target operate ten (when OL-Kin + ES/LR ship)

| # | Claw | Role |
|---|------|------|
| 1 | Capital | Wealth · markets |
| 2 | Work | Outbound · pipeline |
| 3 | Creator | Publish · Engage inbox |
| 4 | Arbitrage | Commerce · margin |
| 5 | Vital | Longevity · + VT-IN (G4+) |
| 6 | **Learn** | Tutor · uses Kin mapper |
| 7 | Gamer | Play · stream · make |
| 8 | Swarm | Fleet orchestration |
| 9 | Forge | Mint · fusion |
| 10 | **Estate** | Legal · Property · Tax |

**Universal (not in ten):** Claw Cafe · Signal · **Kin** (mapper) · Patron Link.

---

## Changelog

| Date | Change |
|------|--------|
| Jul 2026 | **Split:** scoped G1–G3 → [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md) · this doc = future capture only |
| Jul 2026 | G2 build queue moved to CURRENT · G1 closed 2026-07-01 |
| Jun 2026 | Program CL · HS · FC · GK · SS · MA-COS · OL roster lock |

---

## References

- **Current / build-ready:** [CURRENT-ROADMAP.md](./CURRENT-ROADMAP.md)
- Shipped: [DAY-ONE-BUILD-PLAN.md](./DAY-ONE-BUILD-PLAN.md)
- Universal map: [UNIVERSAL-OS-LAYER.md](./UNIVERSAL-OS-LAYER.md)
- Claw Commons: [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md)
- Signal: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
- Cafe north star: [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
