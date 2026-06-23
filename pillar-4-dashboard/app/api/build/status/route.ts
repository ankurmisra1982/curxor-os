export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildBuildStatus } from "@/lib/build-plane-status";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const status = await buildBuildStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
