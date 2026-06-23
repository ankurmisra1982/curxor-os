import type { SwarmGridCell } from "./swarm-fleet";

export type SwarmWorkloadSource = "my-work" | "my-capital" | "my-content-creator" | "claw-forge" | "mesh";

export type SwarmWorkloadStatus = "pending" | "assigned" | "done";

export interface SwarmWorkloadItem {
  id: string;
  source: SwarmWorkloadSource;
  title: string;
  detail: string;
  targetCell: SwarmGridCell;
  priority: "low" | "normal" | "high";
  status: SwarmWorkloadStatus;
  assignedUnitId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const SWARM_SOURCE_LABELS: Record<SwarmWorkloadSource, string> = {
  "my-work": "Work Claw",
  "my-capital": "Capital Claw",
  "my-content-creator": "Creator Claw",
  "claw-forge": "The Forge",
  mesh: "Mesh",
};
