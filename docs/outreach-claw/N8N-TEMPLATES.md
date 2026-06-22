# Work Claw — n8n webhook templates

Self-host [n8n](https://n8n.io/) on eno2 and point these templates at `N8N_WEBHOOK_URL` in `digital.env`.

## 1. Lead stage → won

Trigger when a lead moves to **won** — notify ops channel and create a celebration task.

**Webhook payload (from Work desk or custom script):**

```json
{
  "event": "work.lead.stage_changed",
  "leadId": "LEAD-001",
  "stage": "won",
  "name": "Jordan Lee",
  "email": "jordan@fintechlabs.io",
  "company": "Fintech Labs"
}
```

**n8n flow:** Webhook → IF `stage === won` → Slack message + optional Google Calendar “onboarding kickoff”.

## 2. Sequence first send

Fire after first outbound send (live or simulated) for analytics and CRM mirror.

```json
{
  "event": "work.sequence.first_send",
  "sequenceId": "SEQ-001",
  "sendId": "SEND-042",
  "status": "simulated",
  "leadEmail": "sam@buildco.dev"
}
```

**n8n flow:** Webhook → Twenty CRM create person (HTTP Request node) → Notion append row.

## 3. Interested reply intent

When operator tags mail as **interested**, Work Claw can also `channel.slack.send`. Duplicate to n8n for long-tail routing.

```json
{
  "event": "work.reply.interested",
  "mailId": "MAIL-abc",
  "leadId": "LEAD-003",
  "subject": "Re: CurXor pricing",
  "intent": "interested"
}
```

**n8n flow:** Webhook → create Linear issue → assign SDR → schedule Cal.com follow-up link in Slack thread.

---

Set `N8N_WEBHOOK_URL` in `/etc/curxor/digital.env`. Future Work releases may POST these payloads automatically on each event; today you can wire a small cron or heartbeat hook to forward `work-queue.json` diffs.
