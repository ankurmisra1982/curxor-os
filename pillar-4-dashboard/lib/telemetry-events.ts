export interface VisionFrameEvent {
  timestampNs: string;
  seq: number;
  width: number;
  height: number;
  encoding: number;
  flags: number;
  payloadBytes: number;
  previewBase64?: string;
}

export interface MotorCommandEvent {
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
