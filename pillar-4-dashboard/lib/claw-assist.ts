import { recommendModels } from "./claw-recommend";
import {
  chatCompletion,
  isLocalInferenceAvailable,
  parseJsonLoose,
} from "./local-inference";
import type { BudgetTier } from "./local-llm-catalog";
import { LOCAL_LLM_CATALOG } from "./local-llm-catalog";

export interface ForgeChatTurn {
  role: "user" | "assistant";
  text: string;
  hasImage?: boolean;
}

export interface ForgeAssistRequest {
  message: string;
  imageBase64?: string | null;
  liveVision?: boolean;
  history?: ForgeChatTurn[];
}

export interface ForgeAssistResult {
  reply: string;
  suggestedIntent: string;
  budgetTier: BudgetTier;
  imageHint: string | null;
  readyToForge: boolean;
  rationale: string;
}

const FORGE_VERBS = /forge|create|deploy|provision|build|launch|add|register|make|spin up|stand up/i;
const BUDGET_ECONOMY = /economy|cheap|minimal|lightweight|low memory|small/i;
const BUDGET_PERF = /performance|max|best|heavy|powerful|large model|quality/i;

const VALID_TIERS: BudgetTier[] = ["economy", "balanced", "performance"];

function collectIntent(history: ForgeChatTurn[], message: string): string {
  const userLines = [...history.filter((t) => t.role === "user").map((t) => t.text), message]
    .map((t) => t.trim())
    .filter(Boolean);
  return userLines.join("\n\n");
}

function inferBudgetTier(text: string): BudgetTier {
  if (BUDGET_ECONOMY.test(text)) return "economy";
  if (BUDGET_PERF.test(text)) return "performance";
  return "balanced";
}

function imageHintFromContext(hasImage: boolean, liveVision: boolean): string | null {
  if (liveVision) return "Live mesh vision frame attached as spatial reference.";
  if (hasImage) return "Uploaded reference photo attached for spatial grounding.";
  return null;
}

function catalogSummary(): string {
  return LOCAL_LLM_CATALOG.map((m) => `- ${m.id}: ${m.role}, ~${m.umaGb}GB UMA — ${m.description}`).join("\n");
}

function forgeModelForRequest(intent: string, budgetTier: BudgetTier, hasImage: boolean): string {
  const { models } = recommendModels(intent, budgetTier);
  if (hasImage) return models.vision;
  return models.reasoning;
}

function mergeForgeResult(
  heuristic: ForgeAssistResult,
  llm: Partial<ForgeAssistResult> & { reply?: string },
): ForgeAssistResult {
  const budgetTier = VALID_TIERS.includes(llm.budgetTier as BudgetTier)
    ? (llm.budgetTier as BudgetTier)
    : heuristic.budgetTier;
  const suggestedIntent = (llm.suggestedIntent ?? heuristic.suggestedIntent).trim() || heuristic.suggestedIntent;
  const { rationale: catalogRationale } = recommendModels(suggestedIntent, budgetTier);

  return {
    reply: (llm.reply ?? heuristic.reply).trim() || heuristic.reply,
    suggestedIntent,
    budgetTier,
    imageHint: heuristic.imageHint,
    readyToForge: llm.readyToForge ?? heuristic.readyToForge,
    rationale: (llm.rationale ?? catalogRationale).trim() || catalogRationale,
  };
}

export function assistClawForgeHeuristic(req: ForgeAssistRequest): ForgeAssistResult {
  const message = req.message.trim();
  const history = req.history ?? [];
  const hasImage = Boolean(req.imageBase64?.length);
  const liveVision = Boolean(req.liveVision);
  const combined = `${history.map((t) => t.text).join(" ")} ${message}`.toLowerCase();
  const suggestedIntent = collectIntent(history, message);
  const budgetTier = inferBudgetTier(combined);
  const imageHint = imageHintFromContext(hasImage, liveVision);
  const { rationale } = recommendModels(suggestedIntent, budgetTier);

  const readyToForge =
    FORGE_VERBS.test(message) ||
    (suggestedIntent.length >= 24 && (hasImage || liveVision || suggestedIntent.length >= 48));

  if (!message && !hasImage && !liveVision) {
    return {
      reply:
        "Describe the Claw you want — outbound, arbitrage, creator pipeline, signal feeds — or attach a photo / live vision frame.",
      suggestedIntent: "",
      budgetTier: "balanced",
      imageHint: null,
      readyToForge: false,
      rationale: "",
    };
  }

  if (hasImage || liveVision) {
    const spatialNote = liveVision
      ? "I ingested the live vision frame from your mesh feed."
      : "I parsed your reference image for layout and object cues.";

    if (readyToForge) {
      return {
        reply: `${spatialNote} Intent is clear — tap **+ Forge Claw** to provision with ${budgetTier} tier models. ${rationale}`,
        suggestedIntent,
        budgetTier,
        imageHint,
        readyToForge: true,
        rationale,
      };
    }

    return {
      reply: `${spatialNote} What should this Claw optimize for? Say "forge it" when ready.`,
      suggestedIntent,
      budgetTier,
      imageHint,
      readyToForge: false,
      rationale,
    };
  }

  if (readyToForge) {
    return {
      reply: `Understood. Recommended stack: ${rationale} Tap **+ Forge Claw** to provision on your appliance — no cloud.`,
      suggestedIntent,
      budgetTier,
      imageHint,
      readyToForge: true,
      rationale,
    };
  }

  if (suggestedIntent.length < 16) {
    return {
      reply:
        "Tell me more — which vertical (Capital, Creator, Outreach, Arbitrage), workload, and any latency or safety constraints?",
      suggestedIntent,
      budgetTier,
      imageHint,
      readyToForge: false,
      rationale,
    };
  }

  return {
    reply: `Got it. ${rationale} Attach a photo or live vision for spatial grounding, or say "forge claw" to continue.`,
    suggestedIntent,
    budgetTier,
    imageHint,
    readyToForge: false,
    rationale,
  };
}

async function inferForgeWithLlm(req: ForgeAssistRequest, heuristic: ForgeAssistResult): Promise<ForgeAssistResult | null> {
  if (!(await isLocalInferenceAvailable())) return null;

  const message = req.message.trim();
  const history = req.history ?? [];
  const hasImage = Boolean(req.imageBase64?.length);
  const liveVision = Boolean(req.liveVision);
  const suggestedIntent = heuristic.suggestedIntent;
  const model = forgeModelForRequest(suggestedIntent, heuristic.budgetTier, hasImage);

  const systemPrompt = `You are Forge Master on a sovereign CurXor appliance. Help the operator describe a digital Claw employee to provision on bare metal.
Rules:
- Local models only. Never suggest OpenAI, Anthropic, or cloud APIs.
- You recommend stacks from this catalog:
${catalogSummary()}
- The operator must tap "+ Forge Claw" to provision — you do not deploy directly.
- Respond with JSON only:
{"reply":"string","suggestedIntent":"string","budgetTier":"economy|balanced|performance","readyToForge":boolean,"rationale":"string"}`;

  const turns: { role: "user" | "assistant"; content: string; images?: string[] }[] = history
    .filter((t) => t.role === "user" || t.role === "assistant")
    .slice(-8)
    .map((t) => ({ role: t.role, content: t.text }));

  const userContent =
    message ||
    (liveVision
      ? "Analyze the attached live vision context and suggest a Claw stack."
      : hasImage
        ? "Analyze the attached reference image and suggest a Claw stack."
        : "Continue helping me forge a Claw.");

  turns.push({
    role: "user",
    content: userContent,
    ...(hasImage && req.imageBase64 ? { images: [req.imageBase64] } : {}),
  });

  const result = await chatCompletion({
    model,
    format: "json",
    messages: [{ role: "system", content: systemPrompt }, ...turns],
    temperature: 0.2,
  });

  const parsed = parseJsonLoose<Partial<ForgeAssistResult>>(result.content);
  if (!parsed?.reply) {
    if (result.content.trim()) {
      return { ...heuristic, reply: result.content.trim() };
    }
    return null;
  }

  return mergeForgeResult(heuristic, parsed);
}

export async function assistClawForge(req: ForgeAssistRequest): Promise<ForgeAssistResult> {
  const heuristic = assistClawForgeHeuristic(req);

  try {
    const llm = await inferForgeWithLlm(req, heuristic);
    if (llm) return llm;
  } catch {
    /* fall back to heuristic */
  }

  return heuristic;
}
