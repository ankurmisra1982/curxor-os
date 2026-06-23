import "server-only";

import { readAppFreState } from "./app-fre-state";
import { getApprovalTelegramStatus } from "./content-approval-telegram";
import { requirePublishApproval, requireReplyApproval } from "./content-approval-config";
import { buildBridgeHealthReport, type BridgeHealthReport } from "./content-bridge-health";
import { listRecoveryCandidates, type RecoveryCandidate } from "./content-bridge-recovery";
import { buildCalendarWeek, type CalendarWeek } from "./content-calendar";
import { creationStudioStatusAsync } from "./content-creation-service";
import { buildCreatorGrowthProfile, type CreatorGrowthProfile } from "./creator-growth";
import { buildGoLiveReport, type GoLiveReport } from "./content-go-live";
import { listApprovalQueue } from "./content-approval-service";
import { fetchContentStatus } from "./content-queue-store";
import type { ContentQueueStatus } from "./content-queue-types";
import {
  buildScheduleInsightsBundle,
  type PlatformScheduleInsight,
  type ScheduleSlotSuggestion,
} from "./content-schedule-insights";
import type { ContentPost } from "./content-queue-types";
import type { ContentReply } from "./content-replies-store";
import { readUserSettings } from "./user-settings";

export interface ContentDashboardBootstrap {
  ok: true;
  status: ContentQueueStatus;
  goLive: GoLiveReport;
  growthProfile: CreatorGrowthProfile;
  bridgeHealth: BridgeHealthReport;
  calendar: CalendarWeek;
  scheduleInsights: PlatformScheduleInsight[];
  weekSlots: ScheduleSlotSuggestion[];
  scheduleTimeZone: string;
  scheduleSuggestion: ScheduleSlotSuggestion | null;
  approval: {
    posts: ContentPost[];
    replies: ContentReply[];
    requirePublishApproval: boolean;
    requireReplyApproval: boolean;
    approvalTelegram: Awaited<ReturnType<typeof getApprovalTelegramStatus>>;
  };
  recovery: { candidates: RecoveryCandidate[] };
  studio: Awaited<ReturnType<typeof creationStudioStatusAsync>>;
  freConfig: {
    useDataDrivenSchedule: boolean;
    autoSchedule: boolean;
  };
}

export async function buildContentDashboardBootstrap(options?: {
  week?: Date;
  selectedPostId?: string;
}): Promise<ContentDashboardBootstrap> {
  const week = options?.week ?? new Date();
  const fre = await readAppFreState("my-content-creator");
  const settings = await readUserSettings();
  const growthProfile = buildCreatorGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.creatorGrowthLevel ?? null,
  );
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is string => typeof x === "string")
    : [];
  const timeZone = typeof fre.config.timezone === "string" ? fre.config.timezone : undefined;

  const status = await fetchContentStatus();

  const [
    goLive,
    bridgeHealth,
    scheduleBundle,
    approvalQueue,
    recoveryCandidates,
    studio,
    publishApproval,
    replyApproval,
    approvalTelegram,
  ] = await Promise.all([
    buildGoLiveReport(),
    buildBridgeHealthReport(channels),
    buildScheduleInsightsBundle(week, options?.selectedPostId),
    listApprovalQueue(),
    listRecoveryCandidates(),
    creationStudioStatusAsync(),
    requirePublishApproval(),
    requireReplyApproval(),
    getApprovalTelegramStatus(),
  ]);

  const calendar = buildCalendarWeek(status.posts, week, timeZone);

  return {
    ok: true,
    status,
    goLive,
    growthProfile,
    bridgeHealth,
    calendar,
    scheduleInsights: scheduleBundle.insights,
    weekSlots: scheduleBundle.weekSlots,
    scheduleTimeZone: scheduleBundle.timeZone,
    scheduleSuggestion: scheduleBundle.suggestion,
    approval: {
      posts: approvalQueue.posts,
      replies: approvalQueue.replies,
      requirePublishApproval: publishApproval,
      requireReplyApproval: replyApproval,
      approvalTelegram,
    },
    recovery: { candidates: recoveryCandidates },
    studio,
    freConfig: {
      useDataDrivenSchedule: fre.config.useDataDrivenSchedule !== false,
      autoSchedule: fre.config.autoSchedule === true,
    },
  };
}
