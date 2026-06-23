"use client";

import { useCallback, useEffect, useState } from "react";

import { SignalFeedDeskPanel } from "@/components/apps/signal/SignalFeedDeskPanel";
import { HumanoidKinPolicyPanel } from "@/components/apps/humanoid/HumanoidKinPolicyPanel";
import { HumanoidKnowledgeAuditPanel } from "@/components/apps/humanoid/HumanoidKnowledgeAuditPanel";
import type { HumanoidHubStatus } from "@/lib/humanoid-hub-types";

interface HumanoidKnowledgePanelProps {
  onStatus?: (message: string) => void;
}

const SUGGESTED_RULES = [
  "Shoes off at the door",
  "Ask before any kitchen task",
  "Use quiet voice after 10pm",
  "Greet guests by name from Kin profiles",
];

export function HumanoidKnowledgePanel({ onStatus }: HumanoidKnowledgePanelProps) {
  const [data, setData] = useState<HumanoidHubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [ruleText, setRuleText] = useState("");
  const [showWorldContext, setShowWorldContext] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/humanoid/hub", { cache: "no-store" });
    if (!res.ok) return;
    setData((await res.json()) as HumanoidHubStatus);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/humanoid/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as HumanoidHubStatus & { ok?: boolean; error?: string; message?: string };
      if (json.ok !== false) {
        setData(json);
        onStatus?.(json.message ?? "Knowledge updated");
      } else {
        onStatus?.(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        Package what your humanoid should know — house rules, household context, and relationship tone. Everything
        publishes to the Claw Context mesh on your appliance until pair day.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data?.readiness.ccpScopes.map((scope) => (
          <div
            key={scope.scope}
            className={`border p-3 ${scope.linked ? "border-cursor-glow/40 bg-cursor-glow/5" : "border-line bg-panel"}`}
          >
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{scope.label}</p>
            <p className={`mt-1 font-mono text-[10px] ${scope.linked ? "text-cursor-glow" : "text-stark"}`}>
              {scope.linked ? "Linked" : "Optional"}
            </p>
            <p className="mt-1 font-mono text-[9px] text-muted">{scope.detail}</p>
          </div>
        ))}
      </div>

      <div className="border border-line bg-panel p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Kin-aware robot policy</p>
        <div className="mt-3">
          <HumanoidKinPolicyPanel
            policies={data?.kinPolicies ?? []}
            busy={busy}
            onUpdate={(memberId, patch) => void post({ action: "update_kin_policy", memberId, ...patch })}
          />
        </div>
      </div>

      <HumanoidKnowledgeAuditPanel onStatus={onStatus} />

      <div className="border border-line bg-panel p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">House rules · robot memory</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_RULES.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => void post({ action: "add_rule", text: suggestion, priority: "essential" })}
              className="border border-line px-2 py-0.5 font-mono text-[9px] text-muted hover:border-cursor-glow hover:text-cursor-glow"
            >
              + {suggestion}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            placeholder="e.g. Shoes off at the door · Ask before kitchen tasks"
            className="min-w-[240px] flex-1 border border-line bg-void px-2 py-1.5 font-mono text-[10px] text-stark"
          />
          <button
            type="button"
            disabled={busy || !ruleText.trim()}
            onClick={() => {
              void post({ action: "add_rule", text: ruleText, priority: "essential" }).then(() => setRuleText(""));
            }}
            className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
          >
            Teach rule
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void post({ action: "sync_knowledge" })}
            className="border border-cursor-glow bg-surface px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
          >
            Push to mesh
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {(data?.hub.houseRules ?? []).length === 0 ? (
            <li className="font-mono text-[10px] text-muted">No rules yet — add essentials your humanoid must respect.</li>
          ) : (
            data!.hub.houseRules.map((rule) => (
              <li key={rule.id} className="flex items-start justify-between gap-2 border border-line/60 px-2 py-1.5">
                <div className="font-mono text-[10px]">
                  <span className="text-stark">{rule.text}</span>
                  <span className="ml-2 text-muted">{rule.priority}</span>
                  {rule.syncedAt ? (
                    <span className="ml-2 text-cursor-glow/80">synced</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void post({ action: "remove_rule", ruleId: rule.id })}
                  className="shrink-0 font-mono text-[9px] uppercase text-muted hover:text-stark"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="border border-line bg-panel p-4">
        <button
          type="button"
          onClick={() => setShowWorldContext((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-stark"
        >
          {showWorldContext ? "▼" : "▶"} Ambient world context (optional · preview)
        </button>
        {showWorldContext ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-3 font-mono text-[9px] text-muted">
              Future humanoids can react to home-relevant signals — today this feeds your digital Claws.
            </p>
            <SignalFeedDeskPanel onStatus={onStatus} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
