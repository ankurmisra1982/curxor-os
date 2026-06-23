import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CapitalThesisEntry } from "./capital-alpha-types";
import type {
  CapitalIntelSnapshot,
  IntelAlertFire,
  IntelAlertPreferences,
  IntelAlertRule,
  TickerIntel,
} from "./capital-intel-types";

export interface CapitalIntelCache {
  version: 3;
  updatedAt: string;
  digest: CapitalIntelSnapshot | null;
  tickerBySymbol: Record<string, TickerIntel>;
  alertRules: IntelAlertRule[];
  alertFires: IntelAlertFire[];
  alertPreferences: IntelAlertPreferences;
  thesisEntries: CapitalThesisEntry[];
}

export function defaultAlertPreferences(): IntelAlertPreferences {
  return {
    notifyPilotSignals: true,
    minPilotNotionalUsd: 500,
    notifyMoverSpikes: true,
    moverSpikePct: 3,
    notifyIntelFires: true,
  };
}

function cachePath(): string {
  return process.env.CURXOR_CAPITAL_INTEL_PATH ?? "/etc/curxor/capital-intel.json";
}

function emptyCache(): CapitalIntelCache {
  return {
    version: 3,
    updatedAt: new Date().toISOString(),
    digest: null,
    tickerBySymbol: {},
    alertRules: [],
    alertFires: [],
    alertPreferences: defaultAlertPreferences(),
    thesisEntries: [],
  };
}

function migrateCache(parsed: Partial<CapitalIntelCache>): CapitalIntelCache {
  return {
    version: 3,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    digest: parsed.digest ?? null,
    tickerBySymbol: parsed.tickerBySymbol ?? {},
    alertRules: Array.isArray(parsed.alertRules) ? parsed.alertRules : [],
    alertFires: Array.isArray(parsed.alertFires) ? parsed.alertFires.slice(-100) : [],
    alertPreferences: { ...defaultAlertPreferences(), ...(parsed.alertPreferences ?? {}) },
    thesisEntries: Array.isArray(parsed.thesisEntries) ? parsed.thesisEntries : [],
  };
}

export async function readIntelCache(): Promise<CapitalIntelCache> {
  try {
    const raw = await readFile(cachePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CapitalIntelCache>;
    return migrateCache(parsed);
  } catch {
    return emptyCache();
  }
}

export async function writeIntelCache(data: CapitalIntelCache): Promise<void> {
  const filePath = cachePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  data.alertFires = data.alertFires.slice(-100);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listIntelAlertRules(): Promise<IntelAlertRule[]> {
  const cache = await readIntelCache();
  return cache.alertRules;
}

export async function upsertIntelAlertRule(rule: Omit<IntelAlertRule, "id" | "createdAt" | "lastFiredAt"> & { id?: string }): Promise<IntelAlertRule> {
  const cache = await readIntelCache();
  const now = new Date().toISOString();
  if (rule.id) {
    const idx = cache.alertRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      cache.alertRules[idx] = { ...cache.alertRules[idx]!, ...rule, id: rule.id };
      await writeIntelCache(cache);
      return cache.alertRules[idx]!;
    }
  }
  const created: IntelAlertRule = {
    id: rule.id ?? `IAL-${String(cache.alertRules.length + 1).padStart(2, "0")}`,
    symbol: rule.symbol.toUpperCase(),
    kind: rule.kind,
    keyword: rule.keyword,
    thresholdPct: rule.thresholdPct,
    minNotionalUsd: rule.minNotionalUsd,
    enabled: rule.enabled,
    createdAt: now,
    lastFiredAt: null,
  };
  cache.alertRules.push(created);
  await writeIntelCache(cache);
  return created;
}

export async function deleteIntelAlertRule(id: string): Promise<boolean> {
  const cache = await readIntelCache();
  const before = cache.alertRules.length;
  cache.alertRules = cache.alertRules.filter((r) => r.id !== id);
  if (cache.alertRules.length === before) return false;
  await writeIntelCache(cache);
  return true;
}

export async function recordIntelAlertFire(fire: IntelAlertFire, ruleId: string): Promise<void> {
  const cache = await readIntelCache();
  cache.alertFires.push(fire);
  const rule = cache.alertRules.find((r) => r.id === ruleId);
  if (rule) rule.lastFiredAt = fire.firedAt;
  await writeIntelCache(cache);
}

export async function getAlertPreferences(): Promise<IntelAlertPreferences> {
  const cache = await readIntelCache();
  return cache.alertPreferences;
}

export async function setAlertPreferences(patch: Partial<IntelAlertPreferences>): Promise<IntelAlertPreferences> {
  const cache = await readIntelCache();
  cache.alertPreferences = { ...cache.alertPreferences, ...patch };
  await writeIntelCache(cache);
  return cache.alertPreferences;
}

export async function listThesisEntries(symbol?: string): Promise<CapitalThesisEntry[]> {
  const cache = await readIntelCache();
  const sym = symbol?.trim().toUpperCase();
  const rows = cache.thesisEntries;
  if (!sym) return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return rows
    .filter((e) => e.symbol === sym)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function addThesisEntry(input: {
  symbol: string;
  body: string;
  source?: CapitalThesisEntry["source"];
  linkedTradeId?: string | null;
  linkedRuleId?: string | null;
  linkedPilotId?: string | null;
}): Promise<CapitalThesisEntry> {
  const cache = await readIntelCache();
  const now = new Date().toISOString();
  const entry: CapitalThesisEntry = {
    id: `TH-${String(cache.thesisEntries.length + 1).padStart(3, "0")}`,
    symbol: input.symbol.trim().toUpperCase(),
    body: input.body.trim().slice(0, 2000),
    source: input.source ?? "manual",
    linkedTradeId: input.linkedTradeId ?? null,
    linkedRuleId: input.linkedRuleId ?? null,
    linkedPilotId: input.linkedPilotId ?? null,
    createdAt: now,
  };
  cache.thesisEntries.unshift(entry);
  cache.thesisEntries = cache.thesisEntries.slice(0, 200);
  await writeIntelCache(cache);
  return entry;
}
