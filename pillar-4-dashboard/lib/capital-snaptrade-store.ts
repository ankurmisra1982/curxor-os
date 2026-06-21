import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveDigitalEnvVar } from "./digital-env";

export interface SnapTradeLinkState {
  userId: string;
  userSecret: string;
  linkedAt: string | null;
  brokerAccountId: string | null;
  institutionName: string | null;
}

function storePath(): string {
  return process.env.CURXOR_CAPITAL_SNAPTRADE_PATH ?? "/etc/curxor/capital-snaptrade.json";
}

export async function snapTradeEnv(): Promise<{
  clientId: string | null;
  consumerSecret: string | null;
  redirectUri: string;
}> {
  const clientId = (await resolveDigitalEnvVar("SNAPTRADE_CLIENT_ID")) ?? null;
  const consumerSecret = (await resolveDigitalEnvVar("SNAPTRADE_CONSUMER_SECRET")) ?? null;
  const redirectUri =
    (await resolveDigitalEnvVar("SNAPTRADE_REDIRECT_URI")) || "http://127.0.0.1:3080/api/capital/snaptrade";
  return { clientId, consumerSecret, redirectUri };
}

export async function isSnapTradeConfigured(): Promise<boolean> {
  const { clientId, consumerSecret } = await snapTradeEnv();
  return Boolean(clientId && consumerSecret);
}

export async function readSnapTradeLink(): Promise<SnapTradeLinkState | null> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<SnapTradeLinkState>;
    if (!parsed.userId?.trim() || !parsed.userSecret?.trim()) return null;
    return {
      userId: parsed.userId,
      userSecret: parsed.userSecret,
      linkedAt: parsed.linkedAt ?? null,
      brokerAccountId: parsed.brokerAccountId ?? null,
      institutionName: parsed.institutionName ?? null,
    };
  } catch {
    return null;
  }
}

export async function writeSnapTradeLink(state: SnapTradeLinkState): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function clearSnapTradeLink(): Promise<void> {
  try {
    await writeFile(storePath(), "{}\n", { mode: 0o640 });
  } catch {
    /* ignore */
  }
}
