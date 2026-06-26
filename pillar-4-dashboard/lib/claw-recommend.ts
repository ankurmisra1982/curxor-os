import type { ForgeProvisioningMode } from "./forge-provisioning";
import type { BudgetTier } from "./local-llm-catalog";
import { DEFAULT_REASONING_MODEL, LOCAL_LLM_CATALOG } from "./local-llm-catalog";

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
const CODING = /code|coding|build|forge|develop|repo|git|debug|swe|typescript|python|rust/i;

/** Best evidence-backed coding MoE on Strix Halo / MS-S1 UMA (pi-bench SWE-mini). */
export const PERFORMANCE_CODING_MODEL = "batiai/qwen3.6-35b:q4";

export function recommendModels(intent: string, budgetTier: BudgetTier): RecommendResult {
  const text = intent.toLowerCase();

  let vision = "moondream:1.8b";
  let reasoning = DEFAULT_REASONING_MODEL;
  let vla: string | null = null;
  let rationale = "Default balanced stack for general claw coordination.";

  if (budgetTier === "economy") {
    vision = "moondream:1.8b";
    reasoning = DEFAULT_REASONING_MODEL;
    rationale = "Economy tier — moondream vision + qwen3:8b within UMA budget.";
  } else if (budgetTier === "performance" || MANIPULATION.test(text)) {
    vision = "qwen3-vl:8b";
    reasoning = CODING.test(text) ? PERFORMANCE_CODING_MODEL : "qwen3:30b";
    vla = MANIPULATION.test(text) ? "OpenVLA/openvla-7b" : null;
    rationale = MANIPULATION.test(text)
      ? "Manipulation intent detected — VLA + qwen3.6 MoE reasoning selected."
      : CODING.test(text)
        ? "Coding/build intent — qwen3.6 MoE (Strix Halo pi-bench leader) within 48 GB heap."
        : "Performance tier — qwen3-vl + qwen3:30b MoE within 48 GB GPU heap.";
  } else if (FLEET.test(text)) {
    vision = "moondream:1.8b";
    reasoning = "qwen3:14b";
    rationale = "Fleet/dispatch intent — lightweight vision, qwen3:14b planning.";
  } else if (KIOSK.test(text)) {
    vision = "moondream:1.8b";
    reasoning = DEFAULT_REASONING_MODEL;
    rationale = "Kiosk/retail intent — fast moondream vision + responsive qwen3:8b chat.";
  } else if (CONTENT.test(text)) {
    vision = "qwen3-vl:8b";
    reasoning = "qwen3:14b";
    rationale = "Content/social intent — qwen3-vl for thumbnails + qwen3:14b copy/scripts.";
  } else if (CAPITAL.test(text)) {
    vision = "moondream:1.8b";
    reasoning = "qwen3:14b";
    rationale = "Capital/trading intent — lightweight vision, qwen3:14b rule evaluation.";
  } else if (budgetTier === "balanced") {
    vision = "qwen3-vl:8b";
    reasoning = "qwen3:14b";
    rationale = "Balanced tier — qwen3-vl spatial vision + qwen3:14b reasoning on UMA.";
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
