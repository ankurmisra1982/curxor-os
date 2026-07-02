export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { buildOtaUpdateStatus } from "@/lib/ota-runner";

export async function GET(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const status = await buildOtaUpdateStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
