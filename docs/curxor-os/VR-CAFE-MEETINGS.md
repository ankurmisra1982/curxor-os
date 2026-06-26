# VR Cafe — Meet Your Claws (vision locked)

> **Parent:** [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md) · surfaces [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md) · hub [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)  
> **Roadmap:** Program **AD** · waves **AD7–AD10** in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Handshakes:** Program **HS** ceremonies in VR — [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md)  
> **Status:** scoped · **Last updated:** June 2026

---

## One-line vision

**Step through the portal and meet your Claws in person** — the same pixel Cafe you love on the dashboard, reimagined as an immersive room on Vision Pro or Quest. Walk up to Capital, hear what Work shipped, watch two Claws **bro-hug** when a handshake fires, and feel ascension milestones in space instead of on a flat screen.

This is the **emotional payoff** of ten Claws + sovereign metal: not a metaverse gimmick — **your real operator activity**, embodied.

---

## Why this matters (GTM)

| 2D Cafe (today) | VR Cafe (horizon) |
|-----------------|-------------------|
| Pixel room on `/claw-cafe` | **Same event ledger** — spatial WebXR room on `/display/cafe` |
| Click Claw → inspect flyout | **Walk to Claw** → spatial inspect panel + voice brief (opt-in) |
| Handshake toast + brightness | **Ceremony in room** — two sprites meet, XP burst, patron cheer |
| Ascension title unlock | **Threshold moment** — room transforms · Infinity door opens |
| Solo operator | **Kin horizon** — spouse walks in (AD10 · honest Coming Soon) |

**Price story:** CurXor does not sell headsets. **BYO Vision Pro or Quest** on the same LAN as the appliance — the Cafe you already earned travels with you into immersion.

---

## Experience pillars

### 1. Portal — 2D → VR continuity

```text
/claw-cafe (2D pixel room)
    → "Step into Cafe" on portal arch station (Cafe UI + Signal Overlays)
    → /display/cafe (WebXR / spatial web on eno1)
    → immersive room mirrors live cafe-state.json
```

**Rule:** No separate VR fiction. If Capital is at the ticker wall in 2D, Capital is at the ticker wall in VR. One ledger, two renderers.

### 2. Meet your Claws (proximity inspect)

Each enabled Claw = **spatial character** at its station (Work → mailbox, Creator → desk, Forge → anvil, Signal → yard dock, …).

| Action | VR behavior |
|--------|-------------|
| **Approach** | Nameplate + live activity chip (real telemetry summary — same rules as 2D bubbles) |
| **Inspect** | Floating panel: level, recent XP, **Open Claw** deep-link (opens on phone/laptop or in-headset browser pane) |
| **Patron menu** | Ascension summary · title style · gamification opt-out — patron brief chamber preview |

**Not AgentOffice-style autonomous chatter.** Claws react to **your** events; they do not LLM-roleplay each other at MVP.

### 3. Handshake ceremonies (Program HS in VR)

When Inter-Claw Handshake fires (Leverage or Discover), the 2D Cafe already celebrates. In VR:

| Ceremony | VR treatment |
|----------|----------------|
| **Bro-hug** | Two Claw avatars pathfind to center · brief animation · shared XP pulse |
| **Brightness** | Room ambient lift · streak particles |
| **Cross-claw milestone** | Patron toast in space · optional TTS one-liner (confirm · Kin kid-gate) |
| **Discover nudge** | Dotted path to suggested Claw's station · "Try Creator?" panel |

Hooks: `claw-cafe-spatial.ts` handshake → celebrate · `crossClawHandshake` in ascension · extend with `vr_ceremony` event type.

### 4. Patron presence

Operator = **playable avatar** in VR (controller / hand ray / gaze). Same fiction as 2D walk mode — you are the patron, not a disembodied camera.

**G5+:** Master AI **patron brief chamber** — scheduled immersive stand-up with multi-Claw spatial panels (overlaps AD8).

### 5. Signal & physical mesh

| Class | VR Cafe zone |
|-------|----------------|
| Humanoid / robot | Yard dock — mesh Claw sprites when vision connected |
| Glance | Mirror shelf — "what's on your face" preview volume |
| VR | **You are here** — portal arch is the easter egg origin |
| Smart home | Lightbulb shelf — scene pulse when home routine runs |

Signal Fleet changes can trigger a **fleet wall** moment in VR (optional panel).

---

## Architecture

```text
Claw apps · XP events · handshakes
    → cafe event bus (cafe-state.json)
    → CafeSpatialRenderer (2D Canvas)  |  CafeVRRenderer (WebXR scene)
    → eno1 serves /display/cafe (spatial web)
    → Vision Pro Safari · Quest WebXR browser on LAN
```

| Concern | Pattern |
|---------|---------|
| **Auth** | LAN session token · same as dashboard |
| **Policy** | Kin child profiles → **no immersive VR** without parent unlock |
| **Performance** | Web-first · low-poly / billboards for Claw characters at AD7 |
| **Offline** | Room loads from appliance · no cloud matchmaking at MVP |

---

## AD waves (VR Cafe track)

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **AD7** | **Portal loads** — `/display/cafe` · Cafe room in headset browser · portal arch in 2D | G4+ | Room mirrors live state on VP/Quest LAN |
| **AD8** | **Spatial inspect** — walk to Claw · inspect panel · patron menu in VR | G4+ | One Claw inspect with real XP data |
| **AD9** | **Meet & ceremonies** — handshake bro-hug · brightness · Discover paths in VR | G5 | HS-H3 ceremony visible in WebXR |
| **AD10** | **Shared Cafe** — two patrons same household LAN (stretch) · SharePlay horizon | G5+ | Honest preview or partner-dependent |

AD7 = *you can enter the room.* AD8 = *you can meet a Claw.* AD9 = *the room feels alive when Claws collaborate.*

---

## Claw → VR Cafe paths (Discover)

| Path | Trigger | VR outcome |
|------|---------|------------|
| **Cafe → VR** | First portal open | Major ceremony · +XP · FRE step |
| **Capital → VR** | Rule streak L3+ | Ticker wall in spatial volume |
| **Work → VR** | Pipeline win | Mailbox celebration animation |
| **Creator → VR** | Publish | Draft preview on VR wall |
| **Vital → VR** | Protocol due | Immersive protocol panel |
| **Kin → VR** | Family member binds headset | Per-member labels in room |
| **HS any** | Cross-claw handshake | Bro-hug ceremony (AD9) |

---

## GTM honesty

| Say | Don't say |
|-----|-----------|
| "Walk your Claw Cafe in Vision Pro or Quest — same room, immersive" | "Full metaverse social network" |
| "Meet the Claws you've been leveling — real activity, not fake bots" | "Claws talk to each other with AI" (not at MVP) |
| "Handshakes become ceremonies you can *see*" | "Multiplayer Cafe day one" |
| BYO headset · same LAN as CurXor | "Headset included in $3,999" |

**Child safety:** Immersive VR Cafe requires stricter Kin gates than 2D Cafe — document in AD8 acceptance criteria.

---

## Infinity arc (emotional sequence)

```text
Glance ticker on your face
    → step through portal into VR Cafe
    → handshake ceremonies as habits deepen
    → Master AI patron chamber (G5)
    → Signal humanoid walks the real yard while you watch from VR dock
```

Escalating **embodied trust** — same arc as [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md) Infinity section.

---

## Parking lot

| Idea | Notes |
|------|-------|
| visionOS native Cafe app | Post web-first AD7 |
| Voice spatial audio (HomePod + VR) | Signal SIG4e announce while in room |
| Record ceremony clip | Creator publish opt-in |
| Forge custom VR station skins | Forge mint → VR scene pack |
| Architect secret room in VR | AI Agent Cafe pattern · G6 |

---

## References

- Claw Cafe PRD: [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
- Display / VR surfaces: [DISPLAY-OVERLAY-ROADMAP.md](./DISPLAY-OVERLAY-ROADMAP.md)
- Inter-Claw handshakes: [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md)
- Signal hub: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
