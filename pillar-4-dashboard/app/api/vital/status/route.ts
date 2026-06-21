export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { fetchVitalStatus, markHealthAppConnected, syncVitalContextToMesh } from "@/lib/vital-health-store";

export async function GET(): Promise<Response> {
  const state = await fetchVitalStatus();
  return Response.json({ ok: true, ...state });
}

export async function POST(request: Request): Promise<Response> {
  let body: { action?: string; app?: string; profileId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "connect" && body.app) {
    const state = await markHealthAppConnected(body.app);
    await syncVitalContextToMesh(body.profileId);
    return Response.json({ ok: true, ...state });
  }

  if (body.action === "sync_mesh") {
    await syncVitalContextToMesh(body.profileId);
    const state = await fetchVitalStatus();
    return Response.json({ ok: true, ...state });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
