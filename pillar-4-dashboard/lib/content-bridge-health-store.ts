import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import type { SocialPlatformId } from "./social-channels";
import { SOCIAL_CHANNELS } from "./social-channels";

export type BridgeErrorKind = "auth" | "rate_limit" | "validation" | "network" | "unknown";

export interface BridgePlatformHealthRecord {
  platform: string;
  tool: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastErrorKind: BridgeErrorKind | null;
  lastIntentId: string | null;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  updatedAt: string;
}

interface BridgeHealthFile {
  version: 1;
  platforms: Record<string, BridgePlatformHealthRecord>;
  updatedAt: string;
}

function healthPath(): string {
  return process.env.CURXOR_BRIDGE_HEALTH_PATH ?? "/etc/curxor/content-bridge-health.json";
}

export function classifyBridgeError(error: string | undefined | null): BridgeErrorKind {
  if (!error?.trim()) return "unknown";
  const e = error.toLowerCase();
  if (/401|403|unauthorized|invalid.*token|expired|oauth|forbidden|invalid_grant/.test(e)) return "auth";
  if (/429|rate.?limit|too many requests|throttl/.test(e)) return "rate_limit";
  if (/400|422|validation|required field|missing.*required/.test(e)) return "validation";
  if (/timeout|timed out|econnrefused|enotfound|network|socket/.test(e)) return "network";
  return "unknown";
}

export function platformFromReceipt(receipt: DigitalReceipt): SocialPlatformId | null {
  const ch = SOCIAL_CHANNELS.find((c) => c.bridgeTool === receipt.tool);
  if (ch) return ch.id;

  if (receipt.tool === "content.publish_post") return "x";
  if (receipt.tool === "content.publish_reply") {
    const platform = receipt.receipt.platform;
    return typeof platform === "string" ? (platform as SocialPlatformId) : null;
  }
  return null;
}

async function readHealth(): Promise<BridgeHealthFile> {
  const { mkdir, readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(healthPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeHealthFile>;
    if (parsed.version !== 1 || typeof parsed.platforms !== "object") throw new Error("invalid");
    return {
      version: 1,
      platforms: parsed.platforms ?? {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, platforms: {}, updatedAt: new Date().toISOString() };
  }
}

async function writeHealth(data: BridgeHealthFile): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const filePath = healthPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function recordBridgeReceipt(receipt: DigitalReceipt): Promise<BridgePlatformHealthRecord | null> {
  const platform = platformFromReceipt(receipt);
  if (!platform) return null;

  const file = await readHealth();
  const now = new Date().toISOString();
  const prev = file.platforms[platform] ?? {
    platform,
    tool: receipt.tool,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    lastErrorKind: null,
    lastIntentId: null,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    updatedAt: now,
  };

  const next: BridgePlatformHealthRecord = { ...prev, tool: receipt.tool, lastIntentId: receipt.id, updatedAt: now };

  if (receipt.ok) {
    next.lastSuccessAt = receipt.timestamp || now;
    next.successCount += 1;
    next.consecutiveFailures = 0;
    next.lastError = null;
    next.lastErrorKind = null;
  } else {
    next.lastFailureAt = receipt.timestamp || now;
    next.failureCount += 1;
    next.consecutiveFailures += 1;
    next.lastError = receipt.error ?? "Bridge error";
    next.lastErrorKind = classifyBridgeError(next.lastError);
  }

  file.platforms[platform] = next;
  await writeHealth(file);
  return next;
}

export async function recordBridgeFailure(input: {
  platform: string;
  tool: string;
  error: string;
  intentId?: string;
}): Promise<BridgePlatformHealthRecord | null> {
  const receipt: DigitalReceipt = {
    id: input.intentId ?? `fail-${Date.now()}`,
    tool: input.tool,
    ok: false,
    timestamp: new Date().toISOString(),
    receipt: { platform: input.platform },
    error: input.error,
  };
  return recordBridgeReceipt(receipt);
}

export async function getBridgePlatformHealth(platform: string): Promise<BridgePlatformHealthRecord | null> {
  const file = await readHealth();
  return file.platforms[platform] ?? null;
}

export async function listBridgePlatformHealth(): Promise<BridgePlatformHealthRecord[]> {
  const file = await readHealth();
  return Object.values(file.platforms);
}
