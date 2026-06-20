export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { publishDigitalIntent } from "@/lib/mesh-publish";

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { tool?: string; payload?: Record<string, unknown> };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.tool || typeof body.tool !== "string") {
    return Response.json({ error: "tool required" }, { status: 400 });
  }

  const result = await publishDigitalIntent({
    tool: body.tool,
    payload: typeof body.payload === "object" && body.payload ? body.payload : {},
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
