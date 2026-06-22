# Work Claw — Excellence Phase 2 Build Plan (W21–W28)

> **Baseline:** v0.4.0 · W13–W20 + WL1–WL8 shipped  
> **Prior arc:** [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) (W13–W20, complete)  
> **Landscape:** [BEST-IN-CLASS.md](./BEST-IN-CLASS.md)  
> **Leveling:** [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) · [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Tracking:** [RELEASE-NEXT.md](./RELEASE-NEXT.md)

## North star (Phase 2)

Close the gaps where SaaS still wins — **live connector proof**, **inbox finish-the-job UX**, **deliverability ops**, **CRM live sync**, **signal-aware GTM**, **governance with one-tap approve**, and **cross-Claw OS brief** — without rebuilding UnInbox, Instantly, LinkedIn automation, or Salesforce.

**Target scorecard (post W28):**

| Dimension | v0.4.0 | Target |
|-----------|--------|--------|
| Live connector proof | Demo default | **Live path documented + M365 OAuth** |
| Inbox triage | ~4.3/5 | **~4.7/5** (send, threads, splits) |
| Deliverability UX | ~4.0/5 | **~4.5/5** (suppression, warmup viz, pre-send gate) |
| L4/L5 professional | ~3.8/5 | **~4.3/5** (live CRM, digest, SLA) |
| Cross-Claw OS | Improving | **Leader** (Capital + Creator + unified brief) |
| GTM / signals | Partial | **Signal strip + one-click sequence** |

---

## Scope boundary

### In scope (W21–W28)

| Track | Sprints | Outcome |
|-------|---------|---------|
| **Live proof & naming** | W21 | M365 OAuth E2E, EXIT-DEMO storefront, **Work Claw** product rename |
| **Inbox close-the-loop** | W22 | Thread expand, compose→send, split inboxes, archive keys |
| **Deliverability ops** | W23 | Suppression list, warmup dashboard, pre-send checklist, 2-mailbox rotation |
| **CRM live professional** | W24 | Twenty live conflicts, HubSpot sync, deal-stage automation |
| **Signal-aware GTM** | W25 | Intent strip, signal→lead→mini-sequence |
| **Governance v2** | W26 | Telegram/Slack approve buttons, MCP confirm UI, audit export |
| **Executive + OS** | W27 | Needs-you digest push, SLA chips, Capital handoff, unified OS brief |
| **Cafe + team scaffold** | W28 | Claw Cafe XP consumer, `assignedTo` hooks, worker design |

### Explicitly deferred (unchanged)

- Full UnInbox-style shared team inbox
- LinkedIn automation
- Instantly-style managed warmup SaaS
- Salesforce live sync (HubSpot two-way in W24; SF stays planned)
- Dedicated outbound worker **process** (W28 ships design + heartbeat hardening only)

**Integrate** via Twenty, HubSpot, n8n, MCP, eno2 — do not fork OSS CRM/inbox products.

---

## Execution protocol (continuous + auto-approve)

Agents run this loop **without asking** unless blocked on secrets, destructive git, or push/tag.

### Per-sprint workflow

```
1. Read sprint section + touched files in this doc
2. Implement minimal correct diff (match W13–W20 conventions)
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
- Exclude demo webm/png from commits unless sprint is W21 (GTM assets).

### Agent handoff checklist

At sprint end report: files changed, QA counts, commit hash, acceptance ✅/❌, next sprint ID.

---

## Sprint roadmap (execution order)

```
W21 → W22 → W23 → W24 → W25 → W26 → W27 → W28
```

**Priority rationale:** W21 unlocks buyer trust · W22–W23 daily-desk ROI · W24–W25 revenue lane · W26–W27 L5 + OS moat · W28 when Cafe ready.

---

## Sprint W21 — Live proof, naming & GTM

**Goal:** Buyers see a credible live mail path; product name matches desk vision.

| Task | Files / artifacts |
|------|-------------------|
| **Work Claw** launcher rename; **Outreach** tab label unchanged | `ootb-apps.ts`, `app-agent-catalog.ts`, `MyWorkApp.tsx` header |
| M365 OAuth E2E (mirror Google: link, mail/calendar preview) | `app/api/work/microsoft/route.ts`, `work-microsoft-oauth.ts`, vault panel |
| EXIT-DEMO storefront: copy persona screenshots 24–27 to storefront `public/demo` | `capture-gtm-phase2.mjs`, marketing README |
| `record-work-exit-demo.mjs` → `work-exit-walkthrough.webm` in demo-pack | `scripts/record-work-exit-demo.mjs` |
| Go Live: **liveReady** CTA with deep link to EXIT-DEMO anchor | `WorkGoLivePanel.tsx`, `EXIT-DEMO.md` |
| Morning brief: prefer M365 when linked | `work-morning-brief.ts` |
| Connector vault: M365 `planned` → `oauth` live/demo | `work-connector-registry.ts`, `work-connector-health.ts` |

**Acceptance**

- [ ] Launcher shows **Work Claw**; Outreach tab still labeled Outreach
- [ ] `/api/work/microsoft` POST `start` returns authorize URL when `MICROSOFT_*` set (demo otherwise)
- [ ] `npm run demo:capture:work:levels` produces ≥4 outreach screenshots
- [ ] `verify:work-exit-demo-scaffold` passes
- [ ] `qa:local` pass

**Growth levels:** All (GTM + L4 connectors).

**QA additions:** `microsoft_oauth_status`, `work_claw_rename_smoke` (ootb app name).

---

## Sprint W22 — Inbox close-the-loop

**Goal:** Front/Superhuman-lite finish — read, draft, send, archive without leaving triage.

| Task | Files |
|------|-------|
| Thread expand UI — full message list per thread | `WorkInboxTriagePanel.tsx`, `work-mail-threads.ts` |
| Split inbox strips: **Waiting · Snoozed · Done** | `WorkInboxTriagePanel.tsx`, `WorkStartHomePanel.tsx` |
| `archive_mail` / `mark_mail_done` — hide from waiting strip | `work-store.ts`, `work-queue-types` (`MailIndexEntry.archivedAt`) |
| Keyboard: `e` archive, `d` mark done (extend `useWorkInboxKeys`) | `hooks/useWorkInboxKeys.ts` |
| Compose strip → **Send reply** (simulated or SMTP) | `WorkComposeStrip.tsx`, `work-send-executor` or `draft_reply` + send bridge |
| Light assignment: assign mail to lead + show assignee chip | existing `assign_mail_to_lead` + UI polish |
| API: `archive_mail`, `list_threads` filter archived | `app/api/work/status/route.ts` |

**Acceptance**

- [ ] User expands thread and sees ≥2 messages when seeded
- [ ] Snoozed mail appears in Snoozed strip; archive removes from Waiting
- [ ] Compose can trigger simulated send in demo mode
- [ ] `work-checklist.mjs`: `archive_mail`, `thread_expand_smoke`

**Growth levels:** L1–L3 primary · L4+ inherit.

---

## Sprint W23 — Deliverability ops

**Goal:** L4 operators trust list hygiene and warmup — without Instantly SaaS.

| Task | Files |
|------|-------|
| **Suppression list** — bounce/failed → block future sends to email | `lib/work-suppression.ts`, `work-store`, send policy guard |
| **Warmup dashboard** — 14-day ramp chart from FRE `warmupMode` | `WorkDeliverabilityPanel.tsx`, `work-send-policy.ts` |
| **Pre-send checklist** modal before first live blast | `WorkGoLivePanel.tsx` or `WorkOutboundPanel.tsx` |
| **2-mailbox rotation** — FRE `secondarySmtpFrom`, round-robin on sequences | `app-agent-catalog.ts`, `work-send-executor.ts` |
| Deliverability: suppressed count + unblock action | `WorkDeliverabilityPanel.tsx` |
| Go Live step: suppression empty or acknowledged | `work-go-live.ts` |

**Acceptance**

- [ ] Bounced email cannot receive next sequence step (demo + unit path)
- [ ] Warmup panel shows cap vs sent today
- [ ] Pre-send modal blocks activate when CAN-SPAM fields missing (L3+)
- [ ] `work-checklist.mjs`: `suppression_block`, `warmup_dashboard`, `pre_send_gate`

**Growth levels:** L3 summary · L4+ full panel.

---

## Sprint W24 — CRM live professional

**Goal:** Twenty + HubSpot as real system-of-record adapters — not demo conflicts only.

| Task | Files |
|------|-------|
| Twenty **live** conflict detection (GraphQL people vs local) | `work-crm-conflicts.ts`, `work-twenty-client.ts` |
| HubSpot **push/pull** leads (OAuth or PAT FRE) | `work-hubspot-sync.ts`, `app/api/work/hubspot/route.ts` |
| Pipeline sync badge v2: `synced` / `stale` / `conflict` / `local_only` + tooltip | `WorkPipelinePanel.tsx` |
| Deal stage automation: **won/lost** → pause all sequences for lead | `work-store.ts`, `updateLeadStage` |
| FRE: `hubspotPortalId`, conflict policy UI on Integrations | `WorkCrmConflictPanel.tsx`, onboarding |
| Sync log: per-lead last sync timestamp | `work-queue-types` optional `crmSyncAt` on lead |

**Acceptance**

- [ ] With `TWENTY_*` configured, conflicts reflect real remote diff (or demo fallback logged)
- [ ] `sync_hubspot` action returns imported/pushed counts
- [ ] Won stage pauses active sequences for lead
- [ ] `work-checklist.mjs`: `hubspot_sync`, `won_pauses_sequences`

**Growth levels:** L4+ full · L3 unchanged.

---

## Sprint W25 — Signal-aware GTM

**Goal:** Signal/Clay-lite wedge — intent before cold blast, sovereign.

| Task | Files |
|------|-------|
| **Signal feed** — seeded + webhook ingest (`work.signal.ingest`) | `lib/work-signal-feed.ts`, `work-queue-types` |
| Home / Outreach **Intent strip** — top 5 signals | `WorkSignalStrip.tsx`, `WorkStartHomePanel.tsx` |
| One-click: signal → `create_lead` + `create_mini_sequence` | `MyWorkApp.tsx`, API `signal_to_opportunity` |
| Enrich on signal accept (reuse `enrich_lead`) | `work-lead-enrichment.ts` |
| n8n template doc: RSS → signal webhook | `docs/outreach-claw/N8N-TEMPLATES.md` |
| Growth gate: L2+ sees strip | `work-level-gates.ts` |

**Acceptance**

- [ ] Demo seeds ≥3 signals; click creates lead + sequence
- [ ] Webhook receipt appends signal row (dev-qa or store)
- [ ] `qa-user-flows.mjs`: `signal_to_opportunity`
- [ ] `work-checklist.mjs`: `signal_feed_list`, `signal_convert`

**Growth levels:** L2–L4 primary.

---

## Sprint W26 — Agent governance v2

**Goal:** One-tap approve from phone; visible MCP confirm — Capital parity.

| Task | Files |
|------|-------|
| Telegram **inline buttons** Approve / Reject → API | `work-approval-notify.ts`, `app/api/work/approval-callback/route.ts` |
| Slack **interactive blocks** (or link with signed token) | reuse content-approval-slack patterns |
| **MCP confirm card** in desk UI before execute send | `MyWorkApp.tsx` modal, `work-mcp-server.ts` |
| **Audit export** CSV/JSON download | `WorkAuditTimelinePanel.tsx`, API `audit_export` |
| Approval deep link: `/my-work?tab=ops&sendId=` | `MyWorkApp.tsx` URL params |

**Acceptance**

- [ ] Demo mode: Telegram callback logs approve action (no real bot required in CI)
- [ ] MCP `send_sequence_preview` with `confirm:false` shows card; `confirm:true` executes
- [ ] Audit export returns ≥1 row in demo
- [ ] `work-checklist.mjs`: `approval_callback_demo`, `audit_export`, `mcp_confirm_ui`

**Growth levels:** L3+ approvals · L4+ MCP confirm.

---

## Sprint W27 — Executive layer & cross-Claw OS

**Goal:** L5 digest + OS brief no competitor ships on-appliance.

| Task | Files |
|------|-------|
| **Needs-you digest** — email/Telegram morning (stalls + approvals + P1) | `lib/work-needs-you-digest.ts`, scheduler job |
| **SLA chips** on Needs-you (amber >24h, red >72h) | `WorkNeedsYouPanel.tsx`, `work-stall-detection.ts` |
| **Capital → Work handoff** — intel ticker / reply → opportunity | `MyCapitalApp.tsx`, `work-handoff.ts` |
| **Unified OS brief** skill — Work + Creator + Capital counts | `lib/work-morning-brief.ts` → `lib/os-morning-brief.ts` or extend |
| `assignedTo` on tasks + mail (schema + UI chip) | `work-queue-types`, panels |
| Executive brief: export shareable text | `WorkExecutiveBriefPanel.tsx` |

**Acceptance**

- [ ] `needs_you_digest` action sends demo log entry
- [ ] Capital handoff creates lead with `handoff:my-capital` tag
- [ ] `morning_brief` mentions cross-claw counts when seeded
- [ ] `qa-user-flows.mjs`: `capital_to_work_handoff`
- [ ] L5 `qa-work-levels` still passes

**Growth levels:** L5 primary · L4 sees digest opt-in.

---

## Sprint W28 — Claw Cafe XP & scale scaffold

**Prerequisite:** Claw Cafe shell can read XP API or dev-qa file.

| Task | Files |
|------|-------|
| Cafe **consumes** `work-xp-events.json` or `/api/work/xp` | `app/api/work/xp/route.ts`, Claw Cafe panel |
| XP UI: streak + last 5 work events | `claw-cafe` components (minimal) |
| Cross-Claw bonus: publish + follow-up same week | `lib/claw-cafe-bonus.ts` |
| User setting: opt out gamification | `user-settings-types.ts` |
| **Outbound worker** design doc + heartbeat hardening notes | `docs/outreach-claw/OUTBOUND-WORKER.md` |
| Team role scaffold: `viewer` / `operator` / `admin` on desk (FRE only) | `work-permissions.ts` stub |

**Acceptance**

- [ ] Work action emits XP → Cafe shows event within 60s (demo)
- [ ] Opt-out suppresses emit
- [ ] No regression in `qa:local`
- [ ] `work-checklist.mjs`: `xp_list`, `xp_opt_out`

**Growth levels:** All (optional gamification).

---

## Feature × sprint matrix

| Feature | W21 | W22 | W23 | W24 | W25 | W26 | W27 | W28 |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Work Claw rename | ✅ | | | | | | | |
| M365 OAuth live | ✅ | | | | | | | |
| EXIT-DEMO storefront | ✅ | | | | | | | |
| Thread expand | | ✅ | | | | | | |
| Compose → send | | ✅ | | | | | | |
| Inbox splits + archive | | ✅ | | | | | | |
| Suppression list | | | ✅ | | | | | |
| Warmup dashboard | | | ✅ | | | | | |
| Pre-send checklist | | | ✅ | | | | | |
| 2-mailbox rotation | | | ✅ | | | | | |
| Twenty live conflicts | | | | ✅ | | | | |
| HubSpot sync | | | | ✅ | | | | |
| Won → pause sequences | | | | ✅ | | | | |
| Signal strip | | | | | ✅ | | | |
| Signal → sequence | | | | | ✅ | | | |
| Telegram approve buttons | | | | | | ✅ | | |
| MCP confirm UI | | | | | | ✅ | | |
| Audit export | | | | | | ✅ | | |
| Needs-you digest | | | | | | | ✅ | |
| Capital handoff | | | | | | | ✅ | |
| Unified OS brief | | | | | | | ✅ | |
| Claw Cafe XP UI | | | | | | | | ✅ |
| Team permissions stub | | | | | | | | ✅ |

---

## QA expansion plan

| Sprint | New checks (`work-checklist` / `qa-user-flows` / `qa-work-levels`) |
|--------|---------------------------------------------------------------------|
| W21 | `microsoft_oauth_status`, ootb name **Work Claw** |
| W22 | `archive_mail`, `thread_expand_smoke`, `compose_send_simulated` |
| W23 | `suppression_block`, `warmup_dashboard`, `pre_send_gate` |
| W24 | `hubspot_sync`, `won_pauses_sequences`, `crm_sync_badge` |
| W25 | `signal_feed_list`, `signal_convert` · flow `signal_to_opportunity` |
| W26 | `approval_callback_demo`, `audit_export`, `mcp_confirm_dry_run` |
| W27 | `needs_you_digest`, `capital_to_work_handoff` · flow handoff |
| W28 | `xp_list`, `xp_opt_out` |

**CI note:** Capital checklist flake fix (`2e47ecd`) must stay green — use fresh rule + trade id pattern.

---

## Version tags (suggested)

| Tag | After | Contents |
|-----|-------|----------|
| **v0.4.1** | W21 | Live proof + Work Claw naming + M365 |
| **v0.4.2** | W22 | Inbox close-the-loop |
| **v0.4.3** | W23 | Deliverability ops |
| **v0.4.4** | W24 | CRM live (Twenty + HubSpot) |
| **v0.4.5** | W25 | Signal-aware GTM |
| **v0.5.0** | W26 + W27 | Governance v2 + executive OS |
| **v0.5.1** | W28 | Claw Cafe XP + team scaffold |

---

## Success metrics (Phase 2)

| Metric | Target |
|--------|--------|
| `liveReady` within 7 days (L4 cohort) | > 50% |
| Inbox triage without mouse (keyboard path) | 100% of L1 tour steps |
| Bounce → suppressed within 1 scan | 100% |
| Signal → sequence in < 2 min | > 80% demo completion |
| Approval from Telegram callback (configured) | < 30s median |
| Cross-claw handoff (Creator + Capital) | Both in qa-user-flows |

---

## New modules preview

| File | Sprint |
|------|--------|
| `lib/work-microsoft-oauth.ts` | W21 |
| `lib/work-suppression.ts` | W23 |
| `lib/work-hubspot-sync.ts` | W24 |
| `lib/work-signal-feed.ts` | W25 |
| `components/apps/work/WorkSignalStrip.tsx` | W25 |
| `app/api/work/approval-callback/route.ts` | W26 |
| `lib/work-needs-you-digest.ts` | W27 |
| `lib/os-morning-brief.ts` | W27 |
| `app/api/work/xp/route.ts` | W28 |
| `lib/work-permissions.ts` | W28 |
| `docs/outreach-claw/OUTBOUND-WORKER.md` | W28 |

---

## References

- [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — competitive landscape + v0.4.0 scorecard
- [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) — W13–W20 (complete)
- [EXIT-DEMO.md](./EXIT-DEMO.md) — live mail setup
- [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) — WL1–WL8
- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — ship log
- [N8N-TEMPLATES.md](./N8N-TEMPLATES.md) — webhook glue

## Next action

Phase 2 complete (v0.5.1). See [RELEASE-NEXT.md](./RELEASE-NEXT.md) for post-ship items.
