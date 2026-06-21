export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { fetchPfmSnapshot, refreshPfmData, updateWealthGoal } from "@/lib/capital-pfm-store";

export async function GET(): Promise<Response> {
  const snapshot = await fetchPfmSnapshot();
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    goalId?: string;
    monthlyContributionUsd?: number;
    targetUsd?: number;
    currentUsd?: number;
    name?: string;
    targetDate?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "refresh";

  try {
    switch (action) {
      case "refresh": {
        const snapshot = await refreshPfmData();
        return Response.json({ ok: true, snapshot });
      }

      case "update_goal": {
        if (!body.goalId) {
          return Response.json({ ok: false, error: "goalId required" }, { status: 400 });
        }
        const goal = await updateWealthGoal(body.goalId, {
          monthlyContributionUsd:
            typeof body.monthlyContributionUsd === "number" ? body.monthlyContributionUsd : undefined,
          targetUsd: typeof body.targetUsd === "number" ? body.targetUsd : undefined,
          currentUsd: typeof body.currentUsd === "number" ? body.currentUsd : undefined,
          name: body.name?.trim() || undefined,
          targetDate: body.targetDate === null ? null : body.targetDate?.trim() || undefined,
        });
        if (!goal) return Response.json({ ok: false, error: "Goal not found" }, { status: 404 });
        const snapshot = await fetchPfmSnapshot();
        return Response.json({ ok: true, goal, snapshot });
      }

      default:
        return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "PFM action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
