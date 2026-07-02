export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { runOtaCheck } from "@/lib/ota-runner";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const result = await runOtaCheck();
  const status = result.ok ? 200 : 502;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
