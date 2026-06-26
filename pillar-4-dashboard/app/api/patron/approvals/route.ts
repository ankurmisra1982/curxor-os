export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildOsApprovalInbox } from "@/lib/os-approval-inbox";
import type { OsApprovalKind } from "@/lib/os-approval-inbox-types";
import { requireLanAuth } from "@/lib/lan-auth";
import { resolvePatronApproval, type PatronApprovalAction } from "@/lib/patron-approval-resolve";

const VALID_KINDS = new Set<OsApprovalKind>(["trade", "send", "post", "reply"]);
const VALID_APPS = new Set(["my-capital", "my-work", "my-content-creator"]);

export async function GET(): Promise<Response> {
  const inbox = await buildOsApprovalInbox(12);
  return Response.json({ ok: true, ...inbox }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    appId?: string;
    kind?: string;
    id?: string;
    action?: string;
    note?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const appId = body.appId;
  const kind = body.kind as OsApprovalKind;
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action as PatronApprovalAction;

  if (!appId || !VALID_APPS.has(appId)) {
    return Response.json({ ok: false, error: "Invalid appId" }, { status: 400 });
  }
  if (!kind || !VALID_KINDS.has(kind)) {
    return Response.json({ ok: false, error: "Invalid kind" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return Response.json({ ok: false, error: "action must be approve or reject" }, { status: 400 });
  }

  const result = await resolvePatronApproval({
    appId: appId as "my-capital" | "my-work" | "my-content-creator",
    kind,
    id,
    action,
    note: body.note,
  });

  if (!result.ok) {
    return Response.json(result, { status: 404 });
  }

  const inbox = await buildOsApprovalInbox(12);
  return Response.json({ ...result, inbox });
}
