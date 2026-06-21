import { getAppAgent } from "./app-agent-catalog";
import type { OotbAppId } from "./ootb-apps";

export interface AgentChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AgentAssistRequest {
  appId: OotbAppId;
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

export function skillActivityLine(appId: OotbAppId, skillId: string): string {
  const skill = getAppAgent(appId).skills.find((s) => s.id === skillId);
  if (!skill) return `Unknown skill ${skillId}`;
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${stamp} · ${skill.label} · ${skill.kind}`;
}
