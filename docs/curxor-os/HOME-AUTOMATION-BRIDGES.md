# Home Automation — Signal Claw Bridges (ideas capture)

> **Parent:** [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md) — all AI devices live in Signal  
> **Roadmap:** Program **SIG** · wave **SIG4** (home + voice) in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Status:** scoped · **Last updated:** June 2026

---

## One-line vision

**Signal Claw orchestrates your smart home** — Alexa, Apple Home, Google Home, and Samsung SmartThings — from the same sovereign appliance as robots, glasses, and VR. Operator-owned scenes and Claw-triggered automations; **eno2** gates every cloud hub call.

Not a replacement for those ecosystems — a **neutral conductor** that speaks their APIs (and **Matter** locally where possible).

---

## Device-class model

| Layer | `deviceClass` | Examples |
|-------|---------------|----------|
| **Smart home hub** | `smart_home_hub` | Alexa account · Google Home · Apple Home (Matter/HomePod) · SmartThings |
| **Smart endpoint** | `smart_home` | Light · lock · thermostat · plug · camera (via hub or Matter) |
| **Voice surface** | `voice` | Echo · HomePod · Nest speaker · Galaxy Home — overlaps hub; one Fleet row per physical speaker |

Hubs appear in **Signal Fleet** as linkable accounts; endpoints appear as controllable devices under that hub.

---

## Platform strategy (honest)

| Ecosystem | CurXor bridge (v1 target) | Path | Sovereignty note |
|-----------|---------------------------|------|------------------|
| **Amazon Alexa** | Smart Home Skill + LWA OAuth | eno2 → Alexa APIs | Cloud · BYOK · unplug eno2 stops |
| **Google Home** | Home Graph / Assistant · OAuth | eno2 → Google APIs | Cloud · same |
| **Apple Home** | **Matter** on LAN + HomePod via shortcuts/TTS | eno1 Matter · eno2 for Siri cloud if needed | **Prefer Matter** on Command Port — no Apple cloud for accessory control |
| **Samsung SmartThings** | SmartThings API + Matter hub | eno2 API · local Matter if hub on LAN | Mixed |

**Matter (long-term sovereign path):** CurXor as **Matter controller** on eno1 — accessories talk on LAN; hubs become optional. Document as SIG4 stretch / SIG7.

**We do not claim:** "Works offline with Alexa/Google" — those require cloud except cached scenes with honest labeling.

---

## Architecture

```text
Claw / routine / Master AI (confirm)
    → engine tool: home.scene_run | home.device_set
    → ZMQ digital_out
    → HomeBridgeWorker(s) on eno2 (and MatterBridge on eno1 LAN)
    → Alexa / Google / SmartThings cloud  OR  Matter accessory (local)
    → receipt → digital_in → Cafe event · CCP hardware.smart_home.*
```

Parallel: **voice** TTS/announce on HomePod/Echo via hub bridge (`home.announce`).

Credentials in `/etc/curxor/digital.env` — same pattern as [12-digital-action-layer.md](../guides/12-digital-action-layer.md).

---

## Signal workspace

| Area | Home automation |
|------|-----------------|
| **Fleet** | Linked hubs (Alexa, Google, Apple/Matter, SmartThings) + endpoint count |
| **Routines** | Renamed scope: **Routines & Home** — robot instructions + scenes + schedules |
| **Knowledge** | House rules include **home policies** (which Claws may run which scenes) |
| **Home** tab | Mesh readiness + **hub link status** summary |
| **Control** | Quick scene test (preview) — confirm before live |

**New skill (future):** `link_home_hub` · `run_scene` · `announce_home` · `sync_devices`

---

## Kin & safety (non-negotiable)

| Rule | Implementation |
|------|----------------|
| Locks / garage / alarm | **Always confirm** — no silent unlock from agent |
| Kid profiles | Scenes only · no security devices |
| Guest mode | Limited scenes · no hub admin |
| Room assignment | Kin member → default room group for announcements |
| Audit | Every mutating home action in agent audit log |

---

## Claw → home automation paths

| Source | Scene / action | Example |
|--------|----------------|---------|
| **Vital** | Bedtime protocol | Dim lights · thermostat · HomePod brief |
| **Kin** | Arrival / guest | Welcome scene · porch light |
| **Signal** | Robot routine + home | "Dinner mode" when humanoid enters kitchen zone |
| **Work** | Meeting starting | Office focus scene + announce |
| **Cafe** | Ascension milestone | Fun light pulse (opt-in) |
| **OS brief** | Morning | Lights + weather on HomePod |

**Program HS Discover:** *"Your morning brief could run as a Good Morning scene — link Apple Home in Signal."*

---

## SIG4 waves (home + voice)

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **SIG4a** | Hub link UI · OAuth stubs · Fleet hub rows (preview) | G4 | Four hub cards · honest Coming Soon |
| **SIG4b** | **Google Home** + **Alexa** bridge workers (scene + device read) | G4+ | One scene fires with receipt on eno2 |
| **SIG4c** | **SmartThings** bridge | G4+ | Device list sync |
| **SIG4d** | **Apple Home** via Matter LAN controller (stretch) | G4+ | One Matter light on eno1 |
| **SIG4e** | Voice announce (`home.announce`) on linked speakers | G4+ | TTS brief on one speaker |
| **SIG4f** | Claw triggers with confirm (Vital bedtime, Kin guest) | G5 | Audit log |

---

## GTM honesty

| Claim | When |
|-------|------|
| "Signal links your smart home hubs" | SIG4a+ preview |
| "Run scenes from CurXor via Alexa/Google" | SIG4b+ verified |
| "Apple Home via Matter on your LAN" | SIG4d+ |
| "Replaces Alexa / Google / Apple apps" | **Never** |
| "Works with eno2 unplugged" | **Only** local Matter scenes — label clearly |

**BYOK:** Operator's existing hub accounts · CurXor does not bundle cloud subscriptions.

---

## Cafe spatial

**Smart home station** — lightbulb / thermostat sprite; pulses when scene runs; handshake with Kin or Vital when cross-claw home routine completes.

---

## Parking lot

| Idea | Notes |
|------|------|
| Home Assistant bridge | Power-user local · eno1 peer |
| IFTTT / webhooks | Generic egress |
| Thread border router on MS-S1 | Hardware horizon |
| Energy / solar (Capital) | Scene when grid price spikes |

---

## References

- Signal hub: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
- Digital layer pattern: [12-digital-action-layer.md](../guides/12-digital-action-layer.md)
- Kin household: [17-kin-claw-family.md](../guides/17-kin-claw-family.md)
- Matter: https://csa-iot.org/all-solutions/matter/
