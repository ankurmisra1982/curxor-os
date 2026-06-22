# Outbound worker design (W28)

Work Claw sequences today run via **heartbeat** (`process_due` in `work-send-executor`) on the dashboard process. A dedicated outbound worker is **deferred** — this doc captures the target architecture.

## Goals

- Isolate SMTP/IMAP latency from the Next.js request path
- Survive dashboard restarts without losing queued sends
- Share policy state (warmup caps, suppression, kill switch) with the desk

## Proposed process

```
work-outbound-worker (eno2 sidecar or systemd unit)
  ├── poll work-queue.json / Redis mirror every 60s
  ├── process_due_sequence_steps()
  ├── scan_imap_inbox (optional)
  └── emit receipts → digital bridge → dashboard /api/work/status
```

## Heartbeat hardening (shipped in W28)

- Kill switch read on every send attempt (`readOutboundKillSwitch`)
- Suppression guard before `executeOutboundSend`
- 2-mailbox round-robin via FRE `secondarySmtpFrom`
- Audit log append on every send/sync/approval

## Migration path

1. Extract `processDueSequenceSteps` + IMAP scan into `pillar-4-dashboard/worker/outbound.mjs`
2. Run via `npm run work:outbound-worker` with `CURXOR_WORK_QUEUE_PATH`
3. Dashboard POST `action: process_due` becomes no-op when worker lock file present

## Env

| Key | Purpose |
|-----|---------|
| `CURXOR_WORK_QUEUE_PATH` | Shared queue file |
| `CURXOR_WORK_OUTBOUND_LOCK` | Worker claims lock |
| `SMTP_HOST` / `secondarySmtpFrom` | Primary + rotation mailbox |

See [EXIT-DEMO.md](./EXIT-DEMO.md) for live mail setup.
