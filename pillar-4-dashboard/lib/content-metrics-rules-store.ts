import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { MetricsRule, MetricsRuleFire } from "./content-metrics-rules-types";

interface MetricsRulesFile {
  version: 1;
  rules: MetricsRule[];
  fires: MetricsRuleFire[];
  updatedAt: string;
}

function rulesPath(): string {
  return process.env.CURXOR_METRICS_RULES_PATH ?? "/etc/curxor/content-metrics-rules.json";
}

function defaultRules(): MetricsRule[] {
  return [
    {
      id: "repurpose-high-views",
      label: "Auto-repurpose posts with 500+ views",
      enabled: true,
      condition: { type: "views_gte", minViews: 500 },
      action: { type: "repurpose", preset: "single_to_all" },
      cooldownHours: 168,
    },
    {
      id: "apply-winning-hook",
      label: "Apply winning hook to next draft",
      enabled: true,
      condition: { type: "hook_winner", minSamples: 2, marginPct: 5 },
      action: { type: "select_hook", target: "next_draft" },
      cooldownHours: 24,
    },
    {
      id: "schedule-ready-draft",
      label: "Schedule ready drafts when engagement is strong",
      enabled: false,
      condition: { type: "engagement_gte", minRate: 0.04 },
      action: { type: "schedule", offsetHours: 24 },
      cooldownHours: 72,
    },
  ];
}

async function readFile_(): Promise<MetricsRulesFile> {
  try {
    const raw = await readFile(rulesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<MetricsRulesFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.rules)) throw new Error("invalid");
    return {
      version: 1,
      rules: parsed.rules.length > 0 ? parsed.rules : defaultRules(),
      fires: Array.isArray(parsed.fires) ? parsed.fires : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      version: 1,
      rules: defaultRules(),
      fires: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeFile_(data: MetricsRulesFile): Promise<void> {
  const filePath = rulesPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listMetricsRules(): Promise<MetricsRule[]> {
  const file = await readFile_();
  return file.rules;
}

export async function listMetricsRuleFires(limit = 32): Promise<MetricsRuleFire[]> {
  const file = await readFile_();
  return file.fires.slice(0, limit);
}

export async function updateMetricsRule(
  ruleId: string,
  patch: Partial<Pick<MetricsRule, "enabled" | "label" | "condition" | "action" | "cooldownHours">>,
): Promise<MetricsRule | null> {
  const file = await readFile_();
  const idx = file.rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  file.rules[idx] = { ...file.rules[idx]!, ...patch };
  await writeFile_(file);
  return file.rules[idx]!;
}

export async function appendMetricsRuleFire(input: {
  ruleId: string;
  postId: string;
  action: string;
  detail: string;
  ok: boolean;
  error?: string | null;
}): Promise<MetricsRuleFire> {
  const file = await readFile_();
  const fire: MetricsRuleFire = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ruleId: input.ruleId,
    postId: input.postId,
    action: input.action,
    detail: input.detail,
    ok: input.ok,
    error: input.error ?? null,
  };
  file.fires.unshift(fire);
  if (file.fires.length > 256) file.fires = file.fires.slice(0, 256);
  await writeFile_(file);
  return fire;
}

export function ruleOnCooldown(
  fires: MetricsRuleFire[],
  ruleId: string,
  postId: string,
  cooldownHours: number,
  now = Date.now(),
): boolean {
  const ms = cooldownHours * 60 * 60 * 1000;
  return fires.some(
    (f) =>
      f.ruleId === ruleId &&
      f.postId === postId &&
      f.ok &&
      now - Date.parse(f.at) < ms,
  );
}
