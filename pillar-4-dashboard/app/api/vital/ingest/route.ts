export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { ingestVitalReadings } from "@/lib/vital-health-store";
import type { VitalReading } from "@/lib/vital-health-types";

function isLocalhost(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : "127.0.0.1";
  return ip === "127.0.0.1" || ip === "::1";
}

export async function POST(request: Request): Promise<Response> {
  if (!isLocalhost(request)) {
    return Response.json({ error: "localhost only" }, { status: 403 });
  }

  let body: { readings?: VitalReading[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.readings) || body.readings.length === 0) {
    return Response.json({ error: "Missing readings array" }, { status: 400 });
  }

  const state = await ingestVitalReadings(body.readings);
  return Response.json({ ok: true, vitals: state.vitals.length });
}
