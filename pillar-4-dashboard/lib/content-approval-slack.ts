import "server-only";

import { publishDigitalIntent } from "./mesh-publish";
import {
  approvePost,
  approveReply,
  rejectPost,
  rejectReply,
} from "./content-approval-service";
import { pauseAllPublishing, resumeAllPublishing } from "./content-ops-controls";
import {
  listApprovalSlackChannelIds,
  notifyApprovalViaSlackEnabled,
} from "./content-approval-slack-config";
import {
  formatApprovalQueueMessage,
  parseApprovalTelegramText,
  type ApprovalTelegramCommand,
} from "./content-approval-telegram";
import type { ContentPost } from "./content-queue-types";
import type { ContentReply } from "./content-replies-store";

function stripMention(text: string): string {
  return text.replace(/^<@[^>]+>\s*/, "").trim();
}

export function parseApprovalSlackText(text: string): ApprovalTelegramCommand | null {
  return parseApprovalTelegramText(stripMention(text.trim()));
}

async function isAuthorizedChannel(channelId: string): Promise<boolean> {
  const allowed = await listApprovalSlackChannelIds();
  return allowed.length > 0 && allowed.includes(channelId);
}

async function sendSlack(channel: string, text: string): Promise<void> {
  await publishDigitalIntent({
    tool: "channel.slack.send",
    payload: { channel, text: text.slice(0, 4000) },
  });
}

async function execute(cmd: ApprovalTelegramCommand, channelId: string): Promise<string> {
  const actor = `slack:${channelId}`;

  if (cmd.kind === "pause") {
    await pauseAllPublishing(cmd.reason ?? "Paused via Slack", actor);
    return "⛔ All publishing paused.";
  }
  if (cmd.kind === "resume") {
    await resumeAllPublishing(actor);
    return "✅ Publishing resumed.";
  }
  if (cmd.kind === "list") return await formatApprovalQueueMessage();

  if (cmd.kind === "approve") {
    if (cmd.target === "post") {
      try {
        const result = await approvePost(cmd.id, actor);
        return result.ok
          ? `✅ ${cmd.id} approved.`
          : `⚠️ Approved but bridge failed: ${result.error ?? "unknown"}`;
      } catch (err) {
        return `❌ ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    try {
      const result = await approveReply(cmd.id, actor);
      return result.ok ? "✅ Reply approved." : `⚠️ Bridge failed: ${result.error ?? "unknown"}`;
    } catch (err) {
      return `❌ ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (cmd.target === "post") {
    const post = await rejectPost(cmd.id, cmd.reason, actor);
    return post ? `❌ ${cmd.id} rejected.` : `❌ Not pending.`;
  }
  const reply = await rejectReply(cmd.id, cmd.reason, actor);
  return reply ? "❌ Reply rejected." : "❌ Not pending.";
}

export async function tryHandleApprovalSlackMessage(
  channelId: string,
  text: string,
): Promise<{ handled: boolean; text?: string }> {
  const cmd = parseApprovalSlackText(text);
  if (!cmd) return { handled: false };

  if (!(await isAuthorizedChannel(channelId))) {
    return { handled: true, text: "Unauthorized Slack channel for approval commands." };
  }

  return { handled: true, text: await execute(cmd, channelId) };
}

export async function notifyPostPendingApprovalSlack(post: ContentPost): Promise<void> {
  if (!(await notifyApprovalViaSlackEnabled())) return;
  const text = [
    "🔔 Creator Claw — post needs approval",
    `${post.id} · ${post.platform}`,
    post.draftText.slice(0, 200),
    `/approve ${post.id}`,
  ].join("\n");
  for (const channel of await listApprovalSlackChannelIds()) {
    await sendSlack(channel, text);
  }
}

export async function notifyReplyPendingApprovalSlack(reply: ContentReply): Promise<void> {
  if (!(await notifyApprovalViaSlackEnabled())) return;
  const text = [
    "🔔 Creator Claw — reply needs approval",
    `${reply.platform}`,
    reply.replyText.slice(0, 200),
    `/approve reply ${reply.id}`,
  ].join("\n");
  for (const channel of await listApprovalSlackChannelIds()) {
    await sendSlack(channel, text);
  }
}
