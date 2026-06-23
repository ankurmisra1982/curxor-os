export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { parseImportBundle } from "@/lib/forge-import";
import { importClawBundle } from "@/lib/forge-import-service";
import { requireLanAuth } from "@/lib/lan-auth";
import type { BudgetTier } from "@/lib/local-llm-catalog";

interface ImportBody {
  bundle?: unknown;
  budgetTier?: BudgetTier;
  intentFallback?: string;
  operatorConfirmedWarnings?: boolean;
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

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseImportBundle(body.bundle);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const { bundle, warnings } = parsed.value;
  if (warnings.length > 0 && !body.operatorConfirmedWarnings) {
    return Response.json(
      {
        ok: false,
        requiresConfirmation: true,
        warnings,
        error: "Operator must confirm import warnings before provisioning.",
      },
      { status: 409 },
    );
  }

  const budgetTier = isBudgetTier(body.budgetTier ?? "") ? body.budgetTier! : "balanced";

  await sleep(1200);

  try {
    const result = await importClawBundle({
      bundle,
      budgetTier,
      intentFallback: body.intentFallback,
    });

    return Response.json({
      ok: true,
      profile: result.profile,
      forgedApp: result.forgedApp ?? null,
      href: result.forgedApp?.href ?? null,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
