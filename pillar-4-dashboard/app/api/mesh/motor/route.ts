export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { publishMotorCommand } from "@/lib/mesh-publish";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    clawId?: number;
    x?: number;
    y?: number;
    z?: number;
    torqueX?: number;
    torqueY?: number;
    torqueZ?: number;
    flags?: number;
    seq?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.x !== "number" || typeof body.y !== "number" || typeof body.z !== "number") {
    return Response.json({ error: "x, y, z required" }, { status: 400 });
  }

  const result = await publishMotorCommand({
    clawId: body.clawId,
    x: body.x,
    y: body.y,
    z: body.z,
    torqueX: body.torqueX,
    torqueY: body.torqueY,
    torqueZ: body.torqueZ,
    flags: body.flags,
    seq: body.seq,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
