import "server-only";

import { getAppAgent } from "./app-agent-catalog";
import { publishDigitalIntent, publishMotorCommand, type DigitalPublishResult, type MotorPublishResult } from "./mesh-publish";
import type { OotbAppId } from "./ootb-apps";

export interface SkillMeshResult {
  executed: boolean;
  kind: "physical" | "digital" | "plan" | "none";
  motor?: MotorPublishResult;
  digital?: DigitalPublishResult;
  skipReason?: string;
}

function cfgStr(config: Record<string, unknown>, key: string, fallback: string): string {
  const v = config[key];
  return typeof v === "string" ? v : fallback;
}

function cfgNum(config: Record<string, unknown>, key: string, fallback: number): number {
  const v = config[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function laneCoords(lane: string): { x: number; y: number; z: number } {
  switch (lane.toUpperCase()) {
    case "B":
      return { x: 0.32, y: 0.0, z: 0.18 };
    case "C":
      return { x: 0.48, y: 0.0, z: 0.18 };
    default:
      return { x: 0.16, y: 0.0, z: 0.18 };
  }
}

export async function executeSkillMesh(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
): Promise<SkillMeshResult> {
  const agent = getAppAgent(appId);
  const skill = agent.skills.find((s) => s.id === skillId);
  if (!skill) return { executed: false, kind: "none", skipReason: "unknown skill" };

  if (skill.kind === "plan") {
    return { executed: false, kind: "plan", skipReason: "local-only skill" };
  }

  if (appId === "claw-forge" && skillId === "attach_vision") {
    return { executed: false, kind: "plan", skipReason: "vision attach is UI-only" };
  }

  const clawId = cfgNum(config, "clawId", 1);

  if (skill.kind === "digital") {
    const digital = await buildDigitalIntent(appId, skillId, config);
    if (!digital) {
      return { executed: false, kind: "digital", skipReason: "no digital mapping" };
    }
    const result = await publishDigitalIntent(digital);
    return { executed: result.ok, kind: "digital", digital: result };
  }

  const motor = await buildMotorIntent(appId, skillId, config, clawId);
  if (!motor) {
    return { executed: false, kind: "physical", skipReason: "no motor mapping" };
  }
  const result = await publishMotorCommand(motor);
  return { executed: result.ok, kind: "physical", motor: result };
}

async function buildMotorIntent(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
  clawId: number,
): Promise<Parameters<typeof publishMotorCommand>[0] | null> {
  const lane = cfgStr(config, "clawLane", "A");
  const coords = laneCoords(lane);

  switch (appId) {
    case "my-work":
      if (skillId === "sort_tray") {
        const taskId = cfgStr(config, "selectedTaskId", "");
        const flags = taskId ? 0x0001 | (taskId.charCodeAt(taskId.length - 1) & 0xff) : 0x0001;
        return { clawId, ...coords, flags };
      }
      if (skillId === "move_to_tray") {
        return { clawId, x: coords.x, y: coords.y, z: 0.08, flags: 0x0002 };
      }
      break;

    case "my-shop":
      if (skillId === "sort_sku") {
        const orderId = cfgStr(config, "selectedOrderId", "");
        const orderFlag = orderId ? orderId.charCodeAt(orderId.length - 1) & 0x0f : 0;
        return { clawId, x: 0.22, y: 0.05, z: 0.14, flags: 0x0010 | orderFlag };
      }
      if (skillId === "retry_pick") {
        const sku = cfgStr(config, "selectedSku", "");
        const skuFlag = sku ? sku.charCodeAt(0) & 0x0f : 0;
        return { clawId, x: 0.22, y: 0.05, z: 0.12, flags: 0x0020 | skuFlag, torqueZ: 1.2 };
      }
      break;

    case "tesla-optimus-engine":
      if (skillId === "home_position") {
        return { clawId, x: 0, y: 0, z: 0.5, flags: 0x0100 };
      }
      if (skillId === "test_grip") {
        return { clawId, x: 0.1, y: 0, z: 0.3, torqueZ: cfgNum(config, "gripTorque", 2.5), flags: 0x0200 };
      }
      if (skillId === "tune_joint") {
        return {
          clawId,
          x: cfgNum(config, "jointX", 0.1),
          y: cfgNum(config, "jointY", 0),
          z: cfgNum(config, "jointZ", 0.3),
          torqueX: cfgNum(config, "torqueX", 0.5),
          torqueY: cfgNum(config, "torqueY", 0.3),
          torqueZ: cfgNum(config, "torqueZ", 1.0),
          flags: 0x0400,
        };
      }
      break;

    case "robotaxi-fleet-manager":
      if (skillId === "assign_route") {
        const depot = cfgStr(config, "depotGrid", "A1");
        const col = depot.charCodeAt(0) - 65;
        return { clawId, x: 0.1 + col * 0.08, y: 0.1, z: 0.05, flags: 0x0080 };
      }
      if (skillId === "recall_vehicle") {
        return { clawId, x: 0.1, y: 0.1, z: 0.05, flags: 0x0081 };
      }
      break;

    case "claw-cafe":
      if (skillId === "drop_claw") {
        return { clawId, x: coords.x, y: coords.y, z: 0.04, flags: 0x1000 };
      }
      if (skillId === "photo_booth") {
        return { clawId, ...coords, flags: 0x2000 };
      }
      break;

    default:
      break;
  }

  return null;
}

async function buildDigitalIntent(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
): Promise<{ tool: string; payload: Record<string, unknown> } | null> {
  switch (appId) {
    case "my-content-creator":
      if (skillId === "publish_post") {
        return {
          tool: "content.publish_post",
          payload: {
            channel: cfgStr(config, "primaryChannel", "x"),
            tone: cfgStr(config, "contentTone", "technical"),
            post_id: cfgStr(config, "selectedPostId", `POST-${Date.now()}`),
          },
        };
      }
      break;

    case "my-capital":
      if (skillId === "execute_trade") {
        const asset = cfgStr(config, "selectedAsset", "BTC-USD");
        const ruleId = cfgStr(config, "selectedRuleId", "");
        return {
          tool: "capital.execute_trade",
          payload: {
            ticker: asset,
            qty: 1,
            action: "buy",
            mode: cfgStr(config, "tradingMode", "paper"),
            rule_id: ruleId || undefined,
          },
        };
      }
      break;

    default:
      break;
  }

  return null;
}
