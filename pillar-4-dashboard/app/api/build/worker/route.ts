export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import {
  buildWorkerWizardReport,
  completeWorkerWizardStep,
  runWorkerProbeAndPersist,
  setWorkerHostConfig,
  resolveBuildWorkerOrigin,
  type BuildWorkerWizardStepId,
} from "@/lib/build-worker-wizard";
import { BUILD_WORKER_WIZARD_STEP_IDS } from "@/lib/build-worker-wizard-steps";
import {
  enqueueBuildDelegation,
  readBuildDelegationQueue,
  resolveBuildDelegationStatus,
} from "@/lib/build-delegation-queue";

function isStepId(v: unknown): v is BuildWorkerWizardStepId {
  return typeof v === "string" && (BUILD_WORKER_WIZARD_STEP_IDS as string[]).includes(v);
}

export async function GET(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const origin = resolveBuildWorkerOrigin(request);
  const report = await buildWorkerWizardReport(origin);
  const delegation = await readBuildDelegationQueue(12);
  return Response.json({ ...report, delegation });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const origin = resolveBuildWorkerOrigin(request);

  let body: {
    action?: string;
    stepId?: string;
    workerHost?: string;
    workerSshPort?: number;
    workerSshUser?: string;
    title?: string;
    detail?: string;
    delegationId?: string;
    status?: "approved" | "rejected" | "completed";
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "complete_step" && isStepId(body.stepId)) {
    const report = await completeWorkerWizardStep(body.stepId, origin);
    return Response.json(report);
  }

  if (body.action === "set_host" && typeof body.workerHost === "string") {
    const report = await setWorkerHostConfig(
      {
        workerHost: body.workerHost,
        workerSshPort: body.workerSshPort,
        workerSshUser: body.workerSshUser,
      },
      origin,
    );
    return Response.json(report);
  }

  if (body.action === "probe") {
    const report = await runWorkerProbeAndPersist(origin);
    return Response.json(report);
  }

  if (body.action === "mark_online_demo") {
    const { updateUserSettings } = await import("@/lib/user-settings");
    await updateUserSettings({
      buildPlane: {
        enabled: true,
        workerHost: body.workerHost?.trim() || "127.0.0.1",
        workerStatus: "online",
        workerLastProbeAt: new Date().toISOString(),
        linkStatus: "linked",
        linkedAt: new Date().toISOString(),
      },
    });
    const report = await buildWorkerWizardReport(origin);
    return Response.json(report);
  }

  if (body.action === "enqueue_delegation" && body.title?.trim()) {
    const item = await enqueueBuildDelegation({
      title: body.title,
      detail: body.detail,
      source: "user",
    });
    const report = await buildWorkerWizardReport(origin);
    return Response.json({ ...report, delegationItem: item });
  }

  if (
    body.action === "resolve_delegation" &&
    body.delegationId &&
    (body.status === "approved" || body.status === "rejected" || body.status === "completed")
  ) {
    const result = await resolveBuildDelegationStatus(body.delegationId, body.status);
    if (!result.ok) {
      if (result.error === "not_found") {
        return Response.json({ ok: false, error: "Delegation not found" }, { status: 404 });
      }
      return Response.json({ ok: false, error: "Invalid delegation status transition" }, { status: 409 });
    }
    const report = await buildWorkerWizardReport(origin);
    return Response.json({ ...report, delegationItem: result.item });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
