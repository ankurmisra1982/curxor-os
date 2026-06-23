import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ClawProfile, ClawModels } from "./claw-recommend";
import { clawNameFromIntent, randomClawId, recommendModels } from "./claw-recommend";
import { addClawProfile } from "./claw-profiles";
import { writeActiveClawEnv, restartEngineForActiveClaw } from "./active-claw";
import { addForgedApp } from "./forged-apps-store";
import type { ForgedAppRecord } from "./forged-apps-types";
import { markForgedAppFreComplete } from "./forged-app-fre";
import {
  buildTemplateWorkspace,
  getForgeTemplate,
  inferTemplateFromIntent,
  isForgeTemplateId,
  type ForgeTemplateId,
} from "./forge-templates";
import type { BudgetTier } from "./local-llm-catalog";
import { appendForgedAppSlug } from "./user-settings";
import { forgedAppIdFromSlug, slugFromIntent } from "./workspace-app-id";
import type { GrowthLevel } from "./os-growth-level";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

async function writeForgedWorkspace(
  appId: string,
  files: Record<string, string>,
): Promise<void> {
  const dir = path.join(workspaceRoot(), appId);
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(dir, "skills"), { recursive: true });
  for (const [file, content] of Object.entries(files) as [string, string][]) {
    await writeFile(path.join(dir, file), content.endsWith("\n") ? content : `${content}\n`, { mode: 0o640 });
  }
}

export interface ProvisionFrameworkInput {
  intent: string;
  name?: string;
  templateId?: string;
  budgetTier?: BudgetTier;
  autoSelected?: boolean;
  models?: ClawModels;
  multimodal?: ClawProfile["multimodal"];
  seedFreInitialized?: boolean;
}

export interface ProvisionFrameworkResult {
  forgedApp: ForgedAppRecord;
  profile: ClawProfile;
}

export async function provisionFrameworkApp(input: ProvisionFrameworkInput): Promise<ProvisionFrameworkResult> {
  const intent = input.intent.trim();
  if (!intent) throw new Error("Intent is required");

  const templateId: ForgeTemplateId = isForgeTemplateId(input.templateId)
    ? input.templateId
    : inferTemplateFromIntent(intent);
  const pack = getForgeTemplate(templateId);
  const name = input.name?.trim() || clawNameFromIntent(intent);
  const baseSlug = slugFromIntent(name);
  const short = name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") || "CLW";

  const budgetTier = input.budgetTier ?? "balanced";
  const autoSelected = input.autoSelected !== false;
  const models =
    input.models ??
    (autoSelected ? recommendModels(intent, budgetTier).models : recommendModels(intent, budgetTier).models);

  const forgedApp = await addForgedApp({
    slug: baseSlug,
    name,
    intent,
    templateId,
    short,
    provisioningMode: "framework",
    meshConnected: Boolean(pack.defaultFreConfig.meshPublish),
    clawProfileId: null,
    growthLevel: pack.defaultGrowthLevel as GrowthLevel,
    importSource: null,
  });

  const workspace = buildTemplateWorkspace(pack, name, intent);
  await writeForgedWorkspace(forgedApp.id, {
    "SOUL.md": workspace.soul,
    "TOOLS.md": workspace.tools,
    "HEARTBEAT.md": workspace.heartbeat,
  });

  const freConfig = {
    ...pack.defaultFreConfig,
    forgedIntent: intent,
    forgedTemplateId: templateId,
    growthLevel: pack.defaultGrowthLevel,
  };
  await markForgedAppFreComplete(forgedApp.id, freConfig);

  if (templateId === "work-desk") {
    const { seedForgedWorkDemoIfEmpty } = await import("./forged-work-store");
    await seedForgedWorkDemoIfEmpty(forgedApp.id);
  }

  if (templateId === "creator-desk") {
    const { seedForgedCreatorDemoIfEmpty } = await import("./forged-creator-store");
    await seedForgedCreatorDemoIfEmpty(forgedApp.id);
  }

  if (templateId === "capital-desk") {
    const { seedForgedCapitalDemoIfEmpty } = await import("./forged-capital-store");
    await seedForgedCapitalDemoIfEmpty(forgedApp.id);
  }

  const profile: ClawProfile = {
    id: randomClawId(),
    name,
    intent,
    budgetTier,
    autoSelected,
    models,
    createdAt: new Date().toISOString(),
    provisioningMode: "framework",
    forgedAppId: forgedApp.id,
    forgedAppSlug: forgedApp.slug,
    meshConnected: forgedApp.meshConnected,
    multimodal: input.multimodal,
  };

  await addClawProfile(profile);

  const state = await readForgedAppsAndPatch(forgedApp.id, profile.id);
  await appendForgedAppSlug(forgedApp.slug);

  await writeActiveClawEnv(profile);
  await restartEngineForActiveClaw();

  const { emitForgeCafeEvent } = await import("@/lib/forge-cafe-events");
  await emitForgeCafeEvent({
    mode: "framework",
    name: forgedApp.name,
    appId: forgedApp.id,
    forgedSlug: forgedApp.slug,
    templateId: forgedApp.templateId,
  }).catch(() => undefined);

  return { forgedApp: state, profile };
}

async function readForgedAppsAndPatch(appId: string, clawProfileId: string): Promise<ForgedAppRecord> {
  const { readForgedApps, writeForgedApps } = await import("./forged-apps-store");
  const state = await readForgedApps();
  const idx = state.apps.findIndex((a) => a.id === appId);
  if (idx < 0) throw new Error("Forged app missing after create");
  const updated = { ...state.apps[idx]!, clawProfileId };
  state.apps[idx] = updated;
  await writeForgedApps(state);
  return updated;
}
