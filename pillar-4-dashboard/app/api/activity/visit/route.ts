export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { markHomeVisited } from "@/lib/activity-feed";

export async function POST(): Promise<Response> {
  const homeLastVisitedAt = await markHomeVisited();
  return Response.json({ ok: true, homeLastVisitedAt }, { headers: { "Cache-Control": "no-store" } });
}
