# Capital Claw — Composer Parity Sprint

> **Trigger:** [Composer by SoFi](https://www.sofi.com/invest/composer) launch (Jun 23, 2026) — NL strategy build, community discovery, backtest-before-activate, rules-not-agentic auto execution.  
> **Assumption:** Auto-approval stack **ON** (`defaultAutoApprovalPolicy`) · demo/paper mode · no broker keys required.  
> **Wedge:** Same idea-to-execution loop as Composer — **sovereign on-appliance** with risk guard + audit trail.

## North star

Operator describes an investment idea in one line → sees backtest → arms rule → auto-approval executes when eligible — without cloud black-box agentic trading.

Composer quote to beat:

> *"If you can explain an investment idea in plain English, you can now build, test, and automate it."*

Capital answer:

> *"If you can explain it, Capital Claw builds the rule on your box, backtests it, and runs it through your risk guard — not SoFi's cloud."*

---

## Competitive map

| Composer by SoFi | Capital Claw today | This sprint |
|------------------|-------------------|-------------|
| NL → guided strategy | `create_rule` skill + visual builder | **Q1** describe bar as primary CTA |
| Backtest → activate in seconds | Backtest on save + curve | **Q2** Arm + auto-eligible badge |
| 2,000+ community strategies | Pilot marketplace (demo) | **Q3** search/filter |
| Meld strategies / regime portfolio | Multiple rules + pilot subs | **Q7** deferred (Tier 2) |
| Rules-based auto execution | Auto-approval stack | **Q4** strip on armed rules |
| Not agentic — visible rules | Risk guard, audit, kill switch | **Q5** positioning copy |
| Guided onboarding | Setup Wizard | **Q8** auto-path finish copy |

**Do not copy:** SoFi cloud execution, 2k real strategy catalog, SoFi Plus paywall, regime meld backtest engine.

---

## Sprint scope (Tier 1 — ship in one build chat)

### Q1 — "Describe your strategy" bar

**Where:** Rule engine panel (`CapitalRulesPanel`) + optional pin on Alpha tab.

**Behavior:**
- Single-line input: *"Buy NVDA on 5% dip, sell half on +10%"*
- Submit → existing `create_rule` agent skill or `POST /api/capital/status` `{ action: "create_rule", ... }` via NL assist (`app-agent-assist.ts` already has `create_rule` LLM path)
- On success: select new rule, scroll to backtest curve

**Acceptance:** One sentence → structured rule appears → backtest section visible without opening agent chat.

**Files:** `CapitalRulesPanel.tsx`, optionally `CapitalAlphaFeedPanel.tsx`, `app-agent-assist.ts` (reuse).

---

### Q2 — Backtest → Activate CTA

**Where:** `CapitalBacktestCurve.tsx` + selected rule in `CapitalRulesPanel`.

**Behavior:**
- After backtest renders, show:
  - **Arm rule** button (calls existing `toggle_rule` / `arm_rule`)
  - Badge: **Auto-approval eligible** or **Needs manual approval** from `preview_trade` / `shouldAutoApproveTrade` summary
- If not armed: secondary **Execute now** (existing)

**Copy:** *"Activate — auto-runs on paper when conditions fire (≤$500, risk guard pass)"*

**Acceptance:** User arms from backtest panel; armed rule shows auto-eligibility without opening Risk tab.

**Files:** `CapitalBacktestCurve.tsx`, `CapitalRulesPanel.tsx`, wire `preview_trade` on arm.

---

### Q3 — Pilot search / filter

**Where:** `CapitalPilotMarketplacePanel.tsx`.

**Behavior:**
- Text filter on name, description, holdings tickers
- Category chips: `tracker` | `thematic` | `ai` | `index` | `managed`
- Empty state: *"No strategies match — try 'semiconductor' or 'congress'"*

**Acceptance:** Filter "AI" or "NVDA" surfaces relevant demo pilots.

**Files:** `CapitalPilotMarketplacePanel.tsx` only (client-side filter).

---

### Q4 — Auto-approval strip on armed rules

**Where:** Rule list rows in `CapitalRulesPanel` when `state === "ARMED"`.

**Behavior:**
- One line: `autoApprovalSummary(policy)` + which toggles apply to this rule type (armed rules, intel, pilot)
- If `!policy.autoApproveArmedRules`: amber *"Manual approval required"*

**Acceptance:** Armed rule card shows execution path before next heartbeat fire.

**Files:** `CapitalRulesPanel.tsx` — pass `autoApproval` from `MyCapitalApp`.

---

### Q5 — Positioning copy

**Where:**
- Desk header subtitle when `autoApproval.enabled` (in `MyCapitalApp` header)
- `CapitalAutoApprovalPanel` footer
- Coach tip in `experience-coach-catalog.ts` (`cap-auto-approval-standard`)

**Copy (pick one primary):**
- *"Rules you can read — not a black-box agent. Composer-style automation on your appliance."*
- Auto-approval panel footer: *"Composer by SoFi runs rules in their cloud. Capital runs yours locally with risk guard."*

**Acceptance:** Visible on Risk tab and desk header in dev.

**Files:** `MyCapitalApp.tsx`, `CapitalAutoApprovalPanel.tsx`, `experience-coach-catalog.ts`.

---

### Q8 — Wizard auto-path finish copy

**Where:** `CapitalSetupWizard.tsx` final step (Execute / Go Live).

**Behavior:**
- When `autoApproval.enabled && autoApproveArmedRules`: replace generic execute copy with:
  - *"When this rule's conditions fire, auto-approval will submit paper trades if risk guard passes (max $X)."*
- Show `autoApprovalSummary` one-liner on step 4–5

**Acceptance:** Wizard completer understands they don't need to click Execute every time.

**Files:** `CapitalSetupWizard.tsx` — pass `autoApproval` prop from `MyCapitalApp`.

---

## Out of scope (this sprint)

| Item | Track |
|------|--------|
| Q6 Regime starter pack | Tier 2 — follow-up sprint |
| Q7 Strategy meld panel | Tier 2 |
| Q9 Pilot subscribe → enable `autoApprovePilotCopy` | Tier 2 |
| NL multi-step guided builder | Deferred |
| Real 2k strategy catalog | Deferred |
| GTM walkthrough regen | Wave 1 agent |
| Leveling CL1–CL3 | LEVELING-BUILD-PLAN.md |

---

## Tier 2 backlog (next sprint after Tier 1)

| ID | Win | Effort |
|----|-----|--------|
| Q6 | Regime templates: `tech_momentum`, `defensive_dip`, `spy_rebalance` chips | M |
| Q7 | "My strategies" portfolio strip — armed rules + pilot subs | M |
| Q9 | Subscribe pilot → prompt enable `autoApprovePilotCopy` | S |

---

## Auto-approval dev policy (stack ON)

| Toggle | Dev setting | Notes |
|--------|-------------|-------|
| `enabled` | `true` | Sprint assumes on |
| `paperOnly` | `true` | Until Alpaca paper proven |
| `autoApproveArmedRules` | `true` | Core Composer loop |
| `autoApproveIntelActions` | `true` | Thesis/dip path |
| `autoApprovePilotCopy` | `false` → Q9 | Enable after pilot UX |
| `autoApproveAgentChat` | `true` | Keep `requireAgentPreview` true |
| `maxNotionalUsd` | `500` | Match default |

---

## Demo script (dev QA)

1. Open Capital → Rule engine → type *"5% dip buy on SPY"* in describe bar → rule created.  
2. Backtest curve loads → **Arm rule** → badge shows **Auto-approval eligible**.  
3. Pilots → filter `thematic` → subscribe (optional).  
4. Run demo tour or wait for manual execute → trade log shows `approvalNote` with auto path.  
5. Header shows rules-not-agentic copy.

**QA smoke additions (optional):**
- `capital composer describe rule` — POST create via NL stub  
- `capital pilot filter` — marketplace renders with filter query  

---

## File checklist

| File | Tasks |
|------|--------|
| `CapitalRulesPanel.tsx` | Q1, Q2, Q4 |
| `CapitalBacktestCurve.tsx` | Q2 |
| `CapitalPilotMarketplacePanel.tsx` | Q3 |
| `CapitalSetupWizard.tsx` | Q8 |
| `MyCapitalApp.tsx` | Q5, pass `autoApproval` to wizard + rules |
| `CapitalAutoApprovalPanel.tsx` | Q5 footer |
| `experience-coach-catalog.ts` | Q5 coach tip |
| `BEST-IN-CLASS.md` | Composer by SoFi row update |

---

## Build chat kickoff

```
Capital — Composer Parity Sprint (Tier 1)

Implement Q1–Q5 + Q8 per docs/capital-claw/COMPOSER-PARITY-SPRINT.md.
Auto-approval ON; paperOnly true. No broker keys. No GTM capture.
Do not start Q6–Q9 or leveling CL sprints.

Done when: describe bar → rule → backtest → arm → auto-eligible badge visible.
```

---

## References

- [SoFi investor release — Composer by SoFi](https://investors.sofi.com/news/news-details/2026/Introducing-Composer-by-SoFi-AI-Powered-Investing-From-Idea-to-Execution/default.aspx)
- [BEST-IN-CLASS.md](./BEST-IN-CLASS.md) — Composer row
- [EXECUTION-FLOW.md](./EXECUTION-FLOW.md) — auto-approval journeys
- [SOCIAL-ALPHA-BUILD-PLAN.md](./SOCIAL-ALPHA-BUILD-PLAN.md) — Alpha tab context
- `lib/capital-auto-approval-types.ts` — policy defaults
