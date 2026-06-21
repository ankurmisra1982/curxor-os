import type { OotbAppId } from "../ootb-apps";

/** OpenClaw-compatible workspace files (global + per-Claw). */
export type GlobalWorkspaceFile = "USER.md" | "MEMORY.md";
export type AppWorkspaceFile = "SOUL.md" | "TOOLS.md" | "HEARTBEAT.md";

export interface AgentWorkspaceSnapshot {
  global: Record<GlobalWorkspaceFile, string>;
  app: Record<AppWorkspaceFile, string>;
  skillFiles: string[];
  updatedAt: string;
}

export interface WorkspaceWriteRequest {
  scope: "global" | "app";
  file: GlobalWorkspaceFile | AppWorkspaceFile;
  content: string;
  appId?: OotbAppId;
}

export const DEFAULT_GLOBAL_USER = `# Operator profile

- Name: Primary operator
- Timezone: local
- Communication: concise, technical when needed
`;

export const DEFAULT_GLOBAL_MEMORY = `# Persistent memory

Facts the Claws should remember across sessions. The agent may append here after corrections.

`;
