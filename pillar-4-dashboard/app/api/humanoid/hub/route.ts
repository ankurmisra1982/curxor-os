export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readAppFreState } from "@/lib/app-fre-state";
import {
  addFleetUnit,
  addHouseRule,
  advancePairWizard,
  cancelPairWizard,
  completePairPreview,
  completeSetupStep,
  fetchHumanoidHubStatus,
  removeFleetUnit,
  removeHouseRule,
  setNotifyWhenLive,
  setPrimaryFleetUnit,
  startPairWizard,
  syncHumanoidKnowledgeToMesh,
  toggleHumanoidRoutine,
  updateHumanoidRelationship,
  updateHumanoidUnit,
} from "@/lib/humanoid-hub-store";
import type { RobotKind, SetupStepId } from "@/lib/humanoid-hub-types";
import { requireLanAuth } from "@/lib/lan-auth";

async function freConfig(): Promise<Record<string, unknown>> {
  const state = await readAppFreState("tesla-optimus-engine");
  return state?.config ?? {};
}

export async function GET(request: Request) {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const status = await fetchHumanoidHubStatus(await freConfig());
  return Response.json({ ok: true, ...status });
}

export async function POST(req: Request) {
  const denied = requireLanAuth(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "status";

  try {
    switch (action) {
      case "status": {
        const status = await fetchHumanoidHubStatus(await freConfig());
        return Response.json({ ok: true, ...status });
      }

      case "update_unit": {
        const status = await updateHumanoidUnit({
          unitId: typeof body.unitId === "string" ? body.unitId : undefined,
          displayName: typeof body.displayName === "string" ? body.displayName : undefined,
          kind: typeof body.kind === "string" ? (body.kind as RobotKind) : undefined,
          safetyProfile: typeof body.safetyProfile === "string" ? body.safetyProfile : undefined,
          vendorLabel: typeof body.vendorLabel === "string" ? body.vendorLabel : undefined,
        });
        return Response.json({ ok: true, ...status });
      }

      case "add_unit": {
        const kind =
          body.kind === "mobile" || body.kind === "arm" || body.kind === "custom" || body.kind === "humanoid"
            ? body.kind
            : "mobile";
        const status = await addFleetUnit({
          kind,
          displayName: typeof body.displayName === "string" ? body.displayName : undefined,
          safetyProfile: typeof body.safetyProfile === "string" ? body.safetyProfile : undefined,
        });
        return Response.json({ ok: true, ...status, message: `${kind} slot added to fleet` });
      }

      case "remove_unit": {
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!unitId) return Response.json({ ok: false, error: "unitId required" }, { status: 400 });
        const status = await removeFleetUnit(unitId);
        return Response.json({ ok: true, ...status });
      }

      case "set_primary": {
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!unitId) return Response.json({ ok: false, error: "unitId required" }, { status: 400 });
        const status = await setPrimaryFleetUnit(unitId);
        return Response.json({ ok: true, ...status, message: "Primary robot updated" });
      }

      case "start_pair": {
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!unitId) return Response.json({ ok: false, error: "unitId required" }, { status: 400 });
        const result = await startPairWizard(unitId);
        return Response.json({ ok: true, ...result });
      }

      case "advance_pair": {
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!unitId) return Response.json({ ok: false, error: "unitId required" }, { status: 400 });
        const result = await advancePairWizard(unitId);
        return Response.json({ ok: true, ...result });
      }

      case "complete_pair": {
        const unitId = typeof body.unitId === "string" ? body.unitId : "";
        if (!unitId) return Response.json({ ok: false, error: "unitId required" }, { status: 400 });
        const result = await completePairPreview(unitId);
        return Response.json({ ok: true, ...result });
      }

      case "cancel_pair": {
        const status = await cancelPairWizard();
        return Response.json({ ok: true, ...status });
      }

      case "update_relationship": {
        const tone =
          body.tone === "warm" || body.tone === "professional" || body.tone === "playful" || body.tone === "calm"
            ? body.tone
            : undefined;
        const status = await updateHumanoidRelationship({
          callName: typeof body.callName === "string" ? body.callName : undefined,
          tone,
          guestModeEnabled: typeof body.guestModeEnabled === "boolean" ? body.guestModeEnabled : undefined,
          introScript: typeof body.introScript === "string" ? body.introScript : undefined,
        });
        return Response.json({ ok: true, ...status });
      }

      case "add_rule": {
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return Response.json({ ok: false, error: "text required" }, { status: 400 });
        const priority = body.priority === "preference" ? "preference" : "essential";
        const status = await addHouseRule(text, priority);
        return Response.json({ ok: true, ...status });
      }

      case "remove_rule": {
        const ruleId = typeof body.ruleId === "string" ? body.ruleId : "";
        if (!ruleId) return Response.json({ ok: false, error: "ruleId required" }, { status: 400 });
        const status = await removeHouseRule(ruleId);
        return Response.json({ ok: true, ...status });
      }

      case "toggle_routine": {
        const routineId = typeof body.routineId === "string" ? body.routineId : "";
        if (!routineId) return Response.json({ ok: false, error: "routineId required" }, { status: 400 });
        const status = await toggleHumanoidRoutine(routineId, body.enabled !== false);
        return Response.json({ ok: true, ...status });
      }

      case "sync_knowledge":
      case "push_knowledge": {
        const status = await syncHumanoidKnowledgeToMesh();
        return Response.json({ ok: true, ...status, message: "Knowledge pushed to robot memory on mesh" });
      }

      case "complete_step": {
        const stepId = body.stepId as SetupStepId;
        if (!stepId) return Response.json({ ok: false, error: "stepId required" }, { status: 400 });
        const status = await completeSetupStep(stepId);
        return Response.json({ ok: true, ...status });
      }

      case "notify_when_live": {
        const status = await setNotifyWhenLive(body.notify === true);
        return Response.json({ ok: true, ...status });
      }

      default:
        return Response.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "humanoid hub action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
