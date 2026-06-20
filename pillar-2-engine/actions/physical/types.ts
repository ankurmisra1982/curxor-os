import type { MeshClient } from "../../src/telemetry/mesh-client.js";
import type { VisionFrame } from "../../src/telemetry/vision-protocol.js";

export interface AgentActionContext {
  mesh: MeshClient;
  clawId: number;
  latestVision: VisionFrame | null;
  motorSeq: { value: number };
}

export type PhysicalActionContext = AgentActionContext;

export interface PhysicalToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface PhysicalAction extends PhysicalToolDefinition {
  execute(args: Record<string, unknown>, ctx: AgentActionContext): Promise<unknown>;
}