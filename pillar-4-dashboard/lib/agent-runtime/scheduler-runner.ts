import "server-only";

import { assistAppAgent } from "../app-agent-assist";
import { readAppFreState } from "../app-fre-state";
import type { OotbAppId } from "../ootb-apps";

import { listDueJobs, markJobRun } from "./scheduler-store";
import type { SchedulerJob } from "./scheduler-types";

export interface SchedulerRunResult {
  jobId: string;
  appId: OotbAppId;
  status: "ok" | "error" | "skipped";
  reply?: string;
  error?: string;
}

export async function runSchedulerJob(job: SchedulerJob): Promise<SchedulerRunResult> {
  try {
    const { config: configBase } = await readAppFreState(job.appId);
    if (job.kind === "skill" && job.skillId) {
      let config = { ...configBase };
      if (job.appId === "my-content-creator" && job.skillId === "publish_post" && job.id.startsWith("content-")) {
        config = { ...config, selectedPostId: job.id.slice("content-".length) };
      }
      const result = await assistAppAgent({
        appId: job.appId,
        message: "",
        skillId: job.skillId,
        config,
      });
      await markJobRun(job.id, "ok");
      return { jobId: job.id, appId: job.appId, status: "ok", reply: result.reply };
    }
    if (job.kind === "message" && job.message) {
      const result = await assistAppAgent({
        appId: job.appId,
        message: job.message,
        config: configBase,
      });
      await markJobRun(job.id, "ok");
      return { jobId: job.id, appId: job.appId, status: "ok", reply: result.reply };
    }
    await markJobRun(job.id, "skipped", "empty job");
    return { jobId: job.id, appId: job.appId, status: "skipped", error: "empty job" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markJobRun(job.id, "error", msg);
    return { jobId: job.id, appId: job.appId, status: "error", error: msg };
  }
}

export async function runDueSchedulerJobs(): Promise<SchedulerRunResult[]> {
  const due = await listDueJobs();
  const results: SchedulerRunResult[] = [];
  for (const job of due) {
    results.push(await runSchedulerJob(job));
  }
  return results;
}
