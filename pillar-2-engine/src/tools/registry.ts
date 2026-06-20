/**
 * OpenClaw tool registry — physical mesh + digital intents (sovereign split).
 *
 * Physical: motor/vision on ZeroMQ binary wire formats.
 * Digital: JSON intents → Python bridges → HTTPS (Alpaca, X).
 *
 * The local LLM never calls external APIs directly.
 */

import type { AgentActionContext } from "../../actions/physical/types.js";
import { ingestVisionAction } from "../../actions/physical/ingest-vision.js";
import { publishMotorAction } from "../../actions/physical/publish-motor.js";
import { moveClawAction } from "../../actions/physical/move-claw.js";
import { executeTradeTool } from "./digital/execute-trade.js";
import { publishPostTool } from "./digital/publish-post.js";

export const PURGED_LEGACY_DIGITAL_TOOLS = [
  "email.send",
  "web.scrape",
  "browser.navigate",
  "social.post",
  "cloud.storage",
  "calendar.read",
  "http.fetch_external",
] as const;

const physicalActions = [ingestVisionAction, publishMotorAction, moveClawAction] as const;
const digitalTools = [executeTradeTool, publishPostTool] as const;
const agentTools = [...physicalActions, ...digitalTools] as const;

export async function executeAgentAction(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentActionContext,
): Promise<unknown> {
  const action = agentTools.find((entry) => entry.name === name);
  if (!action) {
    throw new Error(
      `Unknown action '${name}'. Allowed: ${agentTools.map((a) => a.name).join(", ")}`,
    );
  }
  return action.execute(args, ctx);
}

/** @deprecated use executeAgentAction */
export const executePhysicalAction = executeAgentAction;

export function getAgentToolDefinitions() {
  return agentTools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

/** @deprecated use getAgentToolDefinitions */
export const getPhysicalToolDefinitions = getAgentToolDefinitions;

export { physicalActions, digitalTools, agentTools };
