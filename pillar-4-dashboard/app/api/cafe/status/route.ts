export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  buildCafeAscensionBootstrap,
  ingestCafeEvent,
  syncCafeEventSources,
  type CafeEventKind,
  type CafeEventXp,
} from "@/lib/claw-cafe-events";

export async function GET(): Promise<Response> {
  const bootstrap = await buildCafeAscensionBootstrap();
  return Response.json(bootstrap);
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "sync";

  if (action === "sync") {
    const { ingested } = await syncCafeEventSources();
    const bootstrap = await buildCafeAscensionBootstrap();
    return Response.json({ ...bootstrap, ingested });
  }

  if (action === "ingest") {
    const kind = body.kind as CafeEventKind | undefined;
    const appId = typeof body.appId === "string" ? body.appId : "";
    const xp = body.xp as CafeEventXp | undefined;
    if (!kind || !appId || !xp || typeof xp.ascension !== "number") {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const event = await ingestCafeEvent({
      kind,
      appId,
      xp,
      bubble: typeof body.bubble === "string" ? body.bubble : undefined,
    });
    const bootstrap = await buildCafeAscensionBootstrap();
    return Response.json({ ...bootstrap, event });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
