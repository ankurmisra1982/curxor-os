export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildMobilePatronSummarySafe } from "@/lib/mobile-patron-summary";

export async function GET(): Promise<Response> {
  const summary = await buildMobilePatronSummarySafe();
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
