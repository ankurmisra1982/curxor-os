import "server-only";

import { buildBridgeHealthReport } from "./content-bridge-health";
import { publishPostToBridge } from "./content-publish-executor";
import { runPostPreflight } from "./content-preflight";
import { ensureContentQueue, failPostPublish, getContentPost } from "./content-queue-store";
import type { ContentPost } from "./content-queue-types";
import { readAppFreState } from "./app-fre-state";
import type { SocialPlatformId } from "./social-channels";

export interface RecoveryCandidate {
  postId: string;
  platform: string;
  stage: ContentPost["stage"];
  error: string;
  fixHints: string[];
  canRetry: boolean;
}

export async function listRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  const file = await ensureContentQueue();
  const fre = await readAppFreState("my-content-creator");
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is SocialPlatformId => typeof x === "string")
    : [];
  const health = await buildBridgeHealthReport(channels);

  return file.posts
    .filter((p) => p.lastPublishError || (p.approvalNote && p.stage !== "PUBLISHED"))
    .slice(0, 16)
    .map((p) => {
      const platformHealth = health.platforms.find((h) => h.platform === p.platform);
      const error = p.lastPublishError ?? p.approvalNote ?? "Publish failed";
      return {
        postId: p.id,
        platform: p.platform,
        stage: p.stage,
        error,
        fixHints: platformHealth?.fixHints ?? [],
        canRetry: platformHealth?.health === "ready" || platformHealth?.health === "degraded",
      };
    });
}

export async function retryPostPublish(postId: string, actor = "operator"): Promise<{
  ok: boolean;
  error?: string;
  post?: ContentPost | null;
}> {
  const post = await getContentPost(postId);
  if (!post) return { ok: false, error: "Post not found" };

  const preflight = await runPostPreflight(postId);
  if (!preflight?.ready) {
    const first = preflight?.checks.find((c) => c.severity === "error");
    return { ok: false, error: first?.message ?? "Pre-flight failed" };
  }

  const fre = await readAppFreState("my-content-creator");
  const result = await publishPostToBridge(postId, { ...fre.config, retryActor: actor });
  if (!result.ok) {
    await failPostPublish(postId, result.error ?? "Retry failed");
    return { ok: false, error: result.error ?? "Retry failed" };
  }

  const updated = await getContentPost(postId);
  return { ok: true, post: updated };
}

export async function clearPostPublishError(postId: string): Promise<ContentPost | null> {
  const { savePostPublishMeta } = await import("./content-queue-store");
  return savePostPublishMeta(postId, { lastPublishError: null });
}
