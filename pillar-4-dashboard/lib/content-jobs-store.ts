import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ContentJobType = "render_video" | "generate_ai_image" | "render_advanced";
export type ContentJobStatus = "queued" | "running" | "done" | "failed";

export interface ContentJob {
  id: string;
  postId: string;
  type: ContentJobType;
  status: ContentJobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentJobsFile {
  version: 1;
  jobs: ContentJob[];
  updatedAt: string;
}

function jobsPath(): string {
  return process.env.CURXOR_CONTENT_JOBS_PATH ?? "/etc/curxor/content-jobs.json";
}

async function readJobsFile(): Promise<ContentJobsFile> {
  try {
    const raw = await readFile(jobsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ContentJobsFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.jobs)) throw new Error("invalid");
    return {
      version: 1,
      jobs: parsed.jobs,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, jobs: [], updatedAt: new Date().toISOString() };
  }
}

async function writeJobsFile(data: ContentJobsFile): Promise<void> {
  const filePath = jobsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function enqueueContentJob(
  postId: string,
  type: ContentJobType,
  payload: Record<string, unknown> = {},
): Promise<ContentJob> {
  const file = await readJobsFile();
  const now = new Date().toISOString();
  const job: ContentJob = {
    id: randomUUID(),
    postId,
    type,
    status: "queued",
    payload,
    result: null,
    error: null,
    attempts: 0,
    maxAttempts: 3,
    nextRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
  file.jobs.unshift(job);
  if (file.jobs.length > 64) file.jobs = file.jobs.slice(0, 64);
  await writeJobsFile(file);
  return job;
}

export async function listContentJobs(postId?: string): Promise<ContentJob[]> {
  const file = await readJobsFile();
  const jobs = postId ? file.jobs.filter((j) => j.postId === postId) : file.jobs;
  return jobs.slice(0, 32);
}

export async function getContentJob(jobId: string): Promise<ContentJob | null> {
  const file = await readJobsFile();
  return file.jobs.find((j) => j.id === jobId) ?? null;
}

export async function updateContentJob(
  jobId: string,
  patch: Partial<Pick<ContentJob, "status" | "result" | "error" | "attempts" | "nextRunAt">>,
): Promise<ContentJob | null> {
  const file = await readJobsFile();
  const idx = file.jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return null;
  file.jobs[idx] = { ...file.jobs[idx]!, ...patch, updatedAt: new Date().toISOString() };
  await writeJobsFile(file);
  return file.jobs[idx]!;
}

export async function nextQueuedJob(): Promise<ContentJob | null> {
  const file = await readJobsFile();
  const now = Date.now();
  return (
    file.jobs.find((j) => {
      if (j.status !== "queued") return false;
      if (!j.nextRunAt) return true;
      return new Date(j.nextRunAt).getTime() <= now;
    }) ?? null
  );
}

export async function requeueJobWithBackoff(jobId: string, error: string): Promise<ContentJob | null> {
  const file = await readJobsFile();
  const idx = file.jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return null;

  const job = file.jobs[idx]!;
  const attempts = job.attempts + 1;
  if (attempts >= job.maxAttempts) {
    file.jobs[idx] = {
      ...job,
      status: "failed",
      attempts,
      error,
      updatedAt: new Date().toISOString(),
    };
  } else {
    const delaySec = Math.min(300, 15 * 2 ** (attempts - 1));
    const nextRunAt = new Date(Date.now() + delaySec * 1000).toISOString();
    file.jobs[idx] = {
      ...job,
      status: "queued",
      attempts,
      error,
      nextRunAt,
      updatedAt: new Date().toISOString(),
    };
  }
  await writeJobsFile(file);
  return file.jobs[idx]!;
}
