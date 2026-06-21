"use client";

export interface MetricsRuleRow {
  id: string;
  label: string;
  enabled: boolean;
  condition: { type: string; minViews?: number; minRate?: number; minSamples?: number; marginPct?: number };
  action: { type: string; preset?: string; target?: string; offsetHours?: number };
  cooldownHours: number;
}

export interface MetricsRuleFireRow {
  id: string;
  at: string;
  ruleId: string;
  postId: string;
  action: string;
  detail: string;
  ok: boolean;
  error: string | null;
}

interface ContentMetricsRulesPanelProps {
  rules: MetricsRuleRow[];
  fires: MetricsRuleFireRow[];
  rulesEnabled: boolean;
  onRefresh: () => void;
  onRunNow: () => void;
  busy?: boolean;
}

function conditionSummary(rule: MetricsRuleRow): string {
  if (rule.condition.type === "views_gte") {
    return `≥ ${rule.condition.minViews ?? 0} views`;
  }
  if (rule.condition.type === "engagement_gte") {
    return `≥ ${((rule.condition.minRate ?? 0) * 100).toFixed(1)}% engagement`;
  }
  if (rule.condition.type === "hook_winner") {
    return `Hook wins (n≥${rule.condition.minSamples ?? 2})`;
  }
  return rule.condition.type;
}

function actionSummary(rule: MetricsRuleRow): string {
  if (rule.action.type === "repurpose") return `Repurpose → ${rule.action.preset ?? "single_to_all"}`;
  if (rule.action.type === "select_hook") return `Apply hook → ${rule.action.target ?? "next_draft"}`;
  if (rule.action.type === "schedule") return `Schedule +${rule.action.offsetHours ?? 24}h`;
  return rule.action.type;
}

export function ContentMetricsRulesPanel({
  rules,
  fires,
  rulesEnabled,
  onRefresh,
  onRunNow,
  busy,
}: ContentMetricsRulesPanelProps) {
  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await fetch("/api/content/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "metrics_rules_update", ruleId, enabled }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          Master gate:{" "}
          <span className={rulesEnabled ? "text-cursor-glow" : "text-stark"}>
            {rulesEnabled ? "Auto-apply ON" : "Off — enable in FRE or CURXOR_METRICS_RULES_ENABLED"}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onRunNow}
            className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
          >
            Run rules now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRefresh}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {rules.map((rule) => (
          <li key={rule.id} className="border border-line bg-panel p-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-stark">{rule.label}</p>
                <p className="mt-1 text-muted">
                  When {conditionSummary(rule)} → {actionSummary(rule)} · cooldown {rule.cooldownHours}h
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleRule(rule.id, !rule.enabled)}
                className={`border px-2 py-0.5 uppercase ${
                  rule.enabled ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                }`}
              >
                {rule.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {fires.length > 0 ? (
        <div className="border border-line bg-panel p-3">
          <p className="mb-2 uppercase tracking-widest text-muted">Recent auto-actions</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {fires.slice(0, 10).map((f) => (
              <li key={f.id} className="flex flex-wrap gap-x-2 text-muted">
                <span className={f.ok ? "text-cursor-glow" : "text-red-400"}>{f.ok ? "ok" : "fail"}</span>
                <span className="text-stark">{f.ruleId}</span>
                <span>{f.postId}</span>
                <span className="truncate">{f.detail}</span>
                <span className="opacity-60">{new Date(f.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted">No auto-actions yet — runs after each metrics pull when enabled.</p>
      )}
    </div>
  );
}
