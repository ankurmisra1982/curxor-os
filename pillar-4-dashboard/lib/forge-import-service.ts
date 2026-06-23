import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ClawProfile } from "./claw-recommend";
import { clawNameFromIntent, randomClawId, recommendModels } from "./claw-recommend";
import { addClawProfile } from "./claw-profiles";
import { writeActiveClawEnv, restartEngineForActiveClaw } from "./active-claw";
import { addForgedApp } from "./forged-apps-store";
import type { ForgedAppRecord } from "./forged-apps-types";
import { markForgedAppFreComplete } from "./forged-app-fre";
import {
  getForgeTemplate,
  isForgeTemplateId,
  type ForgeTemplateId,
} from "./forge-templates";
import type { ForgeImportBundle } from "./forge-import";
import { workspaceFilesFromBundle } from "./forge-import";
import type { BudgetTier } from "./local-llm-catalog";
import { appendForgedAppSlug } from "./user-settings";
import { slugFromIntent } from "./workspace-app-id";
import type { GrowthLevel } from "./os-growth-level";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

async function writeWorkspaceDir(appId: string, files: Record<string, string>): Promise<void> {
  const dir = path.join(workspaceRoot(), appId);
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(dir, "skills"), { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    await writeFile(path.join(dir, file), content.endsWith("\n") ? content : `${content}\n`, { mode: 0o640 });
  }
}

export interface ImportClawInput {
  bundle: ForgeImportBundle;
  budgetTier?: BudgetTier;
  intentFallback?: string;
}

export interface ImportClawResult {
  profile: ClawProfile;
  forgedApp?: ForgedAppRecord;
}

export async function importClawBundle(input: ImportClawInput): Promise<ImportClawResult> {
  const bundle = input.bundle;
  const integration = bundle.integrationLevel ?? "framework";
  const intent =
    input.intentFallback?.trim() ||
    bundle.soul.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() ||
    bundle.name ||
    "Imported claw";
  const name = bundle.name?.trim() || clawNameFromIntent(intent);
  const budgetTier = input.budgetTier ?? "balanced";
  const models = recommendModels(intent, budgetTier).models;
  const files = workspaceFilesFromBundle(bundle);

  if (integration === "island") {
    const slug = slugFromIntent(name);
    const workspaceId = `forged-${slug}`;
    await writeWorkspaceDir(workspaceId, {
      "SOUL.md": files["SOUL.md"],
      "TOOLS.md": files["TOOLS.md"],
      "HEARTBEAT.md": files["HEARTBEAT.md"],
    });

    const profile: ClawProfile = {
      id: randomClawId(),
      name,
      intent,
      budgetTier,
      autoSelected: true,
      models,
      createdAt: new Date().toISOString(),
      provisioningMode: "imported",
      forgedAppSlug: slug,
      meshConnected: false,
    };

    await addClawProfile(profile);
    await writeActiveClawEnv(profile);
    await restartEngineForActiveClaw();

    const { emitForgeCafeEvent } = await import("./forge-cafe-events");
    await emitForgeCafeEvent({
      mode: "imported",
      name,
      appId: profile.id,
      forgedSlug: slug,
    }).catch(() => undefined);

    return { profile };
  }

  const templateId: ForgeTemplateId = isForgeTemplateId(bundle.templateId)
    ? bundle.templateId
    : "blank-desk";
  const pack = getForgeTemplate(templateId);
  const short = name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") || "IMP";

  const forgedApp = await addForgedApp({
    slug: slugFromIntent(name),
    name,
    intent,
    templateId,
    short,
    provisioningMode: "imported",
    meshConnected: Boolean(bundle.freConfig?.meshPublish ?? pack.defaultFreConfig.meshPublish),
    clawProfileId: null,
    growthLevel: (bundle.growthLevel ?? pack.defaultGrowthLevel) as GrowthLevel,
    importSource: "bundle",
  });

  await writeWorkspaceDir(forgedApp.id, {
    "SOUL.md": files["SOUL.md"],
    "TOOLS.md": files["TOOLS.md"],
    "HEARTBEAT.md": files["HEARTBEAT.md"],
  });

  const freConfig = {
    ...pack.defaultFreConfig,
    ...(bundle.freConfig ?? {}),
    forgedIntent: intent,
    importSource: "bundle",
    growthLevel: bundle.growthLevel ?? pack.defaultGrowthLevel,
  };
  await markForgedAppFreComplete(forgedApp.id, freConfig);

  const profile: ClawProfile = {
    id: randomClawId(),
    name,
    intent,
    budgetTier,
    autoSelected: true,
    models,
    createdAt: new Date().toISOString(),
    provisioningMode: "imported",
    forgedAppId: forgedApp.id,
    forgedAppSlug: forgedApp.slug,
    meshConnected: forgedApp.meshConnected,
  };

  await addClawProfile(profile);

  const { readForgedApps, writeForgedApps } = await import("./forged-apps-store");
  const state = await readForgedApps();
  const idx = state.apps.findIndex((a) => a.id === forgedApp.id);
  if (idx >= 0) {
    state.apps[idx] = { ...state.apps[idx]!, clawProfileId: profile.id };
    await writeForgedApps(state);
  }

  await appendForgedAppSlug(forgedApp.slug);
  await writeActiveClawEnv(profile);
  await restartEngineForActiveClaw();

  const { emitForgeCafeEvent } = await import("./forge-cafe-events");
  await emitForgeCafeEvent({
    mode: "imported",
    name,
    appId: forgedApp.id,
    forgedSlug: forgedApp.slug,
    templateId: forgedApp.templateId,
  }).catch(() => undefined);

  const updated = state.apps[idx] ?? forgedApp;
  return { profile, forgedApp: { ...updated, clawProfileId: profile.id } };
}
