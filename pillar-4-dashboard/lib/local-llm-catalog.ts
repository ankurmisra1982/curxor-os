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

/** Default reasoning backbone — aligned across pillars via CURXOR_INFERENCE_MODEL. */
export const DEFAULT_REASONING_MODEL = "qwen3:8b";

/** Local-only models available on Pillar 1 (no cloud). */
export const LOCAL_LLM_CATALOG: LocalLlmOption[] = [
  {
    id: "moondream:1.8b",
    name: "Moondream 2 (1.8B)",
    role: "vision",
    umaGb: 4,
    tokensPerSec: 38,
    description: "Tiny vision-language for claw cameras and kiosks.",
    tiers: ["economy", "balanced", "performance"],
  },
  {
    id: "qwen3-vl:8b",
    name: "Qwen3-VL 8B",
    role: "vision",
    umaGb: 8,
    tokensPerSec: 24,
    description: "Best UMA-fit spatial vision — 256K context, agentic scenes.",
    tiers: ["balanced", "performance"],
  },
  {
    id: "qwen2.5-vl:7b",
    name: "Qwen2.5-VL 7B (legacy)",
    role: "vision",
    umaGb: 12,
    tokensPerSec: 22,
    description: "Legacy vision stack — prefer qwen3-vl:8b on new claws.",
    tiers: ["balanced", "performance"],
  },
  {
    id: "qwen3:8b",
    name: "Qwen3 8B",
    role: "reasoning",
    umaGb: 6,
    tokensPerSec: 32,
    description: "Default agent backbone — tool-calling, fast on gfx1151 UMA.",
    tiers: ["economy", "balanced", "performance"],
  },
  {
    id: "qwen2.5:7b-instruct-q4_K_M",
    name: "Qwen2.5 7B (legacy)",
    role: "reasoning",
    umaGb: 8,
    tokensPerSec: 30,
    description: "Legacy reasoning stack — prefer qwen3:8b on new claws.",
    tiers: ["economy", "balanced", "performance"],
  },
  {
    id: "qwen3:14b",
    name: "Qwen3 14B",
    role: "reasoning",
    umaGb: 11,
    tokensPerSec: 20,
    description: "Stronger multi-step planning for content and capital claws.",
    tiers: ["balanced", "performance"],
  },
  {
    id: "qwen2.5:14b-instruct-q4_K_M",
    name: "Qwen2.5 14B (legacy)",
    role: "reasoning",
    umaGb: 16,
    tokensPerSec: 18,
    description: "Legacy mid-size reasoning — prefer qwen3:14b on new claws.",
    tiers: ["balanced", "performance"],
  },
  {
    id: "qwen3:30b",
    name: "Qwen3 30B MoE",
    role: "reasoning",
    umaGb: 22,
    tokensPerSec: 38,
    description: "Official Ollama MoE — strong general agent backbone on 64 GB UMA.",
    tiers: ["performance"],
  },
  {
    id: "batiai/qwen3.6-35b:q4",
    name: "Qwen3.6 35B MoE (coding)",
    role: "reasoning",
    umaGb: 20,
    tokensPerSec: 34,
    description: "Strix Halo coding leader — ~67% SWE-mini on pi-bench; agentic tool-calling.",
    tiers: ["performance"],
  },
  {
    id: "batiai/qwen3.6-35b:q6",
    name: "Qwen3.6 35B MoE Q6",
    role: "reasoning",
    umaGb: 28,
    tokensPerSec: 26,
    description: "Higher-quality Qwen3.6 quant for Pro 128 GB coding / Build Plane work.",
    tiers: ["performance"],
  },
  {
    id: "batiai/qwen3.6-27b:q4",
    name: "Qwen3.6 27B Dense",
    role: "reasoning",
    umaGb: 18,
    tokensPerSec: 22,
    description: "Dense coding model — pi-bench sweet spot when 128 GB allows hot-load headroom.",
    tiers: ["performance"],
  },
  {
    id: "qwen3:32b",
    name: "Qwen3 32B",
    role: "reasoning",
    umaGb: 24,
    tokensPerSec: 16,
    description: "Dense flagship reasoning for Pro 128 GB hot-loaded stacks.",
    tiers: ["performance"],
  },
  {
    id: "qwen2.5:35b",
    name: "Qwen2.5 35B MoE (legacy)",
    role: "reasoning",
    umaGb: 22,
    tokensPerSec: 42,
    description: "Legacy MoE — prefer qwen3:30b on new claws.",
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
    description: "Minimal UMA footprint · moondream + qwen3:8b · single-claw kiosks",
  },
  {
    id: "balanced",
    label: "Balanced",
    umaCapGb: 36,
    description: "Recommended for most claws · qwen3-vl:8b + qwen3:14b",
  },
  {
    id: "performance",
    label: "Performance",
    umaCapGb: 48,
    description: "Max quality on 64 GB UMA · qwen3.6 MoE for coding · VLA when manipulation intent",
  },
];

export function modelsForTier(tier: BudgetTier) {
  return LOCAL_LLM_CATALOG.filter((m) => m.tiers.includes(tier));
}
