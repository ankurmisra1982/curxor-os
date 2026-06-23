export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { buildSwarmDashboardBootstrap } from "@/lib/swarm-dashboard-bootstrap";
import { runSwarmExitDemoScenario, buildSwarmGoLiveReport } from "@/lib/swarm-go-live";
import { handoffToSwarm } from "@/lib/swarm-handoff";
import { pingSwarmUnitLatency } from "@/lib/swarm-mesh-ping";
import { applyPing, type SwarmGridCell } from "@/lib/swarm-fleet";
import { emitSwarmXpEvent, type SwarmXpEventKind } from "@/lib/swarm-xp-events";
import {
  assignSwarmWorkload,
  completeSwarmWorkload,
  listSwarmWorkloads,
  seedSwarmDemoWorkloads,
  type SwarmWorkloadSource,
} from "@/lib/swarm-workload-queue";

export async function GET(): Promise<Response> {
  const boot = await buildSwarmDashboardBootstrap();
  return Response.json(boot, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    unitId?: string;
    clawId?: number;
    workloadId?: string;
    source?: string;
    title?: string;
    detail?: string;
    targetCell?: string;
    priority?: string;
    kind?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";

  try {
    switch (action) {
      case "dashboard_bootstrap": {
        const boot = await buildSwarmDashboardBootstrap();
        return Response.json(boot);
      }

      case "go_live": {
        const goLive = await buildSwarmGoLiveReport();
        void (async () => {
          const { maybeEmitGoLiveFailed } = await import("@/lib/go-live-os-events");
          await maybeEmitGoLiveFailed("swarm-preview", goLive);
        })();
        return Response.json({ ok: true, goLive });
      }

      case "run_exit_demo": {
        const scenario = await runSwarmExitDemoScenario();
        return Response.json(scenario);
      }

      case "seed_demo_workloads": {
        const workloads = await seedSwarmDemoWorkloads();
        return Response.json({ ok: true, workloads });
      }

      case "handoff_from_claw": {
        const source = body.source as SwarmWorkloadSource;
        if (!source || !body.title?.trim()) {
          return Response.json({ ok: false, error: "source and title required" }, { status: 400 });
        }
        const result = await handoffToSwarm({
          source,
          title: body.title,
          detail: body.detail,
          targetCell: body.targetCell as SwarmGridCell | undefined,
          priority:
            body.priority === "high" || body.priority === "low" ? body.priority : "normal",
        });
        if (!result.ok) return Response.json(result, { status: 400 });
        const boot = await buildSwarmDashboardBootstrap();
        return Response.json({ workloadId: result.workloadId, ...boot });
      }

      case "list_workloads": {
        const workloads = await listSwarmWorkloads(25);
        return Response.json({ ok: true, workloads });
      }

      case "assign_workload": {
        if (!body.workloadId || !body.unitId) {
          return Response.json({ ok: false, error: "workloadId and unitId required" }, { status: 400 });
        }
        const item = await assignSwarmWorkload(body.workloadId, body.unitId);
        if (!item) return Response.json({ ok: false, error: "workload not found" }, { status: 404 });
        await emitSwarmXpEvent("workload_assigned", {
          workloadId: item.id,
          unitId: body.unitId,
          source: item.source,
        });
        return Response.json({ ok: true, workload: item });
      }

      case "complete_workload": {
        if (!body.workloadId) {
          return Response.json({ ok: false, error: "workloadId required" }, { status: 400 });
        }
        const item = await completeSwarmWorkload(body.workloadId);
        if (!item) return Response.json({ ok: false, error: "workload not found" }, { status: 404 });
        await emitSwarmXpEvent("dispatch_completed", { workloadId: item.id, source: item.source });
        return Response.json({ ok: true, workload: item });
      }

      case "emit_xp": {
        const xpKind = body.kind as SwarmXpEventKind | undefined;
        const allowed: SwarmXpEventKind[] = [
          "dispatch_completed",
          "rebalance",
          "ping_mesh",
          "handoff_received",
          "workload_assigned",
          "fleet_milestone",
          "exit_demo_ready",
        ];
        if (!xpKind || !allowed.includes(xpKind)) {
          return Response.json({ ok: false, error: "valid kind required" }, { status: 400 });
        }
        const event = await emitSwarmXpEvent(xpKind, { manual: true });
        return Response.json({ ok: true, event });
      }

      case "ping_unit": {
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!unitId) {
          return Response.json({ ok: false, error: "unitId required" }, { status: 400 });
        }
        const boot = await buildSwarmDashboardBootstrap();
        const ping = await pingSwarmUnitLatency(unitId, body.clawId);
        const fleet = applyPing(boot.fleet, unitId, ping.rttMs);
        const unit = fleet.find((u) => u.id === unitId);
        await emitSwarmXpEvent("ping_mesh", { unitId, rttMs: ping.rttMs, source: ping.source });
        return Response.json({
          ok: true,
          ping,
          unit,
          fleet,
          growthProfile: boot.growthProfile,
        });
      }

      default:
        return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.warn("[swarm/status] action failed:", err);
    return Response.json({ ok: false, error: "Swarm status failed" }, { status: 500 });
  }
}
