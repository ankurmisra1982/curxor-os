export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { fetchCapitalStatus } from "@/lib/capital-portfolio";

export async function GET(): Promise<Response> {
  const status = await fetchCapitalStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
