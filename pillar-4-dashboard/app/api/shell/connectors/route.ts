export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildShellConnectorsReport } from "@/lib/shell-connectors";

export async function GET(): Promise<Response> {
  const report = await buildShellConnectorsReport();
  return Response.json(report, { headers: { "Cache-Control": "no-store" } });
}
