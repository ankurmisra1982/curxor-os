import { recommendModels } from "./claw-recommend";
import type { BudgetTier } from "./local-llm-catalog";

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

export function assistClawForge(req: ForgeAssistRequest): ForgeAssistResult {
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
        "Describe the claw you want — kiosk, sorting, fleet dispatch, manipulation — or attach a photo / live vision frame.",
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
      reply: `${spatialNote} What should this claw optimize for — speed, precision, guest demos, or inventory? Say "forge it" when ready.`,
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
        "Tell me more — where will it run, what should it pick or move, and any latency or safety constraints?",
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
