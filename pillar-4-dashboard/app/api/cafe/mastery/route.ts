export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildDeskMastery } from "@/lib/cafe-room-mastery";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const appId = url.searchParams.get("appId");
  const mastery = await buildDeskMastery(appId ?? undefined);
  return Response.json({ ok: true, mastery });
}
