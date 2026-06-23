import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ClawProfile, ClawProfilesState } from "./claw-recommend";
import { resolveProvisioningMode } from "./forge-provisioning";

function normalizeProfile(raw: ClawProfile): ClawProfile {
  return {
    ...raw,
    provisioningMode: resolveProvisioningMode(raw.provisioningMode),
  };
}

const DEFAULT: ClawProfilesState = { claws: [], activeClawId: null };

export function getClawProfilesPath(): string {
  return process.env.CURXOR_CLAW_PROFILES_PATH ?? "/etc/curxor/claw-profiles.json";
}

export async function readClawProfiles(): Promise<ClawProfilesState> {
  try {
    const raw = await readFile(getClawProfilesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ClawProfilesState>;
    const claws = Array.isArray(parsed.claws)
      ? parsed.claws.map((c) => normalizeProfile(c as ClawProfile))
      : [];
    return {
      claws,
      activeClawId: typeof parsed.activeClawId === "string" ? parsed.activeClawId : null,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export async function writeClawProfiles(state: ClawProfilesState): Promise<void> {
  const filePath = getClawProfilesPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o644 });
}

export async function addClawProfile(profile: ClawProfile): Promise<ClawProfilesState> {
  const state = await readClawProfiles();
  const next: ClawProfilesState = {
    claws: [...state.claws, profile],
    activeClawId: profile.id,
  };
  await writeClawProfiles(next);
  return next;
}

export async function patchClawProfile(
  profileId: string,
  patch: Partial<ClawProfile>,
): Promise<ClawProfile | null> {
  const state = await readClawProfiles();
  const idx = state.claws.findIndex((c) => c.id === profileId);
  if (idx < 0) return null;
  state.claws[idx] = normalizeProfile({ ...state.claws[idx]!, ...patch });
  await writeClawProfiles(state);
  return state.claws[idx]!;
}

export async function setActiveClawProfile(clawId: string): Promise<ClawProfilesState | null> {
  const state = await readClawProfiles();
  const profile = state.claws.find((c) => c.id === clawId);
  if (!profile) return null;
  const next: ClawProfilesState = { ...state, activeClawId: clawId };
  await writeClawProfiles(next);
  return next;
}
