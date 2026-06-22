# n8n templates — Work Claw webhooks

## Signal ingest (W25)

Route RSS or Clay-style enrich output into Work Claw intent strip.

### Webhook node

- **Method:** POST
- **URL:** `http://127.0.0.1:3080/api/work/status`
- **Body (JSON):**

```json
{
  "action": "signal_ingest",
  "title": "{{ $json.title }}",
  "source": "n8n-rss",
  "url": "{{ $json.link }}",
  "intent": "product",
  "score": 70
}
```

### RSS → Signal flow

1. **RSS Feed Read** — poll every 15m
2. **Filter** — keyword match (e.g. "hiring", "raised", "launch")
3. **HTTP Request** — POST `signal_ingest` as above

### Signal → opportunity

Use dashboard **Intent strip** or POST:

```json
{
  "action": "signal_to_opportunity",
  "signalId": "SIG-xxxxxxxx"
}
```

Creates lead + `polite_followup` mini-sequence and runs `enrich_lead` in demo mode.

## Approval callback (W26)

Telegram bot callback → `POST /api/work/approval-callback` with `{ sendId, decision: "approve" | "reject" }`.

## Needs-you digest (W27)

Schedule **Cron** 7:00 local → POST `{ "action": "needs_you_digest" }`.
