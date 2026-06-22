"use client";

import { useCallback, useEffect, useState } from "react";

import type { ForgedWorkQueueStatus } from "@/lib/forged-work-store";
import type { WorkLead, WorkSequence } from "@/lib/work-queue-types";

interface DeskPanelProps {
  forgedAppId: string;
  config: Record<string, unknown>;
  refreshKey?: number;
  onSkillHint?: (skillId: string) => void;
  updateWorkspaceContext?: (patch: Record<string, unknown>) => void;
}

async function postForgedWork(forgedAppId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/forged/${forgedAppId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{
    ok: boolean;
    status?: ForgedWorkQueueStatus;
    lead?: WorkLead;
    sequence?: WorkSequence;
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
    if (json.status) {
      setStatus(json.status);
      if (!selectedLeadId && json.status.leads[0]) {
        setSelectedLeadId(json.status.leads[0].id);
      }
      setSignal(`${json.status.stats.leadCount} leads · ${json.status.stats.sequenceCount} sequences`);
    }
  }, [forgedAppId, selectedLeadId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshKey]);

  useEffect(() => {
    const lead = status?.leads.find((l) => l.id === selectedLeadId);
    updateWorkspaceContext?.({
      selectedLeadId,
      selectedLeadName: lead?.name ?? "",
      selectedLeadEmail: lead?.email ?? "",
    });
  }, [selectedLeadId, status, updateWorkspaceContext]);

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
        setSignal(`Sequence drafted · ${json.sequence.id}`);
        if (json.status) setStatus(json.status);
        else await loadStatus();
        onSkillHint?.("draft_sequence");
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
              <li key={seq.id} className="text-muted">
                {seq.id} · {seq.status} · {seq.steps.length} steps
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ForgedCreatorDeskPanel({ onSkillHint }: DeskPanelProps) {
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-3 font-mono text-[11px]">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder="Draft post or thread idea…"
        className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
      />
      <button
        type="button"
        disabled={!draft.trim()}
        onClick={() => onSkillHint?.("plan_day")}
        className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
      >
        Schedule draft →
      </button>
    </div>
  );
}

export function ForgedCapitalDeskPanel({ config, onSkillHint }: DeskPanelProps) {
  const tickers = Array.isArray(config.watchlist)
    ? (config.watchlist as unknown[]).filter((t): t is string => typeof t === "string")
    : ["SPY", "QQQ"];

  return (
    <div className="space-y-3 font-mono text-[11px]">
      <div className="flex flex-wrap gap-1">
        {tickers.map((t) => (
          <span key={t} className="border border-line px-2 py-0.5 text-[10px] text-stark">
            {t}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSkillHint?.("plan_day")}
        className="border border-cursor-glow px-3 py-1.5 text-[10px] uppercase tracking-widest text-cursor-glow"
      >
        Research watchlist →
      </button>
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
