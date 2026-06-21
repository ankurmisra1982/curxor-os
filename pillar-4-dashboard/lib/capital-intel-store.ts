import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  CapitalIntelSnapshot,
  IntelAlertFire,
  IntelAlertRule,
  TickerIntel,
} from "./capital-intel-types";

export interface CapitalIntelCache {
  version: 2;
  updatedAt: string;
  digest: CapitalIntelSnapshot | null;
  tickerBySymbol: Record<string, TickerIntel>;
  alertRules: IntelAlertRule[];
  alertFires: IntelAlertFire[];
}

function cachePath(): string {
  return process.env.CURXOR_CAPITAL_INTEL_PATH ?? "/etc/curxor/capital-intel.json";
}

function emptyCache(): CapitalIntelCache {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    digest: null,
    tickerBySymbol: {},
    alertRules: [],
    alertFires: [],
  };
}

function migrateCache(parsed: Partial<CapitalIntelCache>): CapitalIntelCache {
  return {
    version: 2,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    digest: parsed.digest ?? null,
    tickerBySymbol: parsed.tickerBySymbol ?? {},
    alertRules: Array.isArray(parsed.alertRules) ? parsed.alertRules : [],
    alertFires: Array.isArray(parsed.alertFires) ? parsed.alertFires.slice(-100) : [],
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
