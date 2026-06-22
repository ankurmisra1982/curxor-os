# Work Claw — Exit Demo Mode

Move from **demo** (simulated sends, demo mail index) to **live comms** (SMTP + optional IMAP/Google) without changing release policy. Everything below is local setup — no cloud dependency beyond each provider.

## Prerequisites

- Outreach desk works in demo (`demoReady` green after Setup Wizard or demo tour)
- `npm run qa:local` passes on your machine
- Pillar-3 digital bridge running when testing real SMTP/IMAP (see pillar-3 `digital_bridges.py`)

## Step 1 — Scaffold `digital.env`

```bash
cd pillar-4-dashboard
npm run setup:work-env
```

Creates `scripts/dev-qa/digital.env` (gitignored) from `digital.env.example` and wires `.env.local` with work-queue paths.

Verify scaffold (no keys required):

```bash
npm run verify:work-exit-demo-scaffold
```

## Step 2 — Add comms keys (pick paths)

Edit `scripts/dev-qa/digital.env`:

| Path | Env vars | Desk action after restart |
|------|----------|---------------------------|
| **SMTP outbound** | `SMTP_HOST`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS` | Go Live → SMTP **complete** · sends status `sent` |
| **IMAP inbound** | `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS` | Scan Inbox · live mail index via `work.email.fetch` |
| **Google Workspace** | OAuth client + link | Integrations → Link Google · morning brief uses Gmail |
| **Twenty CRM** | `TWENTY_API_URL`, `TWENTY_API_KEY` | Integrations → sync_crm live |
| **Notion** | OAuth + `NOTION_DATABASE_ID` | Pull/push lead notes |

Restart `npm run dev` after editing `digital.env`.

## Step 3 — Prove live outbound

1. Open `/my-work` → **Go Live** → refresh checklist.
2. SMTP step should show **complete** when keys are set.
3. Activate sequence → **Send Step** → status should be **`sent`**, not `simulated`.
4. `liveReady` turns true when bridge path is proven (see `buildWorkGoLiveReport`).

```bash
npm run qa:local
npm run qa:work-checklist
```

## Step 4 — Optional enrichments

| Provider | Env vars | Desk action |
|----------|----------|-------------|
| Hunter.io | `HUNTER_API_KEY` | Enrich Lead skill |
| Apollo | `APOLLO_API_KEY` | Enrich Lead skill |
| HubSpot | `HUBSPOT_ACCESS_TOKEN` | hubspot_preview action |
| Cal.com | `CALCOM_WEBHOOK_URL` | Book Meeting skill |
| n8n | `N8N_WEBHOOK_URL` | Auto webhooks on work events |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Header still says **demo** | Restart dev server after `digital.env` change |
| Sends stay **simulated** | Check `SMTP_*` · bridge worker logs on eno2 |
| Scan Inbox empty with IMAP | Verify `IMAP_*` · run pillar-3 digital bridges |
| Google link 400 | Set `CURXOR_GOOGLE_OAUTH_*` first |

## Related

- [RELEASE-NEXT.md](./RELEASE-NEXT.md)
- [GETTING-STARTED.md](./GETTING-STARTED.md)
- [STARTUP-GUIDE.md](./STARTUP-GUIDE.md)
- Capital: [../capital-claw/EXIT-DEMO.md](../capital-claw/EXIT-DEMO.md)
