export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  advancePostStage,
  bulkReschedulePosts,
  createContentPost,
  failPostPublish,
  fetchContentStatus,
  listIdeaBacklog,
  markPostPublished,
  promoteFromIdeaBacklog,
  removeContentPost,
  rescheduleContentPost,
  savePostDraft,
  savePinterestBoard,
  scheduleContentPost,
  selectHookVariant,
  saveCaptionStyle,
  selectThumbnailVariant,
} from "@/lib/content-queue-store";
import {
  adaptPostForPlatforms,
  applyContentTemplate,
  buildCarouselForPost,
  captureThumbnailForPost,
  cropPostImageForPlatform,
  enqueueAiImageJob,
  enqueueRenderJob,
  fanOutPostToPlatforms,
  generateAiThumbnailForPost,
  generateHookVariantsForPost,
  mediaReadinessAsync,
  renderVideoForPost,
  repurposeContent,
  creationStudioStatusAsync,
  type RepurposePreset,
  generateCarouselSlideImage,
  generateThumbnailVariantsForPost,
} from "@/lib/content-creation-service";
import { buildBridgeHealthReport } from "@/lib/content-bridge-health";
import { buildCalendarWeek } from "@/lib/content-calendar";
import { buildPublishPreview } from "@/lib/content-publish-preview";
import { validatePostMedia } from "@/lib/content-media-validation";
import { drainContentJobQueue, processNextContentJob } from "@/lib/content-job-runner";
import { listContentJobs } from "@/lib/content-jobs-store";
import { resolvePublishTool } from "@/lib/content-channels-status";
import { ingestDemoMetrics, listPostMetrics, compareHookPerformance, compareThumbnailPerformance } from "@/lib/content-analytics-store";
import { listEngageSuggestions, addEngageSuggestion, convertSuggestionToDraft, draftEngageReply, convertSuggestionToReply } from "@/lib/content-engage-bridge";
import { enqueueContentReply, listContentReplies } from "@/lib/content-replies-store";
import { handlePublishReceipt } from "@/lib/content-receipt-handler";
import { handleReplyReceipt, processDueReplies, publishReply } from "@/lib/content-reply-publish";
import { parseDigitalReceipt } from "@/lib/digital-protocol";
import { pullAllLiveMetrics, pullMetricsForPost } from "@/lib/content-metrics-ingest";
import { getMetricsPullState, runScheduledMetricsPull } from "@/lib/content-metrics-scheduler";
import { pollAllSocialEngage } from "@/lib/content-social-engage-ingest";
import { getSocialEngagePollState } from "@/lib/content-social-engage-state";
import {
  assignPostToCampaign,
  createCampaign,
  deleteCampaign,
  listCampaignsWithPosts,
  syncCampaignStageFromPosts,
  updateCampaign,
  fanOutCampaign,
} from "@/lib/content-campaigns-store";
import { deriveContentRecommendations } from "@/lib/content-recommendations";
import { readAppFreState } from "@/lib/app-fre-state";
import {
  approvePost,
  approveReply,
  listApprovalQueue,
  rejectPost,
  rejectReply,
} from "@/lib/content-approval-service";
import { runMetricsRules } from "@/lib/content-metrics-rules-engine";
import { listMetricsRuleFires, listMetricsRules, updateMetricsRule } from "@/lib/content-metrics-rules-store";
import { metricsRulesEnabled } from "@/lib/content-metrics-rules-config";
import { requirePublishApproval, requireReplyApproval } from "@/lib/content-approval-config";
import { getApprovalTelegramStatus } from "@/lib/content-approval-telegram";
import { listAuditEntries } from "@/lib/content-audit-store";
import { requireLanAuth } from "@/lib/lan-auth";
import type { ContentFormat } from "@/lib/content-queue-types";
import { isSocialPlatform, type SocialPlatformId } from "@/lib/social-channels";

const FORMATS = new Set<ContentFormat>(["thread", "long-form", "reel", "short", "carousel", "story"]);

export async function GET(): Promise<Response> {
  const status = await fetchContentStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    postId?: string;
    draftText?: string;
    channel?: string;
    platform?: string;
    format?: string;
    scheduledAt?: string;
    imageBase64?: string;
    platforms?: string[];
    tone?: string;
    prompt?: string;
    voiceover?: boolean;
    autoSchedule?: boolean;
    async?: boolean;
    hookId?: string;
    preset?: string;
    publishedUrl?: string;
    week?: string;
    hourOffset?: number;
    postIds?: string[];
    suggestionId?: string;
    boardId?: string;
    templateId?: string;
    replyText?: string;
    replyId?: string;
    receipt?: Record<string, unknown>;
    force?: boolean;
    limit?: number;
    name?: string;
    channels?: string[];
    autoPublish?: boolean;
    slideId?: string;
    thumbId?: string;
    captionStyle?: string;
    campaignId?: string | null;
    stage?: string;
    note?: string;
    actor?: string;
    targetId?: string;
    ruleId?: string;
    enabled?: boolean;
    useBestTime?: boolean;
    subAction?: string;
    config?: Record<string, unknown>;
    status?: string;
    reason?: string;
    kind?: string;
    viewThreshold?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  switch (body.action) {
    case "create": {
      const platform = body.platform;
      if (!platform || !isSocialPlatform(platform)) {
        return Response.json({ error: "Valid platform required" }, { status: 400 });
      }
      const format = body.format as ContentFormat | undefined;
      if (format && !FORMATS.has(format)) {
        return Response.json({ error: "Invalid format" }, { status: 400 });
      }
      const post = await createContentPost({
        channel: typeof body.channel === "string" ? body.channel : "",
        platform,
        format,
        draftText: typeof body.draftText === "string" ? body.draftText : undefined,
      });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "update_draft": {
      if (!body.postId || typeof body.draftText !== "string") {
        return Response.json({ error: "postId and draftText required" }, { status: 400 });
      }
      const post = await savePostDraft(body.postId, body.draftText);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "advance": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const post = await advancePostStage(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "schedule": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      let when = typeof body.scheduledAt === "string" ? body.scheduledAt : undefined;
      if (body.useBestTime === true || !when) {
        const { resolveScheduleTimeForPost } = await import("@/lib/content-schedule-insights");
        when = await resolveScheduleTimeForPost(body.postId, when);
      }
      const post = await scheduleContentPost(body.postId, when);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, scheduledAt: when, ...status });
    }

    case "delete": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const removed = await removeContentPost(body.postId);
      if (!removed) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, ...status });
    }

    case "capture_thumbnail": {
      if (!body.postId || typeof body.imageBase64 !== "string") {
        return Response.json({ error: "postId and imageBase64 required" }, { status: 400 });
      }
      const saved = await captureThumbnailForPost(body.postId, body.imageBase64);
      const status = await fetchContentStatus();
      return Response.json({ ok: true, ...saved, ...status });
    }

    case "render_video": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        if (body.async !== false) {
          const { jobId } = await enqueueRenderJob(body.postId, {
            voiceover: body.voiceover !== false,
            script: body.draftText,
          });
          void processNextContentJob();
          const status = await fetchContentStatus();
          return Response.json({ ok: true, jobId, queued: true, ...status });
        }
        const rendered = await renderVideoForPost(body.postId, body.draftText, {
          voiceover: body.voiceover !== false,
        });
        const status = await fetchContentStatus();
        return Response.json({ ok: true, ...rendered, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "generate_ai_image": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        if (body.async !== false) {
          const { jobId } = await enqueueAiImageJob(body.postId, body.prompt);
          void processNextContentJob();
          const status = await fetchContentStatus();
          return Response.json({ ok: true, jobId, queued: true, ...status });
        }
        const saved = await generateAiThumbnailForPost(body.postId, body.prompt);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, ...saved, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "studio_status": {
      const studio = await creationStudioStatusAsync();
      return Response.json({ ok: true, studio });
    }

    case "adapt_platforms": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const fre = await readAppFreState("my-content-creator");
      const tone = body.tone ?? (typeof fre.config.contentTone === "string" ? fre.config.contentTone : "technical");
      const rawChannels = body.platforms?.length
        ? body.platforms
        : Array.isArray(fre.config.channels)
          ? fre.config.channels
          : [];
      const platforms = rawChannels.filter((p): p is SocialPlatformId => typeof p === "string" && isSocialPlatform(p));
      if (platforms.length === 0) {
        return Response.json({ error: "No platforms to adapt" }, { status: 400 });
      }
      try {
        const adapted = await adaptPostForPlatforms(body.postId, platforms, tone, {
          autoSchedule:
            body.autoSchedule === true ||
            (body.autoSchedule !== false && fre.config.autoScheduleAdapt === true),
        });
        const status = await fetchContentStatus();
        return Response.json({ ok: true, adapted, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "fan_out": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const fre = await readAppFreState("my-content-creator");
      const tone = body.tone ?? (typeof fre.config.contentTone === "string" ? fre.config.contentTone : "technical");
      const rawChannels = body.platforms?.length
        ? body.platforms
        : Array.isArray(fre.config.channels)
          ? fre.config.channels
          : [];
      const platforms = rawChannels.filter((p): p is SocialPlatformId => typeof p === "string" && isSocialPlatform(p));
      const autoSchedule =
        body.autoSchedule === true ||
        (body.autoSchedule !== false && fre.config.autoSchedule === true);
      try {
        const result = await fanOutPostToPlatforms(body.postId, platforms, tone, { autoSchedule });
        const status = await fetchContentStatus();
        return Response.json({ ok: true, ...result, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "media_status": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { getContentPost } = await import("@/lib/content-queue-store");
      const post = await getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const readiness = await mediaReadinessAsync({ ...post, id: post.id });
      const validation = await validatePostMedia(post);
      return Response.json({ ok: true, readiness, validation, post });
    }

    case "preview": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { getContentPost } = await import("@/lib/content-queue-store");
      const post = await getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const validation = await validatePostMedia(post);
      const { tool } = resolvePublishTool(post.platform);
      const preview = buildPublishPreview(post, validation, tool);
      const readiness = await mediaReadinessAsync({ ...post, id: post.id });
      return Response.json({ ok: true, preview, readiness, post });
    }

    case "reschedule": {
      if (!body.postId || typeof body.scheduledAt !== "string") {
        return Response.json({ error: "postId and scheduledAt required" }, { status: 400 });
      }
      const post = await rescheduleContentPost(body.postId, body.scheduledAt);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, calendar: buildCalendarWeek(status.posts), ...status });
    }

    case "calendar": {
      const status = await fetchContentStatus();
      const fre = await readAppFreState("my-content-creator");
      const tz = typeof fre.config.timezone === "string" ? fre.config.timezone : undefined;
      const anchor = typeof body.week === "string" ? new Date(body.week) : new Date();
      return Response.json({ ok: true, calendar: buildCalendarWeek(status.posts, anchor, tz), timezone: tz ?? "local", ...status });
    }

    case "generate_hooks": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        const hooks = await generateHookVariantsForPost(body.postId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, hooks, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "select_hook": {
      if (!body.postId || !body.hookId) {
        return Response.json({ error: "postId and hookId required" }, { status: 400 });
      }
      const post = await selectHookVariant(body.postId, body.hookId);
      if (!post) return Response.json({ error: "Post or hook not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "repurpose": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const fre = await readAppFreState("my-content-creator");
      const tone = body.tone ?? (typeof fre.config.contentTone === "string" ? fre.config.contentTone : "technical");
      const preset = (body.preset ?? "long_to_social") as RepurposePreset;
      try {
        const result = await repurposeContent(body.postId, preset, tone);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, ...result, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "link_published": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const receipt = body.receipt
        ? parseDigitalReceipt(JSON.stringify(body.receipt))
        : null;
      if (receipt) {
        const result = await handlePublishReceipt(receipt, body.postId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, post: result.post, webhook: result.webhook, ...status });
      }
      const post = await markPostPublished(body.postId, body.publishedUrl ?? null);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "fail_publish": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const receipt =
        body.receipt && typeof body.receipt === "object"
          ? parseDigitalReceipt(JSON.stringify(body.receipt))
          : null;
      if (receipt) {
        const result = await handlePublishReceipt(receipt, body.postId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, post: result.post, webhook: result.webhook, ...status });
      }
      const post = await failPostPublish(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "bulk_reschedule": {
      const ids = body.postIds?.length ? body.postIds : [];
      const offset = typeof body.hourOffset === "number" ? body.hourOffset : 0;
      if (ids.length === 0 || offset === 0) {
        return Response.json({ error: "postIds and hourOffset required" }, { status: 400 });
      }
      const rescheduled = await bulkReschedulePosts(ids, offset);
      const status = await fetchContentStatus();
      return Response.json({ ok: true, rescheduled, ...status });
    }

    case "analytics": {
      const metrics = await listPostMetrics(body.postId);
      const { getContentPost } = await import("@/lib/content-queue-store");
      const post = body.postId ? await getContentPost(body.postId) : null;
      const hooks = post?.hookVariants ?? [];
      const thumbs = post?.thumbnailVariants ?? [];
      return Response.json({
        ok: true,
        metrics,
        hookPerformance: compareHookPerformance(
          metrics,
          hooks.map((h: { id: string; label: string }) => ({ id: h.id, label: h.label })),
        ),
        thumbPerformance: compareThumbnailPerformance(
          metrics,
          thumbs.map((t: { id: string; label: string }) => ({ id: t.id, label: t.label })),
        ),
      });
    }

    case "analytics_recommendations": {
      const status = await fetchContentStatus();
      const metrics = await listPostMetrics();
      const allHooks = status.posts.flatMap((p) => p.hookVariants ?? []);
      const hookPerf = compareHookPerformance(
        metrics,
        allHooks.map((h) => ({ id: h.id, label: h.label })),
      );
      const recommendations = deriveContentRecommendations({
        metrics,
        posts: status.posts,
        hookPerformance: hookPerf,
        campaignId: typeof body.campaignId === "string" ? body.campaignId : null,
      });
      return Response.json({ ok: true, recommendations });
    }

    case "analytics_demo": {
      const status = await fetchContentStatus();
      const published = status.posts.filter((p) => p.stage === "PUBLISHED").map((p) => p.id);
      const metrics = await ingestDemoMetrics(published.length ? published : status.posts.slice(0, 3).map((p) => p.id));
      return Response.json({ ok: true, metrics });
    }

    case "analytics_pull": {
      if (body.postId) {
        const result = await pullMetricsForPost(body.postId);
        const metrics = await listPostMetrics(body.postId);
        return Response.json({ ok: result.ok, result, metrics });
      }
      const results = await pullAllLiveMetrics();
      const metrics = await listPostMetrics();
      return Response.json({ ok: true, results, metrics });
    }

    case "metrics_scheduled_pull": {
      const force = body.force === true;
      const pull = await runScheduledMetricsPull(force);
      const metrics = await listPostMetrics();
      const { evaluateRunningExperiments } = await import("@/lib/content-experiments-engine");
      const { runWeeklyOpsDigest } = await import("@/lib/content-ops-digest");
      const [experiments, digest] = await Promise.all([
        evaluateRunningExperiments(),
        runWeeklyOpsDigest(false),
      ]);
      return Response.json({ ok: true, ...pull, metrics, experiments, digest });
    }

    case "metrics_pull_state": {
      const state = await getMetricsPullState();
      const rulesEnabled = await metricsRulesEnabled();
      return Response.json({ ok: true, state, rulesEnabled });
    }

    case "metrics_rules_list": {
      const [rules, fires, rulesEnabled] = await Promise.all([
        listMetricsRules(),
        listMetricsRuleFires(24),
        metricsRulesEnabled(),
      ]);
      return Response.json({ ok: true, rules, fires, rulesEnabled });
    }

    case "metrics_rules_run": {
      const run = await runMetricsRules(body.force === true);
      const status = await fetchContentStatus();
      return Response.json({ ok: true, ...run, ...status });
    }

    case "metrics_rules_update": {
      if (!body.ruleId) return Response.json({ error: "ruleId required" }, { status: 400 });
      const rule = await updateMetricsRule(body.ruleId, {
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      });
      if (!rule) return Response.json({ error: "Rule not found" }, { status: 404 });
      const rules = await listMetricsRules();
      return Response.json({ ok: true, rule, rules });
    }

    case "social_engage_poll": {
      const force = body.force === true;
      const poll = await pollAllSocialEngage(force);
      const { autoTriageEngageSuggestions, listEnrichedEngageSuggestions } = await import(
        "@/lib/content-engage-intelligence"
      );
      await autoTriageEngageSuggestions();
      const suggestions = await listEnrichedEngageSuggestions(true);
      return Response.json({ ok: true, ...poll, suggestions });
    }

    case "social_engage_state": {
      const state = await getSocialEngagePollState();
      return Response.json({ ok: true, state, webhookUrl: "/api/engage/social/webhook" });
    }

    case "engage_list": {
      const suggestions = await listEngageSuggestions(true);
      return Response.json({ ok: true, suggestions });
    }

    case "engage_add": {
      if (!body.draftText) return Response.json({ error: "draftText required" }, { status: 400 });
      const suggestion = await addEngageSuggestion({
        channel: typeof body.channel === "string" ? body.channel : "inbox",
        author: typeof body.prompt === "string" ? body.prompt : "guest",
        text: body.draftText,
        platform: typeof body.platform === "string" ? body.platform : null,
      });
      return Response.json({ ok: true, suggestion });
    }

    case "engage_convert": {
      if (!body.suggestionId || !body.platform || !isSocialPlatform(body.platform)) {
        return Response.json({ error: "suggestionId and platform required" }, { status: 400 });
      }
      const result = await convertSuggestionToDraft(body.suggestionId, body.platform);
      if (!result) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, ...result, ...status });
    }

    case "engage_draft_reply": {
      if (!body.suggestionId) return Response.json({ error: "suggestionId required" }, { status: 400 });
      const tone = typeof body.tone === "string" ? body.tone : "friendly";
      const result = await draftEngageReply(body.suggestionId, tone);
      if (!result) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ ok: true, ...result });
    }

    case "engage_enqueue_reply": {
      if (!body.suggestionId || !body.replyText) {
        return Response.json({ error: "suggestionId and replyText required" }, { status: 400 });
      }
      try {
        const result = await convertSuggestionToReply({
          suggestionId: body.suggestionId,
          replyText: body.replyText,
          anchorPostId: body.postId ?? null,
          autoPublish: body.autoPublish === true,
        });
        if (!result) return Response.json({ error: "Not found" }, { status: 404 });
        const replies = await listContentReplies();
        return Response.json({ ok: true, ...result, replies });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "replies_list": {
      const replies = await listContentReplies(body.postId);
      return Response.json({ ok: true, replies });
    }

    case "reply_enqueue": {
      if (!body.postId || !body.replyText) {
        return Response.json({ error: "postId and replyText required" }, { status: 400 });
      }
      const post = await (await import("@/lib/content-queue-store")).getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const reply = await enqueueContentReply({
        postId: body.postId,
        platform: post.platform,
        replyText: body.replyText,
        threadUrl: post.publishedUrl,
        parentPostId: post.platformPostId ?? null,
        parentUri: post.platformPostUri ?? null,
        parentCid: post.platformPostCid ?? null,
        scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
      });
      return Response.json({ ok: true, reply });
    }

    case "reply_publish": {
      if (!body.replyId) return Response.json({ error: "replyId required" }, { status: 400 });
      const result = await publishReply(body.replyId);
      const replies = await listContentReplies();
      return Response.json({ ok: result.ok, result, replies });
    }

    case "replies_worker": {
      const processed = await processDueReplies(typeof body.limit === "number" ? body.limit : 8);
      const replies = await listContentReplies();
      return Response.json({ ok: true, processed, replies });
    }

    case "link_reply": {
      if (!body.receipt) return Response.json({ error: "receipt required" }, { status: 400 });
      const receipt = parseDigitalReceipt(JSON.stringify(body.receipt));
      if (!receipt) return Response.json({ error: "Invalid receipt" }, { status: 400 });
      const reply = await handleReplyReceipt(receipt);
      const replies = await listContentReplies();
      return Response.json({ ok: Boolean(reply), reply, replies });
    }

    case "campaigns_list": {
      const campaigns = await listCampaignsWithPosts();
      return Response.json({ ok: true, campaigns });
    }

    case "campaign_create": {
      const name = typeof body.name === "string" ? body.name : "New campaign";
      const campaign = await createCampaign({
        name,
        masterDraft: typeof body.draftText === "string" ? body.draftText : "",
        channels: Array.isArray(body.channels) ? body.channels.filter((x): x is string => typeof x === "string") : [],
      });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, campaign, ...status });
    }

    case "campaign_update": {
      if (!body.campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });
      const campaign = await updateCampaign(body.campaignId, {
        name: typeof body.name === "string" ? body.name : undefined,
        masterDraft: typeof body.draftText === "string" ? body.draftText : undefined,
        stage: typeof body.stage === "string" ? (body.stage as import("@/lib/content-campaign-types").CampaignStage) : undefined,
        channels: Array.isArray(body.channels)
          ? body.channels.filter((x): x is string => typeof x === "string")
          : undefined,
      });
      if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, campaign, ...status });
    }

    case "campaign_delete": {
      if (!body.campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });
      const deleted = await deleteCampaign(body.campaignId);
      if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, ...status });
    }

    case "campaign_assign": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const campaignId =
        typeof body.campaignId === "string" ? body.campaignId : body.campaignId === null ? null : undefined;
      if (campaignId === undefined) return Response.json({ error: "campaignId required" }, { status: 400 });
      const post = await assignPostToCampaign(body.postId, campaignId);
      if (!post) return Response.json({ error: "Not found" }, { status: 404 });
      if (campaignId) await syncCampaignStageFromPosts(campaignId);
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "campaign_fan_out": {
      if (!body.campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });
      try {
        const tone = typeof body.tone === "string" ? body.tone : "technical";
        const result = await fanOutCampaign(body.campaignId, tone, {
          autoSchedule: body.autoSchedule === true,
        });
        const status = await fetchContentStatus();
        return Response.json({ ok: true, ...result, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "save_caption_style": {
      if (!body.postId || !body.captionStyle) {
        return Response.json({ error: "postId and captionStyle required" }, { status: 400 });
      }
      const styles = new Set(["burned", "drawtext", "none", "srt-only"]);
      if (!styles.has(body.captionStyle)) {
        return Response.json({ error: "Invalid captionStyle" }, { status: 400 });
      }
      const post = await saveCaptionStyle(
        body.postId,
        body.captionStyle as import("@/lib/content-queue-types").CaptionStyle,
      );
      if (!post) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "generate_carousel_image": {
      if (!body.postId || !body.slideId) {
        return Response.json({ error: "postId and slideId required" }, { status: 400 });
      }
      try {
        const image = await generateCarouselSlideImage(body.postId, body.slideId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, image, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "generate_thumb_variants": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        const variants = await generateThumbnailVariantsForPost(body.postId, 2);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, variants, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "select_thumb": {
      if (!body.postId || !body.thumbId) {
        return Response.json({ error: "postId and thumbId required" }, { status: 400 });
      }
      const post = await selectThumbnailVariant(body.postId, body.thumbId);
      if (!post) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "idea_backlog": {
      const ideas = await listIdeaBacklog();
      return Response.json({ ok: true, ideas });
    }

    case "promote_idea": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const post = await promoteFromIdeaBacklog(body.postId);
      if (!post) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "save_board": {
      if (!body.postId || !body.boardId) {
        return Response.json({ error: "postId and boardId required" }, { status: 400 });
      }
      const post = await savePinterestBoard(body.postId, body.boardId);
      if (!post) return Response.json({ error: "Not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "build_carousel": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        const slides = await buildCarouselForPost(body.postId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, slides, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "crop_image": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        const cropped = await cropPostImageForPlatform(body.postId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, ...cropped, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "apply_template": {
      if (!body.postId || !body.templateId) {
        return Response.json({ error: "postId and templateId required" }, { status: 400 });
      }
      try {
        const post = await applyContentTemplate(body.postId, body.templateId);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, post, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "jobs_worker": {
      const processed = await drainContentJobQueue(5);
      return Response.json({ ok: true, processed });
    }

    case "jobs_status": {
      const jobs = await listContentJobs(body.postId);
      const processed = await drainContentJobQueue(2);
      return Response.json({ ok: true, jobs, processed });
    }

    case "approval_list": {
      const queue = await listApprovalQueue();
      const [requirePublish, requireReply, approvalTelegram] = await Promise.all([
        requirePublishApproval(),
        requireReplyApproval(),
        getApprovalTelegramStatus(),
      ]);
      return Response.json({
        ok: true,
        ...queue,
        requirePublishApproval: requirePublish,
        requireReplyApproval: requireReply,
        approvalTelegram,
      });
    }

    case "approve_post": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      try {
        const result = await approvePost(body.postId, body.actor ?? "operator");
        const status = await fetchContentStatus();
        return Response.json({ ok: result.ok, result, ...status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "reject_post": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const post = await rejectPost(body.postId, body.note, body.actor ?? "operator");
      if (!post) return Response.json({ error: "Not pending approval" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "approve_reply": {
      if (!body.replyId) return Response.json({ error: "replyId required" }, { status: 400 });
      try {
        const result = await approveReply(body.replyId, body.actor ?? "operator");
        const replies = await listContentReplies();
        return Response.json({ ok: result.ok, result, replies });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    case "reject_reply": {
      if (!body.replyId) return Response.json({ error: "replyId required" }, { status: 400 });
      const reply = await rejectReply(body.replyId, body.note, body.actor ?? "operator");
      if (!reply) return Response.json({ error: "Not pending approval" }, { status: 404 });
      const replies = await listContentReplies();
      return Response.json({ ok: true, reply, replies });
    }

    case "schedule_insights": {
      const fre = await readAppFreState("my-content-creator");
      const timeZone = typeof fre.config.timezone === "string" ? fre.config.timezone : undefined;
      const status = await fetchContentStatus();
      const metrics = await listPostMetrics();
      const { buildPlatformScheduleInsights, suggestBestSlotsThisWeek } = await import(
        "@/lib/content-schedule-insights"
      );
      const insights = buildPlatformScheduleInsights({ metrics, posts: status.posts, timeZone });
      const anchor = typeof body.week === "string" ? new Date(body.week) : new Date();
      const channels = Array.isArray(fre.config.channels)
        ? fre.config.channels.filter((x): x is string => typeof x === "string")
        : status.channels;
      const weekSlots = suggestBestSlotsThisWeek(channels, metrics, status.posts, anchor, timeZone);
      return Response.json({
        ok: true,
        insights,
        weekSlots,
        timeZone: timeZone ?? "local",
        useDataDrivenSchedule: fre.config.useDataDrivenSchedule !== false,
      });
    }

    case "schedule_suggest": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const fre = await readAppFreState("my-content-creator");
      const timeZone = typeof fre.config.timezone === "string" ? fre.config.timezone : undefined;
      const status = await fetchContentStatus();
      const metrics = await listPostMetrics();
      const { suggestBestSlotForPost } = await import("@/lib/content-schedule-insights");
      const suggestion = suggestBestSlotForPost(body.postId, metrics, status.posts, timeZone);
      if (!suggestion) return Response.json({ error: "Post not found" }, { status: 404 });
      return Response.json({ ok: true, suggestion });
    }

    case "bridge_health": {
      const fre = await readAppFreState("my-content-creator");
      const channels = Array.isArray(fre.config.channels)
        ? fre.config.channels.filter((x): x is string => typeof x === "string")
        : [];
      const report = await buildBridgeHealthReport(channels);
      return Response.json({ ok: true, ...report });
    }

    case "audit_list": {
      const entries = await listAuditEntries({
        targetId: typeof body.targetId === "string" ? body.targetId : undefined,
        limit: typeof body.limit === "number" ? body.limit : 48,
      });
      return Response.json({ ok: true, entries });
    }

    case "preflight_check": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { runPostPreflight } = await import("@/lib/content-preflight");
      const report = await runPostPreflight(body.postId);
      if (!report) return Response.json({ error: "Post not found" }, { status: 404 });
      return Response.json({ ok: true, report });
    }

    case "engage_intelligence": {
      const {
        listEnrichedEngageSuggestions,
        getEngageIntelligenceConfig,
        updateEngageIntelligenceConfig,
        setEngageTriageStatus,
        autoTriageEngageSuggestions,
      } = await import("@/lib/content-engage-intelligence");
      if (body.subAction === "update_config") {
        const config = await updateEngageIntelligenceConfig(body.config ?? {});
        return Response.json({ ok: true, config });
      }
      if (body.subAction === "set_status" && body.suggestionId && body.status) {
        const row = await setEngageTriageStatus(
          String(body.suggestionId),
          body.status as "open" | "priority" | "archived",
        );
        return Response.json({ ok: true, triage: row });
      }
      if (body.subAction === "auto_triage") {
        const updated = await autoTriageEngageSuggestions();
        const suggestions = await listEnrichedEngageSuggestions(true);
        return Response.json({ ok: true, updated, suggestions });
      }
      const [suggestions, config] = await Promise.all([
        listEnrichedEngageSuggestions(true),
        getEngageIntelligenceConfig(),
      ]);
      return Response.json({ ok: true, suggestions, config });
    }

    case "ops_status": {
      const { readContentOpsState, pauseAllPublishing, resumeAllPublishing } = await import(
        "@/lib/content-ops-controls"
      );
      if (body.subAction === "pause") {
        const ops = await pauseAllPublishing(String(body.reason ?? "Manual pause"), body.actor ?? "operator");
        return Response.json({ ok: true, ops });
      }
      if (body.subAction === "resume") {
        const ops = await resumeAllPublishing(body.actor ?? "operator");
        return Response.json({ ok: true, ops });
      }
      const ops = await readContentOpsState();
      return Response.json({ ok: true, ops });
    }

    case "ops_digest": {
      const { runWeeklyOpsDigest } = await import("@/lib/content-ops-digest");
      const result = await runWeeklyOpsDigest(body.force === true);
      return Response.json({ ok: true, ...result });
    }

    case "experiments_list": {
      const { listExperiments, createExperiment } = await import("@/lib/content-experiments-store");
      if (body.subAction === "create" && Array.isArray(body.postIds) && body.kind) {
        const exp = await createExperiment({
          kind: body.kind as "hook" | "thumbnail" | "caption",
          postIds: body.postIds.map(String),
          viewThreshold: typeof body.viewThreshold === "number" ? body.viewThreshold : undefined,
        });
        const experiments = await listExperiments();
        return Response.json({ ok: true, experiment: exp, experiments });
      }
      const experiments = await listExperiments();
      return Response.json({ ok: true, experiments });
    }

    case "experiments_evaluate": {
      const { evaluateRunningExperiments } = await import("@/lib/content-experiments-engine");
      const { listExperiments } = await import("@/lib/content-experiments-store");
      const results = await evaluateRunningExperiments();
      const experiments = await listExperiments();
      return Response.json({ ok: true, results, experiments });
    }

    case "analytics_funnel": {
      const { buildAnalyticsFunnelReport } = await import("@/lib/content-analytics-dashboard");
      const { summarizeClicksByPost } = await import("@/lib/content-click-store");
      const status = await fetchContentStatus();
      const metrics = await listPostMetrics();
      const clicks = await summarizeClicksByPost();
      const funnel = buildAnalyticsFunnelReport({ metrics, posts: status.posts, clicks });
      return Response.json({ ok: true, funnel, metrics, clicks });
    }

    case "metrics_import": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { importManualMetrics } = await import("@/lib/content-analytics-dashboard");
      const row = await importManualMetrics({
        postId: body.postId,
        views: typeof body.config?.views === "number" ? body.config.views : undefined,
        likes: typeof body.config?.likes === "number" ? body.config.likes : undefined,
        comments: typeof body.config?.comments === "number" ? body.config.comments : undefined,
        shares: typeof body.config?.shares === "number" ? body.config.shares : undefined,
      });
      const metrics = await listPostMetrics();
      return Response.json({ ok: true, metrics: row, all: metrics });
    }

    case "clicks_list": {
      const { listClicks, summarizeClicksByPost } = await import("@/lib/content-click-store");
      const clicks = body.postId ? await listClicks(body.postId) : await summarizeClicksByPost();
      return Response.json({ ok: true, clicks });
    }

    case "library_list": {
      const { listLibraryAssets } = await import("@/lib/content-library-store");
      const assets = await listLibraryAssets(typeof body.config?.tag === "string" ? body.config.tag : undefined);
      return Response.json({ ok: true, assets });
    }

    case "library_save": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { getContentPost } = await import("@/lib/content-queue-store");
      const { upsertLibraryAssetFromPost, updateLibraryAsset } = await import("@/lib/content-library-store");
      const post = await getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const asset = await upsertLibraryAssetFromPost(post, {
        evergreen: body.config?.evergreen === true,
        evergreenIntervalDays:
          typeof body.config?.evergreenIntervalDays === "number" ? body.config.evergreenIntervalDays : undefined,
        tags: Array.isArray(body.config?.tags) ? body.config.tags.filter((t): t is string => typeof t === "string") : undefined,
      });
      if (body.config?.name && typeof body.config.name === "string") {
        await updateLibraryAsset(asset.id, { name: body.config.name });
      }
      const { savePostPublishMeta } = await import("@/lib/content-queue-store");
      await savePostPublishMeta(body.postId, {
        evergreen: body.config?.evergreen === true,
        evergreenIntervalDays:
          typeof body.config?.evergreenIntervalDays === "number" ? body.config.evergreenIntervalDays : null,
        libraryAssetId: asset.id,
      });
      return Response.json({ ok: true, asset });
    }

    case "library_create_post": {
      if (!body.targetId) return Response.json({ error: "targetId (asset id) required" }, { status: 400 });
      const { createPostFromLibraryAsset } = await import("@/lib/content-evergreen-engine");
      const post = await createPostFromLibraryAsset(body.targetId);
      if (!post) return Response.json({ error: "Asset not found" }, { status: 404 });
      const status = await fetchContentStatus();
      return Response.json({ ok: true, post, ...status });
    }

    case "evergreen_recycle": {
      const { processDueEvergreenRecycles } = await import("@/lib/content-evergreen-engine");
      const results = await processDueEvergreenRecycles();
      const status = await fetchContentStatus();
      return Response.json({ ok: true, results, ...status });
    }

    case "templates_list": {
      const { listAllContentTemplates } = await import("@/lib/content-templates-store");
      const templates = await listAllContentTemplates();
      return Response.json({ ok: true, templates });
    }

    case "templates_save": {
      const { saveContentTemplate } = await import("@/lib/content-templates-store");
      if (!body.name || !body.config) {
        return Response.json({ error: "name and config required" }, { status: 400 });
      }
      const cfg = body.config;
      const template = await saveContentTemplate({
        id: typeof cfg.id === "string" ? cfg.id : undefined,
        name: body.name,
        tone: typeof cfg.tone === "string" ? cfg.tone : "technical",
        platforms: Array.isArray(cfg.platforms) ? cfg.platforms.filter((p): p is SocialPlatformId => typeof p === "string" && isSocialPlatform(p)) : ["x"],
        format: typeof cfg.format === "string" ? (cfg.format as ContentFormat) : "thread",
        draftSeed: typeof cfg.draftSeed === "string" ? cfg.draftSeed : "",
        brandHashtags: Array.isArray(cfg.brandHashtags) ? cfg.brandHashtags.filter((t): t is string => typeof t === "string") : [],
      });
      return Response.json({ ok: true, template });
    }

    case "templates_delete": {
      if (!body.templateId) return Response.json({ error: "templateId required" }, { status: 400 });
      const { deleteContentTemplate } = await import("@/lib/content-templates-store");
      const removed = await deleteContentTemplate(body.templateId);
      return Response.json({ ok: removed });
    }

    case "brand_kit_update": {
      const { updateBrandKitConfig } = await import("@/lib/content-templates-store");
      const brandKit = await updateBrandKitConfig(body.config ?? {});
      return Response.json({ ok: true, brandKit });
    }

    case "publish_meta": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { savePostPublishMeta } = await import("@/lib/content-queue-store");
      const cfg = body.config ?? {};
      const post = await savePostPublishMeta(body.postId, {
        firstCommentText: typeof cfg.firstCommentText === "string" ? cfg.firstCommentText : cfg.firstCommentText === null ? null : undefined,
        firstCommentScheduledAt:
          typeof cfg.firstCommentScheduledAt === "string"
            ? cfg.firstCommentScheduledAt
            : cfg.firstCommentScheduledAt === null
              ? null
              : undefined,
        altText: typeof cfg.altText === "string" ? cfg.altText : cfg.altText === null ? null : undefined,
        threadParts: Array.isArray(cfg.threadParts) ? cfg.threadParts.filter((t): t is string => typeof t === "string") : undefined,
        utmCampaign: typeof cfg.utmCampaign === "string" ? cfg.utmCampaign : undefined,
        utmSource: typeof cfg.utmSource === "string" ? cfg.utmSource : undefined,
        evergreen: typeof cfg.evergreen === "boolean" ? cfg.evergreen : undefined,
        evergreenIntervalDays:
          typeof cfg.evergreenIntervalDays === "number" ? cfg.evergreenIntervalDays : cfg.evergreenIntervalDays === null ? null : undefined,
      });
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      return Response.json({ ok: true, post });
    }

    case "thread_split": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { getContentPost, savePostPublishMeta } = await import("@/lib/content-queue-store");
      const post = await getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const { splitDraftIntoThread } = await import("@/lib/content-ig-grid");
      const { charLimitForPlatform } = await import("@/lib/social-channels");
      const cap = charLimitForPlatform(post.platform) ?? 280;
      const threadParts = splitDraftIntoThread(post.draftText, cap);
      const updated = await savePostPublishMeta(body.postId, { threadParts });
      return Response.json({ ok: true, threadParts, post: updated });
    }

    case "ig_grid": {
      const status = await fetchContentStatus();
      const { buildInstagramGrid } = await import("@/lib/content-ig-grid");
      const grid = buildInstagramGrid(status.posts);
      return Response.json({ ok: true, grid });
    }

    case "team_comments": {
      const { listDraftComments, addDraftComment } = await import("@/lib/content-team-store");
      if (body.subAction === "add") {
        if (!body.postId || !body.note) {
          return Response.json({ error: "postId and note required" }, { status: 400 });
        }
        const comment = await addDraftComment({
          postId: body.postId,
          author: body.actor ?? "reviewer",
          text: body.note,
          action: (body.status as "comment" | "request_changes" | "approve") ?? "comment",
        });
        return Response.json({ ok: true, comment });
      }
      const comments = await listDraftComments(body.postId);
      return Response.json({ ok: true, comments });
    }

    case "performance_predict": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { getContentPost } = await import("@/lib/content-queue-store");
      const fre = await readAppFreState("my-content-creator");
      const post = await getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      if (body.subAction === "coach") {
        const { runPerformanceCoach } = await import("@/lib/content-performance-coach");
        const coach = await runPerformanceCoach(post);
        return Response.json({ ok: true, coach });
      }
      const { predictPostPerformance } = await import("@/lib/content-performance-predict");
      const metrics = await listPostMetrics();
      const prediction = predictPostPerformance({
        post,
        brandKitRaw: fre.config.brandKit,
        historicalMetrics: metrics,
      });
      return Response.json({ ok: true, prediction });
    }

    case "recovery_list": {
      const { listRecoveryCandidates } = await import("@/lib/content-bridge-recovery");
      const candidates = await listRecoveryCandidates();
      return Response.json({ ok: true, candidates });
    }

    case "recovery_retry": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { retryPostPublish } = await import("@/lib/content-bridge-recovery");
      const result = await retryPostPublish(body.postId, body.actor ?? "operator");
      const status = await fetchContentStatus();
      return Response.json({ ...result, ...status });
    }

    case "recovery_clear": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { clearPostPublishError } = await import("@/lib/content-bridge-recovery");
      const post = await clearPostPublishError(body.postId);
      return Response.json({ ok: true, post });
    }

    case "content_plan": {
      const { buildContentPlanReport, executeFillWeekPlan } = await import("@/lib/content-calendar-planning");
      if (body.subAction === "fill") {
        const created = await executeFillWeekPlan(typeof body.limit === "number" ? body.limit : 5);
        const status = await fetchContentStatus();
        return Response.json({ ok: true, created, ...status });
      }
      const plan = await buildContentPlanReport(
        typeof body.week === "string" ? new Date(body.week) : new Date(),
      );
      return Response.json({ ok: true, plan });
    }

    case "hashtag_intel": {
      const { analyzeHashtagsForDraft } = await import("@/lib/content-hashtag-intelligence");
      const { getContentPost } = await import("@/lib/content-queue-store");
      const text = typeof body.draftText === "string" ? body.draftText : undefined;
      const post = body.postId ? await getContentPost(body.postId) : null;
      const report = await analyzeHashtagsForDraft(text ?? post?.draftText ?? "", post ?? undefined);
      return Response.json({ ok: true, report });
    }

    case "alt_text": {
      if (!body.postId) return Response.json({ error: "postId required" }, { status: 400 });
      const { getContentPost } = await import("@/lib/content-queue-store");
      const { generateAltTextForPost } = await import("@/lib/content-alt-text");
      const post = await getContentPost(body.postId);
      if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
      const altText = await generateAltTextForPost(post);
      return Response.json({ ok: true, altText });
    }

    case "signal_feed": {
      const { listSignalFeedItems, ingestSignalFeedItem, createReactiveDraftFromSignal } = await import(
        "@/lib/content-signal-feed"
      );
      if (body.subAction === "ingest" && body.config) {
        const item = await ingestSignalFeedItem({
          title: String(body.config.title ?? "Signal"),
          summary: String(body.config.summary ?? ""),
          source: String(body.config.source ?? "signal-claw"),
          urgency: (body.config.urgency as "low" | "medium" | "high") ?? "medium",
          suggestedPlatforms: Array.isArray(body.config.suggestedPlatforms)
            ? body.config.suggestedPlatforms.filter((p): p is SocialPlatformId => typeof p === "string" && isSocialPlatform(p))
            : ["x"],
        });
        return Response.json({ ok: true, item });
      }
      if (body.subAction === "draft" && body.targetId) {
        const platform = typeof body.platform === "string" && isSocialPlatform(body.platform) ? body.platform : "x";
        const draft = await createReactiveDraftFromSignal(body.targetId, platform);
        const status = await fetchContentStatus();
        return Response.json({ ok: Boolean(draft), draft, ...status });
      }
      const items = await listSignalFeedItems();
      return Response.json({ ok: true, items });
    }

    case "go_live": {
      const { buildGoLiveReport } = await import("@/lib/content-go-live");
      const report = await buildGoLiveReport();
      return Response.json({ ok: true, goLive: report });
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }
}
