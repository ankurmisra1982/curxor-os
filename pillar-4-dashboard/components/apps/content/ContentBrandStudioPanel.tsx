"use client";

import { useState } from "react";

export interface BrandKitFormState {
  styleGuide: string;
  voiceTone: string;
  emojiPolicy: "none" | "minimal" | "allowed";
  pov: "first" | "third" | "brand";
  utmSource: string;
  trackLinks: boolean;
  requiredDisclaimer: string;
  suggestedHashtags: string;
  bannedHashtags: string;
}

interface ContentBrandStudioPanelProps {
  brandKit: BrandKitFormState;
  onSave: (patch: Record<string, unknown>) => void;
  busy?: boolean;
}

export function ContentBrandStudioPanel({ brandKit, onSave, busy }: ContentBrandStudioPanelProps) {
  const [local, setLocal] = useState(brandKit);

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <textarea
        value={local.styleGuide}
        onChange={(e) => setLocal((s) => ({ ...s, styleGuide: e.target.value }))}
        rows={3}
        placeholder="Style guide — themes, POV, words to use/avoid…"
        className="w-full border border-line bg-void p-2 text-stark"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={local.voiceTone}
          onChange={(e) => setLocal((s) => ({ ...s, voiceTone: e.target.value }))}
          placeholder="Voice tone (technical, casual, brand)"
          className="border border-line bg-void px-2 py-1 text-stark"
        />
        <input
          value={local.utmSource}
          onChange={(e) => setLocal((s) => ({ ...s, utmSource: e.target.value }))}
          placeholder="Default UTM source"
          className="border border-line bg-void px-2 py-1 text-stark"
        />
        <select
          value={local.emojiPolicy}
          onChange={(e) => setLocal((s) => ({ ...s, emojiPolicy: e.target.value as BrandKitFormState["emojiPolicy"] }))}
          className="border border-line bg-void px-2 py-1 text-stark"
        >
          <option value="allowed">Emojis allowed</option>
          <option value="minimal">Minimal emojis</option>
          <option value="none">No emojis</option>
        </select>
        <select
          value={local.pov}
          onChange={(e) => setLocal((s) => ({ ...s, pov: e.target.value as BrandKitFormState["pov"] }))}
          className="border border-line bg-void px-2 py-1 text-stark"
        >
          <option value="brand">Brand POV (we/our)</option>
          <option value="first">First person</option>
          <option value="third">Third person</option>
        </select>
      </div>
      <input
        value={local.requiredDisclaimer}
        onChange={(e) => setLocal((s) => ({ ...s, requiredDisclaimer: e.target.value }))}
        placeholder="Required disclaimer (#ad, not financial advice…)"
        className="w-full border border-line bg-void px-2 py-1 text-stark"
      />
      <input
        value={local.suggestedHashtags}
        onChange={(e) => setLocal((s) => ({ ...s, suggestedHashtags: e.target.value }))}
        placeholder="Suggested hashtags (space-separated)"
        className="w-full border border-line bg-void px-2 py-1 text-stark"
      />
      <input
        value={local.bannedHashtags}
        onChange={(e) => setLocal((s) => ({ ...s, bannedHashtags: e.target.value }))}
        placeholder="Banned hashtags (space-separated)"
        className="w-full border border-line bg-void px-2 py-1 text-stark"
      />
      <label className="flex items-center gap-2 text-muted">
        <input
          type="checkbox"
          checked={local.trackLinks}
          onChange={(e) => setLocal((s) => ({ ...s, trackLinks: e.target.checked }))}
        />
        Track link clicks via UTM redirect
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onSave({
            styleGuide: local.styleGuide,
            voiceTone: local.voiceTone,
            emojiPolicy: local.emojiPolicy,
            pov: local.pov,
            utmSource: local.utmSource,
            trackLinks: local.trackLinks,
            requiredDisclaimer: local.requiredDisclaimer,
            suggestedHashtags: local.suggestedHashtags.split(/\s+/).filter(Boolean),
            bannedHashtags: local.bannedHashtags.split(/\s+/).filter(Boolean),
          })
        }
        className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow disabled:opacity-50"
      >
        Save brand studio
      </button>
    </div>
  );
}

interface ContentDraftToolsPanelProps {
  firstComment: string;
  firstCommentScheduledAt: string;
  threadCount: number;
  performanceScore: number | null;
  onFirstCommentChange: (v: string) => void;
  onFirstCommentScheduleChange: (v: string) => void;
  onSaveMeta: () => void;
  onSplitThread: () => void;
  onGenerateAltText?: () => void;
  onRunCoach?: () => void;
  busy?: boolean;
}

export function ContentDraftToolsPanel({
  firstComment,
  firstCommentScheduledAt,
  threadCount,
  performanceScore,
  onFirstCommentChange,
  onFirstCommentScheduleChange,
  onSaveMeta,
  onSplitThread,
  onGenerateAltText,
  onRunCoach,
  busy,
}: ContentDraftToolsPanelProps) {
  return (
    <div className="mt-3 space-y-2 border border-line/60 p-2 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-muted">Publish tools</p>
      {performanceScore !== null ? (
        <p className="text-muted">
          Predicted performance:{" "}
          <span className={performanceScore >= 72 ? "text-cursor-glow" : performanceScore >= 48 ? "text-stark" : "text-amber-400"}>
            {performanceScore}/100
          </span>
        </p>
      ) : null}
      <input
        value={firstComment}
        onChange={(e) => onFirstCommentChange(e.target.value)}
        placeholder="First comment (CTA, link, hashtags)"
        className="w-full border border-line bg-void px-2 py-1 text-stark"
      />
      <input
        type="datetime-local"
        value={firstCommentScheduledAt}
        onChange={(e) => onFirstCommentScheduleChange(e.target.value)}
        className="w-full border border-line bg-void px-2 py-1 text-stark"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSaveMeta} disabled={busy} className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow">
          Save publish meta
        </button>
        <button type="button" onClick={onSplitThread} disabled={busy} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Split into thread{threadCount > 0 ? ` (${threadCount})` : ""}
        </button>
        {onGenerateAltText ? (
          <button type="button" onClick={onGenerateAltText} disabled={busy} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
            Generate alt text
          </button>
        ) : null}
        {onRunCoach ? (
          <button type="button" onClick={onRunCoach} disabled={busy} className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow">
            AI coach
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface ContentMetricsImportRowProps {
  postId: string | null;
  onImport: (postId: string, views: number, likes: number, comments: number) => void;
}

export function ContentMetricsImportRow({ postId, onImport }: ContentMetricsImportRowProps) {
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 font-mono text-[9px]">
      <span className="text-muted">Manual import (IG/TikTok/YT):</span>
      <input value={views} onChange={(e) => setViews(e.target.value)} placeholder="Views" className="w-16 border border-line bg-void px-1 py-0.5" />
      <input value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="Likes" className="w-16 border border-line bg-void px-1 py-0.5" />
      <input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Comments" className="w-16 border border-line bg-void px-1 py-0.5" />
      <button
        type="button"
        disabled={!postId}
        onClick={() =>
          postId &&
          onImport(postId, Number(views) || 0, Number(likes) || 0, Number(comments) || 0)
        }
        className="border border-line px-2 py-0.5 uppercase disabled:opacity-50"
      >
        Import
      </button>
    </div>
  );
}
