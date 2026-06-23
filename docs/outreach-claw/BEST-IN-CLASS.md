# Work Claw — best-in-class landscape

Research snapshot for the **Professional Workstation** arc (June 2026).  
CurXor wedge: **sovereign on-appliance** — one desk for mail, CRM, tasks, calendar, and agent skills; egress only via eno2 bridges; LLM plans, deterministic policy executes.

> **Naming:** App id `my-work`, product **Work Claw** (Outreach Claw is the outbound/GTM lane). Goal: central professional station — not just cold email.

---

## Competitive landscape

### Unified work OS (replace the tab sprawl)

| Product | Model | Strengths | Gaps vs CurXor | Takeaway |
|---------|--------|-----------|----------------|----------|
| [Macro](https://github.com/macro-inc/macro) | AGPL unified OS — email, Slack, Linear, Notion, CRM | Shared AI memory, Superhuman-style mail, team channels | Cloud/SaaS path; not appliance-first | **Block map** — email + tasks + CRM + agents in one nav |
| [Notion 3.3+](https://www.notion.com/releases/2026-02-24) | Custom Agents + Mail + Calendar + MCP | Cross-tool triggers (Slack, Linear, Figma, HubSpot) | Credit-priced agents; data in Notion cloud | **Agent triggers + MCP connector registry** |
| [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) | Self-hosted AI workspace | IMAP/SMTP mail, CalDAV, notes, MCP, local models | General-purpose; weak GTM/CRM depth | **Self-host mail + calendar** as baseline |
| [Bastion](https://github.com/Bastion-Workspace/bastion) | Docker AI workspace + LangGraph | OAuth integrations, team feeds, agent factory | Heavy ops; not retail GTM | **Connector OAuth pattern** for M365/GitHub |
| [Synapse](https://github.com/zai-org/Synapse) | Governed multi-agent workspace | Shareable teammates, relay MCP, audit | Greenfield stack | **Permission + audit** at workspace layer |

### Shared inbox + team email

| Product | Model | Takeaway |
|---------|--------|----------|
| [Front](https://front.com) / [Missive](https://missiveapp.com) | Per-seat shared inbox, assignments, comments | Assignment + collision detection UX |
| [UnInbox](https://github.com/un/inbox) | AGPL self-hosted Front/Missive alt | **Open-source shared inbox** reference for team mail |
| [Superhuman](https://superhuman.com) | Speed + AI triage on Gmail | Keyboard-first triage; split inbox |

### GTM / outbound / sequences

| Product | Model | Takeaway |
|---------|--------|----------|
| [Signal](https://github.com/jay-sahnan/signal) | OSS Clay/Apollo/Outreach — signals + sequences | Chat-first campaign workspace; BYO keys |
| [GTM Engine](https://github.com/sohan-a11y/gtm-engine) | 5 agents + HubSpot/SF sync | **CRM sync adapter** pattern; approval queue |
| [Instantly](https://instantly.ai) / [Smartlead](https://smartlead.ai) | SaaS sequence senders | Warmup, rotation — defer; document as SaaS escape hatch |

### CRM layer

| Product | Model | Takeaway |
|---------|--------|----------|
| [Twenty](https://github.com/twentyhq/twenty) | OSS HubSpot alt — GraphQL, workflows, MCP | **Primary OSS CRM** to embed or sync — not rebuild |
| EspoCRM / SuiteCRM | Mature PHP CRM | Fallback for enterprise migration stories |

### Automation glue (connectors OOTB)

| Product | Model | Takeaway |
|---------|--------|----------|
| [n8n](https://github.com/n8n-io/n8n) | Fair-code 400+ nodes, self-host | **Long-tail connectors** — Google, Slack, Notion, Jira, HubSpot |
| Zapier / Make | Cloud automation | Competitor reference only — CurXor stays sovereign |

### Founder / solo operator CLI

| Product | Model | Takeaway |
|---------|--------|----------|
| [Founder OS](https://github.com/NaluForge/founderOS) | Claude Code plugin — Gmail, Notion, Slack morning sync | **Morning briefing** skill bundle |

---

## CurXor position

| Dimension | SaaS unified desks | CurXor Work Claw |
|-----------|-------------------|------------------|
| Data | Vendor cloud | `work-queue.json` + local mail index on appliance |
| Send path | Vendor SMTP/API | `work.email.send` → pillar-3 SMTP on eno2 |
| Agent | Black-box copilot | Claw skills + local LLM + explicit approval |
| CRM | Locked SaaS | Local lead pipeline today; Twenty sync Tier C |
| Connectors | 1000+ native | **Connector vault** — tiered: live / OAuth / planned / MCP |
| Demo | Trial account | **demoReady** + simulated send (shipped v0.3.5) |

**Do not rebuild:** full CRM (Twenty), full automation IDE (n8n), full shared inbox (UnInbox). **Do integrate** via bridges, webhooks, and MCP where eno2 egress allows.

---

## Current ship state (v0.4.0)

| Area | Status |
|------|--------|
| Local CRM + sequences | Shipped |
| SMTP send + simulated fallback | Shipped |
| **W13–W20 excellence arc** — inbox threads, DNS deliverability, M365 scaffold, executive brief, audit, cross-claw, XP stub | **Shipped v0.4.0** |
| **WL7 persona polish** — L1/L2/L3 tours, inbox hero, keyboard triage, compose strip | **Shipped v0.3.9+** |
| **W12 deliverability** — domain health, reputation, warmup ramp, CAN-SPAM FRE | **Shipped v0.3.9+** |

### Competitive score (June 2026)

| Dimension | CurXor | Notes |
|-----------|--------|-------|
| Sovereign / on-appliance | **Leader** | Core wedge |
| Persona leveling L1–L3 | **Strong (~4.5/5)** | W14 keyboard + threads |
| Inbox triage | **Strong (~4.3/5)** | Threads, snooze, compose strip |
| Sequences / GTM L3+ | **Strong** | Approval queue, kill switch, MCP preview |
| Deliverability UX | **Strong (~4.0/5)** | W15 DNS + warmup + bounce pause |
| L4/L5 professional | **Strong (~4.2/5)** | HubSpot OAuth, activity timeline, team permissions |
| Cross-Claw OS | **Strong (~4.3/5)** | Live OS brief counts, playbooks, Cafe XP (v0.6.2) |

**Phase 2 plan:** [EXCELLENCE-PHASE2-BUILD-PLAN.md](./EXCELLENCE-PHASE2-BUILD-PLAN.md) (W21–W28, complete v0.5.1).

**Phase 3 plan:** [EXCELLENCE-PHASE3-BUILD-PLAN.md](./EXCELLENCE-PHASE3-BUILD-PLAN.md) (W29–W35, complete **v0.6.2**).

---

## Prior ship state (v0.3.7 reference)

| Area | Status |
|------|--------|
| **W7 Exit demo** — EXIT-DEMO.md, IMAP fetch, setup:work-env, verify scaffold | Shipped v0.3.7 |
| **W8 Comms** — inbox triage, draft_reply, mail sanitizer | Shipped v0.3.7 |
| **W9 GTM** — enrich, branching, approval queue, kill switch, Cal.com | Shipped v0.3.7 |
| **W10 Agent** — work MCP, audit, n8n webhooks, Notion pull, HubSpot preview | Shipped v0.3.7 |
| **W11 Polish** — setup wizard, kanban, morning brief, walkthrough video | Shipped v0.3.7 |

---

## Connector vault (mirror Capital brokers + Creator platform vault)

Proposed `work-connector-registry.ts` + FRE panel **Integrations**:

| Connector | Tier | Bridge / tool | Env / OAuth | Work actions |
|-----------|------|---------------|-------------|--------------|
| **SMTP outbound** | Live | `work.email.send` | `SMTP_*` in digital.env | Sequences, one-off send |
| **IMAP inbound** | Live | `work.email.fetch` | `IMAP_*` | scan_inbox live |
| **Gmail / Google Workspace** | OAuth | Google API via eno2 | OAuth link session | Read mail, Calendar free/busy, Drive search |
| **Microsoft 365** | Planned | Graph API | OAuth | Mail + Calendar |
| **Slack** | Live (global) | `channel.slack.send` | `SLACK_BOT_TOKEN` | Notify on reply, digest, approval |
| **Notion** | OAuth | REST / MCP | OAuth | CRM mirror, meeting notes DB |
| **Twenty CRM** | Sync | GraphQL webhook | `TWENTY_*` URL + API key | Bidirectional lead/deal sync |
| **HubSpot** | Planned | REST | OAuth | GTM Engine-style sync |
| **Salesforce** | Planned | REST | OAuth | Enterprise lane |
| **Linear / Jira** | MCP | MCP server | User MCP config | Issue create from mail |
| **Cal.com** | Webhook | inbound webhook | API key | Book from sequence CTA |
| **n8n** | Escape hatch | HTTP webhook | User workflow URL | Long-tail automations |

Health report shape (mirror `content-bridge-health.ts`):

```ts
type WorkConnectorHealth =
  | "live" | "degraded" | "auth_expired" | "unconfigured" | "planned";
```

Go Live steps extend: FRE → connector vault (≥1 comms path) → lead → sequence → first send → **liveReady** (SMTP verified).

---

## Open-source OOTB strategy

| Need | OSS choice | CurXor integration |
|------|------------|-------------------|
| CRM depth | **Twenty** (self-host or cloud API) | Sync adapter; optional sidecar container in compose |
| Shared team inbox | **UnInbox** (future) or IMAP + local index | Phase 2 — don't block Work desk |
| Workflow glue | **n8n** (self-host on eno2) | Webhook intents from Work → n8n; prebuilt templates |
| Mail parsing | **email-reply-parser** (npm) + local index | Already partial in scan_inbox |
| Enrichment | **Hunter.io / Apollo** (API keys, not OSS) | Optional FRE fields; demo uses seeded data |
| Calendar | **CalDAV** (Radicale / Nextcloud) or Google Calendar API | Day brief + meeting prep skill |

**Principle:** Ship CurXor-native UX for day-one (pipeline, sequences, inbox, tasks). Sidecar OSS for categories where parity would take quarters.

---

## Workspace UX — tabs + experience gating

Mirror `ContentWorkspaceTabs.tsx` / Capital desk tabs:

| Tab | minLevel | Sections |
|-----|----------|----------|
| **Start** | beginner | Go Live, demo tour, quick lead + task |
| **Outreach** | beginner | Pipeline, sequences, import, outbound queue |
| **Comms** | standard | Unified inbox, mail index, reply intent |
| **Ops** | standard | Analytics, recovery, send policy |
| **Integrations** | expert | Connector vault, sync log, webhooks |

Implementation files:

- `components/apps/work/WorkWorkspaceTabs.tsx` (new)
- `MyWorkApp.tsx` — `workspaceTab` state + `workSectionVisible()`
- `lib/experience-coach-catalog.ts` — section → tab map

**loadStatus vs bootstrap** (Creator pattern):

| Action | Refresh |
|--------|---------|
| Poll / motor tick | `loadStatus()` GET only |
| create_lead, activate_sequence, send, import | `loadBootstrap()` or targeted `postWork` + merge |
| go_live, demo tour | full bootstrap |

---

## `activate_sequence` + auto-send — product guard

**Today:** Activate queues step 1; heartbeat `process_due` sends when due (respects daily limit + stagger).

**Document** in GETTING-STARTED + Go Live copy:

1. Activate ≠ immediate blast — first send waits for stagger scheduler unless **Send Step** skill.
2. Demo mode always simulates; live mode requires SMTP green on connector vault.
3. Optional FRE flag: `autoSendOnActivate: false` (default **true** for step 1 after delay 0?) — **recommend default false in demo**, true in live with confirmation modal.

**Ship:**

- Go Live step: "Understand auto-send policy"
- `activate_sequence` response includes `{ autoSendPolicy, nextDueAt }`
- Expert panel: toggle auto-send on activate

---

## Sprint roadmap (shipped v0.3.6)

### Sprint W1 — Desk parity ✅

- [x] `WorkWorkspaceTabs` + section gating
- [x] `loadStatus` / `loadBootstrap` split on all mutations
- [x] `activate_sequence` policy docs + response fields + Go Live step
- [x] Demo-pack: `docs/demo-pack/screenshots/outreach/` + README parity
- [x] Tag **v0.3.6** with Work W1–W6 release notes

### Sprint W2 — Connector vault + health ✅

- [x] `lib/work-connector-registry.ts` + `lib/work-connector-health.ts`
- [x] `WorkConnectorVaultPanel.tsx` (mirror `ContentBridgeHealthPanel`)
- [x] Go Live steps use vault health (`liveReady`, `comms_path`)
- [x] Status API: `connectorVault` on bootstrap

### Sprint W3 — Google Workspace lane ✅

- [x] OAuth link session pattern (`/api/work/google`)
- [x] Mail + calendar preview actions (demo when unlinked)
- [x] Skills: `morning_brief`, `prep_meeting`
- [x] Demo: seeded calendar/mail when OAuth absent

### Sprint W4 — Notion + Slack work context ✅

- [x] Notion OAuth scaffold — push lead notes (`sync_notion_lead`)
- [x] Slack — notify on `interested` intent; `slack_digest` skill
- [x] `syncLog` audit trail on work-queue

### Sprint W5 — Twenty CRM sync ✅

- [x] `work.crm.sync` adapter (Twenty GraphQL)
- [x] FRE: `crmBackend: local | twenty`
- [x] Import/export leads; conflict policy (local wins / remote wins)

### Sprint W6 — Professional station polish ✅

- [x] Day brief v2 — cross-connector context
- [x] Task matrix ↔ CRM stage automation (won → complete linked tasks)
- [x] n8n webhook templates doc (`N8N-TEMPLATES.md`)
- [x] `BEST-IN-CLASS.md` refresh + extended QA

---

## Demo-pack parity checklist

Match Capital/Creator capture scripts:

| Asset | Capital | Creator | Work |
|-------|---------|---------|------|
| Go Live panel | ✅ | ✅ | ✅ |
| Primary desk tab | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Connector vault | brokers | platform vault | ✅ |
| Walkthrough video | capital-walkthrough.webm | ❌ | **Shipped** — `outreach-walkthrough.webm` (`demo:record:work`) |

Script: `npm run demo:capture:work` (new) → `docs/demo-pack/screenshots/outreach/`

---

## Agent skills roadmap

| Skill | Sprint | Description |
|-------|--------|-------------|
| `run_demo_tour` | shipped | Lead → sequence → simulated send |
| `morning_brief` | W3 | Mail + calendar + tasks summary |
| `prep_meeting` | W3 | Attendee dossier from CRM + mail |
| `sync_notion_crm` | W4 | Push/pull Notion database |
| `slack_digest` | W4 | Channel summary → task creation |
| `enrich_lead` | W5 | Hunter/Apollo when keys set |
| `book_meeting` | W5 | Cal.com webhook from sequence |

---

## Risk & policy

- **Prompt injection** via inbound mail — sanitize before LLM; human approve outbound (reuse Creator approval pattern).
- **CAN-SPAM / GDPR** — FRE disclaimer step; unsubscribe token in sequence footers (Tier B+).
- **Auto-send** — kill switch on desk (mirror Capital autonomous mode).
- **Connector scopes** — minimum OAuth scopes; read-only default for CRM.

---

## References

- [STARTUP-GUIDE.md](./STARTUP-GUIDE.md) — demo-only operator path
- [GETTING-STARTED.md](./GETTING-STARTED.md) — day-one checklist
- [RELEASE-NEXT.md](./RELEASE-NEXT.md) — deferred + sprint tracking
- [BEST-IN-CLASS-BUILD-PLAN.md](./BEST-IN-CLASS-BUILD-PLAN.md) — **W13–W20 execution plan (complete)**
- [EXCELLENCE-PHASE2-BUILD-PLAN.md](./EXCELLENCE-PHASE2-BUILD-PLAN.md) — W21–W28 (complete)
- [EXCELLENCE-PHASE3-BUILD-PLAN.md](./EXCELLENCE-PHASE3-BUILD-PLAN.md) — **W29–W35 Phase 3 plan**
- Capital: [../capital-claw/BEST-IN-CLASS.md](../capital-claw/BEST-IN-CLASS.md)
- Creator: [../creator-claw/RELEASE-NEXT.md](../creator-claw/RELEASE-NEXT.md)
