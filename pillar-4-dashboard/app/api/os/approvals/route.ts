export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildOsApprovalInbox } from "@/lib/os-approval-inbox";

export async function GET(): Promise<Response> {
  const inbox = await buildOsApprovalInbox();
  return Response.json({ ok: true, ...inbox }, { headers: { "Cache-Control": "no-store" } });
}
