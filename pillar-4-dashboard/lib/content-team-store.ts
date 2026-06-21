import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type DraftCommentAction = "comment" | "request_changes" | "approve";

export interface DraftComment {
  id: string;
  postId: string;
  author: string;
  text: string;
  action: DraftCommentAction;
  createdAt: string;
}

interface TeamFile {
  version: 1;
  comments: DraftComment[];
  updatedAt: string;
}

function teamPath(): string {
  return process.env.CURXOR_CONTENT_TEAM_PATH ?? "/etc/curxor/content-team.json";
}

async function readFile_(): Promise<TeamFile> {
  try {
    const raw = await readFile(teamPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<TeamFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.comments)) throw new Error("invalid");
    return {
      version: 1,
      comments: parsed.comments,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, comments: [], updatedAt: new Date().toISOString() };
  }
}

async function writeFile_(data: TeamFile): Promise<void> {
  const filePath = teamPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listDraftComments(postId?: string): Promise<DraftComment[]> {
  const file = await readFile_();
  const rows = postId ? file.comments.filter((c) => c.postId === postId) : file.comments;
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 128);
}

export async function addDraftComment(input: {
  postId: string;
  author: string;
  text: string;
  action?: DraftCommentAction;
}): Promise<DraftComment> {
  const file = await readFile_();
  const row: DraftComment = {
    id: randomUUID(),
    postId: input.postId,
    author: input.author.trim() || "reviewer",
    text: input.text.trim(),
    action: input.action ?? "comment",
    createdAt: new Date().toISOString(),
  };
  file.comments.unshift(row);
  if (file.comments.length > 512) file.comments = file.comments.slice(0, 512);
  await writeFile_(file);
  return row;
}
