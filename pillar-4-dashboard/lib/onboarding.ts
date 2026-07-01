import "server-only";

import { readFreState } from "@/lib/fre-state";
import { listFamilyProfiles, upsertFamilyProfile } from "@/lib/family-profiles";
import { readUserSettings, updateUserSettings } from "@/lib/user-settings";
import type { OperatorProfile } from "@/lib/user-settings-types";

/** Boxes provisioned before Your Box shipped are grandfathered (no forced /welcome). */
export const ONBOARDING_SHIP_CUTOVER =
  process.env.CURXOR_ONBOARDING_CUTOVER ?? "2026-07-01T00:00:00.000Z";

export function isWelcomeCompleted(profile: OperatorProfile | undefined | null): boolean {
  return typeof profile?.completedAt === "string" && profile.completedAt.length > 0;
}

function operatorStartedYourBox(profile: OperatorProfile | undefined | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.displayName ||
      profile.privacyAcknowledgedAt ||
      profile.privacyDeferred ||
      profile.city ||
      profile.timezone,
  );
}

/** Grandfather pre-ONB appliances that already completed FRE. */
async function migrateLegacyWelcomeIfNeeded(): Promise<boolean> {
  const settings = await readUserSettings();
  if (isWelcomeCompleted(settings.operatorProfile)) return true;
  if (operatorStartedYourBox(settings.operatorProfile)) return false;

  const fre = await readFreState();
  if (!fre.initialized || !fre.provisionedAt) return false;

  const forceGrandfather = process.env.CURXOR_ONBOARDING_LEGACY_GRANDFATHER === "1";
  const isLegacy = fre.provisionedAt < ONBOARDING_SHIP_CUTOVER;
  if (!isLegacy && !forceGrandfather) return false;

  const kin = await listFamilyProfiles();
  const owner = kin.members.find((m) => m.role === "owner") ?? kin.members[0];
  const displayName = owner?.displayName && owner.displayName !== "Primary operator"
    ? owner.displayName
    : undefined;

  await updateUserSettings({
    operatorProfile: {
      completedAt: fre.provisionedAt,
      privacyDeferred: true,
      displayName,
    },
  });
  return true;
}

export async function readWelcomeCompleted(): Promise<boolean> {
  if (await migrateLegacyWelcomeIfNeeded()) return true;
  const settings = await readUserSettings();
  return isWelcomeCompleted(settings.operatorProfile);
}

export function isPrivacyAcknowledged(profile: OperatorProfile | undefined | null): boolean {
  return typeof profile?.privacyAcknowledgedAt === "string" && profile.privacyAcknowledgedAt.length > 0;
}

/** Record privacy acknowledgment — unlocks outbound connector / egress actions (ONB-4). */
export async function acknowledgeOperatorPrivacy(): Promise<void> {
  const settings = await readUserSettings();
  const now = new Date().toISOString();
  await updateUserSettings({
    operatorProfile: {
      ...settings.operatorProfile,
      privacyAcknowledgedAt: now,
      privacyDeferred: false,
    },
  });
}

export interface CompleteWelcomeInput {
  displayName: string;
  city?: string;
  timezone?: string;
  privacyAcknowledged?: boolean;
  privacyDeferred?: boolean;
}

/** Finish Your Box — profile, Essential defaults, Kin owner seed, Patron voice. */
export async function completeWelcomeWizard(input: CompleteWelcomeInput): Promise<void> {
  const now = new Date().toISOString();
  const settings = await readUserSettings();

  const profile: OperatorProfile = {
    ...settings.operatorProfile,
    displayName: input.displayName.trim(),
    city: input.city?.trim() || settings.operatorProfile?.city,
    timezone: input.timezone?.trim() || settings.operatorProfile?.timezone,
    privacyAcknowledgedAt: input.privacyAcknowledged ? now : settings.operatorProfile?.privacyAcknowledgedAt ?? null,
    privacyDeferred: input.privacyDeferred === true,
    completedAt: now,
  };

  await updateUserSettings({
    operatorProfile: profile,
    appearance: {
      experienceLevel: "essential",
      uiMode: "simple",
      textScale: settings.appearance.textScale ?? "large",
    },
    patronAsk: {
      voiceEnabled: true,
    },
  });

  const kin = await listFamilyProfiles();
  const owner = kin.members.find((m) => m.role === "owner") ?? kin.members[0];
  await upsertFamilyProfile({
    id: owner?.id,
    displayName: input.displayName.trim(),
    role: "owner",
  });
}
