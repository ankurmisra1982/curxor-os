export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { runOtaInstall } from "@/lib/ota-runner";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { confirm?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* empty body OK */
  }

  if (body.confirm !== true) {
    return Response.json(
      { ok: false, error: "confirm_required", message: "Set confirm: true to install" },
      { status: 400 },
    );
  }

  const result = await runOtaInstall();
  const status = result.ok ? 202 : result.error === "nothing_to_apply" ? 409 : 502;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
