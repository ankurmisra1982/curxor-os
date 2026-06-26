# Augmented Display & VR Overlays — Vision (ideas capture)

> **Parent:** Signal Claw is the hub for **all AI devices** — [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)  
> **This doc:** Glance · **VR** · Ambient **surface** detail under Signal **Overlays** tab  
> **Roadmap:** Program **SIG** (umbrella) · **AD** waves (surfaces) in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Last updated:** June 2026 · **Status:** scoped

---

## Terminology (VR vs VT vs XR)

| Term | Meaning in CurXor docs |
|------|------------------------|
| **VR** | **Virtual reality** — immersive headsets (Quest, Vision Pro in immersive mode). **Use this label.** |
| **VT** | Old internal shorthand — meant **VR**, not a separate surface. Docs now say VR only. |
| **XR** | Industry umbrella (VR + AR + MR). Fine in GTM; code uses `glance` vs `vr` for clarity. |
| **Glance** | **Not VR** — see-through AR **glasses** with a small display (Ray-Ban Display, Snap SPECS). Peripheral HUD, not full immersion. |

**Vision Pro** is spatial computing: passthrough AR *and* immersive VR-style rooms — we route both through the **`vr`** device class + WebXR / spatial web. **Quest** is primarily VR. **SPECS** is AR glasses (glance class), not VR.

---

## One-line vision

**Glance** (AR glasses) · **VR** (immersive headset) · **Ambient** (room screen) are **output channels** inside **Signal Claw** — not separate products. Same compositor, Kin policy, and Cafe stations as every future AI device class.

| Surface class | Devices | CurXor job |
|---------------|---------|------------|
| **Glance** | Meta Ray-Ban Display · Snap SPECS · future AR glasses | Peripheral cards, tickers, briefs |
| **VR (immersive)** | **Apple Vision Pro** · **Meta Quest** · future XR headsets | Spatial panels, rooms, Claw Cafe portal |
| **Ambient** | TV · tablet · kiosk (web) | Shared household glances |

Compose, schedule, and push from the appliance — Kin-aware per wearer. **Not Claw #11.**

---

## Market context (June 2026)

### Glance surfaces (wearable displays)

| Device | Status | Developer path | Price signal |
|--------|--------|----------------|--------------|
| **[Meta Ray-Ban Display](https://developers.meta.com/blog/build-for-display-glasses/)** | Shipping · display dev preview | Wearables **Device Access Toolkit** — native **or Web Apps** (URL to glasses) | ~$800 |
| **[Snap SPECS](https://newsroom.snap.com/introducing-specs-augmented-reality-glasses)** | Pre-order · fall 2026 | Lens Studio · agentic build in **Cursor** | $2,195 |
| **Meta Orion** | Prototype | No public SDK | — |

### VR surfaces (immersive headsets)

| Device | Status | Developer path | Price signal |
|--------|--------|----------------|--------------|
| **[Apple Vision Pro](https://developer.apple.com/visionos/)** | Shipping · visionOS 27 spatial web | **Safari spatial web** — `<model>` · `requestImmersive` · Web Environments · **WebXR** for full apps | ~$3,499+ |
| **[Meta Quest](https://developers.meta.com/horizon/)** | Quest 3 / 3S shipping | **Horizon OS** — **WebXR** · PWA in browser · native Horizon apps | ~$299–$499 |
| **visionOS native app** | Optional horizon | SwiftUI + RealityKit | Defer — web-first on CurXor |

**Unified CurXor angle:** Host **one compositor** on the appliance; render **Glance** (2D HUD) or **VR** (spatial web / WebXR room) from the same overlay lanes. Operator owns policy; devices are **output**, not brain.

**Cafe killer app for VR:** **Meet your Claws in VR** — step through the portal arch into `/display/cafe`, walk the same pixel room in Vision Pro / Quest, inspect Claws at their stations, and watch **handshake ceremonies** (bro-hug, brightness, XP) in immersive space. Full vision: [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md).

---

## Architectural recommendation: within Signal Claw (locked)

**Signal = AI Device Hub.** Glance / VR / Ambient are **device classes** in the registry — see [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md).

| Option | Verdict |
|--------|---------|
| **A — Signal Claw (all AI devices)** | **Locked** — humanoid wave 1 · surfaces wave 2 · voice/vehicle/edge wave N |
| **B — New claw per device** | **Rejected** forever |
| **C — Creator-only overlays** | **Rejected** — Capital/Work/Vital also publish |

### Signal Claw evolution (naming)

| Today | Future subtitle |
|-------|-----------------|
| **Signal Claw** · Humanoid Home Hub | **Signal Claw** · *The Neural Link* (humanoid · glance · VR · ambient · …) |

Add a sixth workspace area — do **not** add a sixth top-level Claw:

| Area | Today | + Glance & VR |
|------|-------|----------------|
| Home | Neural link readiness | + bound surfaces summary (glasses · headsets · ambient) |
| Fleet | Humanoid / rover / arm | + **Output units** — Meta/Snap glasses · Vision Pro · Quest · web |
| Knowledge | House rules → robot | + **Overlay policies** (face · immersive · household TV) |
| Routines | Robot instruction templates | + **Glance/VR schedules** |
| Control | Motor mesh preview | Unchanged |
| **Overlays** *(new tab)* | — | **Compositor** — surface picker (Glance / VR / Ambient) · preview · publish |

**Cafe spatial (2D pixel room):**

| Device class | Cafe station |
|--------------|--------------|
| Humanoid | Yard dock |
| Glance (glasses) | Mirror / entry shelf |
| **VR (headset)** | **Portal / theater arch** — “step into Cafe” easter egg |
| Ambient (TV) | Living-room wall zone |

---

## What “customize and send content” means

Three layers — mirror how humanoids get **Knowledge** vs **Routines** vs **Control**:

| Layer | Glance analog | VR analog | Example |
|-------|---------------|-----------|---------|
| **Compose** | 2D overlay editor | **Spatial layout** — panels, volumes, USDZ scene | Capital ticker · **Cafe room in VP** |
| **Schedule** | Glance routine | **VR session** — morning brief in immersive panel | 7am Vital · 9am OS brief floating in space |
| **Push** | Live toast on glasses | **Live spatial update** — rule fire → volumetric alert | Kin guest → welcome panel in Quest |

**Content is not video ads.** Operator-owned output from Claws they trust.

---

## Platform bridge strategy (honest)

```text
                    ┌─────────────────────────────┐
                    │  CurXor MS-S1 (sovereign)    │
                    │  Overlay compositor + policy │
                    │  CCP · Kin · Cafe event bus  │
                    └──────────────┬──────────────┘
                                   │
     ┌─────────────┬───────────────┼───────────────┬─────────────┐
     ▼             ▼               ▼               ▼             ▼
 Meta Web      Snap Lens      Vision Pro       Meta Quest    LAN preview
 (glance URL)  (SPECS)        (spatial web)    (WebXR/PWA)   (2D + WebXR)
```

### Glance bridges

| Platform | v1 bridge | eno path | Notes |
|----------|-----------|----------|-------|
| **Meta Ray-Ban Display — Web App** | `https://<eno1>:3080/display/glance/{laneId}` | eno1 + phone relay | **Fastest AD wave** |
| **Snap SPECS — Lens** | Lens Studio + publish path | eno2 | Preview until hardware |
| **Generic glance** | Web component in Overlays tab | eno1 | QA without device |

### VR bridges (Vision Pro · Quest)

| Platform | v1 bridge | eno path | Notes |
|----------|-----------|----------|-------|
| **Apple Vision Pro — Spatial Web** | Host `https://<eno1>:3080/display/vr/{sceneId}` — Safari on visionOS: `<model src="*.usdz">` + [`requestImmersive`](https://developer.apple.com/videos/play/wwdc2026/320/) | eno1 LAN | **No visionOS app required** for v1 · Web Environments on by default (visionOS 27) |
| **Apple Vision Pro — WebXR** | Same origin WebXR room · full Claw status panels | eno1 | Heavier · for Cafe portal AD7 |
| **Meta Quest — WebXR / PWA** | Same URL in Quest browser · WebXR session to appliance | eno1 Wi‑Fi | Quest on same LAN as Command Port |
| **Meta Quest — Horizon native** | Defer | — | Partner / G4+ only |

**One URL family, two renderers:**

```text
/display/glance/{id}   → 2D HUD templates (glasses, phone, TV)
/display/vr/{id}       → spatial web + WebXR (Vision Pro, Quest)
/display/cafe          → immersive Claw Cafe mirror (VR flagship experience)
```

**Sovereignty:** Compositor on box. Headsets load from **your** eno1 IP — not a CurXor cloud CDN. Phone/relay paths labeled honestly where required.

---

## Content model (future schema)

```ts
type DisplaySurface = "glance" | "vr" | "ambient";

type DisplayVendor =
  | "meta_rayban_display"
  | "snap_specs"
  | "apple_vision_pro"
  | "meta_quest"
  | "web_preview"
  | "ambient_tv"
  | "generic";

interface DisplayUnit {
  id: string;
  vendor: DisplayVendor;
  surface: DisplaySurface;
  displayName: string;
  wearerProfileId: string | null; // Kin — null for household ambient
  status: "awaiting_pair" | "paired_preview" | "live" | "offline";
}

interface OverlayLane {
  id: string;
  title: string;
  priority: number;
  surface: DisplaySurface;
  sourceClaw: OotbAppId;
  template:
    | "ticker" | "card" | "list" | "image" | "brief"
    | "spatial_panel" | "immersive_scene" | "cafe_portal" | "webxr_room";
  payload: Record<string, unknown>;
  kinScope: "operator" | "member" | "household";
  spatialAssets?: { usdzUrl?: string; webxrManifest?: string };
}

interface GlanceSchedule {
  id: string;
  cron: string;
  laneIds: string[];
  targetUnitIds: string[];
  enabled: boolean;
}
```

**CCP keys:** `hardware.display.units.*` · `hardware.display.active_lane.*` · `hardware.vr.scene.*` · publish via **Push Glance** / **Push VR** skills.

---

## Claw → surface content paths

| Source Claw | Glance | VR (immersive) | Trigger |
|-------------|--------|----------------|---------|
| **Capital** | Ticker toast | Floating portfolio panel | Rule fire (confirm) |
| **Work** | Next meeting card | Spatial calendar board | Calendar / pipeline |
| **Creator** | Thread teaser | Immersive draft preview wall | Publish / schedule |
| **Vital** | Hydration nudge | Protocol checklist panel | Timer |
| **Kin** | Who's home card | Per-member labels in VR room | Presence |
| **Cafe** | Streak toast | `/display/cafe` portal in Vision Pro / Quest | XP / inspect |
| **OS brief** | Morning glance | Immersive multi-claw brief room | Scheduler |
| **Signal** | Pair status | Fleet command wall in VR | Fleet change |

**Discover (Program HS):** "Your Cafe room in Vision Pro — try VR portal." · "Rule wins as a glasses ticker."

---

## Kin-aware overlays (non-negotiable)

| Principle | Implementation |
|-----------|----------------|
| **Per-wearer policy** | Kid → no Capital tickers · Vital-only · **no immersive VR without parent unlock** |
| **Guest mode** | Signal guest rules extend to display — minimal glances |
| **Consent** | First pair → FRE step: what Claws may push to face or headset |
| **Opt-out** | Settings → disable glance/VR push per Claw |

Same fiction as Optimus “how the robot addresses each person” — applied to **what appears in peripheral vision or immersive space**.

---

## Cafe & Master AI

| Event | Cafe behavior |
|-------|---------------|
| First output unit paired | Mirror sprite (glance) or **portal arch** (VR) · +XP |
| Cafe portal opened in Vision Pro / Quest | **Meet your Claws** — patron avatar · major ceremony · [VR-CAFE-MEETINGS](./VR-CAFE-MEETINGS.md) |
| Cross-claw handshake | **VR ceremony** — bro-hug · brightness · HS-H3 in space (AD9) |
| G5+ | Master AI suggests glance or VR bundle — confirm before push |

**Infinity arc:** Glance → VR portal → humanoid motion — escalating embodied trust.

---

## Build Plane synergy

| Partner | Synergy |
|---------|---------|
| **Snap SPECS** | Lens Studio **agentic dev in Cursor** — Build Plane publishes Lens scaffold; operator approves |
| **Meta** | Web App + WebXR starter · Cursor |
| **Apple** | Spatial web templates (`model` + `requestImmersive`) · optional visionOS native later |
| **Forge** | Custom glance pack **or** VR scene pack for vertical |

Program **GK** (Grok marketplace SHA-pin) + **AD** (display packs) share Forge Skill Pack catalog shape.

---

## AD waves

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **AD1** | Overlays tab · `display-hub.json` · **2D web preview** (glance + vr layout modes) | G4 | Compose card · preview in browser |
| **AD2** | Meta Ray-Ban **Web App** glance URL on appliance | G4 | Dev pairing doc |
| **AD3** | Push Glance · CCP `hardware.display.*` · Kin policy | G4 | Vital nudge in compositor |
| **AD4** | Schedules + OS morning brief (glance + optional VR panel) | G4+ | Cron + receipt |
| **AD5** | Snap SPECS Lens scaffold | G4+ | Honest preview |
| **AD6** | Live Claw triggers with confirm | G5 | Audit log |
| **AD7** | **VR portal** — `/display/cafe` loads · Cafe room in **Vision Pro Safari** + **Quest WebXR** on LAN | G4+ | Room mirrors live `cafe-state` in headset |
| **AD8** | **Meet Claws** — proximity inspect · patron menu · spatial activity panels | G4+ | Walk to one Claw · real XP inspect · [VR-CAFE-MEETINGS](./VR-CAFE-MEETINGS.md) |
| **AD9** | **VR ceremonies** — handshake bro-hug · brightness · Discover paths · OS brief room | G5 | HS ceremony visible in WebXR |
| **AD10** | **Shared Cafe** — two household patrons (LAN / SharePlay stretch) | G5+ | Honest preview |

**Not before G4:** Same gate as Tier C — preview until appliance UAT.

**VR sequencing:** AD1 includes VR **layout mode** in compositor (design now) · **AD7** ships when hardware available (Vision Pro / Quest on same LAN).

---

## GTM honesty

| Claim | Allowed when |
|-------|--------------|
| “Humanoid Home Hub preview” | Today (Signal Tier C) |
| “Compose glances & VR scenes” | AD1+ · Coming Soon |
| “Meta Ray-Ban Display” | AD2+ verified |
| “Snap SPECS” | AD5+ |
| “Apple Vision Pro / Meta Quest via spatial web” | AD7+ · same-LAN appliance URL |
| “Native visionOS / Horizon app in box” | **Not v1** — web-first |
| “Replaces Lens Studio / Meta / Apple SDKs” | **Never** |

**Price story:** CurXor $3,999 · **all headsets BYO** (Vision Pro ~$3,499 · Quest ~$299 · SPECS ~$2,195 · Ray-Ban Display ~$800).

---

## vs Optimus · Glance · VR (parallel pattern)

| Dimension | Humanoid | Glance (glasses) | VR (Vision Pro · Quest) |
|-----------|----------|------------------|-------------------------|
| Device class | `humanoid` · `mobile` · `arm` | `meta_display` · `snap_specs` | `apple_vision_pro` · `meta_quest` |
| Primary action | Instruct · motor | 2D push to face | Spatial panels · immersive rooms |
| Hub tab | Knowledge + Control | **Overlays** (glance mode) | **Overlays** (VR mode) |
| Pair wizard | BLE/mesh | Meta dev / SPECS dev | **LAN URL bind** — Safari / Quest browser → eno1 |
| Cafe zone | Yard dock | Mirror shelf | **Portal arch** |
| Risk | Physical motion | Privacy · attention | **Immersion + child gates** stricter |

---

## Parking lot

| Idea | Notes |
|------|-------|
| In-car HUD (Swarm) | `vehicle_hud` · glance surface |
| Room TV ambient | `ambient_tv` surface |
| visionOS native CurXor app | Post web-first AD7 |
| Quest Horizon store listing | Partner horizon |
| SharePlay / multi-user VR Cafe | Moved to **AD10** — [VR-CAFE-MEETINGS](./VR-CAFE-MEETINGS.md) |
| EMG / neural band | Meta Orion horizon |

---

## References

- Meta Wearables Developer Center: https://wearables.developer.meta.com/
- Meta build for display glasses: https://developers.meta.com/blog/build-for-display-glasses/
- Snap SPECS announcement: https://newsroom.snap.com/introducing-specs-augmented-reality-glasses
- Snap developer tools: https://newsroom.snap.com/snap-launches-new-tools-for-specs-developers
- Apple visionOS spatial web: https://developer.apple.com/videos/play/wwdc2026/320/
- WebKit model element: https://webkit.org/blog/17118/a-step-into-the-spatial-web-the-html-model-element-in-apple-vision-pro/
- Meta Horizon developers: https://developers.meta.com/horizon/
- VR Cafe meetings: [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)
- Signal AI Device Hub: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
- Kin devices: [../guides/17-kin-claw-family.md](../guides/17-kin-claw-family.md)
