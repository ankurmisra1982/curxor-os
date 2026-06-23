import type { ClawProfile, ClawProfilesState } from "./claw-recommend";
import type { ForgedAppRecord } from "./forged-apps-types";
import type { ForgeProvisioningMode } from "./forge-provisioning";
import { resolveProvisioningMode } from "./forge-provisioning";
import { forgedAppHref } from "./workspace-app-id";

export interface ForgeFleetEntry {
  /** Stable row id — profile id, or forged app id when profile-less */
  rowId: string;
  name: string;
  intent: string;
  mode: ForgeProvisioningMode;
  profileId: string | null;
  forgedAppId: string | null;
  forgedSlug: string | null;
  href: string | null;
  templateId: string | null;
  createdAt: string;
  budgetTier: string | null;
  modelSummary: string | null;
  isActive: boolean;
  hasEngineProfile: boolean;
  isArchived: boolean;
  canPromote: boolean;
}

export interface ForgeFleetCounts {
  total: number;
  profiles: number;
  forgedApps: number;
  island: number;
  framework: number;
  imported: number;
  archived: number;
}

export interface ForgeStatusPayload {
  profiles: ClawProfilesState;
  forgedApps: ForgedAppRecord[];
  fleet: ForgeFleetEntry[];
  counts: ForgeFleetCounts;
}

function modelSummary(profile: ClawProfile): string {
  return `${profile.models.vision} · ${profile.budgetTier}`;
}

function profileCreatedAt(profile: ClawProfile): string {
  return profile.createdAt;
}

function isArchivedProfile(profile: ClawProfile): boolean {
  return profile.status === "archived";
}

function isArchivedForged(app: ForgedAppRecord): boolean {
  return app.status === "archived";
}

export function buildForgeFleet(
  profiles: ClawProfilesState,
  forgedApps: ForgedAppRecord[],
): ForgeFleetEntry[] {
  const activeProfiles = profiles.claws.filter((c) => !isArchivedProfile(c));
  const activeForgedApps = forgedApps.filter((a) => !isArchivedForged(a));
  const byProfileId = new Map<string, ForgedAppRecord>();
  for (const app of activeForgedApps) {
    if (app.clawProfileId) byProfileId.set(app.clawProfileId, app);
  }

  const rows: ForgeFleetEntry[] = [];
  const linkedForgedIds = new Set<string>();

  for (const profile of activeProfiles) {
    const forged = byProfileId.get(profile.id) ?? null;
    if (forged) linkedForgedIds.add(forged.id);

    const slug = profile.forgedAppSlug ?? forged?.slug ?? null;
    const href = slug ? forgedAppHref(slug) : forged?.href ?? null;
    const mode = resolveProvisioningMode(profile.provisioningMode);

    rows.push({
      rowId: profile.id,
      name: profile.name,
      intent: profile.intent,
      mode,
      profileId: profile.id,
      forgedAppId: profile.forgedAppId ?? forged?.id ?? null,
      forgedSlug: slug,
      href: mode === "island" ? null : href,
      templateId: forged?.templateId ?? null,
      createdAt: profileCreatedAt(profile),
      budgetTier: profile.budgetTier,
      modelSummary: modelSummary(profile),
      isActive: profiles.activeClawId === profile.id,
      hasEngineProfile: true,
      isArchived: false,
      canPromote: mode === "island" && !profile.forgedAppId,
    });
  }

  for (const app of activeForgedApps) {
    if (linkedForgedIds.has(app.id)) continue;
    rows.push({
      rowId: app.id,
      name: app.name,
      intent: app.intent,
      mode: app.provisioningMode,
      profileId: app.clawProfileId,
      forgedAppId: app.id,
      forgedSlug: app.slug,
      href: app.href,
      templateId: app.templateId,
      createdAt: app.createdAt,
      budgetTier: null,
      modelSummary: null,
      isActive: false,
      hasEngineProfile: Boolean(app.clawProfileId),
      isArchived: false,
      canPromote: false,
    });
  }

  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function forgeFleetCounts(fleet: ForgeFleetEntry[], forgedApps: ForgedAppRecord[], profiles?: ClawProfilesState): ForgeFleetCounts {
  const modes = fleet.map((r) => r.mode);
  const archivedProfiles = profiles?.claws.filter((c) => isArchivedProfile(c)).length ?? 0;
  const archivedForged = forgedApps.filter((a) => isArchivedForged(a)).length;
  return {
    total: fleet.length,
    profiles: fleet.filter((r) => r.hasEngineProfile).length,
    forgedApps: forgedApps.filter((a) => !isArchivedForged(a)).length,
    island: modes.filter((m) => m === "island").length,
    framework: modes.filter((m) => m === "framework").length,
    imported: modes.filter((m) => m === "imported").length,
    archived: archivedProfiles + archivedForged,
  };
}

export function buildForgeStatus(profiles: ClawProfilesState, forgedApps: ForgedAppRecord[]): ForgeStatusPayload {
  const fleet = buildForgeFleet(profiles, forgedApps);
  return {
    profiles,
    forgedApps: forgedApps.filter((a) => !isArchivedForged(a)),
    fleet,
    counts: forgeFleetCounts(fleet, forgedApps, profiles),
  };
}
