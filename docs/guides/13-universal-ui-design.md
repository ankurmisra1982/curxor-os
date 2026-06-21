# Universal UI Design — CurXor OS

Research-backed design for a **novice-to-expert appliance** (June 2026).

## Research summary

### OpenClaw Control UI (2026)

- **Dashboard V2** — modular panels instead of one dense page
- **Command palette** (Ctrl+K) for power users
- **Overview hub** — stat cards, attention items, setup hints, quick actions
- **Mobile bottom tabs** for thumb reach
- **Config categories** — logical groupings (not one flat form)
- **Context notices** — in-UI guidance for first-time tasks

### NemoClaw / enterprise stack

- OpenClaw UI inside sandbox; **guided onboarding** + CLI for experts
- Web UI is admin surface; many operators use channels + CLI

### Community tension (r/openclaw)

- UI complexity grows because the product is a **gateway**, not just chat
- **Fix:** progressive disclosure — simple default, expert opt-in

## CurXor differentiation

| OpenClaw | CurXor OS |
|----------|-----------|
| Software gateway on a PC | **Hardware appliance** + captive portal |
| Many channels | **Ten Claws** + Forge on bare metal |
| Operator often technical | **Novice buyers** ($3,999 appliance GTM) |
| Always-on telemetry | **Simple mode** hides mesh strip |

## Design principles (implemented)

1. **Home first** — `/home` hub with plain-language Claw cards
2. **One agent per workspace** — removed duplicate Master Claw sidebar
3. **Simple / Expert toggle** — expert shows telemetry, activity log, category labels
4. **Grouped navigation** — Wealth, Work, Physical, Create
5. **Context hints** — dismissible tips per route
6. **Command palette** — Ctrl+K
7. **Typography** — sans for labels; mono for metrics only
8. **Quick actions** — skill buttons with plain labels

## Touchpoints

| Surface | Novice | Expert |
|---------|--------|--------|
| Global FRE | Plain step names | Same |
| Home | Claw grid + how-it-works | Telemetry snippet |
| Claw workspace | Chat + quick actions | Activity log |
| Header | Health, Forge, Search, **Settings** | Expert toggle |

## Settings (`/settings`)

User freedom is explicit — nothing is locked at FRE time.

| Tab | What the user controls |
|-----|------------------------|
| **Claws** | Add/remove any OOTB Claw (Forge always on); syncs nav + middleware |
| **Intelligence** | Local-only, frontier-only, or auto; Ollama model name; connect providers via API key, **OAuth PKCE** (OpenAI; Google when configured), or guided subscription link; purchase/docs links |
| **Appearance** | Simple vs Expert mode; color scheme (CurXor, Ocean, Amber, Mono); light / dark / system |
| **General** | Last updated, counts, link back to Home |

Persistence: `/etc/curxor/user-settings.json` (API keys + OAuth tokens in `llm-credentials.json`, mode 0600; link sessions in `provider-link-sessions.json`). Chat routing uses `lib/inference-router.ts` — frontier when configured (API key or OAuth token with refresh), local fallback in auto mode.

## Flow render

Open the interactive canvas beside chat: `curxor-ui-flow.canvas.tsx` in your Cursor canvases folder.
