export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readFreState } from "@/lib/fre-state";

export async function GET(): Promise<Response> {
  const state = await readFreState();
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
