import "server-only";

import { envFlag, loadDigitalEnv } from "./digital-env";
import { readAppFreState } from "./app-fre-state";

function parseChannelList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

export async function listApprovalSlackChannelIds(): Promise<string[]> {
  const fromEnv = parseChannelList(process.env.CURXOR_APPROVAL_SLACK_CHANNEL_IDS);
  if (fromEnv.length > 0) return fromEnv;
  const fre = await readAppFreState("my-content-creator");
  const raw = fre.config.approvalSlackChannelIds;
  if (typeof raw === "string") {
    const ids = parseChannelList(raw);
    if (ids.length > 0) return ids;
  }
  const digital = await loadDigitalEnv();
  const fallback = digital.SLACK_DEFAULT_CHANNEL_ID?.trim();
  return fallback ? [fallback] : [];
}

export async function notifyApprovalViaSlackEnabled(): Promise<boolean> {
  if (envFlag("CURXOR_APPROVAL_SLACK_NOTIFY", false)) return true;
  const fre = await readAppFreState("my-content-creator");
  if (fre.config.notifyApprovalOnSlack === false) return false;
  const ids = await listApprovalSlackChannelIds();
  return ids.length > 0;
}
