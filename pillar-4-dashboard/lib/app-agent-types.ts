import { getAppAgent } from "./app-agent-catalog";
import { isValidAppId } from "./ootb-apps";
import { isForgedAppId } from "./workspace-app-id";

export interface AgentChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AgentAssistRequest {
  appId: string;
  message: string;
  history?: AgentChatTurn[];
  config?: Record<string, unknown>;
  skillId?: string;
  profileId?: string | null;
  channel?: string;
  sessionId?: string;
}

export interface AgentAssistResult {
  reply: string;
  suggestedSkill?: string;
  /** Swarm Claw — run suggested skill after chat without manual tap. */
  autoDispatchSkill?: boolean;
  dispatchHints?: Record<string, unknown>;
  activity?: string;
  mesh?: {
    kind: "physical" | "digital" | "plan" | "none";
    ok: boolean;
    seq?: number;
    id?: string;
    tool?: string;
    error?: string;
  };
}

export function skillActivityLine(appId: string, skillId: string): string {
  if (isValidAppId(appId)) {
    const skill = getAppAgent(appId).skills.find((s) => s.id === skillId);
    if (skill) {
      const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${stamp} · ${skill.label} · ${skill.kind}`;
    }
  }
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${stamp} · ${skillId}${isForgedAppId(appId) ? " · forged desk" : ""}`;
}
