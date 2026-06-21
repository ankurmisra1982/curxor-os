"use client";

import type { ContentPost } from "@/lib/content-queue-types";
import { platformLabel } from "@/lib/social-channels";
import type { PostMetricsRow } from "@/components/apps/content/ContentAnalyticsPanel";
import type { ContentReply } from "@/lib/content-replies-store";
import type { ContentJobRow } from "@/components/apps/content/ContentJobsPanel";

interface ContentPostInspectorProps {
  post: ContentPost | null;
  metrics: PostMetricsRow | null;
  replies: ContentReply[];
  jobs: ContentJobRow[];
  onClose: () => void;
}

export function ContentPostInspector({ post, metrics, replies, jobs, onClose }: ContentPostInspectorProps) {
  if (!post) return null;

  const postReplies = replies.filter((r) => r.postId === post.id);
  const pendingJobs = jobs.filter((j) => j.status === "queued" || j.status === "running");

  return (
    <aside className="border border-line bg-panel p-3 font-mono text-[10px]">
      <div className="mb-2 flex items-center justify-between">
        <p className="uppercase tracking-widest text-muted">Post inspector</p>
        <button type="button" onClick={onClose} className="text-muted hover:text-stark">
          Close
        </button>
      </div>
      <dl className="space-y-2">
        <Row label="ID" value={post.id} />
        <Row label="Platform" value={platformLabel(post.platform)} />
        <Row label="Stage" value={post.stage} highlight />
        <Row label="Format" value={post.format} />
        {post.campaignId ? <Row label="Campaign" value={post.campaignId} /> : null}
        {post.captionStyle ? <Row label="Captions" value={post.captionStyle} /> : null}
        <Row label="Draft" value={`${post.draftText.length} chars`} />
        <Row label="Hooks" value={String(post.hookVariants?.length ?? 0)} />
        <Row label="Thumbs" value={String(post.thumbnailVariants?.length ?? 0)} />
        <Row label="Carousel" value={String(post.carouselSlides?.length ?? 0)} />
        {metrics ? (
          <Row
            label="Metrics"
            value={`${metrics.views} views · ${metrics.likes} likes${metrics.ctr !== null ? ` · CTR ${(metrics.ctr * 100).toFixed(1)}%` : ""}`}
          />
        ) : (
          <Row label="Metrics" value="—" />
        )}
        <Row label="Replies" value={`${postReplies.filter((r) => r.status === "sent").length} sent · ${postReplies.filter((r) => r.status !== "sent").length} pending`} />
        <Row label="Jobs" value={pendingJobs.length ? `${pendingJobs.length} active` : "idle"} />
        {post.publishedUrl ? (
          <div>
            <dt className="text-muted">Live URL</dt>
            <dd className="mt-0.5 truncate text-cursor-glow">
              <a href={post.publishedUrl} target="_blank" rel="noreferrer">
                {post.publishedUrl}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/30 pb-1">
      <dt className="text-muted">{label}</dt>
      <dd className={highlight ? "text-cursor-glow" : "text-stark"}>{value}</dd>
    </div>
  );
}
