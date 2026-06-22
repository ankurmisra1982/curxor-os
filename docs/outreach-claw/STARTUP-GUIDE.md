# Outreach Claw — Startup Guide

Quick orientation for operators and developers opening the desk for the first time.

## Current release mode: **demo only**

This build intentionally runs **without SMTP bridge credentials**. That is expected — not a misconfiguration.

| What works in demo | What waits for later |
|--------------------|----------------------|
| FRE setup, lead pipeline, sequences | Live SMTP send via eno2 bridge |
| **Run demo tour** → lead → sequence → simulated send | Real mail delivery |
| Scan inbox, reply intent, pause-on-reply | IMAP ingest at scale |
| Go Live **demoReady** checklist | Full **ready to send** (SMTP green) |
| Send Step / agent skills (simulated) | Production mailboxes |

Without SMTP configured, outbound sends are marked **`simulated`** — not a bridge failure.

---

## Day-one startup (demo)

1. Open **`/my-work`** (Outreach Claw desk).
2. Complete **FRE** if prompted — name workspace and pick focus areas.
3. Use **Run demo tour** in Go Live — creates a demo lead + sequence and **simulates the first send** when SMTP is unconfigured.
4. Or add a lead → **Draft sequence** → **Activate** → **Send Step** from the agent panel.
5. Check **Go Live** — **Demo ready** when FRE is done and you have lead + sequence activity.

No `digital.env` SMTP setup required for this path.

---

## When you leave demo mode

1. Set **`SMTP_HOST`**, **`SMTP_PORT`**, **`SMTP_USER`**, **`SMTP_PASS`**, and **`SMTP_FROM`** in **`/etc/curxor/digital.env`**.
2. Restart the dashboard dev server (or appliance service).
3. Refresh **Go Live** — aim for **Ready to send** with SMTP step complete.

Full operator checklist: [GETTING-STARTED.md](./GETTING-STARTED.md).

---

## Persona one-liners (L1–L3)

| Level | Persona | One-liner |
|-------|---------|-----------|
| **L1 Explorer** | Student / hobby | Reply desk first — opportunities, templates, draft without CRM jargon. |
| **L2 Side Hustle** | Etsy / freelance | Mini-sequences and hustle packs — polite follow-up without a SaaS stack. |
| **L3 Operator** | Nonprofit / advocacy | Approvals, deliverability, and send policy — sovereign outbound with human gates. |

Capture persona screenshots: `npm run demo:capture:work:levels` (requires dev server). EXIT-DEMO recording: `npm run demo:record:work:exit`.

---

## QA (local)

```bash
cd pillar-4-dashboard
npm run qa:local              # smoke + capital + creator + outreach checklists
npm run qa:work-checklist     # Outreach demo flows only
```

---

## Related docs

- [GETTING-STARTED.md](./GETTING-STARTED.md) — full checklist, API, env vars
- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — shipped features and deferred roadmap
