import "server-only";

import { getCcpConsentState } from "./ccp-consent-store";
import type { ClawContextScope } from "./claw-mesh-protocol";
import { queryClawContext } from "./claw-context-store";
import { fetchHumanoidHubStatus } from "./humanoid-hub-store";
import type { KnowledgeAuditPackage } from "./humanoid-hub-types";
import { policyBehaviorSummary } from "./humanoid-kin-policy-display";

const SCOPE_LABELS: Record<ClawContextScope, string> = {
  personal: "Personal · relationship",
  health: "Health · Vital",
  work: "Work · Outreach",
  finance: "Finance · Capital",
  family: "Family · Kin",
  hardware: "Hardware · robot memory",
  signals: "Signals · ambient",
};

export async function buildKnowledgeAudit(freConfig?: Record<string, unknown>): Promise<KnowledgeAuditPackage> {
  const status = await fetchHumanoidHubStatus(freConfig);
  const consent = await getCcpConsentState();
  const signalScopes: ClawContextScope[] = ["personal", "health", "work", "finance", "family", "hardware"];

  const ccpConsent = signalScopes.map((scope) => {
    const entry = consent.entries.find((e) => e.subscriberAppId === "tesla-optimus-engine" && e.scope === scope);
    return {
      scope,
      allowed: entry?.allowed ?? true,
      label: SCOPE_LABELS[scope],
    };
  });

  let vitalSummary: string | null = null;
  try {
    const health = await queryClawContext({ appId: "my-vital", scopes: ["health"], limit: 3 });
    if (health.length > 0) {
      vitalSummary = `${health.length} health slice${health.length === 1 ? "" : "s"} on mesh (optional for morning routines)`;
    }
  } catch {
    vitalSummary = null;
  }

  const policies = status.kinPolicies;
  const armedRoutines = status.hub.routines.filter((r) => r.enabled);
  const ruleCount = status.hub.houseRules.length;
  const paired = status.fleetSummary.paired;

  const packageSummary = [
    `${policies.length} Kin-aware policies`,
    `${ruleCount} house rule${ruleCount === 1 ? "" : "s"}`,
    `${armedRoutines.length} armed routine${armedRoutines.length === 1 ? "" : "s"}`,
    `${status.fleetSummary.total} fleet unit${status.fleetSummary.total === 1 ? "" : "s"} (${paired} paired preview)`,
    status.hub.lastKnowledgeSyncAt ? "mesh sync recorded" : "not pushed to mesh yet",
  ].join(" · ");

  return {
    generatedAt: new Date().toISOString(),
    previewOnly: true,
    relationship: status.hub.relationship,
    houseRules: status.hub.houseRules,
    armedRoutines,
    kinPolicies: policies.map((p) => ({
      ...p,
      notes: p.notes || policyBehaviorSummary(p),
    })),
    fleet: status.hub.units,
    ccpConsent,
    vitalSummary,
    lastKnowledgeSyncAt: status.hub.lastKnowledgeSyncAt,
    packageSummary,
  };
}
