import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pullAllLiveMetrics, type MetricsPullResult } from "./content-metrics-ingest";

interface MetricsPullState {
  version: 1;
  lastPullAt: string | null;
  lastResultCount: number;
  lastOkCount: number;
  updatedAt: string;
}

function statePath(): string {
  return process.env.CURXOR_METRICS_PULL_STATE_PATH ?? "/etc/curxor/content-metrics-pull-state.json";
}

function intervalHours(): number {
  const raw = process.env.CURXOR_METRICS_PULL_INTERVAL_HOURS ?? "6";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

async function readState(): Promise<MetricsPullState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<MetricsPullState>;
    if (parsed.version !== 1) throw new Error("invalid");
    return {
      version: 1,
      lastPullAt: typeof parsed.lastPullAt === "string" ? parsed.lastPullAt : null,
      lastResultCount: typeof parsed.lastResultCount === "number" ? parsed.lastResultCount : 0,
      lastOkCount: typeof parsed.lastOkCount === "number" ? parsed.lastOkCount : 0,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      version: 1,
      lastPullAt: null,
      lastResultCount: 0,
      lastOkCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeState(state: MetricsPullState): Promise<void> {
  const filePath = statePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function getMetricsPullState(): Promise<MetricsPullState & { intervalHours: number }> {
  const state = await readState();
  return { ...state, intervalHours: intervalHours() };
}

export function metricsPullDue(lastPullAt: string | null, now = Date.now()): boolean {
  if (!lastPullAt) return true;
  const ms = intervalHours() * 60 * 60 * 1000;
  return now - new Date(lastPullAt).getTime() >= ms;
}

export async function runScheduledMetricsPull(force = false): Promise<{
  ran: boolean;
  results: MetricsPullResult[];
  state: MetricsPullState & { intervalHours: number };
  rules?: Awaited<ReturnType<typeof import("./content-metrics-rules-engine").runMetricsRules>>;
}> {
  const state = await readState();
  if (!force && !metricsPullDue(state.lastPullAt)) {
    return { ran: false, results: [], state: { ...state, intervalHours: intervalHours() } };
  }

  const results = await pullAllLiveMetrics();
  const okCount = results.filter((r) => r.ok).length;
  const next: MetricsPullState = {
    version: 1,
    lastPullAt: new Date().toISOString(),
    lastResultCount: results.length,
    lastOkCount: okCount,
    updatedAt: new Date().toISOString(),
  };
  await writeState(next);
  const { runMetricsRules } = await import("./content-metrics-rules-engine");
  const rules = await runMetricsRules();
  return { ran: true, results, state: { ...next, intervalHours: intervalHours() }, rules };
}
