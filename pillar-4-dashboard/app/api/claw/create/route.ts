export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { addClawProfile } from "@/lib/claw-profiles";
import { requireLanAuth } from "@/lib/lan-auth";
import { restartEngineForActiveClaw, writeActiveClawEnv } from "@/lib/active-claw";
import {
  clawNameFromIntent,
  randomClawId,
  recommendModels,
  type ClawProfile,
} from "@/lib/claw-recommend";
import {
  createRejectsNonIslandError,
  islandCreateAvailable,
  resolveProvisioningMode,
  type ForgeProvisioningMode,
} from "@/lib/forge-provisioning";
import type { BudgetTier } from "@/lib/local-llm-catalog";
import { LOCAL_LLM_CATALOG } from "@/lib/local-llm-catalog";

interface CreateBody {
  intent?: string;
  budgetTier?: BudgetTier;
  autoSelected?: boolean;
  provisioningMode?: ForgeProvisioningMode;
  models?: { vision?: string; reasoning?: string; vla?: string | null };
  name?: string;
  multimodal?: {
    hadReferenceImage?: boolean;
    liveVision?: boolean;
    imageHint?: string | null;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isBudgetTier(v: string): v is BudgetTier {
  return v === "economy" || v === "balanced" || v === "performance";
}

function validModelId(id: string): boolean {
  return LOCAL_LLM_CATALOG.some((m) => m.id === id);
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  if (!intent) {
    return Response.json({ ok: false, error: "Intent is required" }, { status: 400 });
  }

  const provisioningMode = resolveProvisioningMode(body.provisioningMode);
  if (!islandCreateAvailable(provisioningMode)) {
    return Response.json(
      {
        ok: false,
        error: createRejectsNonIslandError(provisioningMode),
      },
      { status: 400 },
    );
  }

  const budgetTier = isBudgetTier(body.budgetTier ?? "") ? body.budgetTier! : "balanced";
  const autoSelected = Boolean(body.autoSelected);

  let models = body.models;
  if (autoSelected || !models?.vision || !models?.reasoning) {
    models = recommendModels(intent, budgetTier).models;
  } else {
    if (!validModelId(models.vision) || !validModelId(models.reasoning)) {
      return Response.json({ ok: false, error: "Invalid model selection" }, { status: 400 });
    }
    if (models.vla && !validModelId(models.vla)) {
      return Response.json({ ok: false, error: "Invalid VLA model" }, { status: 400 });
    }
  }

  await sleep(3000);

  const profile: ClawProfile = {
    id: randomClawId(),
    name: body.name?.trim() || clawNameFromIntent(intent),
    intent,
    budgetTier,
    autoSelected,
    models: {
      vision: models!.vision!,
      reasoning: models!.reasoning!,
      vla: models!.vla ?? null,
    },
    createdAt: new Date().toISOString(),
    provisioningMode,
    multimodal: body.multimodal
      ? {
          hadReferenceImage: Boolean(body.multimodal.hadReferenceImage),
          liveVision: Boolean(body.multimodal.liveVision),
          imageHint: body.multimodal.imageHint ?? null,
        }
      : undefined,
  };

  const state = await addClawProfile(profile);

  await writeActiveClawEnv(profile);
  await restartEngineForActiveClaw();

  const { emitForgeCafeEvent } = await import("@/lib/forge-cafe-events");
  await emitForgeCafeEvent({
    mode: provisioningMode,
    name: profile.name,
    appId: profile.id,
    forgedSlug: profile.forgedAppSlug ?? null,
  }).catch(() => undefined);

  return Response.json({ ok: true, profile, state }, { status: 200 });
}
