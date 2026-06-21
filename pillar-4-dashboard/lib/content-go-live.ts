import "server-only";

import { buildBridgeHealthReport } from "./content-bridge-health";
import { getApprovalTelegramStatus } from "./content-approval-telegram";
import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { readAppFreState } from "./app-fre-state";
import { ensureContentQueue } from "./content-queue-store";
import { readContentOpsState } from "./content-ops-controls";
import { listApprovalQueue } from "./content-approval-service";
import type { SocialPlatformId } from "./social-channels";
import { platformLabel } from "./social-channels";

export type GoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface GoLiveStep {
  id: string;
  label: string;
  status: GoLiveStepStatus;
  detail: string;
}

export interface GoLiveTodaySummary {
  nextScheduledAt: string | null;
  nextScheduledPostId: string | null;
  pendingApprovals: number;
  recoveryCount: number;
  publishingPaused: boolean;
}

export interface GoLiveReport {
  ready: boolean;
  progress: { complete: number; total: number };
  steps: GoLiveStep[];
  today: GoLiveTodaySummary;
  freChannels: string[];
}

const MEDIA_PLATFORMS = new Set<SocialPlatformId>(["instagram", "pinterest", "tiktok"]);

function freChannels(config: Record<string, unknown>): SocialPlatformId[] {
  if (!Array.isArray(config.channels)) return [];
  return config.channels.filter((x): x is SocialPlatformId => typeof x === "string");
}

export async function buildGoLiveReport(): Promise<GoLiveReport> {
  const fre = await readAppFreState("my-content-creator");
  const channels = freChannels(fre.config);

  const [queue, health, telegram, slackChannels, ops, approval] = await Promise.all([
    ensureContentQueue(),
    buildBridgeHealthReport(channels),
    getApprovalTelegramStatus(),
    listApprovalSlackChannelIds(),
    readContentOpsState(),
    listApprovalQueue(),
  ]);
  const steps: GoLiveStep[] = [];

  steps.push({
    id: "fre",
    label: "Channels configured",
    status: fre.initialized && channels.length > 0 ? "complete" : "pending",
    detail:
      channels.length > 0
        ? `${channels.map((c) => platformLabel(c)).join(", ")}`
        : "Open Creator Claw setup and pick at least one channel",
  });

  const enabledPlatforms = health.platforms.filter((p) => p.enabledInFre);
  const readyCount = enabledPlatforms.filter((p) => p.health === "ready").length;
  const blocked = enabledPlatforms.filter(
    (p) => p.health === "unconfigured" || p.health === "auth_expired" || p.health === "planned",
  );

  steps.push({
    id: "bridges",
    label: "Publish bridges ready",
    status:
      enabledPlatforms.length === 0
        ? "pending"
        : readyCount === enabledPlatforms.length
          ? "complete"
          : readyCount > 0
            ? "warning"
            : "pending",
    detail:
      enabledPlatforms.length === 0
        ? "No FRE channels to check"
        : readyCount === enabledPlatforms.length
          ? `${readyCount}/${enabledPlatforms.length} ready`
          : blocked.length > 0
            ? `Fix: ${blocked.map((b) => platformLabel(b.platform)).join(", ")} — see Bridge Health`
            : `${readyCount}/${enabledPlatforms.length} ready`,
  });

  const needsPublicBase = channels.some((c) => MEDIA_PLATFORMS.has(c));
  const publicBase = process.env.CURXOR_CONTENT_PUBLIC_BASE?.trim();
  steps.push({
    id: "public_base",
    label: "Public media URL (IG / Pinterest / TikTok)",
    status: !needsPublicBase ? "optional" : publicBase ? "complete" : "warning",
    detail: publicBase
      ? publicBase.replace(/\/$/, "")
      : needsPublicBase
        ? "Set CURXOR_CONTENT_PUBLIC_BASE in dashboard.env so bridges can fetch image_url"
        : "Not required for your current channels",
  });

  const notifyConfigured = telegram.configured || slackChannels.length > 0;
  steps.push({
    id: "operator_notify",
    label: "Operator notifications (Telegram / Slack)",
    status: notifyConfigured ? "complete" : "optional",
    detail: notifyConfigured
      ? [
          telegram.configured ? `Telegram · ${telegram.chatIdCount} chat(s)` : null,
          slackChannels.length > 0 ? `Slack · ${slackChannels.length} channel(s)` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Optional — wire CURXOR_APPROVAL_TELEGRAM_CHAT_IDS for /approve and failure alerts",
  });

  const hasScheduledOrPublished = queue.posts.some(
    (p) => p.stage === "SCHEDULED" || p.stage === "PUBLISHED" || p.stage === "SUBMITTED",
  );
  steps.push({
    id: "first_post",
    label: "First post scheduled or published",
    status: hasScheduledOrPublished ? "complete" : "pending",
    detail: hasScheduledOrPublished
      ? `${queue.posts.filter((p) => p.stage === "SCHEDULED").length} scheduled · ${queue.posts.filter((p) => p.stage === "PUBLISHED").length} published`
      : "Run Creation Wizard → draft → schedule your first post",
  });

  const requiredSteps = steps.filter((s) => s.status !== "optional");
  const complete = requiredSteps.filter((s) => s.status === "complete").length;
  const ready =
    steps.find((s) => s.id === "fre")?.status === "complete" &&
    (steps.find((s) => s.id === "bridges")?.status === "complete" ||
      steps.find((s) => s.id === "bridges")?.status === "warning") &&
    steps.find((s) => s.id === "first_post")?.status === "complete";

  const scheduled = queue.posts
    .filter((p) => p.stage === "SCHEDULED" && p.scheduledAt)
    .sort((a, b) => Date.parse(a.scheduledAt!) - Date.parse(b.scheduledAt!));
  const next = scheduled[0] ?? null;
  const recoveryCount = queue.posts.filter(
    (p) => p.lastPublishError || (p.approvalNote && p.stage !== "PUBLISHED"),
  ).length;

  return {
    ready,
    progress: { complete, total: requiredSteps.length },
    steps,
    freChannels: channels,
    today: {
      nextScheduledAt: next?.scheduledAt ?? null,
      nextScheduledPostId: next?.id ?? null,
      pendingApprovals: approval.posts.length + approval.replies.length,
      recoveryCount,
      publishingPaused: ops.publishingPaused === true,
    },
  };
}
