import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { FamilyPersonality, FamilyProfile, FamilyRole } from "./family-types";
export type { FamilyDevice, FamilyPersonality, FamilyProfile, FamilyRole } from "./family-types";

interface FamilyProfilesFile {
  version: 1;
  primaryProfileId: string | null;
  members: FamilyProfile[];
}

const DEFAULT_PERSONALITY: FamilyPersonality = {
  traits: ["curious"],
  communicationStyle: "warm",
  notes: "",
};

function profilesPath(): string {
  return process.env.CURXOR_FAMILY_PROFILES_PATH ?? "/etc/curxor/family-profiles.json";
}

async function readProfilesFile(): Promise<FamilyProfilesFile> {
  try {
    const raw = await readFile(profilesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<FamilyProfilesFile>;
    return {
      version: 1,
      primaryProfileId:
        typeof parsed.primaryProfileId === "string" ? parsed.primaryProfileId : null,
      members: Array.isArray(parsed.members) ? parsed.members : [],
    };
  } catch {
    return { version: 1, primaryProfileId: null, members: [] };
  }
}

async function writeProfilesFile(data: FamilyProfilesFile): Promise<void> {
  const filePath = profilesPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listFamilyProfiles(): Promise<FamilyProfilesFile> {
  const file = await readProfilesFile();
  if (file.members.length === 0) {
    const owner: FamilyProfile = {
      id: randomUUID(),
      displayName: "Primary operator",
      role: "owner",
      avatarColor: "#bc13fe",
      devices: [],
      personality: { ...DEFAULT_PERSONALITY, traits: ["sovereign", "builder"] },
      sharedScopes: ["personal", "health", "work", "finance"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    file.members = [owner];
    file.primaryProfileId = owner.id;
    await writeProfilesFile(file);
  }
  return file;
}

export async function upsertFamilyProfile(
  input: Partial<FamilyProfile> & { displayName: string },
): Promise<FamilyProfile> {
  const file = await listFamilyProfiles();
  const now = new Date().toISOString();
  const existing = input.id ? file.members.find((m) => m.id === input.id) : undefined;

  const next: FamilyProfile = {
    id: existing?.id ?? randomUUID(),
    displayName: input.displayName,
    role: input.role ?? existing?.role ?? "guest",
    avatarColor: input.avatarColor ?? existing?.avatarColor ?? "#6366f1",
    devices: input.devices ?? existing?.devices ?? [],
    personality: input.personality ?? existing?.personality ?? DEFAULT_PERSONALITY,
    sharedScopes: input.sharedScopes ?? existing?.sharedScopes ?? ["personal"],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    file.members = file.members.map((m) => (m.id === next.id ? next : m));
  } else {
    file.members.push(next);
  }
  if (!file.primaryProfileId) file.primaryProfileId = next.id;
  await writeProfilesFile(file);
  return next;
}

export async function removeFamilyProfile(profileId: string): Promise<void> {
  const file = await listFamilyProfiles();
  if (file.members.length <= 1) {
    throw new Error("At least one family profile must remain");
  }
  file.members = file.members.filter((m) => m.id !== profileId);
  if (file.primaryProfileId === profileId) {
    file.primaryProfileId = file.members[0]?.id ?? null;
  }
  await writeProfilesFile(file);
}

export async function getFamilyProfile(profileId: string): Promise<FamilyProfile | null> {
  const file = await listFamilyProfiles();
  return file.members.find((m) => m.id === profileId) ?? null;
}
