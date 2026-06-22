# Work Claw — Excellence Phase 3 Build Plan (W29–W35)

> **Baseline:** v0.5.1 · W21–W28 + W13–W20 + WL1–WL8 shipped  
> **Prior arc:** [EXCELLENCE-PHASE2-BUILD-PLAN.md](./EXCELLENCE-PHASE2-BUILD-PLAN.md) (W21–W28, complete)  
> **Landscape:** [BEST-IN-CLASS.md](./BEST-IN-CLASS.md)  
> **Leveling:** [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) · [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Tracking:** [RELEASE-NEXT.md](./RELEASE-NEXT.md)

## North star (Phase 3)

Move from **strong sovereign demo** to **best-in-class appliance GTM** — prove live mail once for buyers, finish inbox send/reply in the UI, operationalize deliverability and outbound scale, enable team-lite collaboration, and make **cross-Claw OS** the moat no SaaS desk ships on bare metal.

**Target scorecard (post W35):**

| Dimension | v0.5.1 | Target |
|-----------|--------|--------|
| Live connector proof | OAuth + demo paths | **Recorded live proof** (send + reply ingest) |
| Inbox triage | ~4.7/5 | **~4.9/5** (live send, undo, snooze return) |
| Deliverability UX | API + chips (~4.5/5) | **~4.8/5** (modal, chart, suppression UI) |
| L4/L5 professional | ~4.3/5 | **~4.7/5** (worker, HubSpot OAuth, SLA UI) |
| Cross-Claw OS | Brief + handoffs (partial demo counts) | **Leader** (live counts + playbooks) |
| Team / governance | Permissions stub | **Operator-grade** (roles enforced, phone approve) |
| GTM / signals | Strip + convert | **Enrichment + step analytics** |

---

## Scope boundary

### In scope (W29–W35)

| Track | Sprints | Outcome |
|-------|---------|---------|
| **Live proof GTM** | W29 | EXIT-DEMO video, storefront assets, live mail verification script |
| **Inbox pro** | W30 | Live SMTP reply, undo window, snooze auto-return, home strips polish |
| **Deliverability UI** | W31 | Pre-send modal, warmup chart, suppression manage panel |
| **Outbound worker** | W32 | Sidecar process for `process_due` + IMAP scan |
| **Team inbox lite** | W33 | Assignee collision, internal note, permissions enforced |
| **CRM system-of-record** | W34 | HubSpot OAuth two-way, lead activity timeline |
| **OS moat** | W35 | Live OS brief, cross-Claw playbooks, Cafe XP UI, trust center |

### Explicitly deferred (unchanged)

- Full UnInbox-style shared team inbox (W33 is **lite** — assignee + collision only)
- LinkedIn automation
- Instantly-style managed warmup SaaS (warmup remains self-managed ramp)
- Salesforce live sync
- Multi-mailbox rotation at scale (2-box rotation shipped W23; scale = n8n/ops)

**Integrate** via Twenty, HubSpot OAuth, UnInbox (future sidecar), n8n templates, eno2 — do not fork OSS CRM/inbox products.

---

## Execution protocol (continuous + auto-approve)

Agents run this loop **without asking** unless blocked on secrets, destructive git, or push/tag.

### Per-sprint workflow

```
1. Read sprint section + touched files in this doc
2. Implement minimal correct diff (match W21–W28 conventions)
3. npm run typecheck
4. npm run qa:local -- --port N   (N = 3081–3099 if 3080 busy)
5. Extend work-checklist.mjs + qa-work-levels.mjs (+ qa-user-flows if cross-claw)
6. Update RELEASE-NEXT.md + BEST-IN-CLASS.md score notes
7. Commit: "Ship Work Claw W{N} — <short title>."
8. Tag only on milestone minors (see Version tags) — not every sprint
```

### QA gates (must pass before commit)

| Command | Gate |
|---------|------|
| `npm run typecheck` | 0 errors |
| `npm run qa:local -- --port N` | 0 failures (smoke + capital + creator + work + levels + flows) |
| `npm run qa:work-excellence` | Optional fast loop (work-checklist + levels only) |

### Auto-approve rules

- Run QA on ephemeral port — do not kill dev server on 3080.
- Do **not** commit `scripts/dev-qa/*.json`, `.env`, secrets, `.next/`.
- Do **not** force-push `master`.
- **Push/tag only when user explicitly requests release** (sprints commit locally by default).
- W29 may commit GTM webm/png in `docs/demo-pack/` only.

### Agent handoff checklist

At sprint end report: files changed, QA counts, commit hash, acceptance ✅/❌, next sprint ID.

---

## Sprint roadmap (execution order)

```
W29 → W30 → W31 → W32 → W33 → W34 → W35
```

**Priority rationale:** W29 buyer trust · W30–W31 daily-desk ROI · W32 reliability · W33–W34 L4 team + CRM · W35 OS moat + Cafe.

---

## Sprint W29 — Live proof GTM & buyer EXIT-DEMO

**Goal:** One shippable story — linked mailbox, real send, reply ingested — captured for storefront and QA.

| Task | Files / artifacts |
|------|-------------------|
| **EXIT-DEMO** live-ready runbook: Google **or** M365 path end-to-end | `EXIT-DEMO.md`, `STARTUP-GUIDE.md` |
| `record-work-exit-demo.mjs` → `work-exit-walkthrough.webm` | `scripts/record-work-exit-demo.mjs`, `docs/demo-pack/` |
| Persona screenshots **24–27** → storefront `public/demo` | `capture-gtm-phase2.mjs`, marketing README |
| `verify:work-live-proof` — SMTP + (Google **or** M365 linked **or** IMAP) + `liveReady` | `scripts/verify-work-live-proof.mjs`, `package.json` |
| Connector vault: **live proof** badge when `liveReady` + linked OAuth | `WorkConnectorVaultPanel.tsx`, `work-go-live.ts` |
| Morning brief shows **live** mail source (not demo) when linked | `work-morning-brief.ts`, `work-google-client.ts`, `work-microsoft-client.ts` |

**Acceptance**

- [x] `npm run verify:work-live-proof` passes in demo mode (documents live path when keys absent)
- [x] `verify:work-exit-demo-scaffold` still passes
- [x] `work-exit-walkthrough.webm` recorded (or scaffold documents skip when headless)
- [x] `demo:capture:work:levels` produces ≥4 outreach screenshots including live-ready panel
- [x] `qa:local` pass

**Growth levels:** All (GTM + L4 connectors).

**QA additions:** `live_proof_scaffold`, `mail_source_live_when_linked` (demo skip OK).

---

## Sprint W30 — Inbox pro (Superhuman-lite finish)

**Goal:** Operators trust send/reply — live path, undo, snooze that returns.

| Task | Files |
|------|-------|
| Compose → **live SMTP send** with sent/failed toast + outbound queue link | `WorkComposeStrip.tsx`, `work-send-executor.ts`, `MyWorkApp.tsx` |
| **Undo send** — 5–10s cancel window (demo: mark skipped) | `work-store.ts`, `work-send-executor.ts` |
| Snooze **auto-return** — `snoozedUntil` clears Waiting; task completes on return | `work-store.ts`, scheduler or `process_due` hook |
| Home strips: Waiting / Snoozed / Done aligned with triage panel | `WorkStartHomePanel.tsx` |
| **email-reply-parser** — better reply detection on scan | `work-mail-sanitize.ts` or new `work-reply-parser.ts`, `scanLocalMailQueue` |
| Keyboard: `u` undo (when window open) | `hooks/useWorkInboxKeys.ts` |
| API: `undo_send`, `clear_snooze` | `app/api/work/status/route.ts` |

**Acceptance**

- [x] Live SMTP: compose send records `sent` or `simulated` with clear status in UI
- [x] Undo within window marks send `skipped` (demo path OK)
- [x] Snoozed mail reappears in Waiting after `snoozedUntil` (demo: API force-clear)
- [x] `work-checklist.mjs`: `compose_send_live_status`, `undo_send_smoke`, `snooze_return`

**Growth levels:** L1–L4 primary.

---

## Sprint W31 — Deliverability operator UI

**Goal:** Surface W23 APIs as L4 operator UI — modal, chart, suppression manage.

| Task | Files |
|------|-------|
| **Pre-send modal** before `activate_sequence` when live SMTP + gate fails | `WorkOutboundPanel.tsx` or `WorkSequencePanel.tsx`, `checkPreSendGate` |
| **Warmup chart** — 14-day ramp vs sends (Recharts or CSS bars) | `WorkDeliverabilityPanel.tsx` |
| **Suppression panel** — list, unblock, bounce reason | `WorkDeliverabilityPanel.tsx`, `work-suppression.ts` |
| Go Live: suppression acknowledged step (UI checkbox) | `work-go-live.ts`, `WorkGoLivePanel.tsx` |
| Trust center strip: kill switch + suppression count + egress hint | `WorkSendPolicyPanel.tsx` or new `WorkTrustCenterPanel.tsx` |
| Bounce scan on `scan_inbox` → auto-suppress | `work-suppression.ts`, `scanLocalMailQueue` |

**Acceptance**

- [ ] Pre-send modal blocks activate when `physicalAddress` / `optOutLine` missing (L3+ live)
- [ ] Warmup chart shows cap vs `sendsToday`
- [ ] Operator can unblock suppressed email in UI
- [ ] `work-checklist.mjs`: `pre_send_modal_block`, `suppression_unblock`, `warmup_chart_smoke`

**Growth levels:** L3 summary · L4+ full panel.

---

## Sprint W32 — Outbound worker v1

**Goal:** Sequences and IMAP off the Next.js process — 24/7 appliance behavior.

| Task | Files |
|------|-------|
| Extract `processDueSequenceSteps` + IMAP scan to **`worker/outbound.mjs`** | `pillar-4-dashboard/worker/outbound.mjs` |
| `npm run work:outbound-worker` + systemd note | `package.json`, `OUTBOUND-WORKER.md` |
| Lock file: dashboard skips `process_due` when worker claims lock | `work-send-executor.ts`, `app/api/work/status/route.ts` |
| Shared queue path via `CURXOR_WORK_QUEUE_PATH` | `work-store.ts` |
| Scheduler job: optional `work_outbound_heartbeat` | `scripts/dev-qa/scheduler/` pattern, scheduler API |
| Worker emits receipts → existing receipt handler | `work-receipt-handler.ts` |

**Acceptance**

- [ ] Worker runs `process_due` once and exits 0 in demo (no SMTP)
- [ ] Dashboard `process_due` no-ops when `CURXOR_WORK_OUTBOUND_LOCK` set
- [ ] `OUTBOUND-WORKER.md` updated with run + env table
- [ ] `work-checklist.mjs`: `outbound_worker_lock_smoke`
- [ ] No regression in `qa:local`

**Growth levels:** L4+ ops · L1–L3 unchanged (heartbeat in dashboard OK for demo).

---

## Sprint W33 — Team inbox lite & permissions

**Goal:** Front-lite assignee UX without forking UnInbox — collision + roles enforced.

| Task | Files |
|------|-------|
| **Permissions enforced** — viewer cannot send/approve; admin configures | `work-permissions.ts`, `work-send-executor.ts`, `MyWorkApp.tsx` |
| FRE: `deskRole` → viewer / operator / admin | `app-agent-catalog.ts`, `app-fre-state` |
| **Assignee collision** — warn if mail already assigned to another operator | `assignMailToLead`, `WorkInboxTriagePanel.tsx` |
| Internal **note** on mail thread (local only, not email) | `work-queue-types` `MailIndexEntry.internalNote`, UI chip |
| Needs-you: filter by `assignedTo` | `work-needs-you.ts`, `WorkNeedsYouPanel.tsx` |
| Optional: n8n webhook on assign | `work-webhook-emitter.ts` |

**Acceptance**

- [ ] Viewer role: send/approve actions return 403 or UI disabled
- [ ] Assign shows collision warning when `assignedTo` differs
- [ ] Internal note persists on mail row
- [ ] `work-checklist.mjs`: `permissions_viewer_block`, `assign_collision_smoke`

**Growth levels:** L4 team · L5 full.

---

## Sprint W34 — CRM system-of-record & activity timeline

**Goal:** HubSpot OAuth two-way + per-lead activity — Twenty remains sync adapter.

| Task | Files |
|------|-------|
| HubSpot **OAuth** link session (mirror Google/M365) | `work-hubspot-oauth.ts`, `app/api/work/hubspot/route.ts` |
| Two-way sync: deals/contacts push + webhook pull stub | `work-hubspot-sync.ts` |
| **Lead activity timeline** — sends, stage changes, sync, handoffs | `lib/work-lead-activity.ts`, `WorkPipelinePanel.tsx` |
| Pipeline: activity tab on selected lead | `WorkPipelineKanban.tsx` or detail drawer |
| Twenty: sync log v2 with last error surface | `work-crm-sync.ts`, `WorkCrmConflictPanel.tsx` |
| FRE: `hubspotPortalId` + OAuth link in Integrations | `WorkConnectorVaultPanel.tsx` |

**Acceptance**

- [ ] HubSpot OAuth `start` returns authorize URL when configured (demo otherwise)
- [ ] `sync_hubspot` with OAuth pushes ≥1 lead (demo counts OK)
- [ ] Activity timeline shows ≥3 event types for seeded lead
- [ ] `work-checklist.mjs`: `hubspot_oauth_status`, `lead_activity_timeline`

**Growth levels:** L4+ full.

---

## Sprint W35 — OS moat, playbooks & Cafe XP UI

**Goal:** Cross-Claw OS no competitor ships; optional gamification visible.

| Task | Files |
|------|-------|
| **OS brief live** — Creator + Capital counts from real stores (not constants) | `lib/os-morning-brief.ts`, content/capital status readers |
| **Cross-Claw playbooks** — e.g. Capital alert → Work opp → Creator post | `lib/os-playbooks.ts`, API `run_os_playbook` |
| Creator UI: Capital intel → handoff button (if missing) | `MyCapitalApp.tsx`, `MyContentApp.tsx` |
| **Claw Cafe XP panel** — streak + last 5 work events from `/api/work/xp` | `ClawCafeApp.tsx` or work section in Cafe |
| **SLA chips** UI on Needs-you (>24h amber, >72h red) | `WorkNeedsYouPanel.tsx` |
| Telegram **inline** Approve/Reject (real bot when token set) | `work-approval-notify.ts` |
| MCP confirm **modal** in desk (W26 API → UI) | `MyWorkApp.tsx`, `WorkApprovalPanel.tsx` |
| Sequence **step analytics** — open/reply rate per step | `WorkAnalyticsPanel.tsx`, `work-analytics.ts` |
| Update `BEST-IN-CLASS.md` scorecard to v0.6.x | docs |

**Acceptance**

- [ ] `os_morning_brief` includes non-zero Creator/Capital counts from status APIs
- [ ] `run_os_playbook` demo creates lead + tags `playbook:capital-alert`
- [ ] Cafe shows ≥1 work XP event when gamification enabled
- [ ] SLA chips visible on stalled items in Needs-you panel
- [ ] `qa-user-flows.mjs`: `os_playbook_capital_work`, `cafe_work_xp_smoke`
- [ ] `work-checklist.mjs`: `os_brief_live_counts`, `mcp_confirm_ui`, `sla_chips_smoke`

**Growth levels:** L5 primary · L2–L4 playbooks opt-in.

---

## Feature × sprint matrix

| Feature | W29 | W30 | W31 | W32 | W33 | W34 | W35 |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Live proof video + verify script | ✅ | | | | | | |
| Live SMTP compose send | | ✅ | | | | | |
| Undo send | | ✅ | | | | | |
| Snooze auto-return | | ✅ | | | | | |
| email-reply-parser | | ✅ | | | | | |
| Pre-send modal UI | | | ✅ | | | | |
| Warmup chart | | | ✅ | | | | |
| Suppression manage UI | | | ✅ | | | | |
| Trust center strip | | | ✅ | | | | |
| Outbound worker process | | | | ✅ | | | |
| Worker lock / dashboard defer | | | | ✅ | | | |
| Permissions enforced | | | | | ✅ | | |
| Assignee collision | | | | | ✅ | | |
| Mail internal notes | | | | | ✅ | | |
| HubSpot OAuth | | | | | | ✅ | |
| Lead activity timeline | | | | | | ✅ | |
| OS brief live counts | | | | | | | ✅ |
| Cross-Claw playbooks | | | | | | | ✅ |
| Claw Cafe XP UI | | | | | | | ✅ |
| SLA chips UI | | | | | | | ✅ |
| Telegram inline approve | | | | | | | ✅ |
| MCP confirm modal | | | | | | | ✅ |
| Step analytics | | | | | | | ✅ |

---

## QA expansion plan

| Sprint | New checks (`work-checklist` / `qa-user-flows` / `qa-work-levels`) |
|--------|---------------------------------------------------------------------|
| W29 | `live_proof_scaffold`, `verify_work_live_proof` script in `qa:local` optional gate |
| W30 | `compose_send_live_status`, `undo_send_smoke`, `snooze_return` |
| W31 | `pre_send_modal_block`, `suppression_unblock`, `warmup_chart_smoke` |
| W32 | `outbound_worker_lock_smoke` |
| W33 | `permissions_viewer_block`, `assign_collision_smoke` |
| W34 | `hubspot_oauth_status`, `lead_activity_timeline` |
| W35 | `os_brief_live_counts`, `mcp_confirm_ui`, `sla_chips_smoke` · flows `os_playbook_capital_work`, `cafe_work_xp_smoke` |

**CI note:** Capital checklist arm+execute uses `execute_now` + rule linkage (`bd244b8+`) — do not regress.

---

## Version tags (suggested)

| Tag | After | Contents |
|-----|-------|----------|
| **v0.5.2** | W29 | Live proof GTM + EXIT-DEMO assets |
| **v0.5.3** | W30 | Inbox pro (live send, undo, snooze) |
| **v0.5.4** | W31 | Deliverability operator UI |
| **v0.6.0** | W32 + W33 | Outbound worker + team lite |
| **v0.6.1** | W34 | HubSpot OAuth + activity timeline |
| **v0.6.2** | W35 | OS moat + Cafe XP + governance UI |

---

## Success metrics (Phase 3)

| Metric | Target |
|--------|--------|
| Buyer can complete live EXIT-DEMO in < 30 min (documented) | 100% of runbook steps |
| Compose → live send success rate (configured SMTP) | > 95% in QA fixture |
| Bounce → suppressed on next `scan_inbox` | 100% |
| Worker processes due steps with dashboard lock | 0 double-sends in QA |
| Viewer role cannot execute send | 100% block rate |
| HubSpot OAuth sync (configured) | import + push counts > 0 |
| OS brief shows live cross-claw counts | Non-demo constants in brief |
| Approval from Telegram inline (configured) | < 30s median |
| Work checklist after W35 | ≥ 65 checks green |

---

## New modules preview

| File | Sprint |
|------|--------|
| `scripts/verify-work-live-proof.mjs` | W29 |
| `lib/work-reply-parser.ts` | W30 |
| `components/apps/work/WorkTrustCenterPanel.tsx` | W31 |
| `pillar-4-dashboard/worker/outbound.mjs` | W32 |
| `lib/work-mail-notes.ts` | W33 |
| `lib/work-hubspot-oauth.ts` | W34 |
| `lib/work-lead-activity.ts` | W34 |
| `lib/os-playbooks.ts` | W35 |
| `components/apps/work/WorkLeadActivityPanel.tsx` | W34 |

---

## References

- [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — competitive landscape + scorecard
- [EXCELLENCE-PHASE2-BUILD-PLAN.md](./EXCELLENCE-PHASE2-BUILD-PLAN.md) — W21–W28 (complete)
- [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) — W13–W20 (complete)
- [EXIT-DEMO.md](./EXIT-DEMO.md) — live mail setup
- [OUTBOUND-WORKER.md](./OUTBOUND-WORKER.md) — worker design (W32 implements v1)
- [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) — WL1–WL8
- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — ship log
- [N8N-TEMPLATES.md](./N8N-TEMPLATES.md) — webhook glue

## Next action

Start **Sprint W29** — live proof GTM, `verify-work-live-proof`, EXIT-DEMO walkthrough. Run `npm run typecheck` + `npm run qa:local -- --port 3088` before commit.
