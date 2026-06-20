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
