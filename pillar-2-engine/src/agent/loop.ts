/**
 * Core agent reasoning loop — vision in, local inference, motor out.
 */

import type { EngineConfig } from "../config/env.js";
import { LocalInferenceClient } from "../inference/local-inference.js";
import { createMeshClient } from "../telemetry/mesh-client.js";
import { summarizeVisionFrame } from "../telemetry/vision-protocol.js";
import { executeAgentAction, getAgentToolDefinitions } from "../tools/registry.js";
import type { AgentActionContext } from "../../actions/physical/types.js";
import type { VisionFrame } from "../telemetry/vision-protocol.js";

export class AgentLoop {
  private readonly inference: LocalInferenceClient;
  private latestVision: VisionFrame | null = null;
  private lastVisionSeq = -1;
  private motorSeq = { value: 0 };
  private running = false;
  private lastReasonAt = 0;
  private errorBackoffMs = 0;

  constructor(private readonly config: EngineConfig) {
    this.inference = new LocalInferenceClient(config);
  }

  async start(): Promise<void> {
    const mesh = await createMeshClient(this.config);
    this.running = true;

    console.error("[curxor-engine] online");
    console.error(
      `[curxor-engine] inference ${this.config.inferenceBackend} -> ${this.config.inferenceModel}`,
    );
    console.error(
      `[curxor-engine] mesh vision SUB ${this.config.meshBrokerIp}:${this.config.visionXpubPort}`,
    );
    console.error(
      `[curxor-engine] mesh motor PUB ${this.config.meshBrokerIp}:${this.config.motorXsubPort}`,
    );

    console.error(
      `[curxor-engine] mesh digital PUB ${this.config.meshBrokerIp}:${this.config.motorXsubPort} topic ${this.config.topicDigitalOut}`,
    );

    const ctx: AgentActionContext = {
      mesh,
      clawId: this.config.clawId,
      latestVision: null,
      motorSeq: this.motorSeq,
    };

    try {
      while (this.running) {
        const frame = await mesh.readVision(this.config.loopIntervalMs);
        if (frame) {
          this.latestVision = frame;
          ctx.latestVision = frame;
        }

        const shouldReason = this.shouldReason(frame);
        if (shouldReason) {
          try {
            await this.tick(ctx);
            this.lastReasonAt = Date.now();
            this.errorBackoffMs = 0;
          } catch (error) {
            this.errorBackoffMs = Math.min(this.errorBackoffMs * 2 + 1_000, 30_000);
            console.error("[curxor-engine] inference/backoff:", error);
          }
        }

        await sleep(this.config.loopIntervalMs);
      }
    } finally {
      await mesh.close();
    }
  }

  stop(): void {
    this.running = false;
  }

  private shouldReason(frame: VisionFrame | null): boolean {
    if (!this.latestVision) return false;

    const now = Date.now();
    const intervalOk = now - this.lastReasonAt >= this.config.minReasonIntervalMs + this.errorBackoffMs;
    const newFrame = frame !== null && frame.header.seq !== this.lastVisionSeq;

    if (newFrame) {
      this.lastVisionSeq = frame.header.seq;
    }

    return intervalOk && (newFrame || this.lastReasonAt === 0);
  }

  private async tick(ctx: AgentActionContext): Promise<void> {
    const spatial = summarizeVisionFrame(ctx.latestVision!);
    const tools = getAgentToolDefinitions();
    const enc = ctx.latestVision!.header.encoding;

    const result = await this.inference.reason(
      [
        { role: "system", content: this.config.systemPrompt },
        {
          role: "user",
          content: [
            "Physical claw control tick.",
            `Spatial state: ${JSON.stringify(spatial)}`,
            enc === 1
              ? `Vision frame: ${spatial.width}x${spatial.height} JPEG on mesh seq ${spatial.seq}.`
              : `Vision frame seq ${spatial.seq} (${spatial.payloadBytes} bytes).`,
            "Respond with exactly one tool call when action is required (physical motor or digital intent).",
          ].join("\n"),
        },
      ],
      tools,
    );

    for (const call of result.toolCalls) {
      try {
        const output = await executeAgentAction(call.name, call.arguments, ctx);
        console.error(`[curxor-engine] action ${call.name} -> ${JSON.stringify(output)}`);
      } catch (error) {
        console.error(`[curxor-engine] action ${call.name} failed:`, error);
      }
    }

    if (result.toolCalls.length === 0 && result.content) {
      console.error(`[curxor-engine] model text (no tool call): ${result.content.slice(0, 120)}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
