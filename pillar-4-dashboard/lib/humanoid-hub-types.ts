import type { ClawContextScope } from "./claw-mesh-protocol";

export type RobotKind = "humanoid" | "mobile" | "arm" | "custom";

export type HumanoidUnitStatus =
  | "awaiting_pair"
  | "learning"
  | "standby"
  | "active_preview"
  | "paired_preview";

export type SetupStepId =
  | "name_robot"
  | "link_kin"
  | "teach_rules"
  | "sync_knowledge"
  | "pair_hardware";

export type PairWizardPhase =
  | "idle"
  | "discover"
  | "verify_safety"
  | "load_knowledge"
  | "mesh_handshake"
  | "complete";

export interface HumanoidUnit {
  id: string;
  kind: RobotKind;
  displayName: string;
  vendorLabel: string;
  status: HumanoidUnitStatus;
  safetyProfile: string;
  pairedAt: string | null;
  meshNodeId: string | null;
  discoverName: string | null;
  createdAt: string;
}

export interface PairWizardSession {
  unitId: string;
  phase: PairWizardPhase;
  stepIndex: number;
  startedAt: string;
  discoveredNodeId: string | null;
  previewOnly: true;
}

export interface HumanoidRelationship {
  callName: string;
  tone: "warm" | "professional" | "playful" | "calm";
  guestModeEnabled: boolean;
  introScript: string;
}

export interface HouseRule {
  id: string;
  text: string;
  priority: "essential" | "preference";
  syncedAt: string | null;
  createdAt: string;
}

export interface HumanoidRoutine {
  id: string;
  label: string;
  description: string;
  trigger: string;
  enabled: boolean;
  previewOnly: true;
  source?: "template" | "composed";
}

export type KinRobotTone = "inherit" | "warm" | "professional" | "playful" | "formal" | "calm" | "direct";

export interface KinRobotPolicy {
  memberId: string;
  tone: KinRobotTone;
  greetByName: boolean;
  allowKitchenTasks: boolean;
  allowBedroomEntry: boolean;
  requireAskBefore: string;
  notes: string;
}

export interface KinRobotPolicyView extends KinRobotPolicy {
  displayName: string;
  role: string;
  communicationStyle: string;
}

export interface KnowledgeAuditPackage {
  generatedAt: string;
  previewOnly: true;
  relationship: HumanoidRelationship;
  houseRules: HouseRule[];
  armedRoutines: HumanoidRoutine[];
  kinPolicies: KinRobotPolicyView[];
  fleet: HumanoidUnit[];
  ccpConsent: Array<{ scope: ClawContextScope; allowed: boolean; label: string }>;
  vitalSummary: string | null;
  lastKnowledgeSyncAt: string | null;
  packageSummary: string;
}

export interface HumanoidHubFile {
  version: 1;
  primaryUnitId: string | null;
  units: HumanoidUnit[];
  relationship: HumanoidRelationship;
  houseRules: HouseRule[];
  routines: HumanoidRoutine[];
  kinPolicies: KinRobotPolicy[];
  setupCompleted: SetupStepId[];
  lastKnowledgeSyncAt: string | null;
  notifyWhenLive: boolean;
  pairWizard: PairWizardSession | null;
  updatedAt: string;
}

export interface HumanoidReadinessReport {
  score: number;
  label: string;
  detail: string;
  steps: Array<{
    id: SetupStepId;
    label: string;
    done: boolean;
    hint: string;
  }>;
  ccpScopes: Array<{ scope: string; label: string; linked: boolean; detail: string }>;
}

export interface HumanoidHubStatus {
  hub: HumanoidHubFile;
  primaryUnit: HumanoidUnit | null;
  readiness: HumanoidReadinessReport;
  kinMemberCount: number;
  vitalLinked: boolean;
  kinPolicies: KinRobotPolicyView[];
  fleetSummary: {
    total: number;
    paired: number;
    byKind: Record<RobotKind, number>;
  };
}

export const PAIR_WIZARD_STEPS: Array<{ phase: PairWizardPhase; label: string; detail: string }> = [
  { phase: "discover", label: "Discover", detail: "Scan local Bluetooth + motor mesh for your unit" },
  { phase: "verify_safety", label: "Safety profile", detail: "Confirm torque limits and guest-mode boundaries" },
  { phase: "load_knowledge", label: "Load knowledge", detail: "Inject house rules + Kin context from CCP" },
  { phase: "mesh_handshake", label: "Mesh handshake", detail: "Link claw ID to telemetry/motor_out" },
  { phase: "complete", label: "Ready", detail: "Preview pair complete — live motion on hardware validation" },
];
