"use client";

import { useCallback, useEffect, useState } from "react";

import { activeAdsForPlacement } from "@/lib/capital-pfm-ads";
import type { FinancialSuggestion, PfmSnapshot, WealthGoal } from "@/lib/capital-pfm-types";

interface CapitalPfmPanelProps {
  onSuggestionAction?: (suggestion: FinancialSuggestion) => void;
}

function formatUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function CapitalPfmPanel({ onSuggestionAction }: CapitalPfmPanelProps) {
  const [snapshot, setSnapshot] = useState<PfmSnapshot | null>(null);
  const [tab, setTab] = useState<"overview" | "spending" | "wealth" | "suggestions">("overview");
  const [signal, setSignal] = useState("Loading PFM…");

  const load = useCallback(async () => {
    const res = await fetch("/api/capital/pfm", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as PfmSnapshot;
    setSnapshot(data);
    setSignal(`Synced ${new Date(data.updatedAt).toLocaleTimeString()}`);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateGoal = async (goalId: string, monthlyContributionUsd: number) => {
    const res = await fetch("/api/capital/pfm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_goal", goalId, monthlyContributionUsd }),
    });
    const json = (await res.json()) as { ok: boolean; snapshot?: PfmSnapshot };
    if (json.snapshot) setSnapshot(json.snapshot);
    setSignal(`Goal updated · $${monthlyContributionUsd}/mo`);
  };

  if (!snapshot) {
    return <p className="font-mono text-xs text-muted">{signal}</p>;
  }

  const overviewAds = activeAdsForPlacement(snapshot.contextualAds, "pfm_overview");
  const wealthAds = activeAdsForPlacement(snapshot.contextualAds, "wealth_plan");
  const suggestionAds = activeAdsForPlacement(snapshot.contextualAds, "suggestions");

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "spending" as const, label: "Spending" },
    { id: "wealth" as const, label: "Wealth plan" },
    { id: "suggestions" as const, label: "Suggestions" },
  ];

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border px-2 py-0.5 text-[9px] uppercase ${
                tab === t.id ? "border-cursor-glow text-cursor-glow" : "border-line text-muted hover:text-stark"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
        >
          Refresh
        </button>
      </div>
      <p className="text-[10px] text-muted">
        {signal} · {snapshot.dataSource === "plaid" ? "Plaid-linked" : "Mint-style demo"} on-appliance
        {snapshot.netWorthDelta30dPct != null
          ? ` · 30d net worth Δ ${snapshot.netWorthDelta30dPct > 0 ? "+" : ""}${snapshot.netWorthDelta30dPct}%`
          : ""}
      </p>

      {tab === "overview" ? (
        <>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="border border-line p-2">
              <p className="text-[10px] uppercase text-muted">Net worth</p>
              <p className="text-stark">{formatUsd(snapshot.netWorthUsd)}</p>
            </div>
            <div className="border border-line p-2">
              <p className="text-[10px] uppercase text-muted">Income ({snapshot.cashFlow.periodDays}d)</p>
              <p className="text-cursor-glow">{formatUsd(snapshot.cashFlow.incomeUsd)}</p>
            </div>
            <div className="border border-line p-2">
              <p className="text-[10px] uppercase text-muted">Spend</p>
              <p className="text-stark">{formatUsd(snapshot.cashFlow.spendUsd)}</p>
            </div>
            <div className="border border-line p-2">
              <p className="text-[10px] uppercase text-muted">Savings rate</p>
              <p className="text-stark">{snapshot.cashFlow.savingsRatePct}%</p>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Linked accounts</p>
            {snapshot.accounts.map((a) => (
              <div key={a.id} className="flex justify-between border-b border-line/40 py-1">
                <span className="text-stark">
                  {a.institution} · {a.name}
                </span>
                <span className={a.balanceUsd < 0 ? "text-red-400" : "text-stark"}>
                  {formatUsd(a.balanceUsd)}
                </span>
              </div>
            ))}
          </div>
          {overviewAds.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </>
      ) : null}

      {tab === "spending" ? (
        <>
          <p className="text-[10px] uppercase tracking-widest text-muted">Category breakdown (30d)</p>
          {snapshot.spendingByCategory.length === 0 ? (
            <p className="text-muted">No spend data yet.</p>
          ) : (
            snapshot.spendingByCategory.map((c) => (
              <div key={c.category} className="flex justify-between border-b border-line/40 py-1">
                <span className="text-stark">{c.label}</span>
                <span>
                  {formatUsd(c.amountUsd)} · {c.pctOfSpend}%
                  {c.trendPctMoM != null ? (
                    <span className={c.trendPctMoM > 0 ? " text-red-400" : " text-cursor-glow"}>
                      {" "}
                      ({c.trendPctMoM > 0 ? "+" : ""}
                      {c.trendPctMoM}% MoM)
                    </span>
                  ) : null}
                </span>
              </div>
            ))
          )}
          <p className="mt-2 text-[10px] text-muted">
            Investable surplus: {formatUsd(snapshot.cashFlow.investableSurplusUsd)}/mo
          </p>
        </>
      ) : null}

      {tab === "wealth" ? (
        <>
          {snapshot.goals.map((g) => (
            <GoalRow key={g.id} goal={g} onUpdate={(amt) => void updateGoal(g.id, amt)} />
          ))}
          {wealthAds.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </>
      ) : null}

      {tab === "suggestions" ? (
        <>
          {snapshot.suggestions.length === 0 ? (
            <p className="text-muted">No suggestions — spending looks balanced.</p>
          ) : (
            snapshot.suggestions.map((s) => (
              <div key={s.id} className="border border-line p-2">
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase text-cursor-glow">{s.kind}</span>
                  <span className="text-[10px] text-muted">{s.priority}</span>
                </div>
                <p className="mt-1 text-stark">{s.title}</p>
                <p className="mt-1 text-muted">{s.body}</p>
                {s.actionLabel && s.actionType ? (
                  <button
                    type="button"
                    onClick={() => onSuggestionAction?.(s)}
                    className="mt-2 border border-line px-2 py-0.5 text-[9px] uppercase hover:text-cursor-glow"
                  >
                    {s.actionLabel}
                  </button>
                ) : null}
              </div>
            ))
          )}
          {suggestionAds.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function GoalRow({ goal, onUpdate }: { goal: WealthGoal; onUpdate: (monthly: number) => void }) {
  const pct = Math.min(100, (goal.currentUsd / goal.targetUsd) * 100);
  return (
    <div className="border border-line p-2">
      <div className="flex justify-between">
        <span className="text-stark">{goal.name}</span>
        <span>
          {formatUsd(goal.currentUsd)} / {formatUsd(goal.targetUsd)}
        </span>
      </div>
      <div className="mt-1 h-1 bg-line">
        <div className="h-full bg-cursor-glow" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-muted">${goal.monthlyContributionUsd}/mo</span>
        <button
          type="button"
          onClick={() => onUpdate(goal.monthlyContributionUsd + 100)}
          className="border border-line px-1 py-0.5 text-[9px] uppercase hover:text-cursor-glow"
        >
          +$100/mo
        </button>
      </div>
    </div>
  );
}

function AdCard({ ad }: { ad: { sponsor: string; headline: string; body: string; ctaLabel: string; disclosure: string } }) {
  return (
    <div className="border border-dashed border-line/60 bg-panel/50 p-2 text-[10px]">
      <p className="uppercase tracking-widest text-muted">Sponsored · {ad.sponsor}</p>
      <p className="mt-1 text-stark">{ad.headline}</p>
      <p className="text-muted">{ad.body}</p>
      <p className="mt-1 text-[9px] text-muted">{ad.disclosure}</p>
    </div>
  );
}
