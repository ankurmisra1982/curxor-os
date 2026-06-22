import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface WorkNotionOAuthState {
  version: 1;
  linked: boolean;
  accessToken: string | null;
  workspaceName: string | null;
  updatedAt: string;
}

function notionOAuthPath(): string {
  return process.env.CURXOR_WORK_NOTION_OAUTH_PATH ?? "/etc/curxor/work-notion-oauth.json";
}

export function getNotionOAuthConfig(): { clientId: string | null; clientSecret: string | null } {
  return {
    clientId: process.env.NOTION_CLIENT_ID?.trim() || null,
    clientSecret: process.env.NOTION_CLIENT_SECRET?.trim() || null,
  };
}

export async function readWorkNotionOAuth(): Promise<WorkNotionOAuthState> {
  try {
    const raw = await readFile(notionOAuthPath(), "utf8");
    const parsed = JSON.parse(raw) as WorkNotionOAuthState;
    if (parsed.version !== 1) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, linked: false, accessToken: null, workspaceName: null, updatedAt: new Date().toISOString() };
  }
}

export async function writeWorkNotionToken(accessToken: string, workspaceName?: string): Promise<WorkNotionOAuthState> {
  const state: WorkNotionOAuthState = {
    version: 1,
    linked: true,
    accessToken,
    workspaceName: workspaceName ?? null,
    updatedAt: new Date().toISOString(),
  };
  const filePath = notionOAuthPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export async function unlinkWorkNotion(): Promise<WorkNotionOAuthState> {
  const state: WorkNotionOAuthState = {
    version: 1,
    linked: false,
    accessToken: null,
    workspaceName: null,
    updatedAt: new Date().toISOString(),
  };
  const filePath = notionOAuthPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export async function isWorkNotionConfigured(): Promise<boolean> {
  const state = await readWorkNotionOAuth();
  return state.linked && Boolean(state.accessToken);
}

export async function pushLeadNotesToNotion(input: {
  leadName: string;
  leadEmail: string;
  notes: string;
}): Promise<{ ok: boolean; demo: boolean; detail: string }> {
  const state = await readWorkNotionOAuth();
  if (!state.linked || !state.accessToken) {
    return { ok: true, demo: true, detail: `Demo log: would push notes for ${input.leadEmail}` };
  }

  const databaseId = process.env.NOTION_LEADS_DATABASE_ID?.trim();
  if (!databaseId) {
    return { ok: true, demo: true, detail: "Notion linked but NOTION_LEADS_DATABASE_ID unset — demo log only" };
  }

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: { title: [{ text: { content: input.leadName } }] },
          Email: { email: input.leadEmail },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: input.notes.slice(0, 2000) } }] },
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, demo: false, detail: text.slice(0, 240) };
    }
    return { ok: true, demo: false, detail: `Notion page created for ${input.leadEmail}` };
  } catch (err) {
    return { ok: false, demo: false, detail: err instanceof Error ? err.message : "Notion push failed" };
  }
}
