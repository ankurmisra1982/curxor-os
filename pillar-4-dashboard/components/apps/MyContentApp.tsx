"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { DigitalReceiptPanel } from "@/components/digital/DigitalReceiptPanel";
import { ContentAnalyticsPanel, type ContentRecommendationRow, type HookPerfRow, type PostMetricsRow } from "@/components/apps/content/ContentAnalyticsPanel";
import { ContentMetricsRulesPanel, type MetricsRuleFireRow, type MetricsRuleRow } from "@/components/apps/content/ContentMetricsRulesPanel";
import { EngageInboxPanel, type EngageSuggestionRow } from "@/components/apps/content/EngageInboxPanel";
import { ContentCreationWizard } from "@/components/apps/content/ContentCreationWizard";
import { ContentPostInspector } from "@/components/apps/content/ContentPostInspector";
import { ContentNotifications, useContentToasts } from "@/components/apps/content/ContentNotifications";
import { ContentCalendar } from "@/components/apps/content/ContentCalendar";
import {
  ContentBestTimePanel,
  type PlatformScheduleInsightRow,
  type ScheduleSlotRow,
} from "@/components/apps/content/ContentBestTimePanel";
import { ContentJobsPanel, type ContentJobRow } from "@/components/apps/content/ContentJobsPanel";
import { PublishPreviewPanel } from "@/components/apps/content/PublishPreviewPanel";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import type { ContentPlatform, ContentPost, ContentQueueStatus } from "@/lib/content-queue-types";
import { postEta } from "@/lib/content-queue-types";
import type { CalendarWeek } from "@/lib/content-calendar";
import type { PublishPreview } from "@/lib/content-publish-preview";
import { extractPublishedUrl } from "@/lib/digital-protocol";
import { bridgeTierBadgeClass, charLimitForPlatform, getSocialChannel, platformLabel } from "@/lib/social-channels";
import { platformFormatSpec } from "@/lib/content-platform-format";
import { SOCIAL_BRIDGE_ROADMAP, currentBuildStep } from "@/lib/social-bridge-roadmap";
import { ContentCampaignPanel } from "@/components/apps/content/ContentCampaignPanel";
import {
  ContentBridgeHealthPanel,
  type BridgeHealthEntryRow,
  type BridgeHealthSummary,
} from "@/components/apps/content/ContentBridgeHealthPanel";
import { ContentApprovalPanel, type ContentAuditEntryRow } from "@/components/apps/content/ContentApprovalPanel";
import { ContentOpsPanel, type ContentOpsStateRow } from "@/components/apps/content/ContentOpsPanel";
import { ContentPreflightPanel, type PreflightReportRow } from "@/components/apps/content/ContentPreflightPanel";
import { ContentExperimentsPanel, type ExperimentRow } from "@/components/apps/content/ContentExperimentsPanel";
import { ContentLibraryPanel, type LibraryAssetRow } from "@/components/apps/content/ContentLibraryPanel";
import { ContentTemplateStudioPanel, type ContentTemplateRow } from "@/components/apps/content/ContentTemplateStudioPanel";
import {
  ContentAttributionPanel,
  ContentFunnelPanel,
  type ClickSummaryRow,
  type FunnelReport,
} from "@/components/apps/content/ContentAttributionPanel";
import { ContentInstagramGridPanel, type InstagramGridPlanRow } from "@/components/apps/content/ContentInstagramGridPanel";
import { ContentTeamPanel, type DraftCommentRow } from "@/components/apps/content/ContentTeamPanel";
import {
  ContentBrandStudioPanel,
  ContentDraftToolsPanel,
  ContentMetricsImportRow,
  type BrandKitFormState,
} from "@/components/apps/content/ContentBrandStudioPanel";
import { ContentRecoveryPanel, type RecoveryCandidateRow } from "@/components/apps/content/ContentRecoveryPanel";
import { ContentPlanPanel, type ContentPlanReportRow } from "@/components/apps/content/ContentPlanPanel";
import { ContentSignalPanel, type SignalFeedItemRow } from "@/components/apps/content/ContentSignalPanel";
import { ContentGoLivePanel, type GoLiveReportRow } from "@/components/apps/content/ContentGoLivePanel";
import { ContentMediaAttachPanel } from "@/components/apps/content/ContentMediaAttachPanel";
import type { ContentReply } from "@/lib/content-replies-store";
import { getOotbApp } from "@/lib/ootb-apps";
import { useDigitalStream } from "@/hooks/useDigitalStream";
import { useVisionStream } from "@/hooks/useVisionStream";

interface ContentStatusResponse extends ContentQueueStatus {}

function stageClass(stage: ContentPost["stage"]): string {
  if (stage === "PUBLISHED") return "text-cursor-glow";
  if (stage === "SUBMITTED") return "text-cursor-glow animate-pulse";
  if (stage === "PENDING_APPROVAL") return "text-amber-400";
  if (stage === "SCHEDULED") return "text-stark";
  return "text-muted";
}

export function MyContentApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { frame, connected } = useVisionStream();
  const digital = useDigitalStream();
  const tone = typeof config.contentTone === "string" ? config.contentTone : "technical";
  const autoSchedule = config.autoSchedule === true;

  const [status, setStatus] = useState<ContentStatusResponse | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [draftEdit, setDraftEdit] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [studioBusy, setStudioBusy] = useState<string | null>(null);
  const [studioCaps, setStudioCaps] = useState<{ tts: string; imageGen: boolean }>({ tts: "…", imageGen: false });
  const [lastSignal, setLastSignal] = useState("Queue synced");
  const [calendar, setCalendar] = useState<CalendarWeek | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [jobs, setJobs] = useState<ContentJobRow[]>([]);
  const [syncedReceiptIds, setSyncedReceiptIds] = useState<Set<string>>(() => new Set());
  const [metrics, setMetrics] = useState<PostMetricsRow[]>([]);
  const [hookPerf, setHookPerf] = useState<HookPerfRow[]>([]);
  const [engageSuggestions, setEngageSuggestions] = useState<EngageSuggestionRow[]>([]);
  const [pinterestBoard, setPinterestBoard] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<ContentReply[]>([]);
  const [metricsPullState, setMetricsPullState] = useState<string>("");
  const [socialEngageState, setSocialEngageState] = useState<string>("");
  const [recommendations, setRecommendations] = useState<ContentRecommendationRow[]>([]);
  const [thumbPerf, setThumbPerf] = useState<HookPerfRow[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [approvalPosts, setApprovalPosts] = useState<ContentPost[]>([]);
  const [approvalReplies, setApprovalReplies] = useState<ContentReply[]>([]);
  const [auditEntries, setAuditEntries] = useState<ContentAuditEntryRow[]>([]);
  const [requirePublishApproval, setRequirePublishApproval] = useState(false);
  const [requireReplyApproval, setRequireReplyApproval] = useState(false);
  const [approvalTelegram, setApprovalTelegram] = useState<{
    configured: boolean;
    notifyEnabled: boolean;
    chatIdCount: number;
  } | null>(null);
  const [metricsRules, setMetricsRules] = useState<MetricsRuleRow[]>([]);
  const [metricsRuleFires, setMetricsRuleFires] = useState<MetricsRuleFireRow[]>([]);
  const [metricsRulesEnabled, setMetricsRulesEnabled] = useState(false);
  const [rulesBusy, setRulesBusy] = useState(false);
  const [scheduleInsights, setScheduleInsights] = useState<PlatformScheduleInsightRow[]>([]);
  const [weekSlots, setWeekSlots] = useState<ScheduleSlotRow[]>([]);
  const [scheduleTimeZone, setScheduleTimeZone] = useState("local");
  const [scheduleSuggestion, setScheduleSuggestion] = useState<ScheduleSlotRow | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [bridgeHealth, setBridgeHealth] = useState<{
    digitalEnvPath: string;
    summary: BridgeHealthSummary;
    platforms: BridgeHealthEntryRow[];
  } | null>(null);
  const [bridgeHealthBusy, setBridgeHealthBusy] = useState(false);
  const [opsState, setOpsState] = useState<ContentOpsStateRow | null>(null);
  const [preflightReport, setPreflightReport] = useState<PreflightReportRow | null>(null);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAssetRow[]>([]);
  const [templates, setTemplates] = useState<ContentTemplateRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelReport | null>(null);
  const [clickSummary, setClickSummary] = useState<ClickSummaryRow[]>([]);
  const [igGrid, setIgGrid] = useState<InstagramGridPlanRow | null>(null);
  const [teamComments, setTeamComments] = useState<DraftCommentRow[]>([]);
  const [firstComment, setFirstComment] = useState("");
  const [firstCommentSchedule, setFirstCommentSchedule] = useState("");
  const [threadCount, setThreadCount] = useState(0);
  const [recoveryCandidates, setRecoveryCandidates] = useState<RecoveryCandidateRow[]>([]);
  const [contentPlan, setContentPlan] = useState<ContentPlanReportRow | null>(null);
  const [signalItems, setSignalItems] = useState<SignalFeedItemRow[]>([]);
  const [goLive, setGoLive] = useState<GoLiveReportRow | null>(null);
  const [growthBusy, setGrowthBusy] = useState(false);
  const [brandKitForm, setBrandKitForm] = useState<BrandKitFormState>({
    styleGuide: "",
    voiceTone: "",
    emojiPolicy: "allowed",
    pov: "brand",
    utmSource: "curxor",
    trackLinks: true,
    requiredDisclaimer: "",
    suggestedHashtags: "",
    bannedHashtags: "",
  });
  const { level: experienceLevel, levelLabel } = useExperienceLevel();
  const { toasts, pushToast, dismissToast } = useContentToasts();

  const loadCalendar = useCallback(async (anchor = weekAnchor) => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calendar", week: anchor.toISOString() }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { calendar?: CalendarWeek };
      if (data.calendar) setCalendar(data.calendar);
    } catch {
      /* retry on poll */
    }
  }, [weekAnchor]);

  const loadPreview = useCallback(async (postId: string) => {
    setPreviewLoading(true);
    try {
      const [previewRes, preflightRes] = await Promise.all([
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", postId }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preflight_check", postId }),
        }),
      ]);
      if (previewRes.ok) {
        const data = (await previewRes.json()) as { preview?: PublishPreview };
        if (data.preview) setPreview(data.preview);
      }
      if (preflightRes.ok) {
        const data = (await preflightRes.json()) as { report?: PreflightReportRow };
        if (data.report) setPreflightReport(data.report);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async (postId?: string) => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "jobs_status", postId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs?: ContentJobRow[] };
      if (data.jobs) setJobs(data.jobs);
    } catch {
      /* optional */
    }
  }, []);

  const loadAnalytics = useCallback(async (postId?: string) => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics", postId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        metrics?: PostMetricsRow[];
        hookPerformance?: HookPerfRow[];
        thumbPerformance?: HookPerfRow[];
      };
      if (data.metrics) setMetrics(data.metrics);
      if (data.hookPerformance) setHookPerf(data.hookPerformance);
      if (data.thumbPerformance) setThumbPerf(data.thumbPerformance);
    } catch {
      /* optional */
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics_recommendations" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { recommendations?: ContentRecommendationRow[] };
      if (data.recommendations) setRecommendations(data.recommendations);
    } catch {
      /* optional */
    }
  }, []);

  const loadReplies = useCallback(async (postId?: string) => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replies_list", postId: postId || undefined }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { replies?: ContentReply[] };
      if (data.replies) setReplies(data.replies);
    } catch {
      /* optional */
    }
  }, []);

  const loadSocialEngageState = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "social_engage_state" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        state?: { lastPollAt?: string | null; intervalMinutes?: number };
        webhookUrl?: string;
      };
      const interval = data.state?.intervalMinutes ?? 15;
      const last = data.state?.lastPollAt
        ? new Date(data.state.lastPollAt).toLocaleString()
        : "never";
      setSocialEngageState(
        `Social poll every ${interval}m · last ${last} · webhook ${data.webhookUrl ?? "/api/engage/social/webhook"}`,
      );
    } catch {
      /* optional */
    }
  }, []);

  const loadMetricsPullState = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "metrics_pull_state" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { state?: { lastPullAt?: string | null; intervalHours?: number } };
      if (data.state?.lastPullAt) {
        setMetricsPullState(
          `Last pull ${new Date(data.state.lastPullAt).toLocaleString()} · every ${data.state.intervalHours ?? 6}h`,
        );
      } else {
        setMetricsPullState(`Scheduled every ${data.state?.intervalHours ?? 6}h via heartbeat`);
      }
    } catch {
      /* optional */
    }
  }, []);

  const loadEngage = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "engage_intelligence" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { suggestions?: EngageSuggestionRow[] };
      if (data.suggestions) setEngageSuggestions(data.suggestions);
    } catch {
      /* optional */
    }
  }, []);

  const loadOps = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ops_status" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ops?: ContentOpsStateRow };
      if (data.ops) setOpsState(data.ops);
    } catch {
      /* optional */
    }
  }, []);

  const loadExperiments = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "experiments_list" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { experiments?: ExperimentRow[] };
      if (data.experiments) setExperiments(data.experiments);
    } catch {
      /* optional */
    }
  }, []);

  const loadGoLive = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "go_live" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { goLive?: GoLiveReportRow };
      if (data.goLive) setGoLive(data.goLive);
    } catch {
      /* optional */
    }
  }, []);

  const loadGrowthData = useCallback(async () => {
    try {
      const [libRes, tplRes, funnelRes, gridRes, teamRes, recoveryRes, planRes, signalRes] = await Promise.all([
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "library_list" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "templates_list" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "analytics_funnel" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ig_grid" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "team_comments" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recovery_list" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "content_plan" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "signal_feed" }),
        }),
      ]);
      if (libRes.ok) {
        const d = (await libRes.json()) as { assets?: LibraryAssetRow[] };
        if (d.assets) setLibraryAssets(d.assets);
      }
      if (tplRes.ok) {
        const d = (await tplRes.json()) as { templates?: ContentTemplateRow[] };
        if (d.templates) setTemplates(d.templates);
      }
      if (funnelRes.ok) {
        const d = (await funnelRes.json()) as { funnel?: FunnelReport; clicks?: ClickSummaryRow[] };
        if (d.funnel) setFunnel(d.funnel);
        if (d.clicks) setClickSummary(d.clicks);
      }
      if (gridRes.ok) {
        const d = (await gridRes.json()) as { grid?: InstagramGridPlanRow };
        if (d.grid) setIgGrid(d.grid);
      }
      if (teamRes.ok) {
        const d = (await teamRes.json()) as { comments?: DraftCommentRow[] };
        if (d.comments) setTeamComments(d.comments);
      }
      if (recoveryRes.ok) {
        const d = (await recoveryRes.json()) as { candidates?: RecoveryCandidateRow[] };
        if (d.candidates) setRecoveryCandidates(d.candidates);
      }
      if (planRes.ok) {
        const d = (await planRes.json()) as { plan?: ContentPlanReportRow };
        if (d.plan) setContentPlan(d.plan);
      }
      if (signalRes.ok) {
        const d = (await signalRes.json()) as { items?: SignalFeedItemRow[] };
        if (d.items) setSignalItems(d.items);
      }
    } catch {
      /* optional */
    }
  }, []);

  const loadMetricsRules = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "metrics_rules_list" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        rules?: MetricsRuleRow[];
        fires?: MetricsRuleFireRow[];
        rulesEnabled?: boolean;
      };
      if (data.rules) setMetricsRules(data.rules);
      if (data.fires) setMetricsRuleFires(data.fires);
      setMetricsRulesEnabled(data.rulesEnabled === true);
    } catch {
      /* optional */
    }
  }, []);

  const loadScheduleInsights = useCallback(async (anchor = weekAnchor, postId?: string) => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule_insights", week: anchor.toISOString() }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        insights?: PlatformScheduleInsightRow[];
        weekSlots?: ScheduleSlotRow[];
        timeZone?: string;
      };
      if (data.insights) setScheduleInsights(data.insights);
      if (data.weekSlots) setWeekSlots(data.weekSlots);
      if (data.timeZone) setScheduleTimeZone(data.timeZone);

      if (postId) {
        const sugRes = await fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "schedule_suggest", postId }),
        });
        if (sugRes.ok) {
          const sugData = (await sugRes.json()) as { suggestion?: ScheduleSlotRow };
          setScheduleSuggestion(sugData.suggestion ?? null);
        }
      } else {
        setScheduleSuggestion(null);
      }
    } catch {
      /* optional */
    }
  }, [weekAnchor]);

  const loadBridgeHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bridge_health" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        digitalEnvPath?: string;
        summary?: BridgeHealthSummary;
        platforms?: BridgeHealthEntryRow[];
      };
      if (data.summary && data.platforms) {
        setBridgeHealth({
          digitalEnvPath: data.digitalEnvPath ?? "/etc/curxor/digital.env",
          summary: data.summary,
          platforms: data.platforms,
        });
      }
    } catch {
      /* optional */
    }
  }, []);

  const loadApproval = useCallback(async () => {
    try {
      const [queueRes, auditRes] = await Promise.all([
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approval_list" }),
        }),
        fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "audit_list", limit: 24 }),
        }),
      ]);
      if (queueRes.ok) {
        const data = (await queueRes.json()) as {
          posts?: ContentPost[];
          replies?: ContentReply[];
          requirePublishApproval?: boolean;
          requireReplyApproval?: boolean;
          approvalTelegram?: {
            configured: boolean;
            notifyEnabled: boolean;
            chatIdCount: number;
          };
        };
        if (data.posts) setApprovalPosts(data.posts);
        if (data.replies) setApprovalReplies(data.replies);
        setRequirePublishApproval(data.requirePublishApproval === true);
        setRequireReplyApproval(data.requireReplyApproval === true);
        if (data.approvalTelegram) setApprovalTelegram(data.approvalTelegram);
      }
      if (auditRes.ok) {
        const data = (await auditRes.json()) as { entries?: ContentAuditEntryRow[] };
        if (data.entries) setAuditEntries(data.entries);
      }
    } catch {
      /* optional */
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ContentStatusResponse;
      setStatus(data);
      if (data.posts[0] && !data.posts.some((p) => p.id === selected)) {
        setSelected(data.posts[0].id);
      }
      void loadCalendar(weekAnchor);
      void loadEngage();
      void loadReplies(selected || undefined);
      void loadMetricsPullState();
      void loadSocialEngageState();
      void loadRecommendations();
      void loadApproval();
      void loadMetricsRules();
      void loadScheduleInsights(weekAnchor, selected || undefined);
      void loadBridgeHealth();
      void loadOps();
      void loadExperiments();
    } catch {
      /* retry on poll */
    }
  }, [selected, weekAnchor, loadCalendar, loadEngage, loadReplies, loadMetricsPullState, loadSocialEngageState, loadRecommendations, loadApproval, loadMetricsRules, loadScheduleInsights, loadBridgeHealth, loadOps, loadExperiments]);

  /** Lightweight queue refresh — avoids ~12 API calls on the 30s poll. */
  const refreshQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ContentStatusResponse;
      setStatus(data);
    } catch {
      /* retry on poll */
    }
  }, []);

  const applyRecommendation = useCallback(
    async (rec: ContentRecommendationRow) => {
      const postId = typeof rec.payload.postId === "string" ? rec.payload.postId : selected;
      try {
        if (rec.action === "select_hook" && postId && rec.payload.hookId) {
          await fetch("/api/content/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "select_hook", postId, hookId: rec.payload.hookId }),
          });
        } else if (rec.action === "repurpose_content" && postId) {
          await fetch("/api/content/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "repurpose", postId, preset: rec.payload.preset ?? "single_to_all", tone }),
          });
        } else if (rec.action === "schedule" && postId) {
          await fetch("/api/content/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "schedule", postId, useBestTime: true }),
          });
        } else if (rec.action === "generate_thumb_variants" && postId) {
          await fetch("/api/content/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "generate_thumb_variants", postId }),
          });
        }
        pushToast(`Applied: ${rec.title}`, "success");
        await loadStatus();
        await loadRecommendations();
      } catch {
        pushToast(`Failed to apply: ${rec.title}`, "error");
      }
    },
    [selected, tone, loadStatus, loadRecommendations, pushToast],
  );

  useEffect(() => {
    void loadScheduleInsights(weekAnchor, selected || undefined);
  }, [selected, weekAnchor, loadScheduleInsights]);

  const scheduleAtBestTime = useCallback(
    async (postId: string) => {
      setScheduleBusy(true);
      try {
        const res = await fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "schedule", postId, useBestTime: true }),
        });
        if (!res.ok) {
          pushToast("Schedule failed", "error");
          return;
        }
        const data = (await res.json()) as { scheduledAt?: string };
        pushToast(
          data.scheduledAt
            ? `Scheduled ${postId} · ${new Date(data.scheduledAt).toLocaleString()}`
            : `Scheduled ${postId}`,
          "success",
        );
        void loadStatus();
        void loadCalendar(weekAnchor);
      } finally {
        setScheduleBusy(false);
      }
    },
    [loadStatus, loadCalendar, weekAnchor, pushToast],
  );

  useEffect(() => {
    void loadStatus();
    void loadGoLive();
    void loadGrowthData();
    void fetch("/api/content/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "studio_status" }),
    })
      .then((r) => r.json())
      .then((d: { studio?: { tts?: string; imageGen?: boolean } }) => {
        if (d.studio) setStudioCaps({ tts: d.studio.tts ?? "none", imageGen: d.studio.imageGen ?? false });
      })
      .catch(() => undefined);
    const timer = setInterval(() => void refreshQueue(), 30_000);
    return () => clearInterval(timer);
  }, [loadStatus, loadGoLive, loadGrowthData, refreshQueue]);

  useEffect(() => {
    const raw = config.brandKit;
    const kit =
      typeof raw === "object" && raw !== null
        ? (raw as Record<string, unknown>)
        : typeof raw === "string"
          ? (() => {
              try {
                return JSON.parse(raw) as Record<string, unknown>;
              } catch {
                return {};
              }
            })()
          : {};
    setBrandKitForm({
      styleGuide: typeof kit.styleGuide === "string" ? kit.styleGuide : "",
      voiceTone: typeof kit.voiceTone === "string" ? kit.voiceTone : (typeof config.contentTone === "string" ? config.contentTone : ""),
      emojiPolicy:
        kit.emojiPolicy === "none" || kit.emojiPolicy === "minimal" || kit.emojiPolicy === "allowed"
          ? kit.emojiPolicy
          : "allowed",
      pov: kit.pov === "first" || kit.pov === "third" || kit.pov === "brand" ? kit.pov : "brand",
      utmSource: typeof kit.utmSource === "string" ? kit.utmSource : "curxor",
      trackLinks: kit.trackLinks !== false,
      requiredDisclaimer: typeof kit.requiredDisclaimer === "string" ? kit.requiredDisclaimer : "",
      suggestedHashtags: Array.isArray(kit.suggestedHashtags) ? kit.suggestedHashtags.join(" ") : "",
      bannedHashtags: Array.isArray(kit.bannedHashtags) ? kit.bannedHashtags.join(" ") : "",
    });
  }, [config.brandKit, config.contentTone]);

  const selectedPost = status?.posts.find((p) => p.id === selected) ?? null;

  useEffect(() => {
    if (selectedPost?.pinterestBoardId) setPinterestBoard(selectedPost.pinterestBoardId);
    else setPinterestBoard("");
    setFirstComment(selectedPost?.firstCommentText ?? "");
    if (selectedPost?.firstCommentScheduledAt) {
      const d = new Date(selectedPost.firstCommentScheduledAt);
      setFirstCommentSchedule(Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16));
    } else {
      setFirstCommentSchedule("");
    }
    setThreadCount(selectedPost?.threadParts?.length ?? 0);
  }, [selectedPost?.id, selectedPost?.pinterestBoardId, selectedPost?.firstCommentText, selectedPost?.firstCommentScheduledAt, selectedPost?.threadParts]);

  useEffect(() => {
    if (selectedPost) setDraftEdit(selectedPost.draftText);
  }, [selectedPost?.id, selectedPost?.draftText]);

  useEffect(() => {
    if (!selectedPost) return;
    updateWorkspaceContext({
      selectedPostId: selectedPost.id,
      selectedPostTitle: selectedPost.channel,
      primaryChannel: selectedPost.platform,
      contentTone: tone,
      selectedPostImageUrl: selectedPost.imageUrl ?? "",
      selectedPostVideoUrl: selectedPost.videoUrl ?? "",
      selectedPostVideoPath: selectedPost.videoPath ?? "",
      visionFrameBase64: frame?.previewBase64 ?? "",
      autoSchedule,
      channels: status?.channels ?? [],
    });
  }, [selectedPost, tone, frame?.previewBase64, autoSchedule, status?.channels, updateWorkspaceContext]);

  useEffect(() => {
    if (selected) {
      void loadPreview(selected);
      void loadJobs(selected);
      void loadAnalytics(selected);
      void loadReplies(selected);
    }
  }, [selected, loadPreview, loadJobs, loadAnalytics, loadReplies]);

  useEffect(() => {
    const publishReceipts = digital.receipts.filter(
      (r) =>
        (r.tool.startsWith("content.publish") && r.tool !== "content.publish_reply") ||
        r.tool === "channel.discord.send",
    );
    for (const receipt of publishReceipts) {
      if (syncedReceiptIds.has(receipt.id)) continue;
      const postId = selected || status?.posts.find((p) => p.stage === "SUBMITTED")?.id;
      if (!postId) continue;
      setSyncedReceiptIds((prev) => new Set(prev).add(receipt.id));
      const action = receipt.ok ? "link_published" : "fail_publish";
      void fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postId, publishedUrl: receipt.ok ? extractPublishedUrl(receipt) : undefined, receipt }),
      }).then(() => {
        void loadStatus();
        void loadGoLive();
        void loadBridgeHealth();
        void loadAnalytics(postId);
        pushToast(receipt.ok ? "Post published" : "Publish failed", receipt.ok ? "success" : "error");
      });
    }

    const replyReceipts = digital.receipts.filter((r) => r.tool === "content.publish_reply");
    for (const receipt of replyReceipts) {
      if (syncedReceiptIds.has(receipt.id)) continue;
      setSyncedReceiptIds((prev) => new Set(prev).add(receipt.id));
      void fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_reply", receipt }),
      }).then(() => {
        void loadReplies(selected || undefined);
        void loadBridgeHealth();
        pushToast(receipt.ok ? "Reply published" : "Reply failed", receipt.ok ? "success" : "error");
      });
    }
  }, [digital.receipts, syncedReceiptIds, selected, status?.posts, loadStatus, loadGoLive, loadAnalytics, loadReplies]);

  const reschedulePost = useCallback(
    async (postId: string, scheduledAt: string) => {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", postId, scheduledAt }),
      });
      setLastSignal(`Rescheduled ${postId}`);
      await loadStatus();
    },
    [loadStatus],
  );

  const selectHook = useCallback(
    async (hookId: string) => {
      if (!selected) return;
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select_hook", postId: selected, hookId }),
      });
      await loadStatus();
      await loadPreview(selected);
    },
    [selected, loadStatus, loadPreview],
  );

  const generateHooks = useCallback(async () => {
    if (!selected) return;
    setStudioBusy("generate_hooks");
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_hooks", postId: selected }),
      });
      await loadStatus();
    } finally {
      setStudioBusy(null);
    }
  }, [selected, loadStatus]);

  const repurpose = useCallback(
    async (preset: string) => {
      if (!selected) return;
      setStudioBusy("repurpose");
      try {
        await fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "repurpose", postId: selected, preset, tone }),
        });
        await loadStatus();
      } finally {
        setStudioBusy(null);
      }
    },
    [selected, tone, loadStatus],
  );

  const captureThumbnail = useCallback(
    async (imageBase64: string) => {
      if (!selected) return;
      setStudioBusy("thumbnail");
      try {
        await fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "capture_thumbnail", postId: selected, imageBase64 }),
        });
        setLastSignal(`Thumbnail captured · ${selected}`);
        await loadStatus();
      } finally {
        setStudioBusy(null);
      }
    },
    [selected, loadStatus],
  );

  const runStudioAction = useCallback(
    async (action: "render_video" | "adapt_platforms" | "fan_out" | "generate_ai_image") => {
      if (!selected) return;
      setStudioBusy(action);
      try {
        const body: Record<string, unknown> = { action, postId: selected, tone };
        if (action === "fan_out") body.autoSchedule = autoSchedule;
        const res = await fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = (await res.json()) as { scheduledIds?: string[]; queued?: boolean; jobId?: string };
          const sched =
            action === "fan_out" && data.scheduledIds?.length
              ? ` · scheduled ${data.scheduledIds.length}`
              : "";
          const queued = data.queued ? ` · job ${data.jobId}` : "";
          setLastSignal(`${action}${sched}${queued} · ${selected}`);
          await loadStatus();
          void loadJobs(selected);
        }
      } finally {
        setStudioBusy(null);
      }
    },
    [selected, tone, autoSchedule, loadStatus, loadJobs],
  );

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    const stamp = new Date().toLocaleTimeString();
    if (lastSkillId === "draft_post") {
      setLastSignal(`Draft saved · ${selected} · ${stamp}`);
      void loadStatus();
      return;
    }
    if (lastSkillId === "publish_post") {
      setLastSignal(
        config.requirePublishApproval === true
          ? `Publish submitted for approval · ${selected} · ${stamp}`
          : `Publish queued · ${selected} · ${stamp}`,
      );
      void loadStatus();
      return;
    }
    if (lastSkillId === "schedule_post") {
      setLastSignal(`Scheduled · ${selected} · ${stamp}`);
      void loadStatus();
      return;
    }
    if (
      lastSkillId === "thumbnail_vision" ||
      lastSkillId === "generate_ai_image" ||
      lastSkillId === "render_video" ||
      lastSkillId === "adapt_for_platforms" ||
      lastSkillId === "fan_out_channels" ||
      lastSkillId === "batch_publish" ||
      lastSkillId === "generate_hooks" ||
      lastSkillId === "repurpose_content"
    ) {
      setLastSignal(`${lastSkillId} · ${selected} · ${stamp}`);
      void loadStatus();
    }
  }, [skillTick, lastSkillId, selected, loadStatus, config.requirePublishApproval]);

  useEffect(() => {
    if (skillTick === 0 || lastSkillId !== "thumbnail_vision" || !selected || !frame?.previewBase64) return;
    void captureThumbnail(frame.previewBase64);
  }, [skillTick, lastSkillId, selected, frame?.previewBase64, captureThumbnail]);

  const saveDraft = useCallback(async () => {
    if (!selected) return;
    setSavingDraft(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_draft", postId: selected, draftText: draftEdit }),
      });
      setLastSignal(`Draft updated · ${selected}`);
      await loadStatus();
    } finally {
      setSavingDraft(false);
    }
  }, [selected, draftEdit, loadStatus]);

  const addPost = useCallback(async () => {
    setCreating(true);
    try {
      const platform = (status?.channels[0] as ContentPlatform | undefined) ?? "x";
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          platform,
          channel: `New ${platform.toUpperCase()} post`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ContentStatusResponse & { post?: ContentPost };
        if (data.post?.id) setSelected(data.post.id);
        setStatus(data);
        setLastSignal(`Created ${data.post?.id ?? "post"}`);
      }
    } finally {
      setCreating(false);
    }
  }, [status?.channels, loadStatus]);

  const queueSource = status?.source === "live" ? "X bridge live" : status?.bridgeConfigured ? "demo · bridge ready" : "demo";
  const vault = status?.platformVault;
  const charLimit = selectedPost ? charLimitForPlatform(selectedPost.platform) : 280;
  const overLimit = charLimit !== null && draftEdit.length > charLimit;
  const buildStep = currentBuildStep();
  const selectedChannel = selectedPost ? getSocialChannel(selectedPost.platform) : null;
  const publishLive = selectedChannel?.bridgeTier === "live";
  const platformSpec = selectedPost ? platformFormatSpec(selectedPost.platform) : null;
  const hasThumb = Boolean(selectedPost?.imageUrl || selectedPost?.imagePath);
  const hasVideo = Boolean(selectedPost?.videoUrl || selectedPost?.videoPath);
  const variantEntries = selectedPost?.platformVariants
    ? Object.entries(selectedPost.platformVariants)
    : [];
  const anchorPostId =
    selectedPost?.stage === "PUBLISHED"
      ? selected
      : status?.posts.find((p) => p.stage === "PUBLISHED")?.id ?? "";
  const selectedMetrics = metrics.find((m) => m.postId === selected) ?? null;

  const bridgeIssues =
    (bridgeHealth?.summary.degraded ?? 0) + (bridgeHealth?.summary.authExpired ?? 0);

  return (
    <div className="space-y-4 p-4">
      <ContentNotifications toasts={toasts} onDismiss={dismissToast} />
      <ContentCreationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        channels={status?.channels ?? ["x"]}
        tone={tone}
        selectedPostId={selected}
        onComplete={() => {
          void loadStatus();
          pushToast("Wizard complete — check queue", "success");
        }}
      />
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-content-creator").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Creator Claw Studio</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          {tone} tone · {levelLabel} mode · vision {connected ? "ON" : "OFF"} · {lastSignal}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <ExperienceLevelBadge />
          <button type="button" onClick={() => setWizardOpen(true)} className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow">
            Creation wizard
          </button>
          <button
            type="button"
            onClick={() => setInspectorOpen((v) => !v)}
            disabled={!selectedPost}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-50"
          >
            {inspectorOpen ? "Hide inspector" : "Post inspector"}
          </button>
        </div>
      </header>

      {inspectorOpen && selectedPost ? (
        <ContentPostInspector
          post={selectedPost}
          metrics={selectedMetrics}
          replies={replies}
          jobs={jobs}
          onClose={() => setInspectorOpen(false)}
        />
      ) : null}

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="go-live"
        minLevel="beginner"
        title="Go Live"
        subtitle="Checklist · today · first post"
      >
        <ContentGoLivePanel
          report={goLive}
          onRefresh={() => {
            void loadGoLive();
            void loadStatus();
          }}
          onOpenWizard={() => setWizardOpen(true)}
        />
      </ExperienceAppSection>

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric label="Queue" value={String(status?.posts.length ?? "—")} unit={queueSource} highlight />
        <AppMetric
          label="Platforms"
          value={String(vault?.platforms.length ?? "—")}
          unit={`${vault?.liveCount ?? 0} live · ${vault?.enabledCount ?? 0} in FRE`}
        />
        <AppMetric label="Selected" value={selected || "—"} unit={selectedPost?.platform ?? "tap row"} />
        <AppMetric
          label="Bridge"
          value={digital.connected ? "LIVE" : bridgeIssues > 0 ? "WARN" : status?.bridgeConfigured ? "READY" : "OFF"}
          unit={
            bridgeHealth
              ? `${bridgeHealth.summary.ready}/${bridgeHealth.summary.live} ready`
              : status?.bridgeConfigured
                ? `${vault?.liveCount ?? 0} live bridges`
                : "digital.env"
          }
        />
      </div>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="bridge"
        minLevel="standard"
        title="Bridge Health"
        subtitle="OAuth status · last publish · rate limits · fix hints for digital.env"
      >
        <ContentBridgeHealthPanel
          report={bridgeHealth}
          busy={bridgeHealthBusy}
          onRefresh={() => {
            setBridgeHealthBusy(true);
            void loadBridgeHealth().finally(() => setBridgeHealthBusy(false));
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="bridge-roadmap"
        minLevel="expert"
        title="Bridge Roadmap"
        subtitle={`Step ${buildStep.step} in progress · ${buildStep.title} — ${buildStep.summary}`}
      >
        <ol className="space-y-1 font-mono text-[10px]">
          {SOCIAL_BRIDGE_ROADMAP.map((step) => (
            <li
              key={step.step}
              className={`flex gap-2 border border-line/50 px-2 py-1 ${
                step.status === "in_progress" ? "border-cursor-glow/50 bg-surface" : ""
              }`}
            >
              <span className={step.status === "done" ? "text-cursor-glow" : "text-muted"}>
                {step.status === "done" ? "✓" : step.status === "in_progress" ? "→" : "○"}
              </span>
              <span className="text-stark">{step.title}</span>
              <span className="text-muted">— {step.platformIds.join(", ")}</span>
            </li>
          ))}
        </ol>
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="recovery"
        minLevel="standard"
        title="Publish Recovery"
        subtitle="Failed publishes · fix hints · one-click retry"
      >
        <ContentRecoveryPanel
          candidates={recoveryCandidates}
          onRefresh={() => void loadGrowthData()}
          onRetry={(postId) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "recovery_retry", postId }),
            }).then(async (r) => {
              const d = (await r.json()) as { ok?: boolean; error?: string };
              pushToast(d.ok ? "Retry sent to bridge" : d.error ?? "Retry failed", d.ok ? "success" : "error");
              void loadStatus();
              void loadGrowthData();
            });
          }}
          onClear={(postId) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "recovery_clear", postId }),
            }).then(() => void loadGrowthData());
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="content-plan"
        minLevel="beginner"
        title="Content Planner"
        subtitle="Gap detection · fill week from playbooks & evergreen"
      >
        <ContentPlanPanel
          plan={contentPlan}
          onRefresh={() => void loadGrowthData()}
          onFillWeek={() => {
            setGrowthBusy(true);
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "content_plan", subAction: "fill" }),
            })
              .then(async (r) => {
                const d = (await r.json()) as { created?: unknown[] };
                pushToast(`Created ${d.created?.length ?? 0} scheduled post(s)`, "success");
                void loadStatus();
                void loadGrowthData();
              })
              .finally(() => setGrowthBusy(false));
          }}
          busy={growthBusy}
        />
      </ExperienceAppSection>

      {selectedPost && (
        <ExperienceAppSection
          appId="my-content-creator"
          sectionId="creation-studio"
          minLevel="beginner"
          title="Creation Studio"
          subtitle={`AI pipeline · TTS: ${studioCaps.tts} · image gen: ${studioCaps.imageGen ? "ollama" : "off"} · auto-schedule: ${autoSchedule ? "ON" : "OFF"}`}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="border border-line bg-panel p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Vision / Thumbnail</p>
              <div className="mt-2 flex gap-3">
                {frame?.previewBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${frame.previewBase64}`}
                    alt="Live vision"
                    className="h-20 w-20 border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center border border-line font-mono text-[9px] text-muted">
                    NO FRAME
                  </div>
                )}
                <div className="flex-1 font-mono text-[10px] text-muted">
                  <p>Vision: {connected ? "live" : "offline"}</p>
                  <p className="mt-1">Saved: {hasThumb ? "yes" : "none"}</p>
                  {selectedPost.imageUrl && <p className="mt-1 truncate text-cursor-glow">{selectedPost.imageUrl}</p>}
                </div>
              </div>
              <button
                type="button"
                disabled={!frame?.previewBase64 || studioBusy !== null}
                onClick={() => frame?.previewBase64 && void captureThumbnail(frame.previewBase64)}
                className="mt-3 mr-2 border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-50"
              >
                {studioBusy === "thumbnail" ? "Saving…" : "Capture Thumbnail"}
              </button>
              <button
                type="button"
                disabled={!studioCaps.imageGen || studioBusy !== null}
                onClick={() => void runStudioAction("generate_ai_image")}
                className="mt-3 border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-stark hover:border-cursor-glow disabled:opacity-50"
              >
                {studioBusy === "generate_ai_image" ? "Generating…" : "Generate AI Image"}
              </button>
            </div>

            <div className="border border-line bg-panel p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Video Render + TTS</p>
              <p className="mt-2 font-mono text-[10px] text-muted">
                {platformSpec?.aspectRatio ?? "9:16"} · ffmpeg · voiceover via {studioCaps.tts}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                Output: {hasVideo ? selectedPost.videoPath ?? selectedPost.videoUrl : "not rendered"}
              </p>
              <button
                type="button"
                disabled={!hasThumb || studioBusy !== null}
                onClick={() => void runStudioAction("render_video")}
                className="mt-3 border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-stark hover:border-cursor-glow disabled:opacity-50"
              >
                {studioBusy === "render_video" ? "Rendering…" : "Render Video + Voiceover"}
              </button>
            </div>

            <ContentMediaAttachPanel
              postId={selectedPost.id}
              hasImage={hasThumb}
              hasVideo={hasVideo}
              imagePath={selectedPost.imagePath}
              videoPath={selectedPost.videoPath}
              onAttached={() => {
                pushToast("Media attached", "success");
                void loadStatus();
              }}
              onError={(msg) => pushToast(msg, "error")}
            />

            <div className="border border-line bg-panel p-3 md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Multi-Channel Adaptation</p>
              <p className="mt-2 font-mono text-[10px] text-muted">
                FRE channels: {(status?.channels ?? []).map((c) => platformLabel(c as ContentPlatform)).join(", ")}
                {autoSchedule ? " · Fan Out auto-schedules all posts (+30m stagger)" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={studioBusy !== null}
                  onClick={() => void runStudioAction("adapt_platforms")}
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  {studioBusy === "adapt_platforms" ? "Adapting…" : "Adapt for All Channels"}
                </button>
                <button
                  type="button"
                  disabled={studioBusy !== null}
                  onClick={() => void runStudioAction("fan_out")}
                  className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-50"
                >
                  {studioBusy === "fan_out" ? "Fanning out…" : autoSchedule ? "Fan Out + Schedule" : "Fan Out → Queue Posts"}
                </button>
              </div>
              {variantEntries.length > 0 && (
                <div className="mt-3 space-y-2">
                  {variantEntries.map(([plat, variant]) => (
                    <div key={plat} className="border border-line/50 p-2 font-mono text-[10px]">
                      <span className="text-cursor-glow">{plat}</span>
                      <span className="text-muted"> · {variant.format} · {variant.draftText.length} chars</span>
                      <p className="mt-1 line-clamp-2 text-muted">{variant.draftText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-line bg-panel p-3 md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Hook variants (A/B)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={studioBusy !== null}
                  onClick={() => void generateHooks()}
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  {studioBusy === "generate_hooks" ? "Generating…" : "Generate Hooks"}
                </button>
                {(selectedPost.hookVariants ?? []).map((hook) => (
                  <button
                    key={hook.id}
                    type="button"
                    onClick={() => void selectHook(hook.id)}
                    className={`border px-2 py-1 font-mono text-[10px] ${
                      selectedPost.selectedHookId === hook.id
                        ? "border-cursor-glow text-cursor-glow"
                        : "border-line text-muted hover:text-stark"
                    }`}
                  >
                    {hook.label}: {hook.text.slice(0, 48)}…
                  </button>
                ))}
              </div>
              {(selectedPost.thumbnailVariants?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPost.thumbnailVariants!.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        void fetch("/api/content/status", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "select_thumb", postId: selected, thumbId: t.id }),
                        }).then(() => loadStatus())
                      }
                      className={`border px-2 py-1 text-[10px] ${
                        selectedPost.selectedThumbnailId === t.id
                          ? "border-cursor-glow text-cursor-glow"
                          : "border-line text-muted"
                      }`}
                    >
                      Thumb {t.label}
                    </button>
                  ))}
                </div>
              )}
              {(selectedPost.carouselSlides?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="font-mono text-[10px] uppercase text-muted">Carousel slides</p>
                  {selectedPost.carouselSlides!.map((slide, i) => (
                    <div key={slide.id} className="flex items-center justify-between border border-line/40 px-2 py-1">
                      <span className="text-muted">
                        {i + 1}. {slide.caption.slice(0, 60)}
                        {slide.imagePath ? " · ✓ image" : ""}
                      </span>
                      {!slide.imagePath && studioCaps.imageGen ? (
                        <button
                          type="button"
                          onClick={() =>
                            void fetch("/api/content/status", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "generate_carousel_image", postId: selected, slideId: slide.id }),
                            }).then(() => loadStatus())
                          }
                          className="border border-line px-2 py-0.5 text-[9px] uppercase hover:border-cursor-glow"
                        >
                          AI image
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                <span className="text-muted">Caption style:</span>
                {(["burned", "drawtext", "srt-only", "none"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() =>
                      void fetch("/api/content/status", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "save_caption_style", postId: selected, captionStyle: style }),
                      }).then(() => loadStatus())
                    }
                    className={`border px-2 py-0.5 uppercase ${
                      (selectedPost.captionStyle ?? "burned") === style
                        ? "border-cursor-glow text-cursor-glow"
                        : "border-line text-muted"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={studioBusy !== null}
                  onClick={() => void repurpose("long_to_social")}
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  Repurpose → Social
                </button>
                <button
                  type="button"
                  disabled={studioBusy !== null}
                  onClick={() => void repurpose("video_to_thread")}
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  Video → Thread
                </button>
                <button
                  type="button"
                  disabled={studioBusy !== null}
                  onClick={() =>
                    void fetch("/api/content/status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "build_carousel", postId: selected }),
                    }).then(() => loadStatus())
                  }
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  Build carousel
                </button>
                <button
                  type="button"
                  disabled={studioBusy !== null || !studioCaps.imageGen}
                  onClick={() =>
                    void fetch("/api/content/status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "generate_thumb_variants", postId: selected }),
                    }).then(() => loadStatus())
                  }
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  Thumb A/B
                </button>
                <button
                  type="button"
                  disabled={!hasThumb || studioBusy !== null}
                  onClick={() =>
                    void fetch("/api/content/status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "crop_image", postId: selected }),
                    }).then(() => loadStatus())
                  }
                  className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
                >
                  Crop for platform
                </button>
              </div>
            </div>

            <div className="border border-line bg-panel p-3 md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Render jobs</p>
              <ContentJobsPanel jobs={jobs} />
            </div>
          </div>
        </ExperienceAppSection>
      )}

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="calendar"
        minLevel="beginner"
        title="Content Calendar"
        subtitle="Week view · learned best times from your metrics"
      >
        <ContentBestTimePanel
          insights={scheduleInsights}
          weekSlots={weekSlots}
          timeZone={scheduleTimeZone}
          selectedPostId={selected}
          selectedPlatform={selectedPost?.platform}
          suggestion={scheduleSuggestion}
          busy={scheduleBusy}
          onScheduleBest={(id) => void scheduleAtBestTime(id)}
          onRefresh={() => void loadScheduleInsights(weekAnchor, selected || undefined)}
        />
        <div className="mt-4">
          <ContentCalendar
            calendar={calendar}
            selectedId={selected}
            insights={scheduleInsights}
            onSelect={setSelected}
            onReschedule={(id, when) => void reschedulePost(id, when)}
            onPrevWeek={() => {
              const d = new Date(weekAnchor);
              d.setDate(d.getDate() - 7);
              setWeekAnchor(d);
              void loadCalendar(d);
              void loadScheduleInsights(d, selected || undefined);
            }}
            onNextWeek={() => {
              const d = new Date(weekAnchor);
              d.setDate(d.getDate() + 7);
              setWeekAnchor(d);
              void loadCalendar(d);
              void loadScheduleInsights(d, selected || undefined);
            }}
          />
        </div>
      </ExperienceAppSection>

      {selectedPost && (
        <ExperienceAppSection
          appId="my-content-creator"
          sectionId="preflight"
          minLevel="beginner"
          title="Pre-publish Preview"
          subtitle="Validation + platform payload before Publish skill"
        >
          <ContentPreflightPanel report={preflightReport} loading={previewLoading} />
          <PublishPreviewPanel preview={preview} loading={previewLoading} />
        </ExperienceAppSection>
      )}

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="queue"
        minLevel="beginner"
        title="Content Queue"
        subtitle="Persisted on appliance · Draft Post saves to queue · Publish sends text via digital_out"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={creating}
            onClick={() => void addPost()}
            className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-50"
          >
            {creating ? "Creating…" : "+ New post"}
          </button>
          <span className="font-mono text-[10px] text-muted">
            Channels: {(status?.channels ?? []).join(", ") || "x, youtube"}
          </span>
        </div>
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
              <th className="py-2 text-left">ID</th>
              <th className="py-2 text-left">Channel</th>
              <th className="py-2 text-left">Stage</th>
              <th className="py-2 text-right">Next</th>
            </tr>
          </thead>
          <tbody>
            {(status?.posts ?? []).map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelected(row.id)}
                className={`cursor-pointer border-b border-line/50 ${selected === row.id ? "bg-surface" : ""}`}
              >
                <td className="py-2 text-cursor-glow">{row.id}</td>
                <td className="py-2">
                  <div>{row.channel}</div>
                  <div className="text-[10px] text-muted">{row.format} · {row.platform}</div>
                </td>
                <td className={`py-2 ${stageClass(row.stage)}`}>{row.stage}</td>
                <td className="py-2 text-right">{postEta(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ExperienceAppSection>

      {selectedPost && (
        <ExperienceAppSection
          appId="my-content-creator"
          sectionId="draft-editor"
          minLevel="beginner"
          title="Draft Editor"
          subtitle={
            selectedPost
              ? `${selectedPost.id} · ${selectedPost.platform} · ${charLimit !== null ? `max ${charLimit} chars` : "no char cap"}`
              : ""
          }
        >
          <textarea
            value={draftEdit}
            onChange={(e) => setDraftEdit(e.target.value)}
            rows={6}
            className="w-full border border-line bg-void p-3 font-mono text-xs text-stark outline-none focus:border-cursor-glow"
            placeholder="Draft text — saved locally. Tap Draft Post skill for LLM generation, or edit here."
          />
          <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
            <span className={overLimit ? "text-cursor-glow" : "text-muted"}>
              {draftEdit.length}
              {charLimit !== null ? `/${charLimit}` : ""} chars
              {selectedPost && (
                <span className="ml-2 text-muted">
                  · Publish: {publishLive ? selectedChannel?.bridgeTool ?? "live bridge" : "bridge planned"}
                  {selectedPost.platform === "instagram" ? " · needs image_url" : ""}
                  {selectedPost.platform === "pinterest" ? " · needs image_url · line 1 = title · set PINTEREST_DEFAULT_BOARD_ID" : ""}
                  {selectedPost.platform === "tiktok" ? " · needs video_url or video_path" : ""}
                  {selectedPost.platform === "youtube" ? " · needs video · Shorts auto-#Shorts" : ""}
                  {selectedPost.platform === "snapchat" ? " · needs video · Spotlight/Story · set SNAP_PUBLIC_PROFILE_ID" : ""}
                  {selectedPost.platform === "reddit" ? " · line 1 = title · set REDDIT_DEFAULT_SUBREDDIT" : ""}
                  {selectedPost.platform === "discord" ? " · set DISCORD_CHANNEL_ID · optional image_url embed" : ""}
                </span>
              )}
            </span>
            <button
              type="button"
              disabled={savingDraft}
              onClick={() => void saveDraft()}
              className="border border-line px-3 py-1 uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-50"
            >
              {savingDraft ? "Saving…" : "Save draft"}
            </button>
          </div>
          <ContentDraftToolsPanel
            firstComment={firstComment}
            firstCommentScheduledAt={firstCommentSchedule}
            threadCount={threadCount}
            performanceScore={preflightReport?.performanceScore ?? selectedPost.performanceScore ?? null}
            onFirstCommentChange={setFirstComment}
            onFirstCommentScheduleChange={setFirstCommentSchedule}
            onSaveMeta={() => {
              if (!selected) return;
              const scheduledIso = firstCommentSchedule
                ? new Date(firstCommentSchedule).toISOString()
                : null;
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "publish_meta",
                  postId: selected,
                  config: { firstCommentText: firstComment, firstCommentScheduledAt: scheduledIso },
                }),
              }).then(() => {
                pushToast("Publish meta saved", "success");
                void loadStatus();
              });
            }}
            onSplitThread={() => {
              if (!selected) return;
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "thread_split", postId: selected }),
              }).then(async (r) => {
                const d = (await r.json()) as { threadParts?: string[] };
                setThreadCount(d.threadParts?.length ?? 0);
                pushToast(`Thread split · ${d.threadParts?.length ?? 0} parts`, "success");
              });
            }}
            onGenerateAltText={() => {
              if (!selected) return;
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "alt_text", postId: selected }),
              }).then(async (r) => {
                const d = (await r.json()) as { altText?: string };
                pushToast(d.altText ? `Alt: ${d.altText.slice(0, 60)}…` : "Alt text generated", "success");
              });
            }}
            onRunCoach={() => {
              if (!selected) return;
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "performance_predict", subAction: "coach", postId: selected }),
              }).then(async (r) => {
                const d = (await r.json()) as { coach?: { llmSummary?: string | null; tips?: Array<{ message: string }> } };
                const tip = d.coach?.tips?.[0]?.message ?? d.coach?.llmSummary?.split("\n")[0];
                pushToast(tip ?? "Coach review complete", "info");
                void loadPreview(selected);
              });
            }}
          />
        </ExperienceAppSection>
      )}

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="playbooks"
        minLevel="beginner"
        title="Playbook Studio"
        subtitle="Templates · one-click new posts · apply to selected draft"
      >
        <ContentTemplateStudioPanel
          templates={templates}
          selectedPostId={selected}
          onRefresh={() => void loadGrowthData()}
          onApply={(postId, templateId) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "apply_template", postId, templateId }),
            }).then(() => {
              pushToast("Playbook applied", "success");
              void loadStatus();
            });
          }}
          onCreateFromTemplate={(templateId) => {
            const tpl = templates.find((t) => t.id === templateId);
            if (!tpl?.platforms[0]) return;
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "create",
                platform: tpl.platforms[0],
                format: tpl.format,
                draftText: tpl.draftSeed,
              }),
            }).then(() => {
              pushToast(`Created from ${tpl.name}`, "success");
              void loadStatus();
            });
          }}
          busy={growthBusy}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="brand-studio"
        minLevel="standard"
        title="Brand Studio"
        subtitle="Style guide · voice · UTM defaults · link tracking"
      >
        <ContentBrandStudioPanel
          brandKit={brandKitForm}
          onSave={(patch) => {
            setGrowthBusy(true);
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "brand_kit_update", config: patch }),
            })
              .then(() => {
                setBrandKitForm((s) => ({ ...s, ...patch }));
                pushToast("Brand studio saved", "success");
              })
              .finally(() => setGrowthBusy(false));
          }}
          busy={growthBusy}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="library"
        minLevel="standard"
        title="Content Library"
        subtitle="Reusable assets · evergreen recycling · clone to queue"
      >
        <ContentLibraryPanel
          assets={libraryAssets}
          selectedPostId={selected}
          onRefresh={() => void loadGrowthData()}
          onSaveFromPost={(postId, evergreen, intervalDays) => {
            setGrowthBusy(true);
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "library_save",
                postId,
                config: { evergreen, evergreenIntervalDays: intervalDays },
              }),
            })
              .then(() => {
                pushToast(evergreen ? "Saved as evergreen" : "Saved to library", "success");
                void loadGrowthData();
                void loadStatus();
              })
              .finally(() => setGrowthBusy(false));
          }}
          onCreatePost={(assetId) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "library_create_post", targetId: assetId }),
            }).then(() => {
              pushToast("Post created from library", "success");
              void loadStatus();
            });
          }}
          onRecycleNow={() => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "evergreen_recycle" }),
            }).then(async (r) => {
              const d = (await r.json()) as { results?: unknown[] };
              pushToast(`${d.results?.length ?? 0} evergreen recycle(s)`, "info");
              void loadStatus();
              void loadGrowthData();
            });
          }}
          busy={growthBusy}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="ig-grid"
        minLevel="standard"
        title="Instagram Grid Planner"
        subtitle="Visual feed preview · gap warnings · scheduled + published"
      >
        <ContentInstagramGridPanel grid={igGrid} onRefresh={() => void loadGrowthData()} />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="analytics"
        minLevel="standard"
        title="Analytics"
        subtitle="Full-funnel metrics · manual import · UTM clicks · live pull"
      >
        {metricsPullState ? (
          <p className="mb-2 font-mono text-[9px] text-muted">{metricsPullState}</p>
        ) : null}
        <ContentAnalyticsPanel
          metrics={metrics}
          hookPerformance={hookPerf}
          thumbPerformance={thumbPerf}
          recommendations={recommendations}
          onPullLive={() => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "analytics_pull", postId: selected || undefined }),
            }).then(() => {
              void loadAnalytics(selected);
              void loadRecommendations();
              pushToast("Metrics pulled", "success");
            });
          }}
          onRefreshDemo={() => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "analytics_demo" }),
            }).then(() => {
              void loadAnalytics(selected);
              void loadRecommendations();
            });
          }}
          onRefreshRecommendations={() => void loadRecommendations()}
          onApplyRecommendation={(rec) => void applyRecommendation(rec)}
          liveConfigured={Boolean(
            vault?.platforms.some((p) => (p.id === "x" || p.id === "linkedin") && p.configured),
          )}
        />
        <ContentFunnelPanel funnel={funnel} />
        <ContentMetricsImportRow
          postId={selected}
          onImport={(postId, views, likes, comments) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "metrics_import",
                postId,
                config: { views, likes, comments },
              }),
            }).then(() => {
              pushToast("Metrics imported", "success");
              void loadAnalytics(selected);
              void loadGrowthData();
            });
          }}
        />
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Metrics rules</p>
          <ContentMetricsRulesPanel
            rules={metricsRules}
            fires={metricsRuleFires}
            rulesEnabled={metricsRulesEnabled}
            busy={rulesBusy}
            onRefresh={() => void loadMetricsRules()}
            onRunNow={() => {
              setRulesBusy(true);
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "metrics_rules_run", force: true }),
              })
                .then(async (r) => {
                  const d = (await r.json()) as { results?: Array<{ ok: boolean; skipped?: boolean }> };
                  const fired = (d.results ?? []).filter((x) => x.ok && !x.skipped).length;
                  pushToast(fired > 0 ? `${fired} rule(s) applied` : "Rules evaluated — no new actions", "info");
                  void loadStatus();
                  void loadMetricsRules();
                })
                .finally(() => setRulesBusy(false));
            }}
          />
        </div>
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="attribution"
        minLevel="standard"
        title="Attribution & Clicks"
        subtitle="UTM auto-tag · click redirect · platform funnel"
      >
        <ContentAttributionPanel
          funnel={funnel}
          clicks={clickSummary}
          onRefresh={() => void loadGrowthData()}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="team-review"
        minLevel="expert"
        title="Team Review"
        subtitle="Draft comments · request changes · reviewer notes"
      >
        <ContentTeamPanel
          comments={teamComments}
          selectedPostId={selected}
          onRefresh={() => void loadGrowthData()}
          onAddComment={(postId, text, action) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "team_comments",
                subAction: "add",
                postId,
                note: text,
                status: action,
              }),
            }).then(() => {
              pushToast("Review added", "success");
              void loadGrowthData();
            });
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="approval"
        minLevel="standard"
        title="Publish approval"
        subtitle="Human gate before bridge send · audit trail at /etc/curxor/content-audit.json"
      >
        <ContentApprovalPanel
          posts={approvalPosts}
          replies={approvalReplies}
          auditEntries={auditEntries}
          requirePublishApproval={requirePublishApproval}
          requireReplyApproval={requireReplyApproval}
          approvalTelegram={approvalTelegram ?? undefined}
          onRefresh={() => {
            void loadApproval();
            void loadStatus();
            void loadReplies(selected || undefined);
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="engage"
        minLevel="standard"
        title="Engage → Reply → Publish"
        subtitle="X/LinkedIn/Threads comments & mentions → inbox · Meta webhook · heartbeat poll"
      >
        {socialEngageState ? (
          <p className="mb-2 font-mono text-[9px] text-muted">{socialEngageState}</p>
        ) : null}
        <div className="mb-2 flex flex-wrap gap-2 font-mono text-[10px]">
          <button
            type="button"
            onClick={() =>
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "social_engage_poll", force: true }),
              }).then(async (r) => {
                const d = (await r.json()) as { totalIngested?: number };
                void loadEngage();
                void loadSocialEngageState();
                pushToast(`Social poll: ${d.totalIngested ?? 0} new item(s)`, "info");
              })
            }
            className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow"
          >
            Poll comments now
          </button>
        </div>
        {!anchorPostId ? (
          <p className="font-mono text-[10px] text-muted">Publish at least one post to enable thread replies from engage inbox.</p>
        ) : null}
        <EngageInboxPanel
          suggestions={engageSuggestions}
          anchorPostId={anchorPostId}
          onConvert={(id) => {
            const platform = (selectedPost?.platform ?? status?.channels[0] ?? "x") as ContentPlatform;
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "engage_convert", suggestionId: id, platform }),
            }).then(() => loadStatus());
          }}
          onReplyQueued={(pendingApproval) => {
            void loadReplies();
            void loadEngage();
            void loadApproval();
            pushToast(
              pendingApproval ? "Reply queued — awaiting approval" : "Engage reply queued & publishing",
              pendingApproval ? "info" : "success",
            );
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="ops"
        minLevel="expert"
        title="Ops controls"
        subtitle="Crisis pause · weekly digest · /pause /resume on Telegram & Slack"
      >
        <ContentOpsPanel ops={opsState} onRefresh={() => void loadOps()} />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="experiments"
        minLevel="expert"
        title="Structured experiments"
        subtitle="Hook & thumbnail A/B with auto-winner from metrics"
      >
        <ContentExperimentsPanel
          experiments={experiments}
          selectedPostIds={(status?.posts ?? []).filter((p) => p.stage !== "PUBLISHED").map((p) => p.id)}
          onRefresh={() => void loadExperiments()}
        />
      </ExperienceAppSection>

      {selectedPost?.platform === "pinterest" && (
        <ExperienceAppSection
          appId="my-content-creator"
          sectionId="pinterest-board"
          minLevel="expert"
          title="Pinterest board"
          subtitle="Override PINTEREST_DEFAULT_BOARD_ID per post"
        >
          <div className="flex gap-2 font-mono text-[10px]">
            <input
              value={pinterestBoard}
              onChange={(e) => setPinterestBoard(e.target.value)}
              placeholder="Board ID"
              className="flex-1 border border-line bg-void px-2 py-1 text-stark outline-none focus:border-cursor-glow"
            />
            <button
              type="button"
              onClick={() =>
                void fetch("/api/content/status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "save_board", postId: selected, boardId: pinterestBoard }),
                }).then(() => loadStatus())
              }
              className="border border-line px-3 py-1 uppercase text-muted hover:text-cursor-glow"
            >
              Save
            </button>
          </div>
        </ExperienceAppSection>
      )}

      <ContentCampaignPanel
        posts={status?.posts ?? []}
        campaigns={status?.campaigns ?? []}
        selectedPostId={selected}
        freChannels={status?.channels ?? []}
        tone={tone}
        onRefresh={() => void loadStatus()}
      />

      {selectedPost && (
        <ExperienceAppSection
          appId="my-content-creator"
          sectionId="reply-queue"
          minLevel="standard"
          title="Reply queue"
          subtitle="Thread replies via content.publish_reply (X · Threads · LinkedIn · Bluesky)"
        >
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            className="w-full border border-line bg-void p-2 font-mono text-[10px] text-stark"
            placeholder="Reply text…"
          />
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]">
            <button
              type="button"
              disabled={!replyText.trim()}
              onClick={() =>
                void fetch("/api/content/status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reply_enqueue", postId: selected, replyText }),
                }).then(() => {
                  setReplyText("");
                  void loadReplies(selected);
                })
              }
              className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
            >
              Queue reply
            </button>
            <button
              type="button"
              onClick={() =>
                void fetch("/api/content/status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "replies_worker" }),
                }).then(() => void loadReplies(selected))
              }
              className="border border-line px-3 py-1 uppercase text-muted hover:text-stark"
            >
              Process queue
            </button>
          </div>
          {replies.length > 0 && (
            <ul className="mt-3 space-y-2 font-mono text-[10px]">
              {replies.slice(0, 8).map((r) => (
                <li key={r.id} className="border border-line/60 p-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">{r.platform}</span>
                    <span className={r.status === "sent" ? "text-cursor-glow" : r.status === "failed" ? "text-red-400" : r.status === "pending_approval" ? "text-amber-400" : "text-stark"}>
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-stark">{r.replyText.slice(0, 120)}</p>
                  {r.sentUrl ? (
                    <a href={r.sentUrl} target="_blank" rel="noreferrer" className="text-cursor-glow underline">
                      View reply
                    </a>
                  ) : null}
                  {r.error ? <p className="text-red-400">{r.error}</p> : null}
                  {(r.status === "queued" || r.status === "scheduled" || r.status === "failed") && (
                    <button
                      type="button"
                      onClick={() =>
                        void fetch("/api/content/status", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "reply_publish", replyId: r.id }),
                        }).then(() => {
                          void loadReplies(selected);
                          void loadApproval();
                        })
                      }
                      className="mt-1 border border-line px-2 py-0.5 uppercase hover:border-cursor-glow"
                    >
                      Send now
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ExperienceAppSection>
      )}

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="signal-feed"
        minLevel="expert"
        title="Signal Feed"
        subtitle="Reactive drafts from Signal Claw · trend → queue"
      >
        <ContentSignalPanel
          items={signalItems}
          onRefresh={() => void loadGrowthData()}
          onDraft={(signalId, platform) => {
            void fetch("/api/content/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "signal_feed", subAction: "draft", targetId: signalId, platform }),
            }).then(async (r) => {
              const d = (await r.json()) as { draft?: { postId?: string } };
              pushToast(d.draft?.postId ? `Draft ${d.draft.postId} scheduled` : "Signal draft failed", d.draft?.postId ? "success" : "error");
              void loadStatus();
              void loadGrowthData();
            });
          }}
        />
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-content-creator"
        sectionId="export"
        minLevel="expert"
        title="Export & tools"
        subtitle="ZIP manifest · agent tools at /api/content/tools"
      >
        <div className="flex flex-wrap gap-2 font-mono text-[10px]">
          <button
            type="button"
            onClick={() =>
              void fetch("/api/content/export", { method: "POST" }).then(async (r) => {
                const d = (await r.json()) as { downloadPath?: string };
                if (d.downloadPath) window.open(d.downloadPath, "_blank");
              })
            }
            className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow"
          >
            Export bundle
          </button>
          <button
            type="button"
            onClick={() => {
              const scheduled = (status?.posts ?? []).filter((p) => p.stage === "SCHEDULED").map((p) => p.id);
              if (scheduled.length === 0) return;
              void fetch("/api/content/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "bulk_reschedule", postIds: scheduled, hourOffset: 1 }),
              }).then(() => loadStatus());
            }}
            className="border border-line px-3 py-1 uppercase text-muted hover:text-stark"
          >
            Shift week +1h
          </button>
        </div>
      </ExperienceAppSection>

      <DigitalReceiptPanel
        title="Publish Receipts"
        receipts={digital.receipts.filter(
          (r) => r.tool.startsWith("content.publish") || r.tool === "channel.discord.send",
        )}
        latest={
          [...digital.receipts]
            .reverse()
            .find((r) => r.tool.startsWith("content.publish") || r.tool === "channel.discord.send") ?? null
        }
        connected={digital.connected}
      />
    </div>
  );
}
