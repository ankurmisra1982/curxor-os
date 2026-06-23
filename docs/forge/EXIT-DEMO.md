# The Forge — Exit Demo Guide

> Record Forge walkthrough assets for GTM without live hardware dependencies.

## Demo-ready criteria

From **Go Live** panel (`ClawForgeWorkspace`):

1. Forge FRE complete (dev-qa: `scripts/dev-qa/app-fre/claw-forge.json`)
2. At least one fleet entry (island, framework, or import)
3. Optional: framework desk in nav for `/my-claw/{slug}` demo

**Run demo tour** mints a blank framework desk if none exists — safe for repeat recordings.

## Recording steps

1. Start dev QA: `npm run dev:qa` (or `qa:local -- --port 3081`)
2. Open **The Forge** → confirm Go Live shows **Demo ready**
3. Walk tabs by persona:
   - **L1 Sketcher:** Mint only
   - **L4 Fabricator:** Templates + Import (dev-qa FRE uses `templates_import`)
   - **L5 Foundry:** Ops tab
4. Fleet → **Open desk** on a framework mint
5. Agent console → skill **Run Demo Tour** or Go Live button
6. Capture: `npm run capture:marketing-flows` or `capture-one-demo.mjs` for `04-forge.png`

## Live-ready (post-demo)

- Ollama/vLLM reachable (inference step green in Go Live)
- Framework desk minted for nav proof
- Export bundle from Ops tab for import round-trip story

## QA gate

```bash
cd pillar-4-dashboard
npm run typecheck
node scripts/qa-forge-levels.mjs
node scripts/forge-checklist.mjs http://127.0.0.1:3081
npm run qa:local -- --port 3081
```
