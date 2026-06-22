# Outreach Claw — Release Next

## Shipped (day-one)

- Persistent CRM + sequences in `work-queue.json`
- `/api/work/status` hub (bootstrap, go_live, CRUD, scan, recovery)
- `work.email.send` SMTP bridge (pillar-3 digital_bridges)
- UI panels: Go Live, pipeline, sequences, outbound queue, recovery, mail index
- Agent skills: draft_sequence, send_sequence_step, scan_inbox, summarize_day
- QA smoke: bootstrap, go_live, draft_sequence, scan_inbox, recovery_list

## Shipped (demo hardening sprint)

- [x] **Simulated send** when SMTP unconfigured (`status: simulated` — mirrors Capital/Creator demo paths)
- [x] **Skill double-execute fix** — chat skills refresh desk only after server execution
- [x] **`run_demo_tour`** — lead → sequence → activate → simulated send
- [x] Go Live **`demoReady`** (FRE + lead + sequence activity; SMTP not required)
- [x] Go Live panel demo banner + **Run demo tour** button
- [x] `scripts/work-checklist.mjs` wired into `qa:local` + `qa:work-checklist`
- [x] QA smoke: `run_demo_tour`, `demoReady` on go_live
- [x] Docs: `STARTUP-GUIDE.md`, updated GETTING-STARTED

## Shipped (Tier B — week-one)

- [x] A/B subject line variants per step (`subjectAlt` · variant picked per lead at send)
- [x] Reply intent tagging (interested / objection / OOO / neutral / unknown) — auto on scan + manual override
- [x] Per-mailbox send limits + stagger (`dailySendLimit`, `sendStaggerMinutes` in FRE)
- [x] Open/reply analytics on outbound sends + `track_open` webhook action
- [x] CSV lead import (`import_leads` action + pipeline panel)
- [x] Heartbeat daemon: `process_due` on schedule (due sequence steps)

## Shipped (Professional Workstation W1–W6 — v0.3.6)

- [x] **W1 Desk parity** — `WorkWorkspaceTabs`, bootstrap refresh on mutations, auto-send policy, `demo:capture:work`
- [x] **W2 Connector vault** — `work-connector-registry`, health report, Integrations tab, `liveReady` + `comms_path` Go Live steps
- [x] **W3 Google Workspace** — OAuth route, mail/calendar preview, `morning_brief` + `prep_meeting` skills
- [x] **W4 Notion + Slack** — notion link stub, `sync_notion_lead`, `slack_digest`, interested → Slack notify, `syncLog`
- [x] **W5 Twenty CRM** — GraphQL adapter, `crmBackend` FRE, `sync_crm` / `crm_status`
- [x] **W6 Polish** — day brief v2, won-stage task automation, `N8N-TEMPLATES.md`, extended QA

## Shipped (Excellence arc W7–W11 — v0.3.7)

- [x] **W7 Exit demo** — `EXIT-DEMO.md`, `setup:work-env`, `verify:work-exit-demo-scaffold`, IMAP `work.email.fetch`, Go Live exit CTA
- [x] **W8 Comms** — `WorkInboxTriagePanel`, `draft_reply` skill, `work-mail-sanitize.ts`, assign mail to lead
- [x] **W9 GTM** — `enrich_lead`, sequence `onReplyIntent` branching, `{{unsubscribe_url}}`, Cal.com, approval panel, outbound kill switch
- [x] **W10 Agent** — `/api/work/mcp`, `work-agent-audit`, n8n webhook emitter, Notion pull, HubSpot preview
- [x] **W11 Polish** — `WorkSetupWizard`, kanban pipeline, morning brief panel, OAuth vault links, `demo:record:work`

## Deferred

- LinkedIn automation
- Multi-mailbox rotation at scale
- Salesforce live sync (HubSpot read-only preview shipped)
- Dedicated outbound job worker process
- Full UnInbox-style shared team inbox

## Shipped (Growth leveling WL1–WL6 — v0.3.8)

- [x] **WL1** — FRE `growthIntent`, `WorkLevelBadge`, `growthLevel` persistence, experience sync on FRE
- [x] **WL2** — L1 Explorer surface (opportunities, templates, no CRM jargon)
- [x] **WL3** — L2 Side Hustler (mini-sequences, hustle template packs)
- [x] **WL4** — L3 Operator (approvals, campaigns, connector ops)
- [x] **WL5** — L4/L5 scaffold + level-up nudges
- [x] **WL6** — QA per level (`qa:work-levels`) + Creator/Capital placeholders

See [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) and [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md).
