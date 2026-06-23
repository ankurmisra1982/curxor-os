import "server-only";

import { emitOsEvent } from "./os-event-bus";
import { hasRecentOsEvent } from "./os-event-log-store";

export interface GoLiveReportLike {
  demoReady: boolean;
  progress?: { complete: number; total: number };
  steps?: Array<{ id: string; status: string; label?: string }>;
}

function pendingStepIds(steps: GoLiveReportLike["steps"]): string[] {
  return (steps ?? [])
    .filter((s) => s.status === "pending" || s.status === "warning")
    .map((s) => s.id);
}

/** Emit go_live.failed when demoReady is false (deduped per app per hour). */
export async function maybeEmitGoLiveFailed(appId: string, goLive: GoLiveReportLike): Promise<void> {
  if (goLive.demoReady) return;

  const dedupeKey = `${appId}:go_live.failed`;
  if (await hasRecentOsEvent("go_live.failed", dedupeKey, 60 * 60 * 1000)) return;

  void emitOsEvent("go_live.failed", {
    appId,
    dedupeKey,
    progress: goLive.progress ?? null,
    pendingSteps: pendingStepIds(goLive.steps),
  });
}
