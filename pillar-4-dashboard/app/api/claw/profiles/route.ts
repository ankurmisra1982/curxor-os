export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readClawProfiles } from "@/lib/claw-profiles";

export async function GET(): Promise<Response> {
  const state = await readClawProfiles();
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
