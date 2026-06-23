export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { approveSend, fetchWorkStatus, rejectSend } from "@/lib/work-store";
import { executeOutboundSend } from "@/lib/work-send-executor";
import { appendAgentAudit } from "@/lib/work-agent-audit";
import {
  isWorkActionAllowed,
  readWorkDeskPermissions,
  workPermissionDeniedMessage,
} from "@/lib/work-permissions";

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { sendId?: string; decision?: string; action?: string; token?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sendId = body.sendId?.trim();
  const decision = body.decision ?? body.action;
  if (!sendId || !decision) {
    return Response.json({ ok: false, error: "sendId and decision required" }, { status: 400 });
  }

  if (decision === "approve" || decision === "approved") {
    const perms = await readWorkDeskPermissions();
    if (!isWorkActionAllowed(perms, "approve")) {
      return Response.json(
        {
          ok: false,
          code: "WORK_PERMISSION_DENIED",
          error: workPermissionDeniedMessage("approve", perms.role),
          role: perms.role,
        },
        { status: 403 },
      );
    }
    const send = await approveSend(sendId);
    if (!send) return Response.json({ ok: false, error: "Send not pending" }, { status: 404 });
    await appendAgentAudit({
      kind: "approval",
      source: "telegram_callback",
      note: `Approved ${sendId} via callback`,
      sendId,
    });
    const result = await executeOutboundSend(sendId);
    return Response.json({ ok: result.ok, send: result.send, status: await fetchWorkStatus() });
  }

  if (decision === "reject" || decision === "rejected") {
    const perms = await readWorkDeskPermissions();
    if (!isWorkActionAllowed(perms, "approve")) {
      return Response.json(
        {
          ok: false,
          code: "WORK_PERMISSION_DENIED",
          error: workPermissionDeniedMessage("approve", perms.role),
          role: perms.role,
        },
        { status: 403 },
      );
    }
    const send = await rejectSend(sendId, "Rejected via callback");
    if (!send) return Response.json({ ok: false, error: "Send not found" }, { status: 404 });
    await appendAgentAudit({
      kind: "approval",
      source: "telegram_callback",
      note: `Rejected ${sendId} via callback`,
      sendId,
    });
    return Response.json({ ok: true, send, status: await fetchWorkStatus() });
  }

  return Response.json({ ok: false, error: "Unknown decision" }, { status: 400 });
}
