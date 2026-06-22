# Outreach Claw — Getting Started

Outreach Claw (`/my-work`) is your on-appliance outbound desk: lead pipeline, multi-step email sequences, unified reply inbox, and SMTP send via the digital bridge.

## Demo-only release (expected)

This build ships **without SMTP credentials**. The desk runs in **demo mode**: seeded leads, sequences, inbox scan, and **simulated sends** (`status: simulated`) — no mail leaves the appliance until you configure SMTP.

Quick start: [STARTUP-GUIDE.md](./STARTUP-GUIDE.md) · use **Run demo tour** in the Go Live panel.

## Day-one checklist

1. **Complete FRE setup** — name your workspace and pick focus areas (tasks, mail, calendar).
2. **Open Outreach Claw** — review the **Go Live** panel (beginner mode).
3. **Run demo tour** — lead → sequence → simulated send (no SMTP required).
4. **Add a lead** — pipeline panel → **+ Lead** or ask the agent to draft a sequence.
5. **Draft & activate a sequence** — use **Draft sequence** or agent skill; click **Activate** to queue step 1.
6. **Scan inbox** — agent skill indexes local mail and **auto-pauses sequences on reply**.

When ready for live mail, configure SMTP in `/etc/curxor/digital.env` (see below).

## Best-in-class behaviors (shipped)

| Feature | What it does |
|---------|----------------|
| Lead CRM | Stages: new → contacted → replied → qualified → won/lost |
| Sequences | Multi-step email with delay days between follow-ups |
| Pause on reply | Active sequences stop when a matching reply is indexed |
| Personalization | `{{name}}`, `{{company}}`, `{{email}}`, `{{title}}` tokens |
| Send queue | Log of queued, sent, simulated, and failed outbound mail |
| Go Live | Checklist: FRE, SMTP (optional in demo), lead, sequence, first send |
| Demo tour | One-click lead → sequence → simulated send for QA and demos |
| Recovery | Retry failed sends from the dashboard |
| Failure alerts | Telegram/Slack notify on send failure (reuse Creator approval channels) |
| A/B subjects | `subjectAlt` on sequence steps — variant A/B picked per lead at send |
| Send policy | Daily limit + stagger between sends (FRE: `dailySendLimit`, `sendStaggerMinutes`) |
| Reply intent | Auto-classify on inbox scan; override in Mail index panel |
| CSV import | Pipeline panel → paste CSV with `name,email,company,title` header |
| Analytics | Open/reply rates on outbound queue; intent breakdown from mail index |

## Tier B API actions

```json
{ "action": "import_leads", "csv": "name,email,company\\nJordan,j@co.io,Co" }
{ "action": "tag_reply_intent", "mailId": "MAIL-…", "intent": "interested" }
{ "action": "track_open", "sendId": "SEND-001" }
{ "action": "process_due" }
{ "action": "analytics" }
{ "action": "run_demo_tour" }
```

## Heartbeat

The appliance heartbeat daemon calls `process_due` each tick so scheduled sequence steps send automatically (respects daily limit + stagger).

```bash
node scripts/heartbeat-daemon.mjs
```

## API

All mutations go through `POST /api/work/status`:

```json
{ "action": "dashboard_bootstrap" }
{ "action": "run_demo_tour" }
{ "action": "create_lead", "name": "Jordan", "email": "j@co.io", "company": "Co" }
{ "action": "draft_sequence", "leadId": "LEAD-001" }
{ "action": "activate_sequence", "sequenceId": "SEQ-001" }
{ "action": "scan_inbox" }
{ "action": "recovery_retry", "sendId": "SEND-001" }
```

Data persists in `CURXOR_WORK_QUEUE_PATH` (default `/etc/curxor/work-queue.json`).

## Agent skills

- **Scan Inbox** — index mail, match replies, pause sequences
- **Draft Sequence** — local template sequence for selected lead
- **Send Step** — send current sequence step (simulated without SMTP)
- **Summarize Day** — pipeline + task brief
- **Demo Tour** — lead → sequence → simulated send

## Environment

| Variable | Purpose |
|----------|---------|
| `CURXOR_WORK_QUEUE_PATH` | Lead/task/sequence store |
| `CURXOR_WORK_REQUIRE_APPROVAL` | `1` to queue sends for manual approval |
| `CURXOR_WORK_FAILURE_NOTIFY` | `0` to disable Telegram/Slack failure alerts |
| `SMTP_HOST` / `SMTP_FROM` | Required for live send (see digital.env) |

## Demo mode

Without SMTP configured, the desk runs in **demo mode**: seeded leads, sequences, and local queue — outbound is **simulated** until `SMTP_HOST` + `SMTP_FROM` are set in `digital.env`.
