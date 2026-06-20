/**
 * Node.js mesh client — wire-compatible with curxor_broker.client (Pillar 3).
 *
 * Engine role:
 *   SUB telemetry/vision_in @ XPUB :9101
 *   PUB telemetry/motor_out @ XSUB :9200
 *   PUB telemetry/digital_out @ XSUB :9200 (JSON intents)
 */

import { Publisher, Subscriber } from "zeromq";

import type { EngineConfig } from "../config/env.js";
import type { DigitalIntent } from "./digital-protocol.js";
import { packMotorCommand, type MotorCommand } from "./motor-protocol.js";
import { unpackVisionHeader, type VisionFrame } from "./vision-protocol.js";

export interface MeshClient {
  publishMotor(cmd: MotorCommand): Promise<void>;
  publishDigital(intent: DigitalIntent): Promise<void>;
  readVision(timeoutMs?: number): Promise<VisionFrame | null>;
  close(): Promise<void>;
}

export async function createMeshClient(config: EngineConfig): Promise<MeshClient> {
  const visionSub = new Subscriber();
  visionSub.receiveHighWaterMark = 64;
  visionSub.linger = 0;
  visionSub.connect(`tcp://${config.meshBrokerIp}:${config.visionXpubPort}`);
  visionSub.subscribe(config.topicVision);

  const motorPub = new Publisher();
  motorPub.sendHighWaterMark = 8;
  motorPub.linger = 0;
  motorPub.immediate = true;
  motorPub.connect(`tcp://${config.meshBrokerIp}:${config.motorXsubPort}`);

  const digitalPub = new Publisher();
  digitalPub.sendHighWaterMark = 8;
  digitalPub.linger = 0;
  digitalPub.immediate = true;
  digitalPub.connect(`tcp://${config.meshBrokerIp}:${config.motorXsubPort}`);

  await sleep(250);

  return {
    async publishMotor(cmd: MotorCommand): Promise<void> {
      const payload = packMotorCommand(cmd);
      await motorPub.send([config.topicMotor, payload]);
    },

    async publishDigital(intent: DigitalIntent): Promise<void> {
      const body = Buffer.from(JSON.stringify(intent), "utf8");
      await digitalPub.send([config.topicDigitalOut, body]);
    },

    async readVision(timeoutMs = 100): Promise<VisionFrame | null> {
      const parts = (await visionSub.receive({ timeout: timeoutMs })) as Buffer[] | undefined;
      if (!parts || parts.length !== 3) return null;

      const header = parts[1];
      const payload = parts[2];
      if (!header || !payload) return null;

      return {
        header: unpackVisionHeader(header),
        payload,
      };
    },

    async close(): Promise<void> {
      visionSub.close();
      motorPub.close();
      digitalPub.close();
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
