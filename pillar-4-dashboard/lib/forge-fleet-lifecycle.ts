import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readClawProfiles, writeClawProfiles, patchClawProfile } from "./claw-profiles";
import type { ClawProfile } from "./claw-recommend";
import { emitForgeCafeArchivedEvent, emitForgeCafeEvent } from "./forge-cafe-events";
import {
  buildTemplateWorkspace,
  getForgeTemplate,
  inferTemplateFromIntent,
  isForgeTemplateId,
  type ForgeTemplateId,
} from "./forge-templates";
import {
  getForgedAppById,
  patchForgedApp,
  readForgedApps,
  writeForgedApps,
  addForgedApp,
} from "./forged-apps-store";
import type { ForgedAppRecord } from "./forged-apps-types";
import { markForgedAppFreComplete } from "./forged-app-fre";
import { resolveProvisioningMode } from "./forge-provisioning";
import { appendForgedAppSlug, removeForgedAppSlug } from "./user-settings";
import { slugFromIntent } from "./workspace-app-id";
import { clawNameFromIntent } from "./claw-recommend";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

async function writeForgedWorkspace(appId: string, files: Record<string, string>): Promise<void> {
  const dir = path.join(workspaceRoot(), appId);
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(dir, "skills"), { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    await writeFile(path.join(dir, file), content.endsWith("\n") ? content : `${content}\n`, { mode: 0o640 });
  }
}

export interface ArchiveClawResult {
  ok: boolean;
  profileId?: string;
  forgedAppId?: string;
  error?: string;
}

export async function archiveClawInFleet(input: {
  profileId?: string;
  forgedAppId?: string;
}): Promise<ArchiveClawResult> {
  const profileId = input.profileId?.trim();
  const forgedAppId = input.forgedAppId?.trim();
  if (!profileId && !forgedAppId) {
    return { ok: false, error: "profileId or forgedAppId required" };
  }

  const now = new Date().toISOString();
  let targetName = "Claw";
  let cafeAppId = profileId ?? forgedAppId ?? "claw-forge";

  if (profileId) {
    const state = await readClawProfiles();
    const profile = state.claws.find((c) => c.id === profileId);
    if (!profile) return { ok: false, error: "Profile not found" };
    if (profile.status === "archived") {
      return { ok: true, profileId, forgedAppId: profile.forgedAppId ?? undefined };
    }

    targetName = profile.name;
    cafeAppId = profile.id;
    const forgedSlugForCafe = profile.forgedAppSlug ?? null;
    const idx = state.claws.findIndex((c) => c.id === profileId);
    state.claws[idx] = { ...profile, status: "archived", archivedAt: now };
    if (state.activeClawId === profileId) {
      state.activeClawId =
        state.claws.find((c) => c.id !== profileId && c.status !== "archived")?.id ?? null;
    }
    await writeClawProfiles(state);

    if (profile.forgedAppSlug) await removeForgedAppSlug(profile.forgedAppSlug);
    if (profile.forgedAppId) {
      await archiveForgedAppRecord(profile.forgedAppId, { skipCafe: true });
    }

    await emitForgeCafeArchivedEvent({
      name: targetName,
      appId: cafeAppId,
      forgedSlug: forgedSlugForCafe,
    }).catch(() => undefined);

    return { ok: true, profileId, forgedAppId: profile.forgedAppId ?? undefined };
  }

  if (forgedAppId && !profileId) {
    const archived = await archiveForgedAppRecord(forgedAppId, { skipCafe: true });
    if ("error" in archived) return { ok: false, error: archived.error };
    targetName = archived.name;
    cafeAppId = forgedAppId;
    if (archived.clawProfileId) {
      await patchClawProfile(archived.clawProfileId, { status: "archived", archivedAt: now });
      if (archived.slug) await removeForgedAppSlug(archived.slug);
    }

    await emitForgeCafeArchivedEvent({
      name: targetName,
      appId: cafeAppId,
      forgedSlug: archived.slug,
    }).catch(() => undefined);

    return { ok: true, forgedAppId, profileId: archived.clawProfileId ?? undefined };
  }

  return { ok: false, error: "Nothing archived" };
}

async function archiveForgedAppRecord(
  forgedAppId: string,
  opts: { skipCafe?: boolean } = {},
): Promise<ForgedAppRecord | { error: string }> {
  const state = await readForgedApps();
  const idx = state.apps.findIndex((a) => a.id === forgedAppId);
  if (idx < 0) return { error: "Forged app not found" };
  const app = state.apps[idx]!;
  if (app.status === "archived") return app;

  state.apps[idx] = { ...app, status: "archived", archivedAt: new Date().toISOString() };
  await writeForgedApps(state);

  if (!opts.skipCafe) {
    await emitForgeCafeArchivedEvent({
      name: app.name,
      appId: app.id,
      forgedSlug: app.slug,
    }).catch(() => undefined);
  }

  await removeForgedAppSlug(app.slug);
  return state.apps[idx]!;
}

export interface PromoteIslandResult {
  ok: boolean;
  forgedApp?: ForgedAppRecord;
  profile?: ClawProfile;
  error?: string;
}

export async function promoteIslandToFramework(
  profileId: string,
  templateIdInput?: string,
): Promise<PromoteIslandResult> {
  const profileIdTrim = profileId.trim();
  if (!profileIdTrim) return { ok: false, error: "profileId required" };

  const state = await readClawProfiles();
  const profile = state.claws.find((c) => c.id === profileIdTrim);
  if (!profile) return { ok: false, error: "Profile not found" };
  if (profile.status === "archived") return { ok: false, error: "Cannot promote archived profile" };
  if (resolveProvisioningMode(profile.provisioningMode) !== "island") {
    return { ok: false, error: "Only island profiles can be promoted to framework" };
  }
  if (profile.forgedAppId) return { ok: false, error: "Profile already linked to a forged desk" };

  const templateId: ForgeTemplateId = isForgeTemplateId(templateIdInput)
    ? templateIdInput
    : inferTemplateFromIntent(profile.intent);
  const pack = getForgeTemplate(templateId);
  const name = profile.name || clawNameFromIntent(profile.intent);
  const baseSlug = slugFromIntent(name);
  const short = name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") || "CLW";

  const forgedApp = await addForgedApp({
    slug: baseSlug,
    name,
    intent: profile.intent,
    templateId,
    short,
    provisioningMode: "framework",
    meshConnected: Boolean(pack.defaultFreConfig.meshPublish),
    clawProfileId: profile.id,
    growthLevel: pack.defaultGrowthLevel,
    importSource: null,
  });

  const workspace = buildTemplateWorkspace(pack, name, profile.intent);
  await writeForgedWorkspace(forgedApp.id, {
    "SOUL.md": workspace.soul,
    "TOOLS.md": workspace.tools,
    "HEARTBEAT.md": workspace.heartbeat,
  });

  const freConfig = {
    ...pack.defaultFreConfig,
    forgedIntent: profile.intent,
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

  const updatedProfile = await patchClawProfile(profile.id, {
    provisioningMode: "framework",
    forgedAppId: forgedApp.id,
    forgedAppSlug: forgedApp.slug,
    meshConnected: forgedApp.meshConnected,
  });

  await appendForgedAppSlug(forgedApp.slug);

  await emitForgeCafeEvent({
    mode: "framework",
    name: forgedApp.name,
    appId: forgedApp.id,
    forgedSlug: forgedApp.slug,
    templateId: forgedApp.templateId,
  }).catch(() => undefined);

  return { ok: true, forgedApp, profile: updatedProfile ?? profile };
}

export async function syncForgedMeshFromFre(
  forgedAppId: string,
  config: Record<string, unknown>,
): Promise<void> {
  const meshPublish = Boolean(config.meshPublish);
  await patchForgedApp(forgedAppId, { meshConnected: meshPublish });
  const profileId = (await getForgedAppById(forgedAppId))?.clawProfileId;
  if (profileId) {
    await patchClawProfile(profileId, { meshConnected: meshPublish });
  }
}
