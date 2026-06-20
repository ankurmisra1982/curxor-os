import type { PhysicalAction } from "./types.js";
import { motorNow } from "../../src/telemetry/motor-protocol.js";

export const publishMotorAction: PhysicalAction = {
  name: "physical.publish_motor",
  description:
    "Publish a fixed 40-byte motor command to telemetry/motor_out (torque Nm + target coordinates in meters).",
  parameters: {
    type: "object",
    required: ["x", "y", "z"],
    properties: {
      x: { type: "number", description: "Target X coordinate (meters)" },
      y: { type: "number", description: "Target Y coordinate (meters)" },
      z: { type: "number", description: "Target Z coordinate (meters)" },
      torque_x: { type: "number", description: "Joint torque X (Nm)" },
      torque_y: { type: "number", description: "Joint torque Y (Nm)" },
      torque_z: { type: "number", description: "Joint torque Z (Nm)" },
      flags: { type: "integer", description: "Actuator flag bitmask" },
    },
    additionalProperties: false,
  },
  async execute(args, ctx) {
    ctx.motorSeq.value += 1;
    const cmd = motorNow(ctx.clawId, Number(args.x), Number(args.y), Number(args.z), {
      seq: ctx.motorSeq.value,
      torqueX: Number(args.torque_x ?? 0),
      torqueY: Number(args.torque_y ?? 0),
      torqueZ: Number(args.torque_z ?? 0),
      flags: Number(args.flags ?? 0),
    });
    await ctx.mesh.publishMotor(cmd);
    return { published: true, seq: cmd.seq, wireBytes: 40 };
  },
};
