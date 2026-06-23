/** Futuristic Tesla Robotaxi fleet narrative — preview / coming soon only. */

export type RobotaxiVisionMilestoneStatus = "preview" | "coming_soon" | "planned";

export interface RobotaxiVisionMilestone {
  id: string;
  label: string;
  detail: string;
  status: RobotaxiVisionMilestoneStatus;
}

export const SWARM_ROBOTAXI_VISION = {
  headline: "Autonomous Robotaxi Fleet",
  subhead:
    "Acquire Tesla Robotaxis at scale and operate an autonomous fleet from sovereign metal — utilization, zones, and dispatch without cloud rent.",
  honestNote:
    "Preview module: today's grid trains dispatch on digital Claws and mesh simulators. Live Tesla fleet pairing and on-road autonomy ship when validated — no false Go Live.",
  targetFleetLabel: "Operator target (preview)",
  targetFleetSize: 12,
  liveUnits: 0,
  simUnits: 4,
} as const;

export const ROBOTAXI_VISION_MILESTONES: RobotaxiVisionMilestone[] = [
  {
    id: "registry",
    label: "Unit registry & VIN roster",
    detail: "Track acquired Robotaxis, depot assignment, and pairing state on-box.",
    status: "coming_soon",
  },
  {
    id: "zones",
    label: "Geo-fence & utilization",
    detail: "Zone coverage, idle time, and revenue-per-mile style dashboards — local only.",
    status: "coming_soon",
  },
  {
    id: "tesla-bridge",
    label: "Tesla fleet bridge",
    detail: "API / telematics hook when Tesla opens operator-grade fleet control to sovereign hosts.",
    status: "planned",
  },
  {
    id: "multi-depot",
    label: "Multi-depot autonomous ops",
    detail: "Cross-city rebalance, charge-aware dispatch, and handoffs from Work & Capital Claws.",
    status: "planned",
  },
];

export function robotaxiVisionStatusLabel(status: RobotaxiVisionMilestoneStatus): string {
  if (status === "preview") return "Preview";
  if (status === "coming_soon") return "Coming Soon";
  return "Planned";
}
