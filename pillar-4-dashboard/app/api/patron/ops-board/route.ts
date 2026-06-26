export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildPatronOpsBoard } from "@/lib/patron-ops-board";

export async function GET(): Promise<Response> {
  const board = await buildPatronOpsBoard();
  return Response.json({ ok: true, ...board }, { headers: { "Cache-Control": "no-store" } });
}
