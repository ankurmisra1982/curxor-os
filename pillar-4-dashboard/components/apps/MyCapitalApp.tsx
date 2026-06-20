"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import { DigitalReceiptPanel } from "@/components/digital/DigitalReceiptPanel";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useDigitalStream } from "@/hooks/useDigitalStream";
import { useMotorStream } from "@/hooks/useMotorStream";
import { formatTradeReceipt } from "@/lib/digital-protocol";
import type { CapitalRule } from "@/lib/capital-portfolio";

interface CapitalStatusResponse {
  source: "alpaca" | "demo";
  tradingMode: string;
  riskProfile: string;
  bridgeConfigured: boolean;
  portfolioValue: number | null;
  portfolioLabel: string;
  buyingPower: number | null;
  rules: CapitalRule[];
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function MyCapitalApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { command, connected } = useMotorStream();
  const digital = useDigitalStream("capital.execute_trade");
  const mode = typeof config.tradingMode === "string" ? config.tradingMode : "paper";
  const risk = typeof config.riskProfile === "string" ? config.riskProfile : "balanced";
  const [status, setStatus] = useState<CapitalStatusResponse | null>(null);
  const [rules, setRules] = useState<CapitalRule[]>([]);
  const [selected, setSelected] = useState("RULE-01");
  const [lastSignal, setLastSignal] = useState("Awaiting rule evaluation");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/capital/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as CapitalStatusResponse;
      setStatus(data);
      setRules(data.rules);
      if (data.rules[0] && !data.rules.some((r) => r.id === selected)) {
        setSelected(data.rules[0].id);
      }
    } catch {
      /* retry on next poll */
    }
  }, [selected]);

  useEffect(() => {
    void loadStatus();
    const timer = setInterval(() => void loadStatus(), 30_000);
    return () => clearInterval(timer);
  }, [loadStatus]);

  useEffect(() => {
    const rule = rules.find((r) => r.id === selected);
    if (!rule) return;
    updateWorkspaceContext({
      selectedRuleId: rule.id,
      selectedAsset: rule.asset,
      selectedRuleName: rule.name,
    });
  }, [selected, rules, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    const stamp = new Date().toLocaleTimeString();
    const rule = rules.find((r) => r.id === selected);

    if (lastSkillId === "arm_rule") {
      setRules((prev) =>
        prev.map((r) => (r.id === selected ? { ...r, state: "ARMED" as const } : r)),
      );
      setLastSignal(`${selected} armed · ${mode} · ${stamp}`);
      return;
    }

    if (lastSkillId === "execute_trade") {
      setLastSignal(`${rule?.asset ?? selected} trade queued · ${mode} · ${stamp}`);
      void loadStatus();
      return;
    }

    if (lastSkillId === "rebalance") {
      setLastSignal(`Rebalance simulated · ${stamp}`);
    }
  }, [skillTick, lastSkillId, selected, mode, rules, loadStatus]);

  const portfolioSource = status?.source === "alpaca" ? "Alpaca live" : status?.bridgeConfigured ? "demo" : "demo";

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-capital").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Capital Claw Desk</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          {risk} risk · {mode} · {lastSignal}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric
          label="Portfolio"
          value={formatUsd(status?.portfolioValue ?? null)}
          unit={status?.portfolioLabel ?? portfolioSource}
          highlight
        />
        <AppMetric label="Buying power" value={formatUsd(status?.buyingPower ?? null)} unit="paper" />
        <AppMetric label="Active Rule" value={selected} unit="tap row" />
        <AppMetric label="Engine" value={connected ? "SYNC" : "IDLE"} unit={`claw ${command?.clawId ?? "—"}`} />
        <AppMetric
          label="Bridge"
          value={digital.connected ? "LIVE" : status?.bridgeConfigured ? "READY" : "OFF"}
          unit={status?.source === "alpaca" ? "Alpaca paper" : "configure digital.env"}
        />
      </div>

      <AppSection title="Rule Engine" subtitle="WHEN / THEN blocks · Arm Rule · Execute Trade via digital bridge">
        <div className="mb-4 border border-line bg-panel p-3 font-mono text-[10px] text-muted">
          WHEN [asset] [condition] THEN [action] — evaluated locally; trades publish to telemetry/digital_out
        </div>
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
              <th className="py-2 text-left">Rule</th>
              <th className="py-2 text-left">Asset</th>
              <th className="py-2 text-right">State</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`cursor-pointer border-b border-line/50 ${selected === r.id ? "bg-surface" : ""}`}
              >
                <td className="py-2">
                  <div className="text-cursor-glow">{r.id}</div>
                  <div className="text-[10px]">{r.name}</div>
                </td>
                <td className="py-2">{r.asset}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRules((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, state: x.state === "ARMED" ? "PAUSED" : "ARMED" } : x,
                        ),
                      );
                    }}
                    className={r.state === "ARMED" ? "text-cursor-glow" : "text-muted"}
                  >
                    {r.state}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AppSection>

      <DigitalReceiptPanel
        title="Trade Execution Receipts"
        toolFilter="capital.execute_trade"
        receipts={digital.receipts}
        latest={digital.latest}
        connected={digital.connected}
        formatReceipt={formatTradeReceipt}
      />
    </div>
  );
}
