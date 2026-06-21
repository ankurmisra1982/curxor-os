/**
 * Dashboard mesh publish — PUB.connect to XSUB :9200 (same as Pillar 2 engine).
 * Browser cannot speak ZMQ; these helpers run inside the Next.js Node runtime.
 */

import "server-only";

import { randomUUID } from "crypto";

import { Publisher } from "zeromq";

import { loadDashboardEnv } from "./env";
import { packMotor } from "./wire-protocol";

const ZMQ_CONNECT_SETTLE_MS = 250;

export interface MotorPublishInput {
  clawId?: number;
  x: number;
  y: number;
  z: number;
  torqueX?: number;
  torqueY?: number;
  torqueZ?: number;
  flags?: number;
  seq?: number;
}

export interface MotorPublishResult {
  ok: boolean;
  seq: number;
  clawId: number;
  error?: string;
}

export interface DigitalPublishInput {
  tool: string;
  payload: Record<string, unknown>;
}

export interface DigitalPublishResult {
  ok: boolean;
  id: string;
  tool: string;
  error?: string;
}

export interface ClawContextPublishInput {
  envelope: Record<string, unknown>;
}

export interface ClawContextPublishResult {
  ok: boolean;
  id: string;
  error?: string;
}

class MeshPublisher {
  private motorPub: Publisher | null = null;
  private digitalPub: Publisher | null = null;
  private contextPub: Publisher | null = null;
  private startPromise: Promise<void> | null = null;
  private motorSeq = 0;

  private ensureStarted(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.start();
    }
    return this.startPromise;
  }

  private async start(): Promise<void> {
    const env = loadDashboardEnv();
    const endpoint = `tcp://${env.meshBrokerIp}:${env.motorXsubPort}`;

    this.motorPub = new Publisher();
    this.motorPub.sendHighWaterMark = 8;
    this.motorPub.linger = 0;
    if ("immediate" in this.motorPub) {
      (this.motorPub as Publisher & { immediate: boolean }).immediate = true;
    }
    this.motorPub.connect(endpoint);

    this.digitalPub = new Publisher();
    this.digitalPub.sendHighWaterMark = 8;
    this.digitalPub.linger = 0;
    if ("immediate" in this.digitalPub) {
      (this.digitalPub as Publisher & { immediate: boolean }).immediate = true;
    }
    this.digitalPub.connect(endpoint);

    this.contextPub = new Publisher();
    this.contextPub.sendHighWaterMark = 8;
    this.contextPub.linger = 0;
    if ("immediate" in this.contextPub) {
      (this.contextPub as Publisher & { immediate: boolean }).immediate = true;
    }
    this.contextPub.connect(endpoint);

    await sleep(ZMQ_CONNECT_SETTLE_MS);
  }

  async publishMotor(input: MotorPublishInput): Promise<MotorPublishResult> {
    try {
      await this.ensureStarted();
      const env = loadDashboardEnv();
      const pub = this.motorPub;
      if (!pub) return { ok: false, seq: 0, clawId: 0, error: "motor publisher unavailable" };

      const seq = input.seq ?? ++this.motorSeq;
      const clawId = input.clawId ?? 1;
      const payload = packMotor({
        seq,
        clawId,
        x: input.x,
        y: input.y,
        z: input.z,
        torqueX: input.torqueX,
        torqueY: input.torqueY,
        torqueZ: input.torqueZ,
        flags: input.flags,
      });

      await pub.send([env.topicMotor, payload]);
      return { ok: true, seq, clawId };
    } catch (err) {
      return {
        ok: false,
        seq: 0,
        clawId: input.clawId ?? 1,
        error: err instanceof Error ? err.message : "motor publish failed",
      };
    }
  }

  async publishDigital(input: DigitalPublishInput): Promise<DigitalPublishResult> {
    try {
      await this.ensureStarted();
      const env = loadDashboardEnv();
      const pub = this.digitalPub;
      if (!pub) return { ok: false, id: "", tool: input.tool, error: "digital publisher unavailable" };

      const id = randomUUID();
      const body = Buffer.from(
        JSON.stringify({
          id,
          tool: input.tool,
          timestamp: new Date().toISOString(),
          payload: input.payload,
        }),
        "utf8",
      );

      await pub.send([env.topicDigitalOut, body]);
      return { ok: true, id, tool: input.tool };
    } catch (err) {
      return {
        ok: false,
        id: "",
        tool: input.tool,
        error: err instanceof Error ? err.message : "digital publish failed",
      };
    }
  }

  async publishClawContext(input: ClawContextPublishInput): Promise<ClawContextPublishResult> {
    try {
      await this.ensureStarted();
      const env = loadDashboardEnv();
      const pub = this.contextPub;
      if (!pub) return { ok: false, id: "", error: "context publisher unavailable" };

      const id = randomUUID();
      const body = Buffer.from(
        JSON.stringify({ id, ...input.envelope, timestamp: new Date().toISOString() }),
        "utf8",
      );

      await pub.send([env.topicClawContext, body]);
      return { ok: true, id };
    } catch (err) {
      return {
        ok: false,
        id: "",
        error: err instanceof Error ? err.message : "context publish failed",
      };
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __curxorMeshPublisher: MeshPublisher | undefined;
}

function getPublisher(): MeshPublisher {
  if (!globalThis.__curxorMeshPublisher) {
    globalThis.__curxorMeshPublisher = new MeshPublisher();
  }
  return globalThis.__curxorMeshPublisher;
}

export async function publishMotorCommand(input: MotorPublishInput): Promise<MotorPublishResult> {
  return getPublisher().publishMotor(input);
}

export async function publishDigitalIntent(input: DigitalPublishInput): Promise<DigitalPublishResult> {
  return getPublisher().publishDigital(input);
}

export async function publishClawContextMesh(input: ClawContextPublishInput): Promise<ClawContextPublishResult> {
  return getPublisher().publishClawContext(input);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
