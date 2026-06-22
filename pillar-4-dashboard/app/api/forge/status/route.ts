export const runtime = "nodejs";

export const dynamic = "force-dynamic";



import { restartEngineForActiveClaw, writeActiveClawEnv } from "@/lib/active-claw";

import { readClawProfiles, setActiveClawProfile } from "@/lib/claw-profiles";

import { buildForgeGoLiveReport } from "@/lib/forge-go-live";

import { buildForgeStatus } from "@/lib/forge-fleet";

import { readForgeCafeEvents } from "@/lib/forge-cafe-events";

import { readForgedApps } from "@/lib/forged-apps-store";

import { requireLanAuth } from "@/lib/lan-auth";



export async function GET(): Promise<Response> {

  const profiles = await readClawProfiles();

  const forgedState = await readForgedApps();

  const status = buildForgeStatus(profiles, forgedState.apps);

  const goLive = await buildForgeGoLiveReport();

  const cafeEvents = await readForgeCafeEvents(20);

  return Response.json(

    {

      ok: true,

      ...status,

      goLive,

      demoReady: goLive.demoReady,

      cafeEvents,

    },

    { headers: { "Cache-Control": "no-store" } },

  );

}



interface ForgeStatusPostBody {

  action?: string;

  clawId?: string;

  persona?: string;

}



export async function POST(request: Request): Promise<Response> {

  const denied = requireLanAuth(request);

  if (denied) return denied;



  let body: ForgeStatusPostBody;

  try {

    body = (await request.json()) as ForgeStatusPostBody;

  } catch {

    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  }



  if (body.action === "set_active") {

    const clawId = typeof body.clawId === "string" ? body.clawId.trim() : "";

    if (!clawId) {

      return Response.json({ ok: false, error: "clawId required" }, { status: 400 });

    }



    const profiles = await readClawProfiles();

    const profile = profiles.claws.find((c) => c.id === clawId);

    if (!profile) {

      return Response.json({ ok: false, error: "Profile not found" }, { status: 404 });

    }



    await setActiveClawProfile(clawId);

    await writeActiveClawEnv(profile);

    await restartEngineForActiveClaw();



    const forgedState = await readForgedApps();

    const status = buildForgeStatus(await readClawProfiles(), forgedState.apps);

    const goLive = await buildForgeGoLiveReport();

    return Response.json({ ok: true, ...status, goLive, demoReady: goLive.demoReady });

  }



  if (body.action === "run_demo_tour") {

    const personaRaw = typeof body.persona === "string" ? body.persona : "default";

    const persona =

      personaRaw === "L1" || personaRaw === "L4" || personaRaw === "L5" ? personaRaw : "default";

    const { runForgeDemoTour } = await import("@/lib/forge-demo-tour");

    const tour = await runForgeDemoTour(persona);

    const forgedState = await readForgedApps();

    const status = buildForgeStatus(await readClawProfiles(), forgedState.apps);

    const goLive = await buildForgeGoLiveReport();

    return Response.json({ ok: tour.ok, tour, ...status, goLive, demoReady: goLive.demoReady });

  }



  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });

}


