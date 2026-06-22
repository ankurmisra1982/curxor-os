# Outbound worker (W32)

Work Claw sequences run via **`process_due`** (due steps, undo finalize, snooze return). W32 adds a **sidecar worker** that holds a lock so the dashboard heartbeat does not double-send while the worker is active.

## Architecture

```
work-outbound-worker (systemd / npm script)
  ├── claim CURXOR_WORK_OUTBOUND_LOCK
  ├── POST /api/work/status { action: outbound_worker_tick }
  │     ├── processDueSequenceSteps()
  │     ├── finalizeDueOutboundSends()
  │     ├── processExpiredSnoozes()
  │     └── optional scan_inbox (bounce suppress + reply pause)
  ├── release lock
  └── receipts → existing handleWorkEmailReceipt on /api/work/status receipt action
```

When the lock is held, dashboard `process_due` returns `{ skipped: true, workerActive: true, processed: 0 }`.

## Run

```bash
# One-shot (QA / cron)
npm run work:outbound-worker

# Loop every 60s + optional IMAP scan
node worker/outbound.mjs --loop --interval 60 --scan-inbox --base http://127.0.0.1:3080
```

### systemd (appliance)

```ini
[Unit]
Description=CurXor Work Claw outbound worker
After=network.target curxor-dashboard.service

[Service]
Type=simple
WorkingDirectory=/opt/curxor/pillar-4-dashboard
Environment=CURXOR_WORK_QUEUE_PATH=/etc/curxor/work-queue.json
Environment=CURXOR_WORK_OUTBOUND_LOCK=/var/run/curxor/work-outbound.lock
Environment=CURXOR_WORK_WORKER_BASE=http://127.0.0.1:3080
ExecStart=/usr/bin/node worker/outbound.mjs --loop --interval 60 --scan-inbox
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Env

| Key | Purpose |
|-----|---------|
| `CURXOR_WORK_QUEUE_PATH` | Shared queue file (same as dashboard) |
| `CURXOR_WORK_OUTBOUND_LOCK` | Lock file path (default: sibling of queue file) |
| `CURXOR_WORK_WORKER_BASE` | Dashboard base URL for tick API (default `http://127.0.0.1:3080`) |
| `CURXOR_WORK_WORKER_SCAN_INBOX` | Set `1` to scan IMAP on each tick (or pass `--scan-inbox`) |
| `SMTP_HOST` / `secondarySmtpFrom` | Primary + rotation mailbox (via FRE) |

## Scheduler fallback

When no sidecar is running, register an optional heartbeat job:

```bash
curl -X POST http://127.0.0.1:3080/api/work/status \
  -H 'Content-Type: application/json' \
  -d '{"action":"ensure_outbound_heartbeat_job"}'
```

This upserts `work-outbound-heartbeat` (`process_due` skill every 60m). The dashboard `heartbeat:daemon` still calls `process_due` each tick when the worker lock is absent.

## Heartbeat hardening (W28+)

- Kill switch read on every send attempt (`readOutboundKillSwitch`)
- Suppression guard before `executeOutboundSend`
- 2-mailbox round-robin via FRE `secondarySmtpFrom`
- Audit log append on every send/sync/approval

See [EXIT-DEMO.md](./EXIT-DEMO.md) for live mail setup.
