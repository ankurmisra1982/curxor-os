"use client";

import { useCallback, useEffect, useState } from "react";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { ContentCampaign, CampaignStage } from "@/lib/content-campaign-types";
import { CAMPAIGN_STAGES, campaignStageLabel } from "@/lib/content-campaign-types";
import type { ContentPost } from "@/lib/content-queue-types";
import { platformLabel } from "@/lib/social-channels";

interface CampaignRow extends ContentCampaign {
  postIds: string[];
  postCount: number;
  suggestedStage: CampaignStage;
}

interface ContentCampaignPanelProps {
  posts: ContentPost[];
  campaigns: ContentCampaign[];
  selectedPostId: string;
  freChannels: string[];
  tone: string;
  onRefresh: () => void;
}

export function ContentCampaignPanel({
  posts,
  campaigns,
  selectedPostId,
  freChannels,
  tone,
  onRefresh,
}: ContentCampaignPanelProps) {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [masterDraft, setMasterDraft] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "campaigns_list" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { campaigns?: CampaignRow[] };
      if (data.campaigns) setRows(data.campaigns);
    } catch {
      /* retry on next refresh */
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns, campaigns.length]);

  const selectedPost = posts.find((p) => p.id === selectedPostId);
  const expanded = rows.find((c) => c.id === expandedId);

  useEffect(() => {
    if (expanded) {
      setMasterDraft(expanded.masterDraft);
      setSelectedChannels(expanded.channels.length ? expanded.channels : freChannels.slice(0, 4));
    }
  }, [expanded?.id, expanded?.masterDraft, expanded?.channels, freChannels]);

  const createCampaign = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "campaign_create",
          name: newName.trim(),
          draftText: masterDraft || undefined,
          channels: selectedChannels,
        }),
      });
      setNewName("");
      await loadCampaigns();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const saveCampaign = async (campaignId: string) => {
    setBusy(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "campaign_update",
          campaignId,
          draftText: masterDraft,
          channels: selectedChannels,
        }),
      });
      await loadCampaigns();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const fanOut = async (campaignId: string) => {
    setBusy(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "campaign_fan_out", campaignId, tone, autoSchedule: true }),
      });
      await loadCampaigns();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const assignSelected = async (campaignId: string | null) => {
    if (!selectedPostId) return;
    setBusy(true);
    try {
      await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "campaign_assign", postId: selectedPostId, campaignId }),
      });
      await loadCampaigns();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  return (
    <ExperienceAppSection
      appId="my-content-creator"
      sectionId="campaigns"
      minLevel="standard"
      title="Campaigns"
      subtitle="One story · many channels — master draft → fan out → measure"
    >
      <div className="mb-3 grid gap-2 md:grid-cols-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Campaign name"
          className="border border-line bg-void px-2 py-1 font-mono text-[10px] text-stark outline-none focus:border-cursor-glow"
        />
        <button
          type="button"
          disabled={busy || !newName.trim()}
          onClick={() => void createCampaign()}
          className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
        >
          Create campaign
        </button>
      </div>

      <textarea
        value={masterDraft}
        onChange={(e) => setMasterDraft(e.target.value)}
        rows={3}
        placeholder="Master story — shared across all channels in this campaign"
        className="mb-2 w-full border border-line bg-void p-2 font-mono text-[10px] text-stark"
      />

      <div className="mb-3 flex flex-wrap gap-1 font-mono text-[9px]">
        {freChannels.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => toggleChannel(ch)}
            className={`border px-2 py-0.5 uppercase ${
              selectedChannels.includes(ch) ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
            }`}
          >
            {platformLabel(ch as import("@/lib/social-channels").ContentPlatform)}
          </button>
        ))}
      </div>

      {selectedPost && (
        <div className="mb-3 font-mono text-[10px] text-muted">
          Assign {selectedPost.channel}:
          <div className="mt-1 flex flex-wrap gap-1">
            <button type="button" disabled={busy} onClick={() => void assignSelected(null)} className="border border-line px-2 py-0.5 uppercase">
              None
            </button>
            {rows.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busy}
                onClick={() => void assignSelected(c.id)}
                className={`border px-2 py-0.5 uppercase ${
                  selectedPost.campaignId === c.id ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CAMPAIGN_STAGES.map((stage) => {
          const inStage = rows.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="border border-line bg-void/40 p-2">
              <div className="mb-2 font-mono text-[10px] uppercase text-muted">{campaignStageLabel(stage)}</div>
              {inStage.length === 0 ? (
                <div className="font-mono text-[10px] text-muted/60">—</div>
              ) : (
                inStage.map((c) => {
                  const campaignPosts = posts.filter((p) => p.campaignId === c.id);
                  return (
                    <div key={c.id} className="mb-2 border border-line/60 p-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="font-mono text-[10px] text-stark hover:text-cursor-glow"
                      >
                        {c.name}
                      </button>
                      <div className="font-mono text-[9px] text-muted">
                        {c.postCount} posts
                        {c.suggestedStage !== c.stage ? ` · → ${campaignStageLabel(c.suggestedStage)}` : ""}
                      </div>
                      {expandedId === c.id && (
                        <div className="mt-2 space-y-1">
                          {campaignPosts.slice(0, 6).map((p) => (
                            <div key={p.id} className="text-[9px] text-muted">
                              {platformLabel(p.platform)} · {p.stage} · {p.id}
                            </div>
                          ))}
                          <div className="mt-2 flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void saveCampaign(c.id)}
                              className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow"
                            >
                              Save draft
                            </button>
                            <button
                              type="button"
                              disabled={busy || !masterDraft.trim()}
                              onClick={() => void fanOut(c.id)}
                              className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow"
                            >
                              Fan out channels
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </ExperienceAppSection>
  );
}
