export type BudgetTier = "economy" | "balanced" | "performance";

export interface LocalLlmOption {
  id: string;
  name: string;
  role: "vision" | "reasoning" | "vla";
  umaGb: number;
  tokensPerSec: number;
  description: string;
  tiers: BudgetTier[];
}

/** Local-only models available on Pillar 1 (no cloud). */
export const LOCAL_LLM_CATALOG: LocalLlmOption[] = [
  {
    id: "moondream:1.8b",
    name: "Moondream 1.8B",
    role: "vision",
    umaGb: 4,
    tokensPerSec: 38,
    description: "Lightweight vision-language for claw cameras.",
    tiers: ["economy", "balanced", "performance"],
  },
  {
    id: "qwen2.5-vl:7b",
    name: "Qwen2.5-VL 7B",
    role: "vision",
    umaGb: 12,
    tokensPerSec: 22,
    description: "Stronger spatial understanding for complex scenes.",
    tiers: ["balanced", "performance"],
  },
  {
    id: "qwen2.5:7b-instruct-q4_K_M",
    name: "Qwen2.5 7B",
    role: "reasoning",
    umaGb: 8,
    tokensPerSec: 30,
    description: "Fast planning and tool-calling backbone.",
    tiers: ["economy", "balanced", "performance"],
  },
  {
    id: "qwen2.5:14b-instruct-q4_K_M",
    name: "Qwen2.5 14B",
    role: "reasoning",
    umaGb: 16,
    tokensPerSec: 18,
    description: "Higher-quality reasoning for multi-step tasks.",
    tiers: ["balanced", "performance"],
  },
  {
    id: "qwen2.5:35b",
    name: "Qwen2.5 35B MoE",
    role: "reasoning",
    umaGb: 22,
    tokensPerSec: 42,
    description: "Best speed/quality on 64 GB UMA (MoE active 3B).",
    tiers: ["performance"],
  },
  {
    id: "OpenVLA/openvla-7b",
    name: "OpenVLA 7B",
    role: "vla",
    umaGb: 18,
    tokensPerSec: 12,
    description: "Robotics VLA — vision + action head for manipulation.",
    tiers: ["balanced", "performance"],
  },
];

export const BUDGET_TIERS: Array<{
  id: BudgetTier;
  label: string;
  umaCapGb: number;
  description: string;
}> = [
  {
    id: "economy",
    label: "Economy",
    umaCapGb: 20,
    description: "Minimal UMA footprint · fastest boot · single-claw kiosks",
  },
  {
    id: "balanced",
    label: "Balanced",
    umaCapGb: 36,
    description: "Recommended for most claws · vision + reasoning pair",
  },
  {
    id: "performance",
    label: "Performance",
    umaCapGb: 48,
    description: "Max quality on 64 GB UMA · VLA when intent requires manipulation",
  },
];

export function modelsForTier(tier: BudgetTier) {
  return LOCAL_LLM_CATALOG.filter((m) => m.tiers.includes(tier));
}
