export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  buildCafeAscensionBootstrap,
  ingestCafeEvent,
  syncCafeEventSources,
  type CafeEventKind,
  type CafeEventXp,
} from "@/lib/claw-cafe-events";
import { buildCafeGoLiveReport } from "@/lib/cafe-go-live";
import { runCafeDemoTour } from "@/lib/cafe-demo-tour";

export async function GET(): Promise<Response> {
  try {
    const bootstrap = await buildCafeAscensionBootstrap();
    return Response.json(bootstrap);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cafe status unavailable";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
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

  if (action === "go_live") {
    const goLive = await buildCafeGoLiveReport();
    void (async () => {
      const { maybeEmitGoLiveFailed } = await import("@/lib/go-live-os-events");
      await maybeEmitGoLiveFailed("claw-cafe", goLive);
    })();
    const bootstrap = await buildCafeAscensionBootstrap();
    return Response.json({ ...bootstrap, goLive, demoReady: goLive.demoReady });
  }

  if (action === "run_demo_tour") {
    const tour = await runCafeDemoTour();
    const bootstrap = await buildCafeAscensionBootstrap();
    const goLive = await buildCafeGoLiveReport();
    return Response.json({ ...bootstrap, ok: tour.ok, tour, goLive, demoReady: goLive.demoReady });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
