export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { mkdirSync } from "node:fs";

import { getAppFreDir, markAppFreComplete, readAppFreState } from "@/lib/app-fre-state";
import { readForgedAppFre, markForgedAppFreComplete } from "@/lib/forged-app-fre";
import { defaultFreConfig } from "@/lib/app-agent-catalog";
import { defaultFreConfigForApp } from "@/lib/forged-agent-catalog";
import { getForgedAppById } from "@/lib/forged-apps-store";
import { applyGrowthFromFre } from "@/lib/work-growth";
import { applyGrowthFromCreatorFre } from "@/lib/creator-growth";
import { applyGrowthFromCapitalFre } from "@/lib/capital-growth";
import { applyGrowthFromVitalFre } from "@/lib/vital-growth";
import { applyGrowthFromForgeFre } from "@/lib/forge-growth";
import { applyGrowthFromKinFre } from "@/lib/kin-growth";
import { applyGrowthFromSwarmFre } from "@/lib/swarm-growth";
import { syncExperienceAfterForgeFre } from "@/lib/forge-onboarding";
import { syncExperienceAfterShopFre } from "@/lib/shop-onboarding";
import {
  ensureBeginnerExperienceAfterSwarmFre,
  syncExperienceAfterSwarmFre,
} from "@/lib/swarm-onboarding";
import { ensureBeginnerExperienceAfterCapitalFre, syncExperienceAfterCapitalFre } from "@/lib/capital-onboarding";
import {
  ensureBeginnerExperienceAfterCreatorFre,
  syncExperienceAfterCreatorFre,
} from "@/lib/content-creator-onboarding";
import {
  ensureBeginnerExperienceAfterVitalFre,
  syncExperienceAfterVitalFre,
} from "@/lib/vital-onboarding";
import { bootstrapWorkGrowthDesk, syncExperienceAfterWorkFre } from "@/lib/work-onboarding";
import { requireLanAuth } from "@/lib/lan-auth";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { isForgedAppId } from "@/lib/workspace-app-id";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appId: string }> },
): Promise<Response> {
  const { appId } = await context.params;
  if (isForgedAppId(appId)) {
    const state = await readForgedAppFre(appId);
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  }
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

  let body: { config?: Record<string, unknown> };
  try {
    body = (await request.json()) as { config?: Record<string, unknown> };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isForgedAppId(appId)) {
    const record = await getForgedAppById(appId);
    const rawConfig =
      body.config && typeof body.config === "object"
        ? body.config
        : defaultFreConfigForApp(appId, record);
    try {
      mkdirSync(getAppFreDir(), { recursive: true });
    } catch {
      /* dev */
    }
    const state = await markForgedAppFreComplete(appId, rawConfig);
    return Response.json({ ok: true, state });
  }

  if (!isValidAppId(appId)) {
    return Response.json({ error: "Invalid app id" }, { status: 400 });
  }

  let bodyOotb = body;

  const rawConfig = bodyOotb.config && typeof bodyOotb.config === "object" ? bodyOotb.config : defaultFreConfig(appId as OotbAppId);
  const config =
    appId === "my-work"
      ? applyGrowthFromFre(rawConfig)
      : appId === "my-content-creator"
        ? applyGrowthFromCreatorFre(rawConfig)
        : appId === "my-capital"
          ? applyGrowthFromCapitalFre(rawConfig)
          : appId === "claw-forge"
            ? applyGrowthFromForgeFre(rawConfig)
            : appId === "my-family"
              ? applyGrowthFromKinFre(rawConfig)
              : appId === "robotaxi-fleet-manager"
                ? applyGrowthFromSwarmFre(rawConfig)
                : rawConfig;

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
      await syncExperienceAfterCreatorFre(config).catch((err) => {
        console.warn("[app-fre] Creator experience sync failed:", err);
      });
    }
    if (appId === "my-capital") {
      await ensureBeginnerExperienceAfterCapitalFre().catch((err) => {
        console.warn("[app-fre] Capital beginner experience nudge failed:", err);
      });
      await syncExperienceAfterCapitalFre(config).catch((err) => {
        console.warn("[app-fre] Capital experience sync failed:", err);
      });
    }
    if (appId === "my-vital") {
      await ensureBeginnerExperienceAfterVitalFre().catch((err) => {
        console.warn("[app-fre] Vital beginner experience nudge failed:", err);
      });
      await syncExperienceAfterVitalFre(config).catch((err) => {
        console.warn("[app-fre] Vital experience sync failed:", err);
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
    if (appId === "claw-forge") {
      await syncExperienceAfterForgeFre(config).catch((err) => {
        console.warn("[app-fre] Forge experience sync failed:", err);
      });
    }
    if (appId === "robotaxi-fleet-manager") {
      await ensureBeginnerExperienceAfterSwarmFre().catch((err) => {
        console.warn("[app-fre] Swarm beginner experience nudge failed:", err);
      });
      await syncExperienceAfterSwarmFre(config).catch((err) => {
        console.warn("[app-fre] Swarm experience sync failed:", err);
      });
    }
    if (appId === "my-shop") {
      await syncExperienceAfterShopFre(config).catch((err) => {
        console.warn("[app-fre] Shop experience sync failed:", err);
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
