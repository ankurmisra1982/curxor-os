import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ExperimentKind = "hook" | "thumbnail" | "caption";
export type ExperimentStatus = "running" | "completed" | "cancelled";

export interface ContentExperiment {
  id: string;
  kind: ExperimentKind;
  postIds: string[];
  winnerPostId: string | null;
  viewThreshold: number;
  status: ExperimentStatus;
  createdAt: string;
  completedAt: string | null;
  note: string | null;
}

interface ExperimentsFile {
  version: 1;
  experiments: ContentExperiment[];
  updatedAt: string;
}

function storePath(): string {
  return process.env.CURXOR_CONTENT_EXPERIMENTS_PATH ?? "/etc/curxor/content-experiments.json";
}

async function readFile_(): Promise<ExperimentsFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ExperimentsFile>;
    return {
      version: 1,
      experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, experiments: [], updatedAt: new Date().toISOString() };
  }
}

async function writeFile_(data: ExperimentsFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listExperiments(): Promise<ContentExperiment[]> {
  return (await readFile_()).experiments;
}

export async function createExperiment(input: {
  kind: ExperimentKind;
  postIds: string[];
  viewThreshold?: number;
  note?: string;
}): Promise<ContentExperiment> {
  const file = await readFile_();
  const exp: ContentExperiment = {
    id: randomUUID(),
    kind: input.kind,
    postIds: input.postIds,
    winnerPostId: null,
    viewThreshold: input.viewThreshold ?? 500,
    status: "running",
    createdAt: new Date().toISOString(),
    completedAt: null,
    note: input.note ?? null,
  };
  file.experiments = [exp, ...file.experiments].slice(0, 48);
  await writeFile_(file);
  return exp;
}

export async function completeExperiment(
  id: string,
  winnerPostId: string,
): Promise<ContentExperiment | null> {
  const file = await readFile_();
  const idx = file.experiments.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  file.experiments[idx] = {
    ...file.experiments[idx]!,
    winnerPostId,
    status: "completed",
    completedAt: new Date().toISOString(),
  };
  await writeFile_(file);
  return file.experiments[idx]!;
}
