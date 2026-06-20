export const MOTOR_WIRE_SIZE = 40;
export const VISION_HEADER_SIZE = 24;

export interface MotorCommand {
  timestampNs: string;
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

export interface VisionFrame {
  timestampNs: string;
  seq: number;
  width: number;
  height: number;
  encoding: number;
  flags: number;
  payloadBytes: number;
  previewBase64?: string;
}

export function epochNowNs(): bigint {
  return BigInt(Date.now()) * 1_000_000n;
}

export function packMotor(cmd: {
  timestampNs?: bigint;
  seq: number;
  clawId: number;
  torqueX?: number;
  torqueY?: number;
  torqueZ?: number;
  x: number;
  y: number;
  z: number;
  flags?: number;
}): Buffer {
  const buf = Buffer.alloc(MOTOR_WIRE_SIZE);
  buf.writeBigUInt64LE(cmd.timestampNs ?? epochNowNs(), 0);
  buf.writeUInt32LE(cmd.seq >>> 0, 8);
  buf.writeUInt8(cmd.clawId & 0xff, 12);
  buf.writeUInt8(0, 13);
  buf.writeFloatLE(cmd.torqueX ?? 0, 14);
  buf.writeFloatLE(cmd.torqueY ?? 0, 18);
  buf.writeFloatLE(cmd.torqueZ ?? 0, 22);
  buf.writeFloatLE(cmd.x, 26);
  buf.writeFloatLE(cmd.y, 30);
  buf.writeFloatLE(cmd.z, 34);
  buf.writeUInt16LE((cmd.flags ?? 0) & 0xffff, 38);
  return buf;
}

export function unpackMotor(payload: Buffer): MotorCommand {
  return {
    timestampNs: payload.readBigUInt64LE(0).toString(),
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

export function unpackVisionHeader(header: Buffer, payload: Buffer): VisionFrame {
  const encoding = header.readUInt16LE(20);
  const frame: VisionFrame = {
    timestampNs: header.readBigUInt64LE(0).toString(),
    seq: header.readUInt32LE(8),
    width: header.readUInt32LE(12),
    height: header.readUInt32LE(16),
    encoding,
    flags: header.readUInt16LE(22),
    payloadBytes: payload.length,
  };
  if (encoding === 1 && payload.length > 0) {
    frame.previewBase64 = payload.subarray(0, Math.min(payload.length, 8192)).toString("base64");
  }
  return frame;
}

export function formatMotorMatrix(cmd: MotorCommand): string[][] {
  return [
    ["FIELD", "VALUE", "UNIT"],
    ["seq", String(cmd.seq), "—"],
    ["claw_id", String(cmd.clawId), "—"],
    ["x", cmd.x.toFixed(4), "m"],
    ["y", cmd.y.toFixed(4), "m"],
    ["z", cmd.z.toFixed(4), "m"],
    ["τx", cmd.torqueX.toFixed(3), "Nm"],
    ["τy", cmd.torqueY.toFixed(3), "Nm"],
    ["τz", cmd.torqueZ.toFixed(3), "Nm"],
    ["flags", `0x${cmd.flags.toString(16).padStart(4, "0")}`, "hex"],
    ["ts_ns", cmd.timestampNs, "ns"],
  ];
}