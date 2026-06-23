import "server-only";

import type { SwarmGridCell } from "./swarm-fleet";
import { emitSwarmXpEvent } from "./swarm-xp-events";
import { enqueueSwarmWorkload, type SwarmWorkloadSource } from "./swarm-workload-queue";

export interface SwarmHandoffPayload {
  source: SwarmWorkloadSource;
  title: string;
  detail?: string;
  targetCell?: SwarmGridCell;
  priority?: "low" | "normal" | "high";
}

export interface SwarmHandoffResult {
  ok: boolean;
  workloadId?: string;
  error?: string;
}

export async function handoffToSwarm(payload: SwarmHandoffPayload): Promise<SwarmHandoffResult> {
  const title = payload.title?.trim();
  if (!title) return { ok: false, error: "title required" };

  const item = await enqueueSwarmWorkload({
    source: payload.source,
    title,
    detail: payload.detail,
    targetCell: payload.targetCell,
    priority: payload.priority,
  });

  await emitSwarmXpEvent("handoff_received", {
    source: payload.source,
    workloadId: item.id,
    title: item.title,
  });

  return { ok: true, workloadId: item.id };
}
