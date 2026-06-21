import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ClawContextEnvelope, ClawContextRecord, ClawContextScope } from "./claw-mesh-protocol";
import { subscriptionsForApp, scopeAllowedForApp } from "./claw-mesh-protocol";
import { filterConsentedScopes } from "./ccp-consent-store";
import type { OotbAppId } from "./ootb-apps";

interface ClawContextFile {
  records: ClawContextRecord[];
}

function storePath(): string {
  return process.env.CURXOR_CLAW_CONTEXT_PATH ?? "/etc/curxor/claw-context.json";
}

async function readFile_(): Promise<ClawContextFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ClawContextFile>;
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch {
    return { records: [] };
  }
}

async function writeFile_(data: ClawContextFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

function isExpired(record: ClawContextRecord): boolean {
  if (!record.expiresAt) return false;
  return Date.parse(record.expiresAt) <= Date.now();
}

export async function publishClawContext(
  sourceAppId: OotbAppId | "system" | "bridge",
  input: {
    scope: ClawContextScope;
    key: string;
    payload: Record<string, unknown>;
    profileId?: string | null;
    ttlSeconds?: number | null;
  },
): Promise<ClawContextRecord> {
  if (sourceAppId !== "system" && sourceAppId !== "bridge") {
    if (!scopeAllowedForApp(sourceAppId, input.scope, "write")) {
      throw new Error(`App ${sourceAppId} may not publish scope ${input.scope}`);
    }
  }

  const now = new Date();
  const expiresAt =
    input.ttlSeconds != null && input.ttlSeconds > 0
      ? new Date(now.getTime() + input.ttlSeconds * 1000).toISOString()
      : null;

  const envelope: ClawContextEnvelope = {
    id: randomUUID(),
    version: 1,
    action: "publish",
    sourceAppId,
    profileId: input.profileId ?? null,
    scope: input.scope,
    key: input.key,
    timestamp: now.toISOString(),
    ttlSeconds: input.ttlSeconds ?? null,
    payload: input.payload,
  };

  const record: ClawContextRecord = {
    envelope,
    storedAt: now.toISOString(),
    expiresAt,
  };

  const file = await readFile_();
  file.records = file.records.filter(
    (r) =>
      !(
        r.envelope.scope === input.scope &&
        r.envelope.key === input.key &&
        r.envelope.profileId === (input.profileId ?? null)
      ),
  );
  file.records.unshift(record);
  if (file.records.length > 500) file.records = file.records.slice(0, 500);
  await writeFile_(file);
  return record;
}

export async function queryClawContext(options: {
  appId: OotbAppId;
  scopes?: ClawContextScope[];
  profileId?: string | null;
  keyPrefix?: string;
  limit?: number;
}): Promise<ClawContextRecord[]> {
  const allowedScopes = await filterConsentedScopes(
    options.appId,
    options.scopes ?? subscriptionsForApp(options.appId)?.scopes ?? [],
  );

  const file = await readFile_();
  const limit = options.limit ?? 50;

  return file.records
    .filter((r) => !isExpired(r))
    .filter((r) => allowedScopes.includes(r.envelope.scope))
    .filter((r) => {
      if (options.profileId === undefined) return true;
      return r.envelope.profileId === options.profileId;
    })
    .filter((r) => {
      if (!options.keyPrefix) return true;
      return r.envelope.key.startsWith(options.keyPrefix);
    })
    .slice(0, limit);
}

export async function getContextSummaryForApp(appId: OotbAppId, profileId?: string | null): Promise<string> {
  const records = await queryClawContext({ appId, profileId, limit: 24 });
  if (records.length === 0) return "No shared context yet on the Claw Context mesh.";

  const lines = records.map(
    (r) =>
      `[${r.envelope.scope}/${r.envelope.key}] ${JSON.stringify(r.envelope.payload).slice(0, 200)}`,
  );
  return lines.join("\n");
}

export async function purgeExpiredContext(): Promise<number> {
  const file = await readFile_();
  const before = file.records.length;
  file.records = file.records.filter((r) => !isExpired(r));
  await writeFile_(file);
  return before - file.records.length;
}
