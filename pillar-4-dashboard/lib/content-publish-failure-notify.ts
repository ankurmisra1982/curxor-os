import "server-only";

import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { readAppFreState } from "./app-fre-state";
import { publishDigitalIntent } from "./mesh-publish";
import type { ContentPost } from "./content-queue-types";

function preview(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

const recentFailureAlerts = new Map<string, number>();
const FAILURE_ALERT_COOLDOWN_MS = 5 * 60_000;

function shouldNotifyFailure(postId: string): boolean {
  const now = Date.now();
  const last = recentFailureAlerts.get(postId);
  if (last && now - last < FAILURE_ALERT_COOLDOWN_MS) return false;
  recentFailureAlerts.set(postId, now);
  return true;
}

export async function notifyPublishFailureViaTelegramEnabled(): Promise<boolean> {
  if (process.env.CURXOR_PUBLISH_FAILURE_NOTIFY?.trim().toLowerCase() === "0") return false;
  if (process.env.CURXOR_PUBLISH_FAILURE_NOTIFY?.trim().toLowerCase() === "false") return false;

  const fre = await readAppFreState("my-content-creator");
  if (fre.config.notifyPublishFailureOnTelegram === false) return false;

  const chatIds = await listApprovalTelegramChatIds();
  return chatIds.length > 0;
}

export async function notifyPublishFailureViaSlackEnabled(): Promise<boolean> {
  if (process.env.CURXOR_PUBLISH_FAILURE_NOTIFY?.trim().toLowerCase() === "0") return false;
  if (process.env.CURXOR_PUBLISH_FAILURE_NOTIFY?.trim().toLowerCase() === "false") return false;

  const fre = await readAppFreState("my-content-creator");
  if (fre.config.notifyPublishFailureOnSlack === false) return false;

  const channels = await listApprovalSlackChannelIds();
  return channels.length > 0;
}

export async function notifyPublishFailure(post: ContentPost, error?: string | null): Promise<void> {
  if (!shouldNotifyFailure(post.id)) return;

  const err = error?.trim() || post.lastPublishError?.trim() || "Publish failed";
  const text = [
    "🚨 Creator Claw — publish failed",
    `${post.id} · ${post.platform} · ${post.channel}`,
    preview(post.draftText, 160),
    "",
    `Error: ${preview(err, 240)}`,
    "",
    "Open dashboard → Publish Recovery to retry.",
  ].join("\n");

  if (await notifyPublishFailureViaTelegramEnabled()) {
    for (const chatId of await listApprovalTelegramChatIds()) {
      await sendTelegramApprovalMessage(chatId, text);
    }
  }

  if (await notifyPublishFailureViaSlackEnabled()) {
    for (const channel of await listApprovalSlackChannelIds()) {
      await publishDigitalIntent({
        tool: "channel.slack.send",
        payload: { channel, text: text.slice(0, 4000) },
      });
    }
  }
}
