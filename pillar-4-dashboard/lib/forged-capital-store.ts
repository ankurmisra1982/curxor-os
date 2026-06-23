import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ForgedCapitalAction,
  ForgedCapitalQueueFile,
  ForgedCapitalRule,
  ForgedCapitalRuleState,
  ForgedCapitalWatchEntry,
} from "./forged-capital-types";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

function queuePath(forgedAppId: string): string {
  return path.join(workspaceRoot(), forgedAppId, "capital-queue.json");
}

function emptyFile(): ForgedCapitalQueueFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    watchlist: [],
    rules: [],
  };
}

function demoPrice(ticker: string): number {
  const base = ticker.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return Math.round((base * 1.37 + 42) * 100) / 100;
}

function nextRuleId(rules: ForgedCapitalRule[]): string {
  const nums = rules
    .map((r) => /^RULE-(\d+)$/.exec(r.id)?.[1])
    .filter(Boolean)
    .map((n) => Number.parseInt(n!, 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `RULE-${String(next).padStart(3, "0")}`;
}

async function ensureForgedCapitalQueue(forgedAppId: string): Promise<ForgedCapitalQueueFile> {
  const filePath = queuePath(forgedAppId);
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ForgedCapitalQueueFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    };
  } catch {
    const file = emptyFile();
    await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o644 });
    return file;
  }
}

async function writeForgedCapitalQueue(forgedAppId: string, file: ForgedCapitalQueueFile): Promise<void> {
  file.updatedAt = new Date().toISOString();
  await writeFile(queuePath(forgedAppId), `${JSON.stringify(file, null, 2)}\n`, { mode: 0o644 });
}

export interface ForgedCapitalQueueStatus {
  forgedAppId: string;
  source: "demo" | "live";
  watchlist: ForgedCapitalWatchEntry[];
  rules: ForgedCapitalRule[];
  stats: {
    watchCount: number;
    ruleCount: number;
    armedRules: number;
  };
}

export async function fetchForgedCapitalStatus(forgedAppId: string): Promise<ForgedCapitalQueueStatus> {
  const file = await ensureForgedCapitalQueue(forgedAppId);
  return {
    forgedAppId,
    source: file.watchlist.length === 0 && file.rules.length === 0 ? "demo" : "live",
    watchlist: file.watchlist,
    rules: file.rules,
    stats: {
      watchCount: file.watchlist.length,
      ruleCount: file.rules.length,
      armedRules: file.rules.filter((r) => r.state === "ARMED").length,
    },
  };
}

export async function researchForgedTicker(
  forgedAppId: string,
  input: { ticker: string; note?: string },
): Promise<ForgedCapitalWatchEntry> {
  const file = await ensureForgedCapitalQueue(forgedAppId);
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) throw new Error("ticker required");
  const now = new Date().toISOString();
  const idx = file.watchlist.findIndex((w) => w.ticker === ticker);
  const entry: ForgedCapitalWatchEntry = {
    ticker,
    note: input.note?.trim() || `Local research snapshot for ${ticker} on forged capital desk.`,
    lastPrice: demoPrice(ticker),
    updatedAt: now,
  };
  if (idx >= 0) file.watchlist[idx] = entry;
  else file.watchlist.push(entry);
  await writeForgedCapitalQueue(forgedAppId, file);
  return entry;
}

export async function createForgedCapitalRule(
  forgedAppId: string,
  input: {
    name: string;
    asset: string;
    conditionType?: string;
    action?: ForgedCapitalAction;
    qty?: number;
  },
): Promise<ForgedCapitalRule> {
  const file = await ensureForgedCapitalQueue(forgedAppId);
  const now = new Date().toISOString();
  const asset = input.asset.trim().toUpperCase();
  const rule: ForgedCapitalRule = {
    id: nextRuleId(file.rules),
    name: input.name.trim() || `${asset} dip buy`,
    asset,
    conditionType: input.conditionType?.trim() || "price_drop_pct",
    action: input.action === "sell" ? "sell" : "buy",
    qty: typeof input.qty === "number" && input.qty > 0 ? input.qty : 1,
    state: "PAUSED",
    createdAt: now,
    updatedAt: now,
  };
  file.rules.push(rule);
  await writeForgedCapitalQueue(forgedAppId, file);
  return rule;
}

export async function armForgedCapitalRule(
  forgedAppId: string,
  ruleId: string,
): Promise<ForgedCapitalRule | null> {
  const file = await ensureForgedCapitalQueue(forgedAppId);
  const idx = file.rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  const state: ForgedCapitalRuleState = "ARMED";
  file.rules[idx] = { ...file.rules[idx]!, state, updatedAt: new Date().toISOString() };
  await writeForgedCapitalQueue(forgedAppId, file);
  return file.rules[idx]!;
}

export async function seedForgedCapitalDemoIfEmpty(forgedAppId: string): Promise<ForgedCapitalWatchEntry | null> {
  const file = await ensureForgedCapitalQueue(forgedAppId);
  if (file.watchlist.length > 0) return file.watchlist[0] ?? null;
  await researchForgedTicker(forgedAppId, {
    ticker: "SPY",
    note: "Demo watch — forged capital desk on CurXor bare metal. Paper path until broker bridge wired.",
  });
  await createForgedCapitalRule(forgedAppId, {
    name: "SPY dip buy",
    asset: "SPY",
    conditionType: "price_drop_pct",
    action: "buy",
    qty: 1,
  });
  const status = await fetchForgedCapitalStatus(forgedAppId);
  return status.watchlist[0] ?? null;
}
