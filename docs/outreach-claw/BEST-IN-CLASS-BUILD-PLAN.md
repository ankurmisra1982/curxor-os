# Work Claw — Best-in-Class Build Plan (W13–W20)

> **Baseline:** v0.3.9 · WL1–WL8 + W12 shipped  
> **Landscape:** [BEST-IN-CLASS.md](./BEST-IN-CLASS.md)  
> **Leveling:** [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) · [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md)  
> **Tracking:** [RELEASE-NEXT.md](./RELEASE-NEXT.md)

## North star

Work Claw is the **sovereign professional coordination desk** — not a cloud CRM clone.

Best in class **for this purpose** means:

1. **L1–L3:** Reply and opportunity desk that wins on speed, polish, and safety (simulated send).
2. **L4:** Revenue outreach with **live mail proof** and deliverability trust.
3. **L5:** Executive signal — stall detection, governance, delegation.
4. **OS moat:** Cross-Claw handoffs and Claw Cafe progression (when Cafe ships).

**Do not rebuild:** UnInbox team inbox, LinkedIn automation, Instantly-style warmup SaaS, full Salesforce. **Integrate** via Twenty, n8n, MCP, eno2 bridges.

---

## Scope boundary

### In scope (this plan)

| Track | Sprints | Outcome |
|-------|---------|---------|
| **Proof & GTM** | W13 | Live EXIT-DEMO assets, persona screenshots, marketing scripts |
| **Inbox craftsmanship** | W14 | Keyboard triage, snooze, threads, compose strip |
| **Deliverability depth** | W15 | DNS checks, bounce handling, warmup ramp, CAN-SPAM FRE |
| **L4 professional** | W16 | Twenty conflict UI, M365 OAuth scaffold, sync status on pipeline |
| **L5 executive** | W17 | Real executive brief, stall detection, needs-you queue |
| **Agent governance** | W18 | MCP preview cards, approval push, audit timeline UI |
| **Cross-Claw** | W19 | Creator/Capital → Work handoffs, unified morning brief seed |
| **Claw Cafe XP** | W20 | Wire work XP events (blocked on Claw Cafe app shell) |

### Explicitly deferred (post-W20 or never)

- Full shared team inbox (UnInbox-style)
- LinkedIn automation
- Multi-mailbox rotation at scale
- Salesforce live sync
- Dedicated outbound worker process (heartbeat sufficient until scale proof)

---

## Execution protocol (continuous + auto-approve)

Every sprint follows the same loop. Agents run this **without asking** unless blocked on secrets or destructive git ops.

### Per-sprint workflow

```
1. Read sprint section below + touched files
2. Implement minimal correct diff (match existing conventions)
3. typecheck → qa:local (alternate port if 3080 busy)
4. Extend work-checklist.mjs + qa-work-levels.mjs if API/UI changed
5. Update RELEASE-NEXT.md checkboxes + BEST-IN-CLASS.md score notes
6. Commit (exclude scripts/dev-qa/*.json, .next/, demo artifacts unless sprint is W13)
7. Tag only on milestone minors (v0.3.10, v0.4.0) — not every sprint
```

### QA gates (must pass before commit)

| Command | Gate |
|---------|------|
| `npm run typecheck` | 0 errors |
| `npm run qa:local -- --port N` | 0 failures (smoke + capital + creator + work + levels + flows) |
| `npm run qa:work-levels` | Included in qa:local; run standalone if work-only change |

### Commit message format

```
Ship Work Claw W{N} — <short title>.

```

### Auto-approve rules

- Run QA on ephemeral port (3081–3099) — do not stop dev server on 3080.
- Do **not** commit `scripts/dev-qa/*.json`, `.env`, `digital.env` with secrets.
- Do **not** force-push `master`.
- Push/tag only when user explicitly requests release (sprints commit locally by default).

### Agent handoff checklist

At sprint end, report: files changed, QA counts, commit hash, acceptance criteria ✅/❌, next sprint ID.

---

## Sprint roadmap (execution order)

```
W13 → W14 → W15 → W16 → W17 → W18 → W19 → (W20 when Claw Cafe exists)
```

Estimated: **~8 sprints** · W13 is asset-heavy · W14–W15 are highest L1–L3 ROI · W16–W17 unlock L4/L5 story.

---

## Sprint W13 — Live proof & GTM assets

**Goal:** Buyers see real mail path and persona-specific UI — not generic outreach screenshots.

| Task | Files / artifacts |
|------|-------------------|
| Wire `capture-gtm-phase2.mjs` into package.json | `package.json` → `demo:capture:work:levels` |
| Capture L1 Start, L2 Outreach, L3 Ops, L4 Integrations | `docs/demo-pack/screenshots/outreach/24–27-*.png` |
| EXIT-DEMO recording script or doc steps for `liveReady` | `scripts/record-work-exit-demo.mjs`, `docs/demo-pack/work-exit-walkthrough.webm` (optional webm) |
| STARTUP-GUIDE persona one-liners (L1–L3) | `docs/outreach-claw/STARTUP-GUIDE.md` |
| Go Live panel CTA: “Exit demo mode” deep link | `WorkGoLivePanel.tsx` |
| QA: verify scaffold still passes | `verify-work-exit-demo-scaffold.mjs` |

**Acceptance**

- [ ] `npm run demo:capture:work:levels` produces ≥4 new outreach screenshots
- [ ] EXIT-DEMO doc lists exact steps to `liveReady` with SMTP+IMAP
- [ ] `qa:local` pass · no product regressions

**Growth levels:** All (marketing).

---

## Sprint W14 — Inbox craftsmanship

**Goal:** L1–L3 daily desk feels fast — Front/Superhuman-lite on sovereign hardware.

| Task | Files |
|------|-------|
| Mail thread grouping (from + normalized subject) | `lib/work-mail-threads.ts`, `work-store` |
| Inbox filter strip: unassigned / replied / all (extend Start hero) | `WorkStartHomePanel.tsx`, `WorkInboxTriagePanel.tsx` |
| Keyboard triage: j/k navigate, r draft, a assign, 1–5 intent | `WorkInboxTriagePanel.tsx`, `useWorkInboxKeys.ts` |
| Snooze mail → task with `dueAt` | `work-store` `snooze_mail`, `work-queue-types` |
| Compose strip on Start: template → edit → `draft_reply` / simulate | `WorkComposeStrip.tsx`, `MyWorkApp.tsx` |
| API: `snooze_mail`, `list_threads` | `app/api/work/status/route.ts` |

**Acceptance**

- [ ] L1 user can triage 5 messages without mouse (keyboard path documented in coach)
- [ ] Snooze creates visible task on Start home
- [ ] `work-checklist.mjs`: snooze + thread list smoke
- [ ] `qa-work-levels` L1 tour still passes

**Growth levels:** L1–L3 primary · L4+ inherit.

---

## Sprint W15 — Deliverability depth (W12 part 2)

**Goal:** L4 credibility — DNS truth, bounces, warmup, compliance copy.

| Task | Files |
|------|-------|
| SPF/DKIM/DMARC DNS check via eno2 (no third-party API) | `lib/work-dns-deliverability.ts` |
| Extend `work-deliverability.ts` with DNS rows + recommendations | `WorkDeliverabilityPanel.tsx` |
| Bounce ingest: mark send failed, pause sequence, tag lead | `work-receipt-handler.ts`, `work-store` |
| Warmup ramp FRE: `warmupMode`, daily cap schedule | `app-agent-catalog.ts`, `work-send-policy.ts` |
| CAN-SPAM FRE fields: physical address, opt-out line | FRE + sequence footer template |
| Go Live step: compliance checklist | `work-go-live.ts` |

**Acceptance**

- [ ] Deliverability panel shows SPF/DKIM/DMARC status (demo: seeded when DNS unreachable)
- [ ] Simulated bounce pauses active sequence for lead
- [ ] Warmup mode caps `remainingToday` in send policy UI
- [ ] `work-checklist.mjs`: deliverability_dns, bounce_pause smoke

**Growth levels:** L3 sees summary · L4+ sees full panel.

---

## Sprint W16 — L4 professional (CRM + M365)

**Goal:** Solo business / agency owner trusts Work as system of record.

| Task | Files |
|------|-------|
| Twenty sync conflict detection + merge UI | `lib/work-crm-conflicts.ts`, `WorkCrmConflictPanel.tsx` |
| Pipeline row sync badge (synced / conflict / local-only) | `WorkPipelinePanel.tsx` |
| FRE: “Import from Twenty on first connect” | `work-onboarding.ts`, `sync_crm` |
| Microsoft 365 OAuth scaffold (mirror Google) | `app/api/work/microsoft/`, `work-microsoft-client.ts` |
| Vault registry: M365 planned → live/demo | `work-connector-registry.ts` |
| Morning brief: M365 mail preview when linked | `work-morning-brief.ts` |

**Acceptance**

- [ ] Forced conflict in dev-qa shows merge panel; resolve updates local lead
- [ ] `/api/work/microsoft` GET returns oauth status (demo when unconfigured)
- [ ] L4 `qa-work-levels` vault check still passes
- [ ] `sync_crm` logs conflict count in syncLog

**Growth levels:** L4+ full · L3 peek unchanged.

---

## Sprint W17 — L5 executive brief

**Goal:** Replace stub with actionable “signal not noise” surface.

| Task | Files |
|------|-------|
| Stall detection: leads no touch in N days (FRE configurable) | `lib/work-stall-detection.ts` |
| Needs-you queue: P1 tasks + pending approvals + interested mail | `WorkNeedsYouPanel.tsx` |
| Executive brief v2: weekly impact digest (local LLM) | `lib/work-executive-brief.ts`, skill `executive_brief` |
| Expand `WorkExecutiveBriefPanel.tsx` | wire real data |
| Ops tab default for L5 (`defaultWorkTabForGrowth`) | `work-level-gates.ts` |

**Acceptance**

- [ ] L5 FRE → Executive brief shows stall list + needs-you counts
- [ ] `executive_brief` skill returns structured summary
- [ ] `qa-work-levels` L5 profile + brief smoke

**Growth levels:** L5 primary · nudge from L4 unchanged.

---

## Sprint W18 — Agent governance parity

**Goal:** Match Capital’s preview/confirm/audit maturity for outbound trust.

| Task | Files |
|------|-------|
| MCP tool execute → preview card before send | `work-mcp-server.ts`, `ClawAgentConsole` or desk modal |
| Approval push: Telegram/email when `pending_approval` (extend work-approval-notify) | `work-approval-notify.ts` |
| Audit timeline UI on Ops tab | `WorkAuditTimelinePanel.tsx`, `work-agent-audit` |
| Kill switch + approval state in morning brief | `work-morning-brief.ts` |

**Acceptance**

- [ ] MCP send path requires confirm in UI (demo: dry-run default)
- [ ] Approval push fires in demo mode (log only) when configured
- [ ] Audit panel shows last 20 agent actions
- [ ] `work-checklist.mjs`: audit_list smoke

**Growth levels:** L3+ approvals · L4+ MCP execute confirm.

---

## Sprint W19 — Cross-Claw handoffs

**Goal:** Work Claw as OS professional station — not isolated app.

| Task | Files |
|------|-------|
| Creator → Work: “Add as inquiry” from content DM/collab context | `MyContentApp.tsx` → `create_lead` API |
| Capital → Work: investor reply → opportunity + prep_meeting | `MyCapitalApp.tsx` or mesh context |
| Unified morning brief strip (work + content + capital counts) | `WorkMorningBriefPanel.tsx` or OS shell |
| Mesh context keys: `handoff.work.leadId` | `app/api/mesh/context` |
| Docs: cross-claw flows in GETTING-STARTED | `docs/outreach-claw/GETTING-STARTED.md` |

**Acceptance**

- [ ] One-click handoff from Creator demo creates lead in work-queue
- [ ] `qa-user-flows.mjs`: cross-claw handoff flow
- [ ] Morning brief mentions other Claw open items (demo seeded)

**Growth levels:** L2+ for handoffs · L1 optional.

---

## Sprint W20 — Claw Cafe XP (blocked on Cafe app)

**Prerequisite:** Claw Cafe app shell exists (`claw-cafe` in `ootb-apps`).

| Task | Files |
|------|-------|
| Emit XP events on work actions | `lib/work-xp-events.ts` → Cafe API stub |
| Events: `first_opportunity`, `reply_handled`, `go_live_demo_ready`, `connector_linked` | per LEVELING-BUILD-PLAN |
| Cross-Claw bonus: creator publish + work follow-up same week | `lib/claw-cafe-bonus.ts` |
| Settings: opt out of gamification | `user-settings-types.ts` |

**Acceptance**

- [ ] Action completes → XP event logged (dev-qa file or API)
- [ ] No XP UI required in Work Claw — Cafe consumes events

**Status:** Start when Cafe milestone lands; keep stub until then.

---

## Feature × sprint matrix

| Feature | W13 | W14 | W15 | W16 | W17 | W18 | W19 | W20 |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Persona screenshots / EXIT-DEMO | ✅ | | | | | | | |
| Keyboard inbox triage | | ✅ | | | | | | |
| Snooze → task | | ✅ | | | | | | |
| DNS SPF/DKIM/DMARC | | | ✅ | | | | | |
| Bounce → pause sequence | | | ✅ | | | | | |
| Warmup ramp | | | ✅ | | | | | |
| Twenty conflict UI | | | | ✅ | | | | |
| Microsoft 365 OAuth | | | | ✅ | | | | |
| Executive brief real | | | | | ✅ | | | |
| MCP preview confirm | | | | | | ✅ | | |
| Approval push | | | | | | ✅ | | |
| Audit timeline | | | | | | ✅ | | |
| Cross-Claw handoff | | | | | | | ✅ | |
| Claw Cafe XP | | | | | | | | ✅ |

---

## QA expansion plan

Add to `work-checklist.mjs` / `qa-work-levels.mjs` per sprint:

| Sprint | New checks |
|--------|------------|
| W13 | (scaffold only — no new API) |
| W14 | `snooze_mail`, `list_threads` |
| W15 | `deliverability_dns`, `bounce_pause`, `warmup_policy` |
| W16 | `crm_conflict_list`, `microsoft_status` |
| W17 | `executive_brief`, `stall_detection` |
| W18 | `audit_timeline`, `approval_notify_demo` |
| W19 | `cross_claw_handoff` (in qa-user-flows) |
| W20 | `xp_event_emit` |

Optional: `npm run qa:work-excellence` — runs work-checklist + qa-work-levels only (faster loop).

---

## Version tags (suggested)

| Tag | After | Contents |
|-----|-------|----------|
| **v0.3.10** | W13 + W14 | Proof assets + inbox craftsmanship |
| **v0.3.11** | W15 | Deliverability depth |
| **v0.4.0** | W16 + W17 | L4/L5 professional lane |
| **v0.4.1** | W18 + W19 | Governance + cross-Claw |
| **v0.4.2** | W20 | Claw Cafe XP (when unblocked) |

---

## Success metrics (unchanged from leveling plan)

| Metric | L1 | L2 | L3 | L4 |
|--------|----|----|----|-----|
| Time to first `draft_reply` | < 3 min | < 5 min | < 5 min | — |
| FRE → first opportunity | > 90% | > 85% | > 85% | > 80% |
| Demo / persona tour completion | > 80% | > 70% | > 60% | — |
| `liveReady` within 7 days | — | — | — | > 40% |
| Bounce rate visible & actioned | — | — | — | 100% of failures logged |

---

## File checklist (new modules preview)

| File | Sprint |
|------|--------|
| `scripts/record-work-exit-demo.mjs` | W13 |
| `lib/work-mail-threads.ts` | W14 |
| `components/apps/work/WorkComposeStrip.tsx` | W14 |
| `hooks/useWorkInboxKeys.ts` | W14 |
| `lib/work-dns-deliverability.ts` | W15 |
| `lib/work-crm-conflicts.ts` | W16 |
| `components/apps/work/WorkCrmConflictPanel.tsx` | W16 |
| `app/api/work/microsoft/route.ts` | W16 |
| `lib/work-stall-detection.ts` | W17 |
| `components/apps/work/WorkNeedsYouPanel.tsx` | W17 |
| `components/apps/work/WorkAuditTimelinePanel.tsx` | W18 |
| `lib/work-xp-events.ts` | W20 |

---

## References

- [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — competitive landscape
- [EXIT-DEMO.md](./EXIT-DEMO.md) — live mail setup
- [LEVELING-BUILD-PLAN.md](./LEVELING-BUILD-PLAN.md) — WL1–WL8 (complete)
- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — ship log
- [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md) — L1–L5 personas

## Next action

W13–W20 complete (v0.4.0). Start **Phase 2** — [EXCELLENCE-PHASE2-BUILD-PLAN.md](./EXCELLENCE-PHASE2-BUILD-PLAN.md) **Sprint W21**.
