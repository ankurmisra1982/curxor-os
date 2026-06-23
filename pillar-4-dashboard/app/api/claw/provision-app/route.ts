export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { provisionFrameworkApp } from "@/lib/forge-provision-service";
import { isForgeTemplateId } from "@/lib/forge-templates";
import { requireLanAuth } from "@/lib/lan-auth";
import type { BudgetTier } from "@/lib/local-llm-catalog";
import { LOCAL_LLM_CATALOG } from "@/lib/local-llm-catalog";

interface ProvisionAppBody {
  intent?: string;
  name?: string;
  templateId?: string;
  budgetTier?: BudgetTier;
  autoSelected?: boolean;
  models?: { vision?: string; reasoning?: string; vla?: string | null };
  multimodal?: {
    hadReferenceImage?: boolean;
    liveVision?: boolean;
    imageHint?: string | null;
  };
}

function isBudgetTier(v: string): v is BudgetTier {
  return v === "economy" || v === "balanced" || v === "performance";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: ProvisionAppBody;
  try {
    body = (await request.json()) as ProvisionAppBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  if (intent.length < 8) {
    return Response.json({ ok: false, error: "Intent must be at least 8 characters" }, { status: 400 });
  }

  if (body.templateId && !isForgeTemplateId(body.templateId)) {
    return Response.json({ ok: false, error: "Invalid templateId" }, { status: 400 });
  }

  const budgetTier = isBudgetTier(body.budgetTier ?? "") ? body.budgetTier! : "balanced";

  let models = body.models;
  if (models?.vision && models?.reasoning) {
    const valid = LOCAL_LLM_CATALOG.some((m) => m.id === models!.vision);
    if (!valid) {
      return Response.json({ ok: false, error: "Invalid model selection" }, { status: 400 });
    }
  }

  await sleep(1500);

  try {
    const result = await provisionFrameworkApp({
      intent,
      name: body.name,
      templateId: body.templateId,
      budgetTier,
      autoSelected: body.autoSelected !== false,
      models: models?.vision && models?.reasoning
        ? { vision: models.vision, reasoning: models.reasoning, vla: models.vla ?? null }
        : undefined,
      multimodal: body.multimodal
        ? {
            hadReferenceImage: Boolean(body.multimodal.hadReferenceImage),
            liveVision: Boolean(body.multimodal.liveVision),
            imageHint: body.multimodal.imageHint ?? null,
          }
        : undefined,
    });

    return Response.json({
      ok: true,
      forgedApp: result.forgedApp,
      profile: result.profile,
      href: result.forgedApp.href,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provision failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
