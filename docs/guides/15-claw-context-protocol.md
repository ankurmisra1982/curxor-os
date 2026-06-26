# Claw Context Protocol (CCP)

Unified inter-Claw communication on the CurXor appliance — June 2026.

## Why CCP exists

Each Claw owns a slice of the operator's life (health, finance, outreach, hardware). Without a shared bus, bots stay siloed. **Claw Context Protocol** lets every Claw:

- **Publish** context it owns (with permission checks)
- **Subscribe** to scopes it needs (Optimus reads health + family; Vital reads family)
- **Sync** over ZeroMQ topic `telemetry/claw_context` and local JSON store

This is the "central communication interface" — not a cloud hub, but an on-appliance mesh protocol.

## Scopes

| Scope | Owner Claw(s) | Typical keys |
|-------|---------------|--------------|
| `personal` | Kin, Vital | preferences, routines |
| `health` | Vital | vitals.*, protocol.*, reports.* |
| `work` | Outreach | pipeline.*, crm.* |
| `finance` | Capital | portfolio.*, rules.* |
| `family` | Kin | members.*, devices.* |
| `hardware` | Signal Claw | robot.*, display.*, vr.*, smart_home.*, voice.*, vehicle.*, motor state |

Registry: `pillar-4-dashboard/lib/claw-mesh-protocol.ts`

## Mesh topic

```
Publishers → XSUB :9200  topic: telemetry/claw_context
Subscribers ← XPUB :9201
```

Same proxy pair as motor/digital — isolated by topic prefix.

Env: `CURXOR_TOPIC_CLAW_CONTEXT=telemetry/claw_context`

## Persistence

| File | Purpose |
|------|---------|
| `/etc/curxor/claw-context.json` | Latest context records (TTL-aware) |
| `/etc/curxor/family-profiles.json` | Kin Claw household members |
| `/etc/curxor/vital-health.json` | Vital Claw vitals + protocol |

## API

| Route | Purpose |
|-------|---------|
| `GET /api/mesh/context?appId=…` | Merged context for a Claw |
| `GET /api/mesh/context?registry=1` | Publication/subscription matrix |
| `POST /api/mesh/context` | Publish slice or resync family/vital |
| `GET /api/family` | List household profiles |
| `POST /api/family` | Add/update member |
| `GET /api/vital/status` | Longevity desk state |

## Example: Optimus deep context

Signal Claw (`tesla-optimus-engine`) subscribes to: personal, health, work, finance, family, hardware.

When the operator chats in Optimus workspace, `app-agent-assist` injects merged CCP context into the local LLM system prompt — so the robot "knows" sleep scores, household members, and work pipeline without cloud sync.

## Family profiles

Kin Claw (`my-family`) manages per-member:

- Role (owner, partner, child, elder, guest)
- Devices (watch, phone, Optimus unit ref)
- Personality (traits, communication style)
- Shared scopes (privacy opt-in per domain)

Each profile gets a `profileId` on CCP messages so Vital can run per-member longevity protocols.

## Security

- Publish requires scope write permission in registry
- Read filtered by subscription matrix
- Channel conversations publish to `work/inbox.*` and app scopes via bridge (see Agent runtime guide)
- No automatic eno2 egress — bridges are separate
- LAN auth gates mutating routes in production

See also: [16-vital-claw.md](16-vital-claw.md), [17-kin-claw-family.md](17-kin-claw-family.md)
