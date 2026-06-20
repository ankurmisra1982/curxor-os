import type { PhysicalAction } from "./types.js";
import { summarizeVisionFrame } from "../../src/telemetry/vision-protocol.js";

export const ingestVisionAction: PhysicalAction = {
  name: "physical.ingest_vision",
  description: "Read the latest claw camera frame from telemetry/vision_in and return spatial metadata.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute(_args, ctx) {
    if (!ctx.latestVision) {
      return { available: false, reason: "no vision frame buffered" };
    }
    return { available: true, frame: summarizeVisionFrame(ctx.latestVision) };
  },
};
