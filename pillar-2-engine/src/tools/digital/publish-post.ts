import type { AgentActionContext } from "../../../actions/physical/types.js";
import { packDigitalIntent } from "../../telemetry/digital-protocol.js";

export const publishPostTool = {
  name: "content.publish_post",
  description:
    "Publish a social post intent to the digital bridge (X API). Does NOT call the internet from the engine.",
  parameters: {
    type: "object",
    required: ["text"],
    properties: {
      text: { type: "string", description: "Post body (max 280 chars for X)" },
    },
    additionalProperties: false,
  },
  async execute(
    args: Record<string, unknown>,
    ctx: AgentActionContext,
  ): Promise<{ queued: true; intentId: string; tool: string }> {
    const text = String(args.text ?? "").trim();
    if (!text) throw new Error("text is required");
    if (text.length > 280) throw new Error("text exceeds 280 characters");

    const intent = packDigitalIntent("content.publish_post", { text });
    await ctx.mesh.publishDigital(intent);
    return { queued: true, intentId: intent.id, tool: intent.tool };
  },
};
