export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildPatronWeeklyBundle } from "@/lib/patron-weekly-bundle";
import { requireLanAuth } from "@/lib/lan-auth";
import { updateUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const bundle = await buildPatronWeeklyBundle();
  return Response.json({ ok: true, bundle }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "confirm") {
    return Response.json({ ok: false, error: "action must be confirm" }, { status: 400 });
  }

  const bundle = await buildPatronWeeklyBundle();
  await updateUserSettings({
    patronWeeklyBundle: {
      weekOf: bundle.weekOf,
      lastConfirmedAt: new Date().toISOString(),
    },
  });

  const next = await buildPatronWeeklyBundle();
  return Response.json({ ok: true, bundle: { ...next, confirmed: true } });
}
