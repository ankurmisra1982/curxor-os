# Outreach Claw — Release Next

## Shipped (day-one)

- Persistent CRM + sequences in `work-queue.json`
- `/api/work/status` hub (bootstrap, go_live, CRUD, scan, recovery)
- `work.email.send` SMTP bridge (pillar-3 digital_bridges)
- UI panels: Go Live, pipeline, sequences, outbound queue, recovery, mail index
- Agent skills: draft_sequence, send_sequence_step, scan_inbox, summarize_day
- QA smoke: bootstrap, go_live, draft_sequence, scan_inbox, recovery_list

## Week-one (Tier B)

- [ ] A/B subject line variants per step
- [ ] Reply intent tagging (interested / objection / OOO)
- [ ] Per-mailbox send limits + stagger
- [ ] Open/reply analytics (IMAP ingest or webhook)
- [ ] CSV lead import
- [ ] Heartbeat daemon: `process_due` on schedule

## Deferred

- LinkedIn automation
- Multi-mailbox rotation at scale
- Salesforce/HubSpot sync
- Dedicated outbound job worker process
