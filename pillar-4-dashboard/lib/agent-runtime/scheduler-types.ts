import type { WorkspaceAppId } from "../workspace-app-id";
export type SchedulerJobKind = "skill" | "message" | "heartbeat";

export interface SchedulerJob {
  id: string;
  appId: WorkspaceAppId;
  kind: SchedulerJobKind;
  /** skill id when kind=skill */
  skillId?: string;
  /** chat message when kind=message */
  message?: string;
  /** Cron expression (minute hour dom month dow) — 5-field subset; also supports @every_30m */
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: "ok" | "error" | "skipped" | null;
  lastError: string | null;
  createdAt: string;
}

export interface SchedulerState {
  version: 1;
  jobs: SchedulerJob[];
  daemonEnabled: boolean;
  pollIntervalSeconds: number;
  updatedAt: string;
}

export interface HeartbeatLine {
  schedule: string;
  action: { kind: "skill"; skillId: string } | { kind: "message"; text: string };
}

export const DEFAULT_SCHEDULER_STATE: SchedulerState = {
  version: 1,
  jobs: [],
  daemonEnabled: true,
  pollIntervalSeconds: 60,
  updatedAt: new Date(0).toISOString(),
};
