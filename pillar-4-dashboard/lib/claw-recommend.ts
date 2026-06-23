import type { ForgeProvisioningMode } from "./forge-provisioning";
import type { BudgetTier } from "./local-llm-catalog";
import { LOCAL_LLM_CATALOG } from "./local-llm-catalog";

export type { ForgeProvisioningMode };

export interface ClawModels {
  vision: string;
  reasoning: string;
  vla: string | null;
}

export interface ClawProfile {
  id: string;
  name: string;
  intent: string;
  budgetTier: BudgetTier;
  autoSelected: boolean;
  models: ClawModels;
  createdAt: string;
  /** How this profile connects to CurXor OS — defaults to island for legacy rows. */
  provisioningMode?: ForgeProvisioningMode;
  /** Linked forged app when provisioned via framework/import path. */
  forgedAppId?: string;
  forgedAppSlug?: string;
  meshConnected?: boolean;
  multimodal?: {
    hadReferenceImage: boolean;
    liveVision: boolean;
    imageHint: string | null;
  };
  status?: "active" | "archived";
  archivedAt?: string | null;
}

export interface ClawProfilesState {
  claws: ClawProfile[];
  activeClawId: string | null;
}

export interface RecommendRequest {
  intent: string;
  budgetTier: BudgetTier;
}

export interface RecommendResult {
  models: ClawModels;
  rationale: string;
  estimatedUmaGb: number;
}

const MANIPULATION = /optimus|humanoid|grasp|pick|place|torque|manipul|claw|grip/i;
const FLEET = /fleet|robotaxi|taxi|vehicle|route|dispatch/i;
const KIOSK = /cafe|kiosk|prize|guest|demo|shop|retail/i;
const CONTENT = /content|creator|social|youtube|tiktok|channel|headless|post|media|video|reel|stream/i;
const CAPITAL = /capital|invest|stock|crypto|trading|portfolio|rule|market|finance|btc|eth|equity/i;

export function recommendModels(intent: string, budgetTier: BudgetTier): RecommendResult {
  const text = intent.toLowerCase();

  let vision = "moondream:1.8b";
  let reasoning = "qwen2.5:7b-instruct-q4_K_M";
  let vla: string | null = null;
  let rationale = "Default balanced stack for general claw coordination.";

  if (budgetTier === "economy") {
    vision = "moondream:1.8b";
    reasoning = "qwen2.5:7b-instruct-q4_K_M";
    rationale = "Economy tier — smallest local models within UMA budget.";
  } else if (budgetTier === "performance" || MANIPULATION.test(text)) {
    vision = "qwen2.5-vl:7b";
    reasoning = "qwen2.5:35b";
    vla = MANIPULATION.test(text) ? "OpenVLA/openvla-7b" : null;
    rationale = MANIPULATION.test(text)
      ? "Manipulation intent detected — VLA + strong reasoning selected."
      : "Performance tier — maximum local quality within 48 GB GPU heap.";
  } else if (FLEET.test(text)) {
    vision = "moondream:1.8b";
    reasoning = "qwen2.5:14b-instruct-q4_K_M";
    rationale = "Fleet/dispatch intent — lightweight vision, stronger planning model.";
  } else if (KIOSK.test(text)) {
    vision = "moondream:1.8b";
    reasoning = "qwen2.5:7b-instruct-q4_K_M";
    rationale = "Kiosk/retail intent — fast vision + responsive chat backbone.";
  } else if (CONTENT.test(text)) {
    vision = "qwen2.5-vl:7b";
    reasoning = "qwen2.5:14b-instruct-q4_K_M";
    rationale = "Content/social intent — vision for thumbnails + stronger copy/script reasoning.";
  } else if (CAPITAL.test(text)) {
    vision = "moondream:1.8b";
    reasoning = "qwen2.5:14b-instruct-q4_K_M";
    rationale = "Capital/trading intent — lightweight vision, planning-heavy rule evaluation.";
  } else if (budgetTier === "balanced") {
    vision = "qwen2.5-vl:7b";
    reasoning = "qwen2.5:14b-instruct-q4_K_M";
    rationale = "Balanced tier — spatial vision + mid-size reasoning on UMA.";
  }

  const models: ClawModels = { vision, reasoning, vla };

  const estimatedUmaGb = sumUma(models);

  return { models, rationale, estimatedUmaGb };
}

function sumUma(models: ClawModels): number {
  const ids = [models.vision, models.reasoning, models.vla].filter(Boolean) as string[];
  return ids.reduce((sum, id) => {
    const m = LOCAL_LLM_CATALOG.find((x) => x.id === id);
    return sum + (m?.umaGb ?? 0);
  }, 0);
}

export function clawNameFromIntent(intent: string): string {
  const line = intent.trim().split("\n")[0]?.trim() ?? "New Claw";
  return line.length > 48 ? `${line.slice(0, 45)}…` : line || "New Claw";
}

export function randomClawId(): string {
  return `claw-${Date.now().toString(36)}`;
}
