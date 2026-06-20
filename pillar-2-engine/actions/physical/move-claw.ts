import type { PhysicalAction } from "./types.js";
import { publishMotorAction } from "./publish-motor.js";

export const moveClawAction: PhysicalAction = {
  name: "physical.move_claw",
  description: "High-level claw move — publishes target coordinates to telemetry/motor_out.",
  parameters: {
    type: "object",
    required: ["x", "y", "z"],
    properties: {
      x: { type: "number" },
      y: { type: "number" },
      z: { type: "number" },
      torque: { type: "number", description: "Optional uniform grip torque (Nm)" },
    },
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const torque = Number(args.torque ?? 0.5);
    return publishMotorAction.execute(
      {
        x: args.x,
        y: args.y,
        z: args.z,
        torque_z: torque,
      },
      ctx,
    );
  },
};
