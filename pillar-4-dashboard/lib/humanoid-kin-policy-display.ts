import type { KinRobotPolicyView, KinRobotTone } from "./humanoid-hub-types";

export function policyBehaviorSummary(policy: KinRobotPolicyView): string {
  const tone = policy.tone === "inherit" ? `inherit Kin (${policy.communicationStyle})` : policy.tone;
  const parts = [`Tone: ${tone}`];
  if (policy.greetByName) parts.push("greet by name");
  if (!policy.allowKitchenTasks) parts.push("no unsupervised kitchen");
  if (!policy.allowBedroomEntry) parts.push("no bedroom entry");
  if (policy.requireAskBefore.trim()) parts.push(`ask before: ${policy.requireAskBefore}`);
  if (policy.notes.trim()) parts.push(policy.notes);
  return parts.join(" · ");
}

export function isKinRobotTone(value: string): value is KinRobotTone {
  return ["inherit", "warm", "professional", "playful", "formal", "calm", "direct"].includes(value);
}
