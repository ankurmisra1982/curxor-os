/** OS-wide event bus kinds (Build Plane BP2 / v0.8.2). */
export type OsEventKind =
  | "forge.claw_minted"
  | "go_live.failed"
  | "ota.available"
  | "eno2.down"
  | "claw.skill_completed"
  | "claw.approval_required"
  | "scheduler.heartbeat"
  | "bridge.receipt"
  | "system.power_action";

export const OS_EVENT_KINDS: OsEventKind[] = [
  "forge.claw_minted",
  "go_live.failed",
  "ota.available",
  "eno2.down",
  "claw.skill_completed",
  "claw.approval_required",
  "scheduler.heartbeat",
  "bridge.receipt",
  "system.power_action",
];

export type OsEventPayload = Record<string, unknown>;

export interface OsEventRecord {
  id: string;
  event: OsEventKind;
  timestamp: string;
  payload: OsEventPayload;
  webhook?: {
    attempted: boolean;
    ok: boolean;
    demo: boolean;
    detail: string;
  };
}

export interface EmitOsEventResult {
  ok: true;
  id: string;
  event: OsEventKind;
  logged: boolean;
  cafeIngested: boolean;
  webhook: {
    attempted: boolean;
    ok: boolean;
    demo: boolean;
    detail: string;
  };
}
