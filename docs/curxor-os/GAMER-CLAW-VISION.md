# Gamer Claw — Vision & Architecture (deep capture)

> **Room:** Vision & Strategy · capture only · **no build** until gated  
> **Roadmap:** Program **GM** in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Related:** [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md) · [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md) · [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)  
> **Status:** scoped · **Last updated:** June 2026

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Should this exist?** | **Yes** — leisure + identity is a real operator job; none of today's ten desks own *play* end-to-end. |
| **Is it Claw #11?** | **No** — operate claw **#7** · Cafe + Signal are universal apps |
| **Does CurXor run AAA games?** | **No.** MS-S1 is not a console. CurXor **orchestrates** libraries, sessions, streams, and **hosts small AI-made games** — your PC/console/phone still runs Cyberpunk. |
| **AI game creation?** | **Yes — tiered.** Browser micro-games on eno1 first; Godot/web jam via Build Plane second; never promise Unreal in the box. |

**One-line:** **Gamer Claw is your play desk** — Steam, Xbox, PlayStation, mobile, and Twitch in one sovereign view, plus an **AI game studio** that ships small games to your LAN and Cafe arcade station.

---

## Claw slot (locked)

**Gamer** is OOTB operate claw **#7**. Engage and Cafe were never real operate slots; **Signal** is a **universal app** (The Neural Link). Roster leaves **slot #10 open** — see [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md).

**Route:** `/my-game` · **Appliance ID:** `my-game` · **Short:** `GAME`

---

## Three pillars

```text
┌─────────────────────────────────────────────────────────────┐
│                      GAMER CLAW                              │
├──────────────┬──────────────────────┬─────────────────────┤
│  PLAY        │  STREAM              │  MAKE                 │
│  Library     │  Twitch / live       │  AI Game Studio       │
│  Sessions    │  Clips → Creator     │  Forge Game Packs     │
│  Achievements│  Squad / co-op       │  /play/{id} on eno1   │
└──────────────┴──────────────────────┴─────────────────────┘
         │              │                        │
    Steam/Xbox/PS/   Twitch Helix            Build Plane +
    mobile bridges   EventSub               Ollama + Godot/web
```

### 1. PLAY — library & session intelligence

**Job:** One desk for *what you're playing*, not scattered launcher apps.

| Platform | Bridge (v1 target) | Data CurXor owns | Honest limit |
|----------|-------------------|------------------|--------------|
| **Steam** | Web API + OpenID · library, achievements, friends, playtime | Session log · last played · achievement feed | Games run on **your PC** · Steam Link is client-side |
| **Xbox** | Microsoft identity · Xbox Live REST | Game Pass library · Gamerscore · presence | No xCloud hosting on appliance |
| **PlayStation** | PSN link (official partner path) · trophy sync | Trophy shelf · recent titles | **Hardest API** — v1 may be manual trophy link + PS App deep links |
| **Mobile** | No single API — per-store deep links + **Kin screen-time** | Installed-game list (operator-maintained) · session timers | CurXor doesn't sideload APKs |
| **Epic / GOG** | Parking lot · same pattern as Steam | — | GM6+ |

**Session model:** Operator (or Kin profile) starts a **session** — CurXor logs duration, optional Vital break nudges, optional Creator "clip-worthy" flag. Not anti-cheat; not kernel hooks — **honest activity journal** + platform receipts where APIs allow.

**Signal overlap:** Consoles and PCs are **`gaming_platform`** endpoints in Signal Fleet (like smart home endpoints) — Gamer Claw owns **meaning**; Signal owns **pairing/discovery** if needed.

### 2. STREAM — Twitch & live (Creator adjacency)

| Owns Gamer | Owns Creator |
|------------|--------------|
| Go live · stream title/game category · chat summary · squad night | Edit highlight · schedule post · brand · multi-channel publish |
| EventSub: follow, raid, clip created | Clip → vertical draft (handshake) |

**Twitch:** Helix API + EventSub webhooks (eno2 ingress with LAN tunnel or ngrok BYOK). Keys in `digital.env`.

**Discover (HS):** *"You raided — Creator can turn that clip into a Short."*

### 3. MAKE — AI game studio (deep)

This is the differentiated bet: **sovereign game jam** tied to Cafe + optional VR arcade.

#### What we will ship (tiered)

| Tier | Output | Where it runs | Build path |
|------|--------|---------------|------------|
| **GM-M1 Micro-web** | Phaser / Canvas pixel game | **eno1** `/play/{slug}` · LAN browsers · Cafe embed | Prompt → local LLM → scaffold → human confirm → deploy static bundle |
| **GM-M2 Cafe arcade** | Same game · leaderboard | Cafe **arcade station** sprite + XP | Score events → `cafe-state` |
| **GM-M3 Godot jam** | `.pck` or HTML5 export | Operator workstation · link from Gamer desk | Build Plane generates project · `godot export` off-box |
| **GM-M4 Forge Game Pack** | Reusable template + SHA-pin | Mint vertical games (quiz, tycoon, roguelike) | Program **GK** skill-pack catalog shape |
| **GM-M5 NPC brain** | Dialogue in micro-games | **Ollama on appliance** | `game.npc_chat` tool · CCP game lore scope |

#### What we will not ship (v1)

| Fantasy | Reality |
|---------|---------|
| "CurXor runs AAA games" | ROCm box is for inference + orchestration, not RTX replacement |
| "Replace Unity/Unreal on appliance" | Editor toolchain stays on dev machine / Build Plane |
| "Scrape ROMs / train on Nintendo assets" | **Legal poison** — operator BYO assets only |
| "Multiplayer netcode at scale" | WebRTC LAN co-op **maybe** GM7 · not global matchmaking |

#### AI creation pipeline (architecture)

```text
Operator intent ("roguelike vampire-survivors clone, pixel art, 5-min runs")
    → Gamer Claw compose (NL + optional reference URL via Firecrawl FC-UC pattern)
    → Local LLM plan: mechanics doc + file tree
    → Build Plane (Cursor Bridge) OR in-appliance codegen for M1 only
    → Sandbox review — diff + play preview in iframe
    → Operator confirm
    → Deploy to /var/lib/curxor/games/{id}/ → served at https://eno1/play/{id}
    → Optional Forge mint: "Night Shift Roguelike" Game Pack
    → Cafe: new arcade cabinet when first player scores
```

**Sovereignty rules:**

1. **Game source lives on appliance** (or git mirror operator controls).
2. **Asset gen** — local ComfyUI horizon or BYOK image API on eno2; receipts required.
3. **No silent publish** — deploy to LAN is confirm-gated; public internet hosting is out of scope v1.
4. **Kid profiles (Kin)** — only E-rated / operator-approved games in child session.

#### Tech stack bias (pragmatic)

| Layer | Choice | Why |
|-------|--------|-----|
| Micro-games | **Phaser 3** or **littlejs** | Matches Cafe pixel tone · single-file deploy |
| Jam exports | **Godot 4 HTML5** | Open · exports without license fee |
| 3D horizon | **Three.js / WebXR** | Reuse AD7 VR stack for game rooms |
| Codegen | **Build Plane** for >500 LOC | Appliance LLM for sketches only |
| Leaderboards | Local SQLite on appliance | No cloud leaderboard rent |

---

## Gamer workspace (proposed tabs)

| Tab | Purpose |
|-----|---------|
| **Home** | Now playing · squad online · stream live indicator |
| **Library** | Linked platforms · unified shelf · filters |
| **Sessions** | Journal · time · Vital break hooks |
| **Stream** | Twitch dashboard · go live · chat digest |
| **Studio** | AI game compose · projects · deploy to `/play` |
| **Squad** | Friends · party night · Kin household gaming |

Growth levels (placeholder): **Casual → Regular → Dedicated → Creator-adjacent → Architect of Play** (mythic alt in Settings).

---

## Platform bridges (eno2 digital layer)

Same pattern as Firecrawl / Alpaca:

```text
Gamer skill: library.sync | session.start | twitch.go_live | game.deploy
    → ZMQ digital_out
    → GamingBridgeWorker(s) on eno2
    → Steam / Xbox / Twitch APIs
    → receipt → digital_in → CCP game.* + Cafe event
```

| Worker | Credentials | Notes |
|--------|-------------|-------|
| `SteamBridgeWorker` | Steam Web API key + steamid | Mature docs |
| `XboxBridgeWorker` | Azure app · Xbox Live | Partner registration |
| `PlayStationBridgeWorker` | PSN partner OR manual trophy import v1 | **Defer full auto** until partner path |
| `TwitchBridgeWorker` | Client ID + secret + broadcaster OAuth | EventSub webhook endpoint on eno2 |
| `MobileBridgeWorker` | None — Kin timers + manual library | Honest |

**CCP scopes (future):** `game.library.*` · `game.session.*` · `game.studio.*` · `game.twitch.*`

---

## Kin · Vital · Cafe · VR

| Claw | Integration |
|------|-------------|
| **Kin** | Per-member gaming profiles · screen time · age gates · purchase confirm · "family game night" scene (→ Signal home) |
| **Vital** | Session length nudges · hydration · sleep guard ("one more match" intercept) |
| **Creator** | Clip → draft · stream announce posts · HS Gamer→Creator |
| **Cafe** | **Arcade station** — character walks to cabinet when you're in-game · achievement handshake |
| **VR Cafe** | Play micro-game **inside** VR room · AD9 arcade cabinet in WebXR |
| **Forge** | Mint **Game Pack** Claws · roguelike template for niches |
| **Signal** | `gaming_platform` device class · console on LAN discovery (optional) |

---

## Inter-Claw handshakes (Program HS)

| Path | Trigger | Outcome |
|------|---------|---------|
| **Gamer → Creator** | Clip · milestone · funny moment | "Turn this into a Short" |
| **Gamer → Kin** | Kid achievement | Family celebrate · Cafe bro-hug |
| **Gamer → Vital** | 3h session | Break nudge · stretch protocol |
| **Creator → Gamer** | Stream scheduled | "Go live with this title?" |
| **Work → Gamer** | Friday 5pm · burnout pattern | Discover: "Squad night?" (opt-in · not cringe) |
| **Forge → Gamer** | Game Pack minted | New arcade cabinet in Cafe |
| **Gamer → VR** | New game deployed | "Play in VR Cafe arcade" |

---

## GM waves

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **GM0** | Founder claw-slot decision · route stub · honest Coming Soon | G2 | Nav + Tier C card |
| **GM1** | Library UI · manual game list + session journal | G4 | Session start/stop logged |
| **GM2** | **Steam** bridge — library sync + playtime | G4+ | Receipt + shelf |
| **GM3** | **Twitch** — OAuth · go live · EventSub follow/clip | G4+ | Live indicator on Home |
| **GM4** | **Studio M1** — prompt → Phaser micro-game → `/play/{id}` | G4+ | One game playable on LAN |
| **GM5** | **Xbox** library + presence | G5 | Game Pass shelf |
| **GM6** | Cafe arcade station + leaderboard events | G5 | Score → Cafe XP |
| **GM7** | **Studio M3** — Godot jam via Build Plane | G5 | Export linked from desk |
| **GM8** | PlayStation trophy link (honest tier) | G5+ | Manual or partner API |

**Engage merge** is prerequisite for GM0 if Option A.

---

## Competitive honesty

| They do | CurXor does |
|---------|-------------|
| Steam Big Picture / Deck UI | **Cross-platform shelf** + Claw intelligence + Cafe |
| Discord activity | **Sovereign** session log · no Discord dependency |
| Xbox mobile app | Same APIs · plus Kin + Vital + handoffs to Creator |
| AI game gens (generic chatbots) | **Deploy to your LAN** + Cafe arcade + Forge mint · not a disposable URL |

**Moat:** Play data on **your metal** feeds Master AI patron who knows you work hard *and* how you unwind — without selling attention to ad networks.

---

## GTM honesty

| Say | Don't say |
|-----|-----------|
| "Gamer Claw — your libraries, streams, and AI game studio on sovereign metal" | "Gaming PC in a box" |
| "Steam & Xbox library on your dashboard" | "All platforms day one" |
| "AI helps you **ship small games** to your home LAN" | "AI builds Cyberpunk" |
| "Twitch go-live from the same desk" | "Replaces OBS" (v1) |
| BYOK platform logins | "Includes Game Pass / Steam credits" |

**PS5 honesty:** Trophy sync may lag Steam/Xbox — ship **manual link** before fake automation.

---

## Risks (brutal)

| Risk | Mitigation |
|------|------------|
| Scope explosion (5 platforms × studio × stream) | **GM waves** — Steam + Twitch + M1 studio before PSN perfection |
| Engage merge politics | Founder decision before GM0 code |
| Operator expects GPU gaming | Copy + FRE: orchestrator not console |
| AI slop games | Quality bar: confirm gate · Cafe only celebrates **played** games |
| Kids + Twitch | Kin hard gates · no kid go-live |

---

## Parking lot

| Idea | Notes |
|------|-------|
| Discord Rich Presence bridge | eno2 · optional |
| Epic Games Store | GM6+ |
| Speedrun timer + split integration | Creator clip handshake |
| LAN party WebRTC | GM7 |
| Esports / Capital paper trading | **Reject** v1 — regulatory distraction |
| Roblox / Minecraft edu | Kin child profiles — partner horizon |

---

## References

- Digital bridges pattern: [12-digital-action-layer.md](../guides/12-digital-action-layer.md)
- Build Plane: [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md)
- Grok skill packs (Game Pack catalog): [EXTERNAL-BRIDGES-ROADMAP.md](./EXTERNAL-BRIDGES-ROADMAP.md)
- Kin family: [17-kin-claw-family.md](../guides/17-kin-claw-family.md)
- Cafe arcade: [CLAW-CAFE-PRD.md](./CLAW-CAFE-PRD.md)
- VR arcade: [VR-CAFE-MEETINGS.md](./VR-CAFE-MEETINGS.md)
