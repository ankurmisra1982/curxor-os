export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { buildPowerStatus, isPowerAction, runPowerAction } from "@/lib/power-runner";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "127.0.0.1";
}

export async function GET(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const status = await buildPowerStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { action?: unknown; confirm?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "invalid_body", message: "JSON body required" },
      { status: 400 },
    );
  }

  if (!isPowerAction(body.action)) {
    return Response.json(
      {
        ok: false,
        error: "invalid_action",
        message: "action must be restart_stack, reboot, or shutdown",
      },
      { status: 400 },
    );
  }

  const result = await runPowerAction(body.action, body.confirm, clientIp(request));
  const status = result.ok ? 202 : result.error === "confirm_required" ? 400 : 502;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
