import "server-only";

import { readAppFreState } from "./app-fre-state";
import { envFlag, loadDigitalEnv } from "./digital-env";

function parseChatIdList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function approvalTelegramChatIdsFromEnv(): string[] {
  const fromEnv = parseChatIdList(process.env.CURXOR_APPROVAL_TELEGRAM_CHAT_IDS);
  if (fromEnv.length > 0) return fromEnv;
  return [];
}

export async function approvalTelegramChatIdsFromFre(): Promise<string[]> {
  const fre = await readAppFreState("my-content-creator");
  const raw = fre.config.approvalTelegramChatIds;
  if (typeof raw !== "string") return [];
  return parseChatIdList(raw);
}

/** Operator chat IDs allowed to run /approve, /reject, /approvals. */
export async function listApprovalTelegramChatIds(): Promise<string[]> {
  const envIds = approvalTelegramChatIdsFromEnv();
  if (envIds.length > 0) return envIds;

  const freIds = await approvalTelegramChatIdsFromFre();
  if (freIds.length > 0) return freIds;

  const digital = await loadDigitalEnv();
  const fallback = digital.TELEGRAM_DEFAULT_CHAT_ID?.trim();
  if (fallback) return [fallback];
  return [];
}

export async function notifyApprovalViaTelegramEnabled(): Promise<boolean> {
  if (envFlag("CURXOR_APPROVAL_TELEGRAM_NOTIFY", false)) return true;
  if (process.env.CURXOR_APPROVAL_TELEGRAM_NOTIFY?.trim().toLowerCase() === "0") return false;
  if (process.env.CURXOR_APPROVAL_TELEGRAM_NOTIFY?.trim().toLowerCase() === "false") return false;

  const fre = await readAppFreState("my-content-creator");
  if (fre.config.notifyApprovalOnTelegram === false) return false;

  const chatIds = await listApprovalTelegramChatIds();
  return chatIds.length > 0;
}

export async function approvalTelegramConfigured(): Promise<boolean> {
  const chatIds = await listApprovalTelegramChatIds();
  return chatIds.length > 0;
}
