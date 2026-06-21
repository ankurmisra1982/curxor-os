# Holding Pattern — MS-S1 MAX Pending

Hardware has not arrived. Appliance engineering is **feature-complete for v0.1.0 scaffold**; on-device validation is blocked.

## Status

| Item | State |
|------|-------|
| Software stack (`curxor-os`) | Active but frozen for major refactors until hardware |
| GTM / storefront | Continue in **`../curxor storefront/`** repo |
| First boot checklist | `docs/guides/01-installation.md` + `docs/guides/10-ms-s1-max-hardware-bios.md` |

## GTM handoff

Product positioning, audit, and marketing accuracy live in the sibling repo:

```
../curxor storefront/
├── docs/APPLIANCE-AUDIT.md
├── docs/PRODUCT-POSITIONING.md
├── docs/TECHNICAL-HANDOFF.md
├── docs/GTM-CHECKLIST.md
└── docs/SYNC.md
```

## When hardware arrives

1. Run first-boot checklist in `docs/guides/01-installation.md`
2. File issues in `curxor-os` for anything that fails on real eno1/eno2 / ROCm
3. Capture screenshots for storefront
4. Bump `version.json` after validation → publish OTA manifest

## Do not block on hardware

- Storefront / waitlist / pitch deck
- Copy and positioning (use TECHNICAL-HANDOFF facts)
- PDF docs export: `./docs/scripts/export-guides-pdf.sh` (Linux/WSL + pandoc)
- Local QA: `cd pillar-4-dashboard && npm run qa:local -- --port 3081`
- Demo screenshots: `cd pillar-4-dashboard && npm run demo:capture`

## When you're back (quick wins)

1. `npm run qa:local -- --port 3081` — confirms 24/24 API smoke locally (CCP, Vital, Kin, OAuth)
2. Open Flight Command canvas mockup in Cursor Glass
3. Continue storefront GTM pages (architecture, FAQ, pricing)
