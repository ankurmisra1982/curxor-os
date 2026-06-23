"use client";

import { useCallback, useEffect, useState } from "react";

import type { ForgedWorkQueueStatus } from "@/lib/forged-work-store";
import type { ForgedCapitalQueueStatus } from "@/lib/forged-capital-store";
import type { ForgedCreatorQueueStatus } from "@/lib/forged-creator-store";
import type { ForgedCreatorPlatform } from "@/lib/forged-creator-types";
import type { OutboundSend, WorkLead, WorkSequence } from "@/lib/work-queue-types";

interface DeskPanelProps {
  forgedAppId: string;
  config: Record<string, unknown>;
  refreshKey?: number;
  onSkillHint?: (skillId: string) => void;
  updateWorkspaceContext?: (patch: Record<string, unknown>) => void;
}

async function postForgedDesk(forgedAppId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/forged/${forgedAppId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

async function postForgedWork(forgedAppId: string, body: Record<string, unknown>) {
  return postForgedDesk(forgedAppId, body) as Promise<{
    ok: boolean;
    status?: ForgedWorkQueueStatus;
    lead?: WorkLead;
    sequence?: WorkSequence;
    send?: OutboundSend;
    error?: string;
  }>;
}

export function ForgedBlankDeskPanel({ config, onSkillHint }: DeskPanelProps) {
  const focus = typeof config.deskFocus === "string" ? config.deskFocus : "";
  const [draft, setDraft] = useState(focus);

  return (
    <div className="space-y-3 font-mono text-[11px]">
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-muted">Desk focus</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-1 w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          placeholder="Primary mission for this desk"
        />
      </label>
      <button
        type="button"
        onClick={() => onSkillHint?.("publish_context")}
        className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow"
      >
        Publish context →
      </button>
    </div>
  );
}

export function ForgedWorkDeskPanel({
  forgedAppId,
  refreshKey = 0,
  onSkillHint,
  updateWorkspaceContext,
}: DeskPanelProps) {
  const [status, setStatus] = useState<ForgedWorkQueueStatus | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [signal, setSignal] = useState("Loading pipeline…");

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/forged/${forgedAppId}/status`, { cache: "no-store" });
    if (!res.ok) {
      setSignal("Could not load forged pipeline");
      return;
    }
    const json = (await res.json()) as { status?: ForgedWorkQueueStatus };
    const deskStatus = json.status;
    if (deskStatus) {
      setStatus(deskStatus);
      if (!selectedLeadId && deskStatus.leads[0]) {
        setSelectedLeadId(deskStatus.leads[0].id);
      }
      const forLead = deskStatus.sequences.filter(
        (s) => s.leadId === (selectedLeadId || deskStatus.leads[0]?.id),
      );
      if (!selectedSequenceId && forLead[0]) {
        setSelectedSequenceId(forLead[0].id);
      }
      setSignal(
        `${deskStatus.stats.leadCount} leads · ${deskStatus.stats.sequenceCount} sequences · ${deskStatus.stats.simulatedSends ?? 0} simulated sends`,
      );
    }
  }, [forgedAppId, selectedLeadId, selectedSequenceId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshKey]);

  useEffect(() => {
    const lead = status?.leads.find((l) => l.id === selectedLeadId);
    updateWorkspaceContext?.({
      selectedLeadId,
      selectedLeadName: lead?.name ?? "",
      selectedLeadEmail: lead?.email ?? "",
      selectedSequenceId,
    });
  }, [selectedLeadId, selectedSequenceId, status, updateWorkspaceContext]);

  const createLead = async () => {
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try {
      const json = await postForgedWork(forgedAppId, {
        action: "create_lead",
        name,
        email,
        company,
      });
      if (json.ok && json.lead) {
        setSelectedLeadId(json.lead.id);
        setName("");
        setEmail("");
        setCompany("");
        setSignal(`Lead added · ${json.lead.id}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
      }
    } finally {
      setBusy(false);
    }
  };

  const draftSequence = async () => {
    if (!selectedLeadId) return;
    setBusy(true);
    try {
      const json = await postForgedWork(forgedAppId, {
        action: "draft_sequence",
        leadId: selectedLeadId,
      });
      if (json.ok && json.sequence) {
        setSelectedSequenceId(json.sequence.id);
        setSignal(`Sequence drafted · ${json.sequence.id}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("draft_sequence");
      }
    } finally {
      setBusy(false);
    }
  };

  const sendSequenceStep = async () => {
    if (!selectedSequenceId) return;
    setBusy(true);
    try {
      const json = await postForgedWork(forgedAppId, {
        action: "send_sequence_step",
        sequenceId: selectedSequenceId,
      });
      if (json.ok && json.send) {
        setSignal(`Simulated send · ${json.send.id} · ${json.send.status}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("send_sequence_step");
      }
    } finally {
      setBusy(false);
    }
  };

  const sequencesForLead = status?.sequences.filter((s) => s.leadId === selectedLeadId) ?? [];

  return (
    <div className="space-y-4 font-mono text-[11px]">
      <p className="text-muted">
        Forged outreach desk — local pipeline on appliance. Simulated send path; wire SMTP on main Work Claw for live
        egress.
      </p>
      <p className="text-[10px] uppercase tracking-widest text-cursor-glow">{signal}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Add lead</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company (optional)"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="button"
            disabled={busy || !name.trim() || !email.trim()}
            onClick={() => void createLead()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Create lead
          </button>
        </div>

        <div className="space-y-2 border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Pipeline</p>
          {status?.leads.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {status.leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full border px-2 py-1 text-left ${
                      selectedLeadId === lead.id ? "border-cursor-glow text-cursor-glow" : "border-line text-stark"
                    }`}
                  >
                    {lead.name} · {lead.stage} · {lead.id}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No leads yet — add one or tap Create Lead in agent console.</p>
          )}
          <button
            type="button"
            disabled={busy || !selectedLeadId}
            onClick={() => void draftSequence()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Draft sequence
          </button>
        </div>
      </div>

      {sequencesForLead.length > 0 ? (
        <div className="border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Sequences</p>
          <ul className="mt-2 space-y-1">
            {sequencesForLead.map((seq) => (
              <li key={seq.id}>
                <button
                  type="button"
                  onClick={() => setSelectedSequenceId(seq.id)}
                  className={`w-full border px-2 py-1 text-left ${
                    selectedSequenceId === seq.id ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                  }`}
                >
                  {seq.id} · {seq.status} · step {seq.currentStepIndex + 1}/{seq.steps.length}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy || !selectedSequenceId}
            onClick={() => void sendSequenceStep()}
            className="mt-2 border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Send step (simulated)
          </button>
        </div>
      ) : null}

      {(status?.sends?.length ?? 0) > 0 ? (
        <div className="border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Recent sends</p>
          <ul className="mt-2 space-y-1 text-muted">
            {status!.sends.slice(-3).map((send) => (
              <li key={send.id}>
                {send.id} · {send.status} · {send.subject}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ForgedCreatorDeskPanel({
  forgedAppId,
  config,
  refreshKey = 0,
  onSkillHint,
  updateWorkspaceContext,
}: DeskPanelProps) {
  const primaryChannel =
    typeof config.primaryChannel === "string" ? (config.primaryChannel as ForgedCreatorPlatform) : "x";
  const [status, setStatus] = useState<ForgedCreatorQueueStatus | null>(null);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [draftText, setDraftText] = useState("");
  const [channel, setChannel] = useState("");
  const [platform, setPlatform] = useState<ForgedCreatorPlatform>(primaryChannel === "multi" ? "x" : primaryChannel);
  const [busy, setBusy] = useState(false);
  const [signal, setSignal] = useState("Loading content queue…");

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/forged/${forgedAppId}/status`, { cache: "no-store" });
    if (!res.ok) {
      setSignal("Could not load forged content queue");
      return;
    }
    const json = (await res.json()) as { status?: ForgedCreatorQueueStatus };
    if (json.status) {
      setStatus(json.status);
      const selected = json.status.posts.find((p) => p.id === selectedPostId) ?? json.status.posts[0];
      if (selected && !selectedPostId) {
        setSelectedPostId(selected.id);
        setDraftText(selected.draftText);
        setChannel(selected.channel);
        setPlatform(selected.platform);
      }
      setSignal(
        `${json.status.stats.postCount} posts · ${json.status.stats.draftCount} drafts · ${json.status.stats.scheduledCount} scheduled`,
      );
    }
  }, [forgedAppId, selectedPostId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshKey]);

  useEffect(() => {
    const post = status?.posts.find((p) => p.id === selectedPostId);
    updateWorkspaceContext?.({
      selectedPostId,
      selectedPostDraft: post?.draftText ?? draftText,
      primaryChannel: platform,
      channel: post?.channel ?? channel,
    });
  }, [selectedPostId, status, draftText, platform, channel, updateWorkspaceContext]);

  const selectPost = (postId: string) => {
    setSelectedPostId(postId);
    const post = status?.posts.find((p) => p.id === postId);
    if (post) {
      setDraftText(post.draftText);
      setChannel(post.channel);
      setPlatform(post.platform);
    }
  };

  const saveDraft = async () => {
    if (!draftText.trim()) return;
    setBusy(true);
    try {
      const json = (await postForgedDesk(forgedAppId, {
        action: "draft_post",
        postId: selectedPostId || undefined,
        draftText,
        channel: channel || undefined,
        platform,
      })) as {
        ok: boolean;
        post?: { id: string; stage: string };
        status?: ForgedCreatorQueueStatus;
        error?: string;
      };
      if (json.ok && json.post) {
        setSelectedPostId(json.post.id);
        setSignal(`Draft saved · ${json.post.id} · ${json.post.stage}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("draft_post");
      }
    } finally {
      setBusy(false);
    }
  };

  const scheduleDraft = async () => {
    if (!selectedPostId) return;
    setBusy(true);
    try {
      const json = (await postForgedDesk(forgedAppId, {
        action: "schedule_post",
        postId: selectedPostId,
      })) as {
        ok: boolean;
        post?: { id: string; scheduledAt: string | null };
        status?: ForgedCreatorQueueStatus;
      };
      if (json.ok && json.post) {
        const when = json.post.scheduledAt ? new Date(json.post.scheduledAt).toLocaleString() : "next slot";
        setSignal(`Scheduled · ${json.post.id} · ${when}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("schedule_post");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-[11px]">
      <p className="text-muted">
        Forged creator desk — local content queue on appliance. Simulated publish path; wire digital bridges on main
        Creator Claw for live egress.
      </p>
      <p className="text-[10px] uppercase tracking-widest text-cursor-glow">{signal}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Draft post</p>
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Channel name"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ForgedCreatorPlatform)}
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          >
            <option value="x">X / Twitter</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="multi">Multi-channel</option>
          </select>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={4}
            placeholder="Draft post or thread idea…"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="button"
            disabled={busy || !draftText.trim()}
            onClick={() => void saveDraft()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Save draft
          </button>
        </div>

        <div className="space-y-2 border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Queue</p>
          {status?.posts.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {status.posts.map((post) => (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => selectPost(post.id)}
                    className={`w-full border px-2 py-1 text-left ${
                      selectedPostId === post.id ? "border-cursor-glow text-cursor-glow" : "border-line text-stark"
                    }`}
                  >
                    {post.id} · {post.platform} · {post.stage}
                    {post.scheduledAt ? ` · ${new Date(post.scheduledAt).toLocaleDateString()}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No posts yet — save a draft or tap Draft Post in agent console.</p>
          )}
          <button
            type="button"
            disabled={busy || !selectedPostId}
            onClick={() => void scheduleDraft()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Schedule post
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForgedCapitalDeskPanel({
  forgedAppId,
  config,
  refreshKey = 0,
  onSkillHint,
  updateWorkspaceContext,
}: DeskPanelProps) {
  const defaultTicker =
    typeof config.watchlist === "object" && Array.isArray(config.watchlist) && typeof config.watchlist[0] === "string"
      ? config.watchlist[0]
      : "SPY";
  const [status, setStatus] = useState<ForgedCapitalQueueStatus | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [ticker, setTicker] = useState(defaultTicker);
  const [ruleName, setRuleName] = useState("");
  const [ruleAsset, setRuleAsset] = useState(defaultTicker);
  const [busy, setBusy] = useState(false);
  const [signal, setSignal] = useState("Loading capital desk…");

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/forged/${forgedAppId}/status`, { cache: "no-store" });
    if (!res.ok) {
      setSignal("Could not load forged capital desk");
      return;
    }
    const json = (await res.json()) as { status?: ForgedCapitalQueueStatus };
    if (json.status) {
      setStatus(json.status);
      if (!selectedRuleId && json.status.rules[0]) setSelectedRuleId(json.status.rules[0].id);
      setSignal(
        `${json.status.stats.watchCount} tickers · ${json.status.stats.ruleCount} rules · ${json.status.stats.armedRules} armed`,
      );
    }
  }, [forgedAppId, selectedRuleId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshKey]);

  useEffect(() => {
    const rule = status?.rules.find((r) => r.id === selectedRuleId);
    const watch = status?.watchlist.find((w) => w.ticker === rule?.asset) ?? status?.watchlist[0];
    updateWorkspaceContext?.({
      selectedRuleId,
      selectedTicker: watch?.ticker ?? ticker,
      ruleAsset: rule?.asset ?? ruleAsset,
    });
  }, [selectedRuleId, status, ticker, ruleAsset, updateWorkspaceContext]);

  const researchTicker = async () => {
    if (!ticker.trim()) return;
    setBusy(true);
    try {
      const json = (await postForgedDesk(forgedAppId, {
        action: "research_ticker",
        ticker,
      })) as { ok: boolean; watch?: { ticker: string }; status?: ForgedCapitalQueueStatus };
      if (json.ok) {
        setSignal(`Research · ${ticker.toUpperCase()}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("research_ticker");
      }
    } finally {
      setBusy(false);
    }
  };

  const createRule = async () => {
    const asset = (ruleAsset || ticker).trim();
    if (!asset) return;
    setBusy(true);
    try {
      const json = (await postForgedDesk(forgedAppId, {
        action: "create_rule",
        name: ruleName || `${asset} rule`,
        asset,
      })) as { ok: boolean; rule?: { id: string }; status?: ForgedCapitalQueueStatus };
      if (json.ok && json.rule) {
        setSelectedRuleId(json.rule.id);
        setSignal(`Rule created · ${json.rule.id}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
      }
    } finally {
      setBusy(false);
    }
  };

  const armRule = async () => {
    if (!selectedRuleId) return;
    setBusy(true);
    try {
      const json = (await postForgedDesk(forgedAppId, {
        action: "arm_rule",
        ruleId: selectedRuleId,
      })) as { ok: boolean; rule?: { id: string; state: string }; status?: ForgedCapitalQueueStatus };
      if (json.ok && json.rule) {
        setSignal(`Armed · ${json.rule.id}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("arm_rule");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-[11px]">
      <p className="text-muted">
        Forged capital desk — local watchlist and rules on appliance. Paper evaluation only; wire broker bridge on main
        Capital Claw for live egress.
      </p>
      <p className="text-[10px] uppercase tracking-widest text-cursor-glow">{signal}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">Research ticker</p>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="SPY"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="button"
            disabled={busy || !ticker.trim()}
            onClick={() => void researchTicker()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Add to watchlist
          </button>
          {status?.watchlist.length ? (
            <ul className="mt-2 space-y-1 text-[10px] text-muted">
              {status.watchlist.map((w) => (
                <li key={w.ticker}>
                  {w.ticker}
                  {w.lastPrice != null ? ` · $${w.lastPrice.toFixed(2)}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-2 border border-line bg-panel p-3">
          <p className="text-[10px] uppercase tracking-widest text-stark">IF/THEN rules</p>
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="Rule name"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <input
            value={ruleAsset}
            onChange={(e) => setRuleAsset(e.target.value.toUpperCase())}
            placeholder="Asset"
            className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="button"
            disabled={busy || !ruleAsset.trim()}
            onClick={() => void createRule()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Create rule
          </button>
          {status?.rules.length ? (
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {status.rules.map((rule) => (
                <li key={rule.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`w-full border px-2 py-1 text-left ${
                      selectedRuleId === rule.id ? "border-cursor-glow text-cursor-glow" : "border-line text-stark"
                    }`}
                  >
                    {rule.id} · {rule.asset} · {rule.state}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No rules yet — create one or tap skills in agent console.</p>
          )}
          <button
            type="button"
            disabled={busy || !selectedRuleId}
            onClick={() => void armRule()}
            className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
          >
            Arm rule
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForgedKioskDeskPanel({ onSkillHint }: DeskPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[11px]">
      <p className="text-muted">
        Lane A · idle · vision stream available from Forge Mint tab when mesh camera is connected.
      </p>
      <button
        type="button"
        onClick={() => onSkillHint?.("publish_context")}
        className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow"
      >
        Publish lane context →
      </button>
    </div>
  );
}
