/**
 * 40-byte motor wire format — byte-compatible with curxor_broker.protocol.MotorCommand
 *
 * Layout (little-endian):
 *   timestamp_ns u64 | seq u32 | claw_id u8 | pad u8 | torque xyz f32×3 | xyz f32×3 | flags u16
 */

export const MOTOR_WIRE_SIZE = 40;

export interface MotorCommand {
  timestampNs: bigint;
  seq: number;
  clawId: number;
  torqueX: number;
  torqueY: number;
  torqueZ: number;
  x: number;
  y: number;
  z: number;
  flags: number;
}

export function packMotorCommand(cmd: MotorCommand): Buffer {
  const buf = Buffer.alloc(MOTOR_WIRE_SIZE);
  buf.writeBigUInt64LE(cmd.timestampNs, 0);
  buf.writeUInt32LE(cmd.seq >>> 0, 8);
  buf.writeUInt8(cmd.clawId & 0xff, 12);
  buf.writeUInt8(0, 13);
  buf.writeFloatLE(cmd.torqueX, 14);
  buf.writeFloatLE(cmd.torqueY, 18);
  buf.writeFloatLE(cmd.torqueZ, 22);
  buf.writeFloatLE(cmd.x, 26);
  buf.writeFloatLE(cmd.y, 30);
  buf.writeFloatLE(cmd.z, 34);
  buf.writeUInt16LE(cmd.flags & 0xffff, 38);
  return buf;
}

export function unpackMotorCommand(payload: Buffer): MotorCommand {
  if (payload.length < MOTOR_WIRE_SIZE) {
    throw new Error(`motor payload must be ${MOTOR_WIRE_SIZE} bytes, got ${payload.length}`);
  }
  return {
    timestampNs: payload.readBigUInt64LE(0),
    seq: payload.readUInt32LE(8),
    clawId: payload.readUInt8(12),
    torqueX: payload.readFloatLE(14),
    torqueY: payload.readFloatLE(18),
    torqueZ: payload.readFloatLE(22),
    x: payload.readFloatLE(26),
    y: payload.readFloatLE(30),
    z: payload.readFloatLE(34),
    flags: payload.readUInt16LE(38),
  };
}

/** Epoch nanoseconds (ms precision) — compatible with Python time.time_ns() granularity. */
export function epochNowNs(): bigint {
  return BigInt(Date.now()) * 1_000_000n;
}

export function motorNow(
  clawId: number,
  x: number,
  y: number,
  z: number,
  opts: Partial<Omit<MotorCommand, "timestampNs" | "clawId" | "x" | "y" | "z">> = {},
): MotorCommand {
  return {
    timestampNs: epochNowNs(),
    seq: opts.seq ?? 0,
    clawId,
    torqueX: opts.torqueX ?? 0,
    torqueY: opts.torqueY ?? 0,
    torqueZ: opts.torqueZ ?? 0,
    x,
    y,
    z,
    flags: opts.flags ?? 0,
  };
}
