"use client";

import { useCallback, useEffect, useState } from "react";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { useForgeAssist } from "@/components/claw/ForgeAssistProvider";
import {
  BUDGET_TIERS,
  LOCAL_LLM_CATALOG,
  modelsForTier,
  type BudgetTier,
} from "@/lib/local-llm-catalog";

interface ForgeStacksPanelProps {
  budgetTier: BudgetTier;
  onBudgetTierChange: (tier: BudgetTier) => void;
}

export function ForgeStacksPanel({ budgetTier, onBudgetTierChange }: ForgeStacksPanelProps) {
  const forge = useForgeAssist();
  const [rationale, setRationale] = useState<string | null>(null);

  const fetchRecommendation = useCallback(async () => {
    const intent = forge.intent.trim();
    if (!intent) {
      setRationale(null);
      return;
    }
    const res = await fetch("/api/claw/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, budgetTier }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { rationale: string };
    setRationale(data.rationale);
  }, [forge.intent, budgetTier]);

  useEffect(() => {
    void fetchRecommendation();
  }, [fetchRecommendation]);

  const tierModels = modelsForTier(budgetTier);

  return (
    <div className="space-y-4">
      <ExperienceAppSection
        appId="claw-forge"
        sectionId="stacks-budget"
        minLevel="standard"
        title="UMA Budget Tiers"
        subtitle="Local-only models on Pillar 1 — no cloud API rent"
      >
        <div className="grid gap-2 md:grid-cols-3">
          {BUDGET_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => onBudgetTierChange(tier.id)}
              className={`border px-3 py-2 text-left ${
                budgetTier === tier.id ? "border-cursor-glow bg-surface" : "border-line hover:border-line/80"
              }`}
            >
              <div className="font-mono text-xs uppercase text-stark">{tier.label}</div>
              <div className="mt-1 font-mono text-[10px] text-muted">{tier.description}</div>
              <div className="mt-1 font-mono text-[10px] text-muted">≤ {tier.umaCapGb} GB UMA</div>
            </button>
          ))}
        </div>
        {rationale ? (
          <p className="mt-3 border border-line bg-void px-3 py-2 font-mono text-[11px] text-muted">
            Recommend: {rationale}
          </p>
        ) : null}
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="claw-forge"
        sectionId="stacks-catalog"
        minLevel="standard"
        title="Local LLM Catalog"
        subtitle={`${tierModels.length} models available at ${budgetTier} tier`}
      >
        <ul className="divide-y divide-line border border-line">
          {LOCAL_LLM_CATALOG.map((model) => {
            const inTier = model.tiers.includes(budgetTier);
            return (
              <li
                key={model.id}
                className={`px-3 py-2 font-mono text-xs ${inTier ? "text-stark" : "text-muted/50"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{model.name}</span>
                  <span className="text-[10px] uppercase tracking-widest">{model.role}</span>
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  {model.id} · ~{model.umaGb} GB · {model.tokensPerSec} tok/s
                </div>
                <div className="mt-1 text-[10px] text-muted">{model.description}</div>
              </li>
            );
          })}
        </ul>
      </ExperienceAppSection>
    </div>
  );
}
