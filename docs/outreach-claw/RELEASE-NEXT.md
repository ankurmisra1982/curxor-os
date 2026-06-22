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

## Shipped (Growth leveling WL7 — persona polish — v0.3.9)

- [x] **WL7** — Per-level demo tours (L1 opportunity + template + draft · L2 mini-sequence · L3 approval queue)
- [x] Inbox hero — People waiting click-through · unassigned/replied/all strip · draft reply
- [x] Template UX — copy-to-clipboard + Use in draft
- [x] Pipeline quick actions — Enrich / book meeting on selected row (L2+)
- [x] Dual-gate cleanup — `skipExperienceGate` on growth-gated Work sections

## Shipped (W12 — deliverability — v0.3.9)

- [x] Deliverability panel — domain health, reputation score, failure surfacing (Ops L3+)
- [x] Go Live domain_health step + chip
- [x] Sequence editor unsubscribe preview for `{{unsubscribe_url}}`
- [x] Outbound bounce-like failure labels

## Shipped (WL8 — QA matrix — v0.3.9)

- [x] `qa-work-levels.mjs` L1–L5 persona fixtures
- [x] L3 approval tour in work-checklist · checklist dedup
- [x] Demo captures L1/L2/L3 in `capture-gtm-phase2.mjs`
- [x] `BEST-IN-CLASS.md` refresh

## Shipped (W13–W20 — best-in-class excellence arc — v0.4.0)

- [x] **W13** — `demo:capture:work:levels`, `record-work-exit-demo.mjs`, STARTUP-GUIDE persona one-liners, Go Live exit CTA
- [x] **W14** — Mail threads, snooze→task, keyboard triage (`useWorkInboxKeys`), `WorkComposeStrip`
- [x] **W15** — DNS SPF/DKIM/DMARC, bounce→pause sequence, warmup ramp FRE, CAN-SPAM compliance go-live step
- [x] **W16** — Twenty conflict UI, M365 OAuth scaffold, pipeline sync badges
- [x] **W17** — Executive brief v2, stall detection, `WorkNeedsYouPanel`, L5 default ops tab
- [x] **W18** — MCP send preview (dry_run), approval notify demo log, `WorkAuditTimelinePanel`
- [x] **W19** — Cross-Claw handoff API + Creator “Add to Work”, morning brief cross-claw strip
- [x] **W20** — `work-xp-events.ts` stub (Claw Cafe consumes events)

## Shipped (Phase 2 excellence W21–W28 — v0.5.1)

- [x] **W21** — Work Claw rename, M365 OAuth E2E, `work-microsoft-oauth.ts`, liveReady EXIT-DEMO CTA
- [x] **W22** — Thread expand, inbox splits (waiting/snoozed/done), archive/done keys, compose→send
- [x] **W23** — Suppression list, warmup dashboard fields, pre-send gate, 2-mailbox rotation FRE
- [x] **W24** — HubSpot sync, Twenty live conflicts, won→pause sequences, CRM sync badges
- [x] **W25** — Signal feed + `WorkSignalStrip`, signal→lead→sequence, `N8N-TEMPLATES.md`
- [x] **W26** — Approval callback route, audit export, MCP confirm smoke
- [x] **W27** — Needs-you digest, OS morning brief, Capital handoff flow QA
- [x] **W28** — `/api/work/xp`, gamification opt-out, `OUTBOUND-WORKER.md`, permissions stub
- [x] Work checklist **55/55** · user flows **25/25** · `qa:local` green

## Shipped (Phase 3 excellence W29 — v0.5.2)

- [x] **W29** — Live proof GTM: `verify:work-live-proof`, EXIT-DEMO live-ready runbook, `record-work-exit-demo.mjs`, persona screenshots 24–29, connector vault live-proof badge, morning brief live mail source metadata
- [x] Work checklist **57/57** · `verify:work-live-proof` in `qa:local`

## Shipped (Phase 3 excellence W30 — v0.5.3)

- [x] **W30** — Inbox pro: compose undo window, snooze return, reply parser, home/triage strip alignment, `undo_send` / `clear_snooze` / `finalize_send`
- [x] Work checklist **60/60**

## Next

**Phase 3 excellence arc (W31–W35)** — see [EXCELLENCE-PHASE3-BUILD-PLAN.md](./EXCELLENCE-PHASE3-BUILD-PLAN.md).

| Sprint | Focus | Target tag |
|--------|--------|------------|
| W29 | Live proof GTM + EXIT-DEMO video | v0.5.2 ✓ |
| W30 | Inbox pro (live send, undo, snooze return) | v0.5.3 ✓ |
| W31 | Deliverability operator UI | v0.5.4 |
| W32–W33 | Outbound worker + team lite | v0.6.0 |
| W34 | HubSpot OAuth + activity timeline | v0.6.1 |
| W35 | OS moat + Cafe XP + governance UI | v0.6.2 |

Deferred items unchanged — see **Deferred** above.

