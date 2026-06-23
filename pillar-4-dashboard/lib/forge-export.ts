import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { readClawProfiles } from "./claw-profiles";
import type { ForgeImportBundle } from "./forge-import";
import { FORGE_IMPORT_BUNDLE_VERSION } from "./forge-import";
import { getForgedAppById, readForgedApps } from "./forged-apps-store";
import { readForgedAppFre } from "./forged-app-fre";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

async function readWorkspaceText(appId: string, file: string): Promise<string | null> {
  try {
    return await readFile(path.join(workspaceRoot(), appId, file), "utf8");
  } catch {
    return null;
  }
}

export interface ExportClawInput {
  forgedAppId?: string;
  profileId?: string;
}

export async function exportClawBundle(input: ExportClawInput): Promise<ForgeImportBundle | { error: string }> {
  const forgedAppId = input.forgedAppId?.trim();
  const profileId = input.profileId?.trim();

  if (!forgedAppId && !profileId) {
    return { error: "forgedAppId or profileId required" };
  }

  let workspaceId: string | null = null;
  let name = "Exported Claw";
  let templateId: string | undefined;
  let integrationLevel: "island" | "framework" = "framework";
  let growthLevel = undefined as ForgeImportBundle["growthLevel"];
  let freConfig: Record<string, unknown> | undefined;

  if (forgedAppId) {
    const app = await getForgedAppById(forgedAppId);
    if (!app) return { error: "Forged app not found" };
    workspaceId = app.id;
    name = app.name;
    templateId = app.templateId;
    integrationLevel = app.provisioningMode === "imported" ? "framework" : "framework";
    growthLevel = app.growthLevel;
    const fre = await readForgedAppFre(forgedAppId);
    if (fre.initialized) freConfig = fre.config;
  } else if (profileId) {
    const profiles = await readClawProfiles();
    const profile = profiles.claws.find((c) => c.id === profileId);
    if (!profile) return { error: "Profile not found" };
    name = profile.name;
    if (profile.forgedAppId) {
      const app = await getForgedAppById(profile.forgedAppId);
      if (app) {
        workspaceId = app.id;
        templateId = app.templateId;
        growthLevel = app.growthLevel;
        const fre = await readForgedAppFre(app.id);
        if (fre.initialized) freConfig = fre.config;
      }
    }
    if (!workspaceId && profile.forgedAppSlug) {
      workspaceId = `forged-${profile.forgedAppSlug}`;
    }
    integrationLevel = profile.provisioningMode === "island" ? "island" : "framework";
  }

  if (!workspaceId) {
    return { error: "No workspace directory for export target" };
  }

  const soul = await readWorkspaceText(workspaceId, "SOUL.md");
  const tools = await readWorkspaceText(workspaceId, "TOOLS.md");
  const heartbeat = await readWorkspaceText(workspaceId, "HEARTBEAT.md");

  if (!soul || !tools) {
    return { error: "Workspace SOUL.md or TOOLS.md missing" };
  }

  const bundle: ForgeImportBundle = {
    version: FORGE_IMPORT_BUNDLE_VERSION,
    name,
    soul,
    tools,
    heartbeat: heartbeat ?? undefined,
    integrationLevel,
    templateId,
    growthLevel,
    freConfig,
  };

  return bundle;
}

export async function exportFleetBundles(): Promise<{
  bundles: Array<{ targetId: string; kind: "forged" | "profile"; name: string; bundle: ForgeImportBundle }>;
  errors: string[];
}> {
  const targets = await listExportableTargets();
  const bundles: Array<{ targetId: string; kind: "forged" | "profile"; name: string; bundle: ForgeImportBundle }> = [];
  const errors: string[] = [];

  for (const target of targets) {
    const result = await exportClawBundle(
      target.kind === "forged" ? { forgedAppId: target.id } : { profileId: target.id },
    );
    if ("error" in result) {
      errors.push(`${target.name}: ${result.error}`);
      continue;
    }
    bundles.push({ targetId: target.id, kind: target.kind, name: target.name, bundle: result });
  }

  return { bundles, errors };
}

export async function listExportableTargets(): Promise<
  Array<{ id: string; kind: "forged" | "profile"; name: string; mode: string }>
> {
  const [forged, profiles] = await Promise.all([readForgedApps(), readClawProfiles()]);
  const rows: Array<{ id: string; kind: "forged" | "profile"; name: string; mode: string }> = forged.apps
    .filter((a) => a.status !== "archived")
    .map((a) => ({
      id: a.id,
      kind: "forged" as const,
      name: a.name,
      mode: a.provisioningMode,
    }));
  for (const p of profiles.claws) {
    if (p.status === "archived") continue;
    if (p.forgedAppId && rows.some((r) => r.id === p.forgedAppId)) continue;
    rows.push({
      id: p.id,
      kind: "profile",
      name: p.name,
      mode: p.provisioningMode ?? "island",
    });
  }
  return rows;
}
