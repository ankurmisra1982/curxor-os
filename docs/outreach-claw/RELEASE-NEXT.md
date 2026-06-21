# Outreach Claw — Release Next

## Shipped (day-one)

- Persistent CRM + sequences in `work-queue.json`
- `/api/work/status` hub (bootstrap, go_live, CRUD, scan, recovery)
- `work.email.send` SMTP bridge (pillar-3 digital_bridges)
- UI panels: Go Live, pipeline, sequences, outbound queue, recovery, mail index
- Agent skills: draft_sequence, send_sequence_step, scan_inbox, summarize_day
- QA smoke: bootstrap, go_live, draft_sequence, scan_inbox, recovery_list

## Shipped (Tier B — week-one)

- [x] A/B subject line variants per step (`subjectAlt` · variant picked per lead at send)
- [x] Reply intent tagging (interested / objection / OOO / neutral / unknown) — auto on scan + manual override
- [x] Per-mailbox send limits + stagger (`dailySendLimit`, `sendStaggerMinutes` in FRE)
- [x] Open/reply analytics on outbound sends + `track_open` webhook action
- [x] CSV lead import (`import_leads` action + pipeline panel)
- [x] Heartbeat daemon: `process_due` on schedule (due sequence steps)

## Deferred

- LinkedIn automation
- Multi-mailbox rotation at scale
- Salesforce/HubSpot sync
- Dedicated outbound job worker process
- Real IMAP ingest (today: local mail index + demo scan)
