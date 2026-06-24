import { ASCENSION_TIER_INDEX, type AscensionTierId } from "./claw-cafe-ascension";
import type { BuildDelegationSource, BuildDelegationStatus } from "./build-delegation-queue";

export type BuildDelegationAccessTier = "locked" | "suggest" | "full";

export interface BuildDelegationPolicyInput {
  enabled: boolean;
  allowDelegation: boolean;
  ascensionTier: AscensionTierId;
}

export interface BuildDelegationPolicyView {
  accessTier: BuildDelegationAccessTier;
  ascensionTier: AscensionTierId;
  enabled: boolean;
  allowDelegation: boolean;
  canSuggest: boolean;
  canEnqueue: boolean;
  canResolve: boolean;
  canComplete: boolean;
  gateReason: string | null;
}

export function buildDelegationAccessTier(ascensionTier: AscensionTierId): BuildDelegationAccessTier {
  const idx = ASCENSION_TIER_INDEX[ascensionTier];
  if (idx < ASCENSION_TIER_INDEX.consciousness) return "locked";
  if (idx === ASCENSION_TIER_INDEX.consciousness) return "suggest";
  return "full";
}

function baseGate(input: BuildDelegationPolicyInput): string | null {
  if (!input.enabled) return "Enable Build Plane overlay in Settings.";
  if (!input.allowDelegation) return "Turn on Allow Master AI delegation in Build Plane policy.";
  if (buildDelegationAccessTier(input.ascensionTier) === "locked") {
    return "Requires G5 Consciousness ascension in Claw Cafe.";
  }
  return null;
}

export function resolveBuildDelegationPolicy(input: BuildDelegationPolicyInput): BuildDelegationPolicyView {
  const accessTier = buildDelegationAccessTier(input.ascensionTier);
  const gate = baseGate(input);
  const unlocked = gate === null;

  return {
    accessTier,
    ascensionTier: input.ascensionTier,
    enabled: input.enabled,
    allowDelegation: input.allowDelegation,
    canSuggest: unlocked && accessTier !== "locked",
    canEnqueue: unlocked && accessTier === "full",
    canResolve: unlocked,
    canComplete: unlocked && accessTier === "full",
    gateReason: gate,
  };
}

export function assertCanEnqueue(input: BuildDelegationPolicyInput & { source: BuildDelegationSource }):
  | { ok: true }
  | { ok: false; reason: string } {
  const policy = resolveBuildDelegationPolicy(input);
  if (policy.gateReason) return { ok: false, reason: policy.gateReason };
  if (input.source === "master_ai" && policy.canSuggest) return { ok: true };
  if (input.source === "user" && policy.canEnqueue) return { ok: true };
  if (input.source === "webhook" && policy.canEnqueue) return { ok: true };
  if (input.source === "master_ai") return { ok: false, reason: "Master AI suggest requires G5+." };
  return { ok: false, reason: "Direct enqueue requires G6 Infinity ascension." };
}

export function assertCanResolve(
  input: BuildDelegationPolicyInput & { status: BuildDelegationStatus },
): { ok: true } | { ok: false; reason: string } {
  const policy = resolveBuildDelegationPolicy(input);
  if (policy.gateReason) return { ok: false, reason: policy.gateReason };
  if (!policy.canResolve) return { ok: false, reason: "Delegation resolve not permitted." };
  if (input.status === "completed" && !policy.canComplete) {
    return { ok: false, reason: "Mark completed requires G6 Infinity ascension." };
  }
  return { ok: true };
}
