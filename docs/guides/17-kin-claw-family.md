# Kin Claw — My Family

**Appliance ID:** `my-family` · **Route:** `/my-family` · **Nav:** KIN · **Display name:** Kin Claw

## Purpose

Kin Claw manages **household profiles** so every Claw and hardware unit can personalize per person:

- Add family members with roles and personalities
- Bind devices (phone, watch, tablet, Optimus robot, appliance)
- Control **shared scopes** (health, work, finance, personal) per member
- Sync all profiles to **Claw Context Protocol**

## Why "Kin Claw"

Matches the Digital Wealth Claw naming (Capital, Creator, Outreach…) while the route stays `/my-family` for clarity in setup and URLs.

## Workspace

- Member selector tabs
- Profile detail (role, communication style, traits, scopes, device count)
- Add member form
- Resync mesh button

## Skills

| Skill | Action |
|-------|--------|
| Add Member | Create household profile |
| Bind Device | Link hardware to profile |
| Resync Mesh | Publish family.* keys to CCP |

## FRE fields

- Household name
- Default communication style
- Enable child profiles toggle

## Storage

`CURXOR_FAMILY_PROFILES_PATH` → `/etc/curxor/family-profiles.json`

Auto-seeds a **Primary operator** profile on first access.

## Integration with Optimus

When Optimus (Signal Claw) runs in guest or family mode, it reads `family.members.*` and `family.devices.*` from CCP to adjust physical interactions and conversation tone per `personality.communicationStyle`.

## Related

- [15-claw-context-protocol.md](15-claw-context-protocol.md)
- [16-vital-claw.md](16-vital-claw.md)
