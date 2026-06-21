import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type EngageTriageStatus = "open" | "priority" | "archived";

export interface EngageIntelligenceConfig {
  version: 1;
  vipAuthors: string[];
  blockPatterns: string[];
  priorityKeywords: string[];
  spamPatterns: string[];
  slaHours: number;
  updatedAt: string;
}

export interface EngageTriageMeta {
  suggestionId: string;
  status: EngageTriageStatus;
  priorityScore: number;
  reasons: string[];
  updatedAt: string;
}

interface EngageIntelligenceFile {
  version: 1;
  config: EngageIntelligenceConfig;
  triage: EngageTriageMeta[];
  updatedAt: string;
}

const DEFAULT_CONFIG: EngageIntelligenceConfig = {
  version: 1,
  vipAuthors: [],
  blockPatterns: ["buy now", "crypto giveaway", "dm me for"],
  priorityKeywords: ["pricing", "demo", "help", "bug", "question"],
  spamPatterns: ["follow back", "check my profile"],
  slaHours: 24,
  updatedAt: new Date(0).toISOString(),
};

function storePath(): string {
  return process.env.CURXOR_ENGAGE_INTELLIGENCE_PATH ?? "/etc/curxor/engage-intelligence.json";
}

async function readFile_(): Promise<EngageIntelligenceFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<EngageIntelligenceFile>;
    return {
      version: 1,
      config: { ...DEFAULT_CONFIG, ...(parsed.config as EngageIntelligenceConfig) },
      triage: Array.isArray(parsed.triage) ? parsed.triage : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      version: 1,
      config: { ...DEFAULT_CONFIG, updatedAt: new Date().toISOString() },
      triage: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeFile_(data: EngageIntelligenceFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function getEngageIntelligenceConfig(): Promise<EngageIntelligenceConfig> {
  return (await readFile_()).config;
}

export async function updateEngageIntelligenceConfig(
  patch: Partial<Omit<EngageIntelligenceConfig, "version">>,
): Promise<EngageIntelligenceConfig> {
  const file = await readFile_();
  file.config = { ...file.config, ...patch, version: 1, updatedAt: new Date().toISOString() };
  await writeFile_(file);
  return file.config;
}

export function scoreEngageSuggestion(input: {
  author: string;
  text: string;
  createdAt: string;
  config: EngageIntelligenceConfig;
}): { score: number; reasons: string[]; suggestedStatus: EngageTriageStatus } {
  const textLower = input.text.toLowerCase();
  const authorLower = input.author.toLowerCase();
  let score = 50;
  const reasons: string[] = [];

  for (const vip of input.config.vipAuthors) {
    if (vip && authorLower.includes(vip.toLowerCase())) {
      score += 40;
      reasons.push(`VIP author: ${vip}`);
      break;
    }
  }

  for (const kw of input.config.priorityKeywords) {
    if (kw && textLower.includes(kw.toLowerCase())) {
      score += 15;
      reasons.push(`Keyword: ${kw}`);
    }
  }

  for (const spam of input.config.spamPatterns) {
    if (spam && textLower.includes(spam.toLowerCase())) {
      score -= 50;
      reasons.push(`Spam pattern: ${spam}`);
    }
  }

  for (const block of input.config.blockPatterns) {
    if (block && textLower.includes(block.toLowerCase())) {
      score -= 80;
      reasons.push(`Block pattern: ${block}`);
    }
  }

  if (input.text.includes("?")) {
    score += 10;
    reasons.push("Contains question");
  }

  const ageHours = (Date.now() - new Date(input.createdAt).getTime()) / 3_600_000;
  if (ageHours > input.config.slaHours) {
    score += 20;
    reasons.push(`SLA breach (${Math.round(ageHours)}h)`);
  }

  score = Math.max(0, Math.min(100, score));

  let suggestedStatus: EngageTriageStatus = "open";
  if (score < 20) suggestedStatus = "archived";
  else if (score >= 70) suggestedStatus = "priority";

  return { score, reasons, suggestedStatus };
}

export async function getEngageTriageMeta(suggestionId: string): Promise<EngageTriageMeta | null> {
  const file = await readFile_();
  return file.triage.find((t) => t.suggestionId === suggestionId) ?? null;
}

export async function setEngageTriageStatus(
  suggestionId: string,
  status: EngageTriageStatus,
  score?: number,
  reasons?: string[],
): Promise<EngageTriageMeta> {
  const file = await readFile_();
  const existing = file.triage.find((t) => t.suggestionId === suggestionId);
  const row: EngageTriageMeta = {
    suggestionId,
    status,
    priorityScore: score ?? existing?.priorityScore ?? 50,
    reasons: reasons ?? existing?.reasons ?? [],
    updatedAt: new Date().toISOString(),
  };
  file.triage = [row, ...file.triage.filter((t) => t.suggestionId !== suggestionId)].slice(0, 200);
  await writeFile_(file);
  return row;
}

export async function listEngageTriageMeta(): Promise<EngageTriageMeta[]> {
  return (await readFile_()).triage;
}
