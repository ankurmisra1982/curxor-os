export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readForgedApps } from "@/lib/forged-apps-store";

export async function GET(): Promise<Response> {
  const state = await readForgedApps();
  return Response.json({ ok: true, apps: state.apps }, { headers: { "Cache-Control": "no-store" } });
}
