"use client";

import { useCallback, useState } from "react";

import type { KnowledgeAuditPackage } from "@/lib/humanoid-hub-types";
import { policyBehaviorSummary } from "@/lib/humanoid-kin-policy-display";

interface HumanoidKnowledgeAuditPanelProps {
  onStatus?: (message: string) => void;
}

export function HumanoidKnowledgeAuditPanel({ onStatus }: HumanoidKnowledgeAuditPanelProps) {
  const [audit, setAudit] = useState<KnowledgeAuditPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/humanoid/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "knowledge_audit" }),
      });
      const json = (await res.json()) as { ok?: boolean; audit?: KnowledgeAuditPackage; error?: string };
      if (json.ok !== false && json.audit) {
        setAudit(json.audit);
        setOpen(true);
        onStatus?.("Memory audit generated — preview package for pair day");
      } else {
        onStatus?.(json.error ?? "Audit failed");
      }
    } finally {
      setBusy(false);
    }
  }, [onStatus]);

  return (
    <div className="border border-cursor-glow/20 bg-void/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Pair-day memory audit</p>
          <p className="mt-1 font-mono text-[9px] text-muted">
            Exact package your robot inherits — rules, Kin policies, routines, fleet, CCP consent.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
        >
          {busy ? "Building…" : "View audit"}
        </button>
      </div>

      {open && audit ? (
        <div className="mt-4 space-y-3 border-t border-line pt-4 font-mono text-[10px]">
          <p className="text-muted">
            Generated {new Date(audit.generatedAt).toLocaleString()} · {audit.packageSummary}
          </p>

          <Section title="Relationship">
            Calls you {audit.relationship.callName} · {audit.relationship.tone} tone · guest mode{" "}
            {audit.relationship.guestModeEnabled ? "on" : "off"}
          </Section>

          <Section title={`House rules (${audit.houseRules.length})`}>
            {audit.houseRules.length === 0 ? (
              <span className="text-muted">None yet</span>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-stark">
                {audit.houseRules.map((r) => (
                  <li key={r.id}>
                    {r.text} <span className="text-muted">({r.priority})</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Kin-aware policies (${audit.kinPolicies.length})`}>
            <ul className="space-y-2">
              {audit.kinPolicies.map((p) => (
                <li key={p.memberId} className="border border-line/50 px-2 py-1">
                  <span className="text-stark">{p.displayName}</span>{" "}
                  <span className="text-muted">({p.role})</span>
                  <p className="mt-0.5 text-[9px] text-muted">{policyBehaviorSummary(p)}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={`Armed routines (${audit.armedRoutines.length})`}>
            {audit.armedRoutines.map((r) => (
              <p key={r.id} className="text-stark">
                {r.label} · {r.trigger}
              </p>
            ))}
          </Section>

          <Section title={`Fleet (${audit.fleet.length})`}>
            {audit.fleet.map((u) => (
              <p key={u.id} className="text-stark">
                {u.displayName} · {u.kind} · {u.pairedAt ? "paired preview" : "awaiting pair"}
              </p>
            ))}
          </Section>

          <Section title="CCP consent (Signal Claw reads)">
            <div className="flex flex-wrap gap-2">
              {audit.ccpConsent.map((c) => (
                <span
                  key={c.scope}
                  className={`border px-2 py-0.5 text-[9px] ${c.allowed ? "border-cursor-glow/40 text-cursor-glow" : "border-line text-muted"}`}
                >
                  {c.label}: {c.allowed ? "allowed" : "blocked"}
                </span>
              ))}
            </div>
          </Section>

          {audit.vitalSummary ? <Section title="Vital">{audit.vitalSummary}</Section> : null}

          <details className="text-[9px] text-muted">
            <summary className="cursor-pointer uppercase tracking-widest">Raw JSON export</summary>
            <pre className="mt-2 max-h-48 overflow-auto border border-line bg-void p-2 text-[8px]">
              {JSON.stringify(audit, null, 2)}
            </pre>
          </details>

          <button type="button" onClick={() => setOpen(false)} className="text-[9px] uppercase text-muted hover:text-stark">
            Close audit
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-muted">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
