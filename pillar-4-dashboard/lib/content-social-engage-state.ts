import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface SocialEngagePollState {
  version: 1;
  lastPollAt: string | null;
  xMentionsSinceId: string | null;
  xUserId: string | null;
  linkedInCommentCursors: Record<string, string>;
  threadsReplyCursors: Record<string, string>;
  instagramCommentCursors: Record<string, string>;
  updatedAt: string;
}

function statePath(): string {
  return process.env.CURXOR_SOCIAL_ENGAGE_STATE_PATH ?? "/etc/curxor/social-engage-poll-state.json";
}

function intervalMinutes(): number {
  const raw = process.env.CURXOR_SOCIAL_ENGAGE_POLL_INTERVAL_MINUTES ?? "15";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

async function readState(): Promise<SocialEngagePollState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<SocialEngagePollState>;
    if (parsed.version !== 1) throw new Error("invalid");
    return {
      version: 1,
      lastPollAt: typeof parsed.lastPollAt === "string" ? parsed.lastPollAt : null,
      xMentionsSinceId: typeof parsed.xMentionsSinceId === "string" ? parsed.xMentionsSinceId : null,
      xUserId: typeof parsed.xUserId === "string" ? parsed.xUserId : null,
      linkedInCommentCursors:
        parsed.linkedInCommentCursors && typeof parsed.linkedInCommentCursors === "object"
          ? parsed.linkedInCommentCursors
          : {},
      threadsReplyCursors:
        parsed.threadsReplyCursors && typeof parsed.threadsReplyCursors === "object"
          ? parsed.threadsReplyCursors
          : {},
      instagramCommentCursors:
        parsed.instagramCommentCursors && typeof parsed.instagramCommentCursors === "object"
          ? parsed.instagramCommentCursors
          : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      version: 1,
      lastPollAt: null,
      xMentionsSinceId: null,
      xUserId: null,
      linkedInCommentCursors: {},
      threadsReplyCursors: {},
      instagramCommentCursors: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeState(state: SocialEngagePollState): Promise<void> {
  const filePath = statePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function getSocialEngagePollState(): Promise<SocialEngagePollState & { intervalMinutes: number }> {
  const state = await readState();
  return { ...state, intervalMinutes: intervalMinutes() };
}

export function socialEngagePollDue(lastPollAt: string | null, now = Date.now()): boolean {
  if (!lastPollAt) return true;
  return now - new Date(lastPollAt).getTime() >= intervalMinutes() * 60 * 1000;
}

export async function updateSocialEngageState(
  patch: Partial<
    Pick<
      SocialEngagePollState,
      "xMentionsSinceId" | "xUserId" | "linkedInCommentCursors" | "threadsReplyCursors" | "instagramCommentCursors" | "lastPollAt"
    >
  >,
): Promise<SocialEngagePollState & { intervalMinutes: number }> {
  const state = await readState();
  const next: SocialEngagePollState = {
    ...state,
    ...patch,
    lastPollAt: patch.lastPollAt ?? new Date().toISOString(),
  };
  await writeState(next);
  return { ...next, intervalMinutes: intervalMinutes() };
}
