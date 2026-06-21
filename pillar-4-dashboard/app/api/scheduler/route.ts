export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  getSchedulerState,
  removeSchedulerJob,
  syncHeartbeatToJobs,
  upsertSchedulerJob,
} from "@/lib/agent-runtime/scheduler-store";
import { runDueSchedulerJobs } from "@/lib/agent-runtime/scheduler-runner";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(): Promise<Response> {
  const state = await getSchedulerState();
  return Response.json({ ok: true, ...state });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: {
    action?: string;
    job?: {
      id: string;
      appId: string;
      kind: "skill" | "message" | "heartbeat";
      skillId?: string;
      message?: string;
      schedule: string;
      enabled: boolean;
    };
    jobId?: string;
    appId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "run_due") {
    const results = await runDueSchedulerJobs();
    const state = await getSchedulerState();
    return Response.json({ ok: true, results, ...state });
  }

  if (body.action === "sync_heartbeat" && body.appId && isValidAppId(body.appId)) {
    const state = await syncHeartbeatToJobs(body.appId as OotbAppId);
    return Response.json({ ok: true, ...state });
  }

  if (body.action === "delete" && body.jobId) {
    const state = await removeSchedulerJob(body.jobId);
    return Response.json({ ok: true, ...state });
  }

  if (body.job && isValidAppId(body.job.appId)) {
    const state = await upsertSchedulerJob({
      ...body.job,
      appId: body.job.appId as OotbAppId,
    });
    return Response.json({ ok: true, ...state });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
