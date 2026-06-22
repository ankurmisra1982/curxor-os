import "server-only";

import { upsertSchedulerJob } from "./agent-runtime/scheduler-store";
import { finalizeDueOutboundSends, processDueSequenceSteps } from "./work-send-executor";
import { processExpiredSnoozes, scanLocalMailQueue } from "./work-store";
import { isOutboundWorkerLockHeld } from "./work-outbound-lock";

export interface OutboundWorkerTickResult {
  processed: number;
  finalizedSends: number;
  snoozeReturned: number;
  inboxIndexed?: number;
  bounceSuppressed?: number;
  failedSuppressed?: number;
}

export async function runOutboundWorkerTick(opts?: { scanInbox?: boolean }): Promise<OutboundWorkerTickResult> {
  const [processed, finalizedSends, snoozeReturn] = await Promise.all([
    processDueSequenceSteps(),
    finalizeDueOutboundSends(),
    processExpiredSnoozes(),
  ]);

  let inboxIndexed: number | undefined;
  let bounceSuppressed: number | undefined;
  let failedSuppressed: number | undefined;

  if (opts?.scanInbox) {
    const entries = await scanLocalMailQueue();
    const { pauseSequencesOnReply } = await import("./work-send-executor");
    const { scanMailIndexForBounces, scanFailedSendsForSuppression } = await import("./work-suppression");
    for (const entry of entries.filter((e) => e.matchedReply && e.from)) {
      await pauseSequencesOnReply(entry.from, entry.replyIntent);
    }
    inboxIndexed = entries.length;
    bounceSuppressed = await scanMailIndexForBounces(entries);
    failedSuppressed = await scanFailedSendsForSuppression();
  }

  return {
    processed,
    finalizedSends,
    snoozeReturned: snoozeReturn.returned,
    inboxIndexed,
    bounceSuppressed,
    failedSuppressed,
  };
}

export async function runDashboardProcessDue(): Promise<
  OutboundWorkerTickResult & { skipped: boolean; workerActive?: boolean }
> {
  if (await isOutboundWorkerLockHeld()) {
    return {
      skipped: true,
      workerActive: true,
      processed: 0,
      finalizedSends: 0,
      snoozeReturned: 0,
    };
  }
  const tick = await runOutboundWorkerTick();
  return { skipped: false, ...tick };
}

/** Optional scheduler fallback when sidecar worker is not running. */
export async function ensureWorkOutboundHeartbeatJob(): Promise<void> {
  await upsertSchedulerJob({
    id: "work-outbound-heartbeat",
    appId: "my-work",
    kind: "skill",
    skillId: "process_due",
    schedule: "@every_60m",
    enabled: true,
  });
}
