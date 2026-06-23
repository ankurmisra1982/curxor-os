export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildVitalGoLiveReport } from "@/lib/vital-go-live";
import { buildVitalGrowthProfile } from "@/lib/vital-growth";
import {
  fetchVitalStatus,
  ingestDemoReport,
  markHealthAppConnected,
  refreshProtocolForFocus,
  runVitalDemoTour,
  syncVitalContextToMesh,
  syncWearablesDemo,
} from "@/lib/vital-health-store";
import { readAppFreState } from "@/lib/app-fre-state";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const [state, settings, fre, goLive] = await Promise.all([
    fetchVitalStatus(),
    readUserSettings(),
    readAppFreState("my-vital"),
    buildVitalGoLiveReport(),
  ]);
  const growthProfile = buildVitalGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.vitalGrowthLevel ?? null,
  );
  return Response.json(
    { ok: true, ...state, growthProfile, goLive },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    action?: string;
    app?: string;
    profileId?: string | null;
    focus?: string;
    title?: string;
    summary?: string;
    provider?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "go_live") {
    const goLive = await buildVitalGoLiveReport();
    return Response.json({ ok: true, goLive });
  }

  if (body.action === "run_demo_tour") {
    const tour = await runVitalDemoTour(body.profileId);
    const [state, goLive] = await Promise.all([fetchVitalStatus(), buildVitalGoLiveReport()]);
    return Response.json({ ok: true, tour, ...state, goLive });
  }

  if (body.action === "sync_wearables") {
    const state = await syncWearablesDemo();
    const goLive = await buildVitalGoLiveReport();
    return Response.json({ ok: true, ...state, goLive });
  }

  if (body.action === "ingest_report") {
    const report = await ingestDemoReport({
      title: body.title,
      summary: body.summary,
      provider: body.provider,
    });
    const [state, goLive] = await Promise.all([fetchVitalStatus(), buildVitalGoLiveReport()]);
    return Response.json({ ok: true, report, ...state, goLive });
  }

  if (body.action === "update_protocol") {
    const fre = await readAppFreState("my-vital");
    const focus =
      body.focus ??
      (typeof fre.config.longevityFocus === "string" ? fre.config.longevityFocus : "metabolic");
    const state = await refreshProtocolForFocus(focus);
    const goLive = await buildVitalGoLiveReport();
    return Response.json({ ok: true, ...state, goLive });
  }

  if (body.action === "connect" && body.app) {
    const state = await markHealthAppConnected(body.app);
    await syncVitalContextToMesh(body.profileId);
    const goLive = await buildVitalGoLiveReport();
    return Response.json({ ok: true, ...state, goLive });
  }

  if (body.action === "sync_mesh") {
    await syncVitalContextToMesh(body.profileId);
    const [state, goLive] = await Promise.all([fetchVitalStatus(), buildVitalGoLiveReport()]);
    return Response.json({ ok: true, ...state, goLive });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
