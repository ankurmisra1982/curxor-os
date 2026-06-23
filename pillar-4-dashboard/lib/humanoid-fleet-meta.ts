import type { HumanoidUnit, PairWizardPhase, RobotKind } from "./humanoid-hub-types";

export const FLEET_UNIT_LIMIT = 6;

export const ROBOT_KIND_META: Record<
  RobotKind,
  { label: string; short: string; defaultName: string; vendorLabel: string; description: string }
> = {
  humanoid: {
    label: "Humanoid",
    short: "HUM",
    defaultName: "Home Humanoid",
    vendorLabel: "Humanoid-class · home assistant",
    description: "Biped home unit — full neural link + guest mode",
  },
  mobile: {
    label: "Mobile base",
    short: "MOB",
    defaultName: "Home Rover",
    vendorLabel: "Mobile base · patrol & fetch",
    description: "Rover or patrol bot sharing the same knowledge mesh",
  },
  arm: {
    label: "Arm / manipulator",
    short: "ARM",
    defaultName: "Kitchen Arm",
    vendorLabel: "Manipulator · precision tasks",
    description: "Fixed or mounted arm for kitchen, garage, lab",
  },
  custom: {
    label: "Custom robot",
    short: "CST",
    defaultName: "Custom Unit",
    vendorLabel: "Forge-linked · custom Claw",
    description: "Any robot minted from The Forge on your appliance",
  },
};

export function kindLabel(kind: RobotKind): string {
  return ROBOT_KIND_META[kind].label;
}

export function statusLabel(status: HumanoidUnit["status"]): string {
  switch (status) {
    case "awaiting_pair":
      return "Awaiting pair";
    case "learning":
      return "Learning home";
    case "standby":
      return "Standby";
    case "active_preview":
      return "Active preview";
    case "paired_preview":
      return "Paired · preview";
    default:
      return status;
  }
}

export function nextPairPhase(phase: PairWizardPhase): PairWizardPhase {
  switch (phase) {
    case "idle":
      return "discover";
    case "discover":
      return "verify_safety";
    case "verify_safety":
      return "load_knowledge";
    case "load_knowledge":
      return "mesh_handshake";
    case "mesh_handshake":
      return "complete";
    default:
      return "complete";
  }
}

export function pairPhaseIndex(phase: PairWizardPhase): number {
  if (phase === "idle") return -1;
  if (phase === "complete") return 4;
  const order: PairWizardPhase[] = ["discover", "verify_safety", "load_knowledge", "mesh_handshake", "complete"];
  return order.indexOf(phase);
}
