/**
 * Server-side ZeroMQ XPUB subscribers → in-process fan-out for SSE routes.
 * Browser cannot speak ZMQ; this bridge runs inside the Next.js Node runtime.
 */

import { Subscriber } from "zeromq";

import { loadDashboardEnv } from "./env";
import { parseDigitalReceipt, type DigitalReceipt } from "./digital-protocol";
import { unpackMotor, unpackVisionHeader, type MotorCommand, type VisionFrame } from "./wire-protocol";

/** libzmq slow-joiner: allow XPUB subscription handshake before first frames. */
const ZMQ_CONNECT_SETTLE_MS = 250;

type Listener<T> = (payload: T) => void;

class MeshBridge {
  private visionSub: Subscriber | null = null;
  private motorSub: Subscriber | null = null;
  private digitalSub: Subscriber | null = null;
  private visionListeners = new Set<Listener<VisionFrame>>();
  private motorListeners = new Set<Listener<MotorCommand>>();
  private digitalListeners = new Set<Listener<DigitalReceipt>>();
  private startPromise: Promise<void> | null = null;

  ensureStarted(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.start();
    }
    return this.startPromise;
  }

  private async start(): Promise<void> {
    const env = loadDashboardEnv();

    this.visionSub = new Subscriber();
    this.visionSub.receiveHighWaterMark = 32;
    this.visionSub.linger = 0;
    this.visionSub.connect(`tcp://${env.meshBrokerIp}:${env.visionXpubPort}`);
    this.visionSub.subscribe(env.topicVision);

    this.motorSub = new Subscriber();
    this.motorSub.receiveHighWaterMark = 8;
    this.motorSub.linger = 0;
    if ("conflate" in this.motorSub) {
      (this.motorSub as Subscriber & { conflate: boolean }).conflate = true;
    }
    this.motorSub.connect(`tcp://${env.meshBrokerIp}:${env.motorXpubPort}`);
    this.motorSub.subscribe(env.topicMotor);

    this.digitalSub = new Subscriber();
    this.digitalSub.receiveHighWaterMark = 32;
    this.digitalSub.linger = 0;
    this.digitalSub.connect(`tcp://${env.meshBrokerIp}:${env.visionXpubPort}`);
    this.digitalSub.subscribe(env.topicDigitalIn);

    await sleep(ZMQ_CONNECT_SETTLE_MS);

    void this.pumpVision();
    void this.pumpMotor();
    void this.pumpDigital();
  }

  subscribeDigital(listener: Listener<DigitalReceipt>): () => void {
    this.digitalListeners.add(listener);
    return () => this.digitalListeners.delete(listener);
  }

  subscribeVision(listener: Listener<VisionFrame>): () => void {
    this.visionListeners.add(listener);
    return () => this.visionListeners.delete(listener);
  }

  subscribeMotor(listener: Listener<MotorCommand>): () => void {
    this.motorListeners.add(listener);
    return () => this.motorListeners.delete(listener);
  }

  private async pumpVision(): Promise<void> {
    const sub = this.visionSub;
    if (!sub) return;
    for await (const parts of sub) {
      if (parts.length !== 3) continue;
      const header = parts[1];
      const payload = parts[2];
      if (!header || !payload) continue;
      const frame = unpackVisionHeader(header, payload);
      for (const listener of this.visionListeners) listener(frame);
    }
  }

  private async pumpMotor(): Promise<void> {
    const sub = this.motorSub;
    if (!sub) return;
    for await (const parts of sub) {
      if (parts.length !== 2) continue;
      const payload = parts[1];
      if (!payload || payload.length < 40) continue;
      const cmd = unpackMotor(payload);
      for (const listener of this.motorListeners) listener(cmd);
    }
  }

  private async pumpDigital(): Promise<void> {
    const sub = this.digitalSub;
    if (!sub) return;
    for await (const parts of sub) {
      if (parts.length !== 2) continue;
      const payload = parts[1];
      if (!payload) continue;
      const receipt = parseDigitalReceipt(Buffer.from(payload));
      if (receipt) {
        for (const listener of this.digitalListeners) listener(receipt);
      }
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __curxorMeshBridge: MeshBridge | undefined;
}

export function getMeshBridge(): MeshBridge {
  if (!globalThis.__curxorMeshBridge) {
    globalThis.__curxorMeshBridge = new MeshBridge();
  }
  return globalThis.__curxorMeshBridge;
}

export function sseEncode(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
