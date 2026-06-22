export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { mkdirSync } from "node:fs";

import { getAppFreDir, markAppFreComplete, readAppFreState } from "@/lib/app-fre-state";
import { defaultFreConfig } from "@/lib/app-agent-catalog";
import { applyGrowthFromFre } from "@/lib/work-growth";
import { ensureBeginnerExperienceAfterCapitalFre } from "@/lib/capital-onboarding";
import { ensureBeginnerExperienceAfterCreatorFre } from "@/lib/content-creator-onboarding";
import { bootstrapWorkGrowthDesk, syncExperienceAfterWorkFre } from "@/lib/work-onboarding";
import { requireLanAuth } from "@/lib/lan-auth";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appId: string }> },
): Promise<Response> {
  const { appId } = await context.params;
  if (!isValidAppId(appId)) {
    return Response.json({ error: "Invalid app id" }, { status: 400 });
  }
  const state = await readAppFreState(appId);
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ appId: string }> },
): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const { appId } = await context.params;
  if (!isValidAppId(appId)) {
    return Response.json({ error: "Invalid app id" }, { status: 400 });
  }

  let body: { config?: Record<string, unknown> };
  try {
    body = (await request.json()) as { config?: Record<string, unknown> };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawConfig = body.config && typeof body.config === "object" ? body.config : defaultFreConfig(appId);
  const config = appId === "my-work" ? applyGrowthFromFre(rawConfig) : rawConfig;

  try {
    try {
      mkdirSync(getAppFreDir(), { recursive: true });
    } catch (mkdirErr) {
      console.warn("[app-fre] mkdirSync failed (dev or permissions):", mkdirErr);
    }

    const state = await markAppFreComplete(appId as OotbAppId, config);
    if (appId === "my-content-creator") {
      await ensureBeginnerExperienceAfterCreatorFre().catch((err) => {
        console.warn("[app-fre] Creator beginner experience nudge failed:", err);
      });
    }
    if (appId === "my-capital") {
      await ensureBeginnerExperienceAfterCapitalFre().catch((err) => {
        console.warn("[app-fre] Capital beginner experience nudge failed:", err);
      });
    }
    if (appId === "my-work") {
      await syncExperienceAfterWorkFre(config).catch((err) => {
        console.warn("[app-fre] Work experience sync failed:", err);
      });
      await bootstrapWorkGrowthDesk(config).catch((err) => {
        console.warn("[app-fre] Work growth desk bootstrap failed:", err);
      });
    }
    return Response.json({ ok: true, state });
  } catch (err) {
    console.warn("[app-fre] Failed to persist FRE state:", err);
    return Response.json(
      {
        ok: false,
        error: "Could not persist app FRE state",
        hint: "Ensure /etc/curxor/app-fre exists and is writable by the dashboard user",
      },
      { status: 503 },
    );
  }
}
