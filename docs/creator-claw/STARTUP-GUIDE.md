# Creator Claw — Startup Guide

Quick orientation for operators and developers opening the desk for the first time.

## Current release mode: **demo only**

This build intentionally runs **without publish bridge credentials**. That is expected — not a misconfiguration.

| What works in demo | What waits for later |
|--------------------|----------------------|
| FRE setup, channels, Creation Wizard | Live OAuth publish via eno2 bridge |
| **Run demo tour** → draft → schedule → simulated publish | Real platform receipts |
| Pre-flight, calendar, best-time schedule | `CURXOR_CONTENT_PUBLIC_BASE` for IG/Pinterest/TikTok media |
| Analytics demo ingest, engage inbox (local) | Telegram/Slack approval wiring |
| Go Live **demoReady** checklist | Full **ready to publish** (all bridges green) |

Without bridge keys, **Publish now** marks posts **`PUBLISHED`** with URL `demo://local` — not a bridge failure.

---

## Day-one startup (demo)

1. Open **`/my-content`** (Creator Claw desk).
2. Complete **FRE** if prompted — pick at least one channel (X is fastest for demo).
3. Use **Run demo tour** in Go Live — creates an X post, runs preflight, schedules locally, and **simulates publish** when bridges are unconfigured.
4. Or use **Creation Wizard** for the full draft → media → preflight → schedule path.
5. Check **Go Live** — **Demo ready** when FRE is done and a post is scheduled or published.

No `digital.env` OAuth setup required for this path.

---

## When you leave demo mode

1. Add platform tokens to **`/etc/curxor/digital.env`** (see Bridge Health panel for missing keys).
2. Set **`CURXOR_CONTENT_PUBLIC_BASE`** in `dashboard.env` if you publish to Instagram, Pinterest, or TikTok with local images.
3. Optional: wire **`CURXOR_APPROVAL_TELEGRAM_CHAT_IDS`** for `/approve` and failure alerts.
4. Refresh **Go Live** and **Bridge Health** — aim for **Ready to publish** on every FRE channel.

Full operator checklist: [GETTING-STARTED.md](./GETTING-STARTED.md).

---

## QA (local)

```bash
cd pillar-4-dashboard
npm run qa:local              # smoke + capital + creator checklists
npm run qa:creator-checklist  # Creator demo flows only
```

---

## Related docs

- [GETTING-STARTED.md](./GETTING-STARTED.md) — full checklist, API, env vars
- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — shipped features and deferred roadmap
- [DAY-ONE-SPRINT.md](./DAY-ONE-SPRINT.md) — sprint notes
