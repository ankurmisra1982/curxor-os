export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { recommendModels, type RecommendRequest } from "@/lib/claw-recommend";
import type { BudgetTier } from "@/lib/local-llm-catalog";

function isBudgetTier(v: string): v is BudgetTier {
  return v === "economy" || v === "balanced" || v === "performance";
}

export async function POST(request: Request): Promise<Response> {
  let body: RecommendRequest;
  try {
    body = (await request.json()) as RecommendRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  const budgetTier = isBudgetTier(body.budgetTier) ? body.budgetTier : "balanced";

  if (!intent) {
    return Response.json({ error: "Intent is required" }, { status: 400 });
  }

  const result = recommendModels(intent, budgetTier);
  return Response.json(result);
}
