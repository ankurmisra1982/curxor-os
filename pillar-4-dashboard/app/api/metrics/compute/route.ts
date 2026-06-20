export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { collectComputeMetrics } from "@/lib/metrics";

export async function GET(): Promise<Response> {
  const metrics = await collectComputeMetrics();
  return Response.json(metrics, {
    headers: { "Cache-Control": "no-store" },
  });
}
