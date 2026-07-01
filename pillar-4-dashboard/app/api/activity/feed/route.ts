export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildActivityFeed } from "@/lib/activity-feed";

export async function GET(): Promise<Response> {
  const { homeLastVisitedAt, attention, items } = await buildActivityFeed();
  return Response.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      homeLastVisitedAt,
      attention,
      items,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
