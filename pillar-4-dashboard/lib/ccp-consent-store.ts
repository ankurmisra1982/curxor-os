import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ClawContextScope } from "./claw-mesh-protocol";
import { CCP_REGISTRY } from "./claw-mesh-protocol";
import type { OotbAppId } from "./ootb-apps";

export interface CcpConsentEntry {
  subscriberAppId: OotbAppId;
  scope: ClawContextScope;
  allowed: boolean;
}

export interface CcpConsentState {
  version: 1;
  entries: CcpConsentEntry[];
  updatedAt: string;
}

function consentPath(): string {
  return process.env.CURXOR_CCP_CONSENT_PATH ?? "/etc/curxor/ccp-consent.json";
}

async function readState(): Promise<CcpConsentState> {
  try {
    const raw = await readFile(consentPath(), "utf8");
    const parsed = JSON.parse(raw) as CcpConsentState;
    if (parsed.version !== 1) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, entries: [], updatedAt: new Date().toISOString() };
  }
}

async function writeState(state: CcpConsentState): Promise<void> {
  const filePath = consentPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export function buildDefaultConsentMatrix(): CcpConsentEntry[] {
  const entries: CcpConsentEntry[] = [];
  for (const sub of CCP_REGISTRY.subscriptions) {
    for (const scope of sub.scopes) {
      entries.push({ subscriberAppId: sub.appId, scope, allowed: true });
    }
  }
  return entries;
}

export async function getCcpConsentState(): Promise<CcpConsentState> {
  const state = await readState();
  if (state.entries.length === 0) {
    return { version: 1, entries: buildDefaultConsentMatrix(), updatedAt: new Date().toISOString() };
  }
  return state;
}

export async function setCcpConsent(
  subscriberAppId: OotbAppId,
  scope: ClawContextScope,
  allowed: boolean,
): Promise<CcpConsentState> {
  const state = await getCcpConsentState();
  const idx = state.entries.findIndex((e) => e.subscriberAppId === subscriberAppId && e.scope === scope);
  if (idx >= 0) state.entries[idx]!.allowed = allowed;
  else state.entries.push({ subscriberAppId, scope, allowed });
  await writeState(state);
  return state;
}

export async function isScopeConsented(appId: OotbAppId, scope: ClawContextScope): Promise<boolean> {
  const state = await getCcpConsentState();
  const entry = state.entries.find((e) => e.subscriberAppId === appId && e.scope === scope);
  return entry?.allowed ?? true;
}

export async function filterConsentedScopes(appId: OotbAppId, scopes: ClawContextScope[]): Promise<ClawContextScope[]> {
  const state = await getCcpConsentState();
  return scopes.filter((scope) => {
    const entry = state.entries.find((e) => e.subscriberAppId === appId && e.scope === scope);
    return entry?.allowed ?? true;
  });
}
