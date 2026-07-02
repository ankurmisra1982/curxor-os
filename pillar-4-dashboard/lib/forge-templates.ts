import type { AppFreField, AgentSkill } from "./app-agent-catalog";
import type { GrowthLevel } from "./os-growth-level";

export type ForgeTemplateId = "blank-desk" | "work-desk" | "creator-desk" | "capital-desk" | "kiosk-desk";

export interface ForgeTemplatePack {
  id: ForgeTemplateId;
  label: string;
  description: string;
  cloneHint: string;
  defaultGrowthLevel: GrowthLevel;
  agentNameSuffix: string;
  skills: AgentSkill[];
  freFields: AppFreField[];
  defaultFreConfig: Record<string, unknown>;
  soulTemplate: string;
  toolsTemplate: string;
  heartbeatTemplate: string;
}

function applyTemplateVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function renderTemplateText(template: string, vars: Record<string, string>): string {
  return applyTemplateVars(template, vars);
}

const BASE_SKILLS: AgentSkill[] = [
  { id: "plan_day", label: "Plan Day", description: "Summarize priorities from intent", kind: "plan" },
  { id: "publish_context", label: "Publish Context", description: "Publish scoped context to mesh", kind: "plan" },
];

export const FORGE_TEMPLATE_PACKS: Record<ForgeTemplateId, ForgeTemplatePack> = {
  "blank-desk": {
    id: "blank-desk",
    label: "Blank framework",
    description: "Minimal CurXor shell — growth gates scaffold, you add panels later.",
    cloneHint: "Custom niche desk",
    defaultGrowthLevel: "L1",
    agentNameSuffix: "Claw",
    skills: BASE_SKILLS,
    freFields: [
      { id: "deskFocus", label: "Primary focus", type: "text", defaultValue: "", placeholder: "e.g. Research pipeline" },
      { id: "meshPublish", label: "Publish to Claw Context mesh", type: "toggle", defaultValue: false },
    ],
    defaultFreConfig: { deskFocus: "", meshPublish: false, growthLevel: "L1" },
    soulTemplate: `# {{agentName}}

{{intent}}

## Purpose
- Sovereign operator desk forged on CurXor bare metal.
- Chat plans locally; outbound actions require explicit skill taps.

## Voice
Direct, operator-first, no cloud API rent.`,
    toolsTemplate: `# Tools — {{agentName}}

- **plan_day** (plan): Summarize today's priorities
- **publish_context** (plan): Opt-in mesh publish when enabled in FRE`,
    heartbeatTemplate: `# HEARTBEAT — {{agentName}}

## Daily at 08:00
- message:Morning brief for {{name}}`,
  },
  "work-desk": {
    id: "work-desk",
    label: "Outreach desk clone",
    description: "Work Claw skeleton — leads, sequences, CRM-style coordination.",
    cloneHint: "Based on Work Claw",
    defaultGrowthLevel: "L2",
    agentNameSuffix: "Outreach Claw",
    skills: [
      ...BASE_SKILLS,
      { id: "create_lead", label: "Create Lead", description: "Add a lead to pipeline", kind: "plan" },
      { id: "draft_sequence", label: "Draft Sequence", description: "Plan outbound sequence", kind: "plan" },
      { id: "send_sequence_step", label: "Send Step", description: "Simulate current sequence step", kind: "digital" },
    ],
    freFields: [
      { id: "persona", label: "Operator persona", type: "select", defaultValue: "side_hustle", options: [
        { value: "student_hobbies", label: "Student / hobbies" },
        { value: "side_hustle", label: "Side hustle" },
        { value: "solo_business", label: "Solo business" },
      ]},
      { id: "meshPublish", label: "Share work context on mesh", type: "toggle", defaultValue: true },
    ],
    defaultFreConfig: { persona: "side_hustle", meshPublish: true, growthLevel: "L2" },
    soulTemplate: `# {{agentName}}

{{intent}}

## Purpose
- Outbound coordination desk cloned from Work Claw framework.
- Sequences and sends egress via eno2 bridges only.

## Voice
Professional, sovereign, operator-first.`,
    toolsTemplate: `# Tools — {{agentName}}

- **create_lead** (plan): Add lead to pipeline
- **draft_sequence** (plan): Plan multi-step outreach
- **send_sequence_step** (digital): Simulate send for current step
- **publish_context** (plan): Share scoped work context`,
    heartbeatTemplate: `# HEARTBEAT — {{agentName}}

## Every 30 minutes
- skill:publish_context`,
  },
  "creator-desk": {
    id: "creator-desk",
    label: "Creator desk clone",
    description: "Creator Claw skeleton — draft, calendar, publish bridges.",
    cloneHint: "Based on Creator Claw",
    defaultGrowthLevel: "L2",
    agentNameSuffix: "Creator Claw",
    skills: [
      ...BASE_SKILLS,
      { id: "draft_post", label: "Draft Post", description: "Local LLM draft", kind: "plan" },
      { id: "schedule_post", label: "Schedule", description: "Queue publish intent", kind: "plan" },
    ],
    freFields: [
      { id: "primaryChannel", label: "Primary channel", type: "select", defaultValue: "x", options: [
        { value: "x", label: "X / Twitter" },
        { value: "linkedin", label: "LinkedIn" },
        { value: "multi", label: "Multi-channel" },
      ]},
      { id: "meshPublish", label: "Share creator context on mesh", type: "toggle", defaultValue: true },
    ],
    defaultFreConfig: { primaryChannel: "x", meshPublish: true, growthLevel: "L2" },
    soulTemplate: `# {{agentName}}

{{intent}}

## Purpose
- Content operator desk cloned from Creator Claw framework.
- Drafts stay local; publish requires operator tap.

## Voice
Creative but sovereign — no cloud API rent for posts.`,
    toolsTemplate: `# Tools — {{agentName}}

- **draft_post** (plan): Local LLM copy draft
- **schedule_post** (plan): Queue publish via bridge
- **publish_context** (plan): Share creator context`,
    heartbeatTemplate: `# HEARTBEAT — {{agentName}}

## Daily at 09:00
- message:Review content calendar`,
  },
  "capital-desk": {
    id: "capital-desk",
    label: "Capital desk clone",
    description: "Capital Claw skeleton — watchlist, rules, paper trading path.",
    cloneHint: "Based on Capital Claw",
    defaultGrowthLevel: "L1",
    agentNameSuffix: "Capital Claw",
    skills: [
      ...BASE_SKILLS,
      { id: "research_ticker", label: "Research Ticker", description: "Local ticker research", kind: "plan" },
      { id: "arm_rule", label: "Arm Rule", description: "Enable IF/THEN rule", kind: "plan" },
    ],
    freFields: [
      { id: "riskProfile", label: "Risk profile", type: "select", defaultValue: "balanced", options: [
        { value: "conservative", label: "Conservative" },
        { value: "balanced", label: "Balanced" },
        { value: "aggressive", label: "Aggressive" },
      ]},
      { id: "meshPublish", label: "Share portfolio context on mesh", type: "toggle", defaultValue: false },
    ],
    defaultFreConfig: { riskProfile: "balanced", meshPublish: false, growthLevel: "L1", watchlist: ["SPY"] },
    soulTemplate: `# {{agentName}}

{{intent}}

## Purpose
- Wealth desk cloned from Capital Claw framework.
- Trades egress via eno2 only — LLM never calls brokers directly.

## Voice
Calm, risk-aware, operator-first.`,
    toolsTemplate: `# Tools — {{agentName}}

- **research_ticker** (plan): Price + headlines locally
- **arm_rule** (plan): Enable automation rule
- **publish_context** (plan): Opt-in portfolio context`,
    heartbeatTemplate: `# HEARTBEAT — {{agentName}}

## Daily at 07:30
- message:Market open brief`,
  },
  "kiosk-desk": {
    id: "kiosk-desk",
    label: "Kiosk / retail desk",
    description: "Cafe-style kiosk intent — guest queue, vision, lane ops.",
    cloneHint: "Retail / kiosk domain pack",
    defaultGrowthLevel: "L1",
    agentNameSuffix: "Kiosk Claw",
    skills: [
      ...BASE_SKILLS,
      { id: "drop_claw", label: "Drop Claw", description: "Queue next guest action", kind: "physical" },
      { id: "reset_lane", label: "Reset Lane", description: "Clear lane state", kind: "physical" },
    ],
    freFields: [
      { id: "kioskName", label: "Kiosk name", type: "text", defaultValue: "Patron Hall" },
      { id: "meshPublish", label: "Publish kiosk events to mesh", type: "toggle", defaultValue: true },
    ],
    defaultFreConfig: { kioskName: "Patron Hall", meshPublish: true, growthLevel: "L1" },
    soulTemplate: `# {{agentName}}

{{intent}}

## Purpose
- Retail / kiosk operator forged for lane vision and guest queue.
- Physical skills publish to claw mesh when connected.

## Voice
Upbeat, demo-ready, operator-safe.`,
    toolsTemplate: `# Tools — {{agentName}}

- **drop_claw** (physical): Queue guest interaction
- **reset_lane** (physical): Reset active lane
- **publish_context** (plan): Share kiosk status`,
    heartbeatTemplate: `# HEARTBEAT — {{agentName}}

## Every 15 minutes
- skill:publish_context`,
  },
};

export const FORGE_TEMPLATE_LIST = Object.values(FORGE_TEMPLATE_PACKS);

export function isForgeTemplateId(v: unknown): v is ForgeTemplateId {
  return typeof v === "string" && v in FORGE_TEMPLATE_PACKS;
}

export function getForgeTemplate(id: ForgeTemplateId): ForgeTemplatePack {
  return FORGE_TEMPLATE_PACKS[id];
}

export function templateVars(name: string, intent: string, agentName: string): Record<string, string> {
  return { name, intent, agentName };
}

export function buildTemplateWorkspace(
  pack: ForgeTemplatePack,
  name: string,
  intent: string,
): { soul: string; tools: string; heartbeat: string } {
  const agentName = name.includes("Claw") ? name : `${name} ${pack.agentNameSuffix}`.trim();
  const vars = templateVars(name, intent, agentName);
  return {
    soul: renderTemplateText(pack.soulTemplate, vars),
    tools: renderTemplateText(pack.toolsTemplate, vars),
    heartbeat: renderTemplateText(pack.heartbeatTemplate, vars),
  };
}

export function inferTemplateFromIntent(intent: string): ForgeTemplateId {
  const text = intent.toLowerCase();
  if (/capital|invest|stock|crypto|trading|portfolio|finance/.test(text)) return "capital-desk";
  if (/content|creator|social|youtube|tiktok|post|channel/.test(text)) return "creator-desk";
  if (/outreach|email|lead|crm|sequence|sales/.test(text)) return "work-desk";
  if (/kiosk|cafe|retail|guest|lane|prize|shop/.test(text)) return "kiosk-desk";
  return "blank-desk";
}
