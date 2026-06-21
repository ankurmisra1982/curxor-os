# Vital Claw — Longevity Desk

**Appliance ID:** `my-vital` · **Route:** `/my-vital` · **Nav:** VIT

## Purpose

Vital Claw is CurXor's longevity employee:

- Ingest **wearable vitals** (Oura, Apple Health, Garmin, Whoop, Fitbit) via local bridges
- Store **medical reports** (PDF summaries, lab tags)
- Sync **diet and health apps** (Cronometer, MyFitnessPal, etc.)
- Generate and maintain a **longevity protocol** (sleep, movement, nutrition, labs)
- Publish **health scope** to Claw Context Protocol for Optimus and Kin Claw

## Data flow

```
Wearable / health app  →  eno2 bridge (future)  →  vital-health.json
                                                    ↓
                                            CCP publish (health.*)
                                                    ↓
                              Optimus · Kin Claw · Forge (subscribers)
```

## Workspace

- Live vitals grid (resting HR, HRV, sleep score, steps)
- Health app connection status
- Active protocol steps with frequency and priority
- **Publish to Claw Context mesh** button

## Skills

| Skill | Action |
|-------|--------|
| Sync Wearables | Pull latest readings from connected bridges |
| Ingest Report | Add medical report summary to vault |
| Update Protocol | Regenerate longevity steps via local LLM |
| Publish Context | Push health slice to CCP |

## FRE fields

- Wearable sources (multiselect)
- Primary longevity focus (metabolic, cardio, cognitive, athletic)
- Share health context with Optimus (toggle)

## Storage

`CURXOR_VITAL_STATE_PATH` → `/etc/curxor/vital-health.json`

## What's scaffold vs. production

| Today (v0.1) | Coming |
|--------------|--------|
| Demo vitals + protocol template | Live Oura/Apple Health OAuth bridges |
| Manual mesh publish | Scheduled wearable sync |
| Report ingest API stub | PDF OCR + structured lab parsing |

## Related

- [15-claw-context-protocol.md](15-claw-context-protocol.md)
- [12-digital-action-layer.md](12-digital-action-layer.md) — bridge pattern on eno2
