# Patron Link — Mobile interface (vision capture)

> **Room:** Vision & Strategy · capture only · **no build** until gated  
> **Parent:** **Signal Claw — The Neural Link** conducts interfaces; phone is the **pocket surface** · [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)  
> **Roadmap:** Program **MO** in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **OS layers:** [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md)  
> **Status:** scoped · **Last updated:** June 2026

---

## One-line vision

**Patron Link** is CurXor’s **mobile companion** — limited on purpose, sovereign on architecture. **Pull** status, briefs, and inbox glances; **push** confirms, nudges, and handoffs back to the appliance. Not Flight Command in your pocket; your **pocket conductor** for the desk on bare metal.

**GTM tie-in:** *Interfaces drift. Your desk conducts.* — the phone is an interface Signal already owns.

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Native App Store day one?** | **No** — **PWA first** (`/m`), optional native shell horizon |
| **Full dashboard on phone?** | **No** — 5–7 focused surfaces only |
| **CurXor cloud relay?** | **No** — pair to appliance; away-from-home via **operator VPN** (Tailscale doc), not our SaaS |
| **Push notifications?** | **Tiered** — LAN foreground first · self-hosted or BYOK push second |
| **Who uses it?** | Operator + **Kin** household members (scoped tokens) |

---

## What Patron Link is / isn’t

| Is | Isn’t |
|----|-------|
| Confirm / deny queue for gated actions | Capital charting · Forge mint wizard |
| Patron brief + Cafe ascension glance | Full pixel room editor |
| Quick channel reply (webchat / Telegram path) | Build Plane · Cursor |
| Appliance health + eno2 status | Mesh motor teleop |
| Kin-scoped family alerts | Admin root on box |
| “Approve and go back to life” | Replacement for laptop on eno1 |

---

## Architecture (recommended)

```text
Phone (PWA /m)
    │  HTTPS (eno1 LAN · or Tailscale to appliance)
    ▼
┌─────────────────────────────────────────┐
│  MS-S1 :3080 — Patron Link API layer    │
│  GET  /api/mobile/summary               │  ← PULL bundle
│  GET  /api/os/approvals                 │  ← existing confirm bus
│  POST /api/mobile/confirm               │  ← PUSH intent back
│  POST /api/channels/webchat             │  ← quick reply
│  GET  /api/cafe/status (trimmed)        │  ← ascension glance
│  POST /api/mobile/push-subscribe        │  ← Web Push / ntfy
│  SSE  /api/stream/mobile (or poll)      │  ← foreground refresh
└─────────────────────────────────────────┘
    │
    ├── Operate claws (confirm sources)
    ├── Cafe (events → notification copy)
    └── Signal (register phone as patron_mobile)
```

**Device class:** `patron_mobile` in Signal Fleet — paired like glasses, not a operate claw.

---

## Pairing model

```text
Dashboard (laptop) → Settings → Patron Link → Show QR
    → Phone scans → POST /api/mobile/pair
    → Appliance issues device token (scoped · rotatable)
    → Optional: Web Push subscription stored on appliance
    → Kin: parent approves child device · reduced scopes
```

| Rule | Detail |
|------|--------|
| **Pair on LAN** | QR includes `http://10.0.0.1:3080` or mDNS `curxor.local` |
| **Token scope** | `confirm` · `read_summary` · `webchat` · per-Kin profile |
| **Revoke** | Dashboard → Fleet → Patron devices |
| **No account cloud** | Tokens live in `/var/lib/curxor/patron-devices.json` |

Reuse patterns: `CURXOR_LAN_AUTH_TOKEN`, PKCE from [14-frontier-oauth.md](../guides/14-frontier-oauth.md), CCP consent matrix.

---

## PULL surfaces (read)

| Surface | Source API | Mobile UX |
|---------|------------|-----------|
| **Patron brief** | CCP summary + cafe patron | One scrollable card |
| **Approval inbox** | `GET /api/os/approvals` | List · tap for detail |
| **Cafe glance** | ascension level · streak · last handshake | Compact chip |
| **Appliance health** | setup status · eno2 · OTA | Green / amber / red |
| **Claw activity** | per-app last event (not full telemetry) | “Work: 3 leads today” |
| **Kin home** | who’s home · kid session (if parent) | Household strip |
| **Gamer** (GM3+) | live stream? · session timer | Optional chip |
| **Inbox preview** | `GET /api/channels/inbox` | Last 5 threads · tap to reply |

**Refresh:** foreground poll 30s or SSE; background via push (MO2+).

---

## PUSH surfaces (write + notify)

| Event (notify) | Action (tap) |
|----------------|--------------|
| `*.approval_pending` | Approve / deny / snooze |
| Forge fusion offered | Open confirm → deep link Forge |
| Handshake / ascension | View Cafe ceremony recap |
| Vital protocol step | Mark done · snooze |
| eno2 unplugged / OTA | Acknowledge |
| Kin guest / child gate | Approve scene · deny |
| Capital rule fire (paper) | Optional notify only |
| Signal pair complete | View Fleet |

**POST /api/mobile/confirm** body:

```json
{
  "approvalId": "…",
  "decision": "approve" | "deny" | "snooze",
  "deviceId": "patron-…",
  "note": "optional"
}
```

Wire to existing approval handlers (Capital, Work, Creator, digital layer confirm gates).

---

## Implementation path (waves)

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **MO0** | Responsive `/m` shell · LAN pair QR · read-only summary | G3 | Phone on Wi‑Fi shows brief + health |
| **MO1** | Approval inbox pull + confirm POST | G3+ | Capital demo approval from phone |
| **MO2** | Web Push — **ntfy** self-hosted on eno1 *or* FCM BYOK | G4 | Lock screen notify on LAN |
| **MO3** | Kin child device · scoped token | G4+ | Parent sees kid request |
| **MO4** | `channels/webchat` quick reply | G4+ | One-tap reply from notification |
| **MO5** | Away-from-home guide — Tailscale + same PWA | G4+ | Doc + QA · no CurXor cloud |
| **MO6** | iOS/Android shell (TWA / Capacitor) optional | G5 | Home screen icon · biometrics |

**Not before G3:** Mobile is **companion** to golden path — laptop unbox still canonical.

---

## Push technology (sovereignty-honest)

| Option | Sovereignty | Verdict |
|--------|-------------|---------|
| **Foreground poll only (MO0–1)** | Perfect | Ship first |
| **ntfy / Gotify on eno1** | Self-hosted push · LAN | **Preferred MO2** for purists |
| **Web Push + FCM/APNs** | Google/Apple relay · BYOK keys | Practical MO2 alt · disclose |
| **Telegram bot notify** | eno2 egress · already have channel bridge | **Clever hack** — notify via operator’s Telegram |
| **CurXor-hosted push** | **Reject** | Breaks sovereign story |

**Honest GTM:** “Push works on your network first; away-from-home uses **your** VPN, not our cloud.”

---

## UI sketch (5 tabs max)

| Tab | Content |
|-----|---------|
| **Home** | Brief + health + Cafe chip |
| **Act** | Approval queue (primary PUSH surface) |
| **Inbox** | Channels preview + quick reply |
| **House** | Kin strip (if enabled) |
| **More** | Pair status · revoke · open full dashboard (browser) |

No Forge, no Swarm map, no telemetry graphs.

---

## Relationship to other layers

| Layer | Relationship |
|-------|--------------|
| **Signal** | Phone = `patron_mobile` · Neural Link pocket mode |
| **Cafe** | Push ascension · handshake toasts · no full room on phone (link to `/cafe`) |
| **Claw Commons** | Venture-out confirm · draft reply approve · moderation hold — [CLAW-COMMONS-VISION.md](./CLAW-COMMONS-VISION.md) · MO5+ |
| **Operate claws** | Emit approvals · receive confirms |
| **Creator Engage** | Inbox tab overlaps MO4 — same channel router |
| **Capital** | Deferred “mobile push for approvals” → **MO1** |
| **Master AI** | G5+ patron brief push digest |

---

## Security

| Threat | Mitigation |
|--------|------------|
| Stolen phone | Short-lived tokens · biometric shell MO6 · revoke from dashboard |
| Kid approves trade | Kin scope excludes `confirm` for child profiles |
| Public Wi‑Fi | TLS to appliance only via VPN; warn if cleartext LAN |
| Notification leakage | No raw CCP secrets in push body — “Approval needed” + id |

---

## GTM honesty

| Say | Don't say |
|-----|-----------|
| “Patron Link — confirm and brief from your phone” | “Full CurXor mobile app” |
| “Pair on your LAN · sovereign tokens on the box” | “Download from App Store day one” |
| “Works away from home with **your** Tailscale” | “Works everywhere with CurXor cloud” |

---

## Parking lot

| Idea | Notes |
|------|-------|
| Apple Watch glance | Signal `wearable` horizon |
| Siri / Shortcuts | “Hey Siri, approve CurXor” → URL scheme |
| Widget (iOS) | Approval count |
| NFC tap-to-pair | Hardware charm horizon |

---

## References

- Signal: [SIGNAL-AI-DEVICE-HUB.md](./SIGNAL-AI-DEVICE-HUB.md)
- OS layers: [CAFE-OS-LAYER-MODEL.md](./CAFE-OS-LAYER-MODEL.md)
- Channels: [18-agent-runtime.md](../guides/18-agent-runtime.md)
- LAN auth: [09-operations-troubleshooting.md](../guides/09-operations-troubleshooting.md)
- Networking: [03-networking.md](../guides/03-networking.md)
