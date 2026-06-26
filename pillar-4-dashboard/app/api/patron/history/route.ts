export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readPatronHistory } from "@/lib/patron-session";

export async function GET(): Promise<Response> {
  const turns = await readPatronHistory();
  return Response.json({ turns }, { headers: { "Cache-Control": "no-store" } });
}
