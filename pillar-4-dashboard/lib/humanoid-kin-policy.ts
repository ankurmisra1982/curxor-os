import "server-only";

import type { FamilyProfile } from "./family-types";
import { listFamilyProfiles } from "./family-profiles";
import type { KinRobotPolicy, KinRobotPolicyView } from "./humanoid-hub-types";
import { isKinRobotTone, policyBehaviorSummary } from "./humanoid-kin-policy-display";

export { isKinRobotTone, policyBehaviorSummary };

export function defaultKinRobotPolicy(member: FamilyProfile): KinRobotPolicy {
  const base: KinRobotPolicy = {
    memberId: member.id,
    tone: "inherit",
    greetByName: true,
    allowKitchenTasks: false,
    allowBedroomEntry: false,
    requireAskBefore: "",
    notes: "",
  };

  switch (member.role) {
    case "child":
      return {
        ...base,
        tone: "playful",
        allowKitchenTasks: false,
        allowBedroomEntry: false,
        requireAskBefore: "kitchen, sharp objects, outdoor exit",
        notes: "Use short sentences. Ask a parent before physical help.",
      };
    case "guest":
      return {
        ...base,
        tone: member.personality.communicationStyle === "formal" ? "formal" : "warm",
        greetByName: true,
        allowKitchenTasks: false,
        allowBedroomEntry: false,
        requireAskBefore: "bedrooms, private office, garage",
        notes: "Guest mode — offer coat and beverage; never follow into private rooms.",
      };
    case "elder":
      return {
        ...base,
        tone: "calm",
        allowKitchenTasks: true,
        requireAskBefore: "heavy lifts, stairs",
        notes: "Speak clearly. Offer arm support when mobility scopes are shared.",
      };
    case "partner":
      return {
        ...base,
        tone: "inherit",
        allowKitchenTasks: true,
        allowBedroomEntry: true,
        notes: "Full household trust tier.",
      };
    case "owner":
    default:
      return {
        ...base,
        tone: "inherit",
        allowKitchenTasks: true,
        allowBedroomEntry: true,
        notes: "Primary operator — match relationship tone from hub.",
      };
  }
}

export function mergeKinPolicies(stored: KinRobotPolicy[], members: FamilyProfile[]): KinRobotPolicy[] {
  const byId = new Map(stored.map((p) => [p.memberId, p]));
  return members.map((member) => {
    const existing = byId.get(member.id);
    const defaults = defaultKinRobotPolicy(member);
    if (!existing) return defaults;
    return {
      ...defaults,
      ...existing,
      memberId: member.id,
    };
  });
}

export function kinPolicyViews(policies: KinRobotPolicy[], members: FamilyProfile[]): KinRobotPolicyView[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  return policies
    .filter((p) => memberMap.has(p.memberId))
    .map((p) => {
      const member = memberMap.get(p.memberId)!;
      return {
        ...p,
        displayName: member.displayName,
        role: member.role,
        communicationStyle: member.personality.communicationStyle,
      };
    });
}

export async function loadFamilyMembersForPolicies(): Promise<FamilyProfile[]> {
  const file = await listFamilyProfiles();
  return file.members;
}
