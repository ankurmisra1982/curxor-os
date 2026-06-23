import "server-only";

import type { DigitalPublishResult } from "./mesh-publish";
import { publishDigitalIntent } from "./mesh-publish";
import { markPostPublished, markPostSubmitted, getContentPost } from "./content-queue-store";
import { markReplySubmitted } from "./content-replies-store";
import { buildDigitalIntentForPost, buildDigitalIntentForReply } from "./content-publish-intents";
import { recordBridgeFailure } from "./content-bridge-health-store";
import { getContentReply } from "./content-replies-store";
import { isPublishingPaused } from "./content-ops-controls";
import { isPlatformBridgeConfigured } from "./content-channels-status";
import type { SocialPlatformId } from "./social-channels";

/** Demo-mode publish when platform bridge is not configured — local only, not sent to eno2. */
async function simulateDemoPublish(postId: string): Promise<DigitalPublishResult & { postId: string }> {
  const simId = `SIM-${postId.slice(-6)}`;
  await markPostPublished(postId, "demo://local", simId);
  const post = await getContentPost(postId);
  if (post) {
    const { emitCreatorXpEvent } = await import("./creator-xp-events");
    void emitCreatorXpEvent("post_published", {
      postId,
      platform: post.platform,
      channel: post.channel,
    });
  }
  return {
    ok: true,
    id: simId,
    tool: "content.publish",
    postId,
  };
}

export async function publishPostToBridge(
  postId: string,
  config: Record<string, unknown>,
): Promise<DigitalPublishResult & { postId: string }> {
  if (await isPublishingPaused()) {
    return {
      ok: false,
      id: "",
      tool: "content.publish",
      error: "Publishing paused (crisis mode)",
      postId,
    };
  }
  const post = await getContentPost(postId);
  if (post && !(await isPlatformBridgeConfigured(post.platform as SocialPlatformId))) {
    return simulateDemoPublish(postId);
  }

  const digital = await buildDigitalIntentForPost(postId, config);
  if (!digital) {
    return {
      ok: false,
      id: "",
      tool: "content.publish",
      error: "Cannot build publish intent",
      postId,
    };
  }
  const result = await publishDigitalIntent(digital);
  if (result.ok) {
    await markPostSubmitted(postId, result.id);
    const published = await getContentPost(postId);
    if (published) {
      const { emitCreatorXpEvent } = await import("./creator-xp-events");
      void emitCreatorXpEvent("post_published", {
        postId,
        platform: published.platform,
        channel: published.channel,
      });
    }
  } else {
    const post = await getContentPost(postId);
    if (post) {
      await recordBridgeFailure({
        platform: post.platform,
        tool: digital.tool,
        error: result.error ?? "Bridge send failed",
        intentId: result.id,
      });
    }
  }
  return { ...result, postId };
}

export async function publishReplyToBridge(
  replyId: string,
): Promise<DigitalPublishResult & { replyId: string }> {
  const digital = await buildDigitalIntentForReply(replyId);
  if (!digital) {
    return {
      ok: false,
      id: "",
      tool: "content.publish_reply",
      error: "Cannot build reply intent",
      replyId,
    };
  }
  const result = await publishDigitalIntent(digital);
  if (result.ok) {
    await markReplySubmitted(replyId, result.id);
  } else {
    const reply = await getContentReply(replyId);
    if (reply) {
      await recordBridgeFailure({
        platform: reply.platform,
        tool: digital.tool,
        error: result.error ?? "Bridge send failed",
        intentId: result.id,
      });
    }
  }
  return { ...result, replyId };
}
