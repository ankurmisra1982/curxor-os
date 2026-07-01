import "server-only";

import { readAppFreState } from "./app-fre-state";
import { buildBridgeHealthReport } from "./content-bridge-health";
import { runPostPreflight, type PreflightReport } from "./content-preflight";
import { publishPostToBridge } from "./content-publish-executor";
import {
  advancePostStage,
  createContentPost,
  ensureContentQueue,
  savePostDraft,
  scheduleContentPost,
} from "./content-queue-store";
import { resolveScheduleTimeForPost } from "./content-schedule-insights";
import type { SocialPlatformId } from "./social-channels";

const DEMO_CHANNEL = "Demo tour";
const DEMO_DRAFT =
  "Creator Claw demo tour — sovereign publish on bare metal. Draft → preflight → schedule locally. #curxor";

export interface ContentDemoTourResult {
  ok: boolean;
  postId?: string;
  steps: string[];
  preflight?: PreflightReport;
  scheduledAt?: string;
  simulatedPublish?: boolean;
  error?: string;
}

function freChannels(config: Record<string, unknown>): SocialPlatformId[] {
  if (!Array.isArray(config.channels)) return ["x"];
  return config.channels.filter((x): x is SocialPlatformId => typeof x === "string");
}

export async function runContentDemoTour(): Promise<ContentDemoTourResult> {
  const steps: string[] = [];
  const fre = await readAppFreState("my-content-creator");
  const channels = freChannels(fre.config);
  const platform: SocialPlatformId = channels.includes("x") ? "x" : channels[0] ?? "x";

  steps.push(
    fre.initialized
      ? `FRE ready · ${channels.map((c) => c).join(", ") || "x"}`
      : "FRE not initialized — complete Creator Claw setup",
  );
  if (!fre.initialized) {
    return { ok: false, steps, error: "Complete Creator Claw FRE first" };
  }

  const queue = await ensureContentQueue();
  let post =
    queue.posts.find((p) => p.channel.startsWith(DEMO_CHANNEL) && p.platform === platform) ?? null;

  if (!post) {
    post = await createContentPost({
      channel: `${DEMO_CHANNEL} · ${platform}`,
      platform,
      format: "thread",
      draftText: DEMO_DRAFT,
    });
    steps.push(`Created ${platform} post · ${post.id}`);
  } else {
    post = (await savePostDraft(post.id, DEMO_DRAFT)) ?? post;
    steps.push(`Reused demo post · ${post.id}`);
  }

  if (post.stage === "IDEATE") {
    post = (await advancePostStage(post.id)) ?? post;
  }
  if (post.stage === "SCRIPT") {
    post = (await advancePostStage(post.id)) ?? post;
  }
  steps.push(`Draft saved · stage ${post.stage}`);

  const preflight = await runPostPreflight(post.id);
  if (preflight) {
    steps.push(
      `Preflight · ${preflight.blockers} blocker(s) · ${preflight.warnings} warning(s) · ready=${preflight.ready}`,
    );
  } else {
    steps.push("Preflight skipped · post missing");
  }

  const when = await resolveScheduleTimeForPost(post.id);
  post = (await scheduleContentPost(post.id, when)) ?? post;
  steps.push(`Scheduled locally · ${when}`);

  const health = await buildBridgeHealthReport(channels);
  const platformHealth = health.platforms.find((p) => p.platform === post!.platform);
  const bridgeUnconfigured =
    platformHealth?.health === "unconfigured" || platformHealth?.health === "planned";

  let simulatedPublish = false;
  if (bridgeUnconfigured) {
    // Unconfigured bridge = local demo only — skip approval queue (not real egress).
    const result = await publishPostToBridge(post.id, fre.config);
    if (result.ok) {
      simulatedPublish = true;
      steps.push(`Simulated publish · demo://local · ${result.id}`);
    } else {
      steps.push(`Publish attempt · ${result.error ?? "bridge path"}`);
    }
  } else {
    steps.push("Bridge configured — schedule only (use Publish now for live send)");
  }

  const { emitCreatorXpEvent } = await import("./creator-xp-events");
  void emitCreatorXpEvent("demo_tour_complete", { postId: post.id, platform: post.platform });

  return {
    ok: true,
    postId: post.id,
    steps,
    preflight: preflight ?? undefined,
    scheduledAt: when,
    simulatedPublish,
  };
}
