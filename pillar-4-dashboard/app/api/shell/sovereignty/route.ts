export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { collectComputeMetrics } from "@/lib/metrics";
import { resolveEgressState } from "@/lib/egress-policy";
import { readUserSettings } from "@/lib/user-settings";

export async function GET(): Promise<Response> {
  const [metrics, egress, settings] = await Promise.all([
    collectComputeMetrics(),
    resolveEgressState(),
    readUserSettings(),
  ]);

  const source = settings.intelligence.primarySource;

  return Response.json(
    {
      localInference: {
        active: metrics.backend !== "unknown",
        host: "127.0.0.1",
        backend: metrics.backend,
        model: metrics.modelLoaded,
        tokensPerSecond: metrics.tokensPerSecond,
      },
      memory: {
        usedGb: metrics.memory.usedGb,
        totalGb: metrics.memory.totalGb,
        umaUsedPercent: metrics.memory.umaUsedPercent,
      },
      egress: {
        paused: egress.paused,
        label: egress.paused ? "Paused" : "Live",
        reason: egress.reason,
        privacyBlocked: egress.privacyBlocked,
        eno2Down: egress.eno2Down,
      },
      frontier: {
        primarySource: source,
        label:
          source === "local"
            ? "Local only"
            : source === "frontier"
              ? "Frontier"
              : "Auto",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
