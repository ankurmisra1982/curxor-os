import type { GrowthLevel } from "./os-growth-level";
import type { VitalWorkspaceTab } from "./vital-level-gates";

export function vitalTabLabel(growth: GrowthLevel, tab: VitalWorkspaceTab): string {
  if (growth === "L1" && tab === "overview") return "Today";
  if (tab === "overview") return "Overview";
  if (tab === "lab") return growth === "L1" ? "Ask" : "Lab";
  if (tab === "protocol") return growth === "L1" ? "Plan" : "Protocol";
  if (tab === "reports") return "Reports";
  if (tab === "bridges") return growth === "L1" ? "Connect" : "Bridges";
  if (tab === "analytics") return "Analytics";
  return tab;
}

export function vitalDeskSubtitle(growth: GrowthLevel): string {
  if (growth === "L1") return "Learn your vitals, ask longevity questions, and build a starter protocol — all on-box.";
  if (growth === "L2") return "Track wearables and connect health bridges via eno2.";
  if (growth === "L3") return "Optimize protocol, ingest labs, and publish to Claw Context.";
  if (growth === "L4") return "Athlete desk — trends, diet sync, and recovery analytics.";
  return "Longevity governance — full vault, mesh, and analytics on sovereign metal.";
}
