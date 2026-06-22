"use client";

import { useState } from "react";

import type { ConditionType, TradeAction } from "@/lib/capital-queue-types";

const CONDITIONS: Array<{ id: ConditionType; label: string; params?: string[] }> = [
  { id: "manual_trigger", label: "Manual — I trigger it" },
  { id: "price_drop_pct", label: "Price drops %", params: ["pct"] },
  { id: "pct_change_1d", label: "1-day change %", params: ["pct"] },
  { id: "rsi_oversold", label: "RSI oversold", params: ["threshold"] },
  { id: "price_above_ma", label: "Price above MA", params: ["period"] },
  { id: "breakout_20d_high", label: "Breaks 20-day high" },
  { id: "tradingview_webhook", label: "TradingView webhook fires" },
  { id: "crypto_wallet_signal", label: "Crypto wallet signal (beta)", params: ["pct"] },
  { id: "options_iv_rank", label: "Options IV rank high (beta)", params: ["threshold"] },
];

interface CapitalRuleBuilderProps {
  defaultAsset?: string;
  onCreate: (input: {
    name: string;
    asset: string;
    conditionType: ConditionType;
    conditionParams: Record<string, number | string>;
    action: TradeAction;
    qty: number;
    takeProfitPct?: number;
    stopLossPct?: number;
    kind?: "signal" | "rebalance";
    targetWeight?: number;
    driftThresholdPct?: number;
  }) => void;
}

export function CapitalRuleBuilder({ defaultAsset = "NVDA", onCreate }: CapitalRuleBuilderProps) {
  const [name, setName] = useState("");
  const [asset, setAsset] = useState(defaultAsset);
  const [ruleKind, setRuleKind] = useState<"signal" | "rebalance">("signal");
  const [conditionType, setConditionType] = useState<ConditionType>("price_drop_pct");
  const [pct, setPct] = useState("5");
  const [action, setAction] = useState<TradeAction>("buy");
  const [qty, setQty] = useState("1");
  const [takeProfitPct, setTakeProfitPct] = useState("");
  const [stopLossPct, setStopLossPct] = useState("");
  const [targetWeight, setTargetWeight] = useState("25");
  const [driftThreshold, setDriftThreshold] = useState("10");

  const cond = CONDITIONS.find((c) => c.id === conditionType);

  const submit = () => {
    const conditionParams: Record<string, number | string> = {};
    if (cond?.params?.includes("pct")) conditionParams.pct = Number.parseFloat(pct) || 5;
    if (cond?.params?.includes("threshold")) conditionParams.threshold = Number.parseFloat(pct) || 30;
    if (cond?.params?.includes("period")) conditionParams.period = Number.parseInt(pct, 10) || 50;

    onCreate({
      name: name.trim() || `${asset} ${ruleKind === "rebalance" ? "rebalance" : (cond?.label ?? conditionType)}`,
      asset: asset.trim().toUpperCase(),
      conditionType: ruleKind === "rebalance" ? "manual_trigger" : conditionType,
      conditionParams: ruleKind === "rebalance" ? {} : conditionParams,
      action,
      qty: Number.parseFloat(qty) || 1,
      takeProfitPct: takeProfitPct ? Number.parseFloat(takeProfitPct) : undefined,
      stopLossPct: stopLossPct ? Number.parseFloat(stopLossPct) : undefined,
      kind: ruleKind,
      targetWeight: ruleKind === "rebalance" ? Number.parseFloat(targetWeight) || 25 : undefined,
      driftThresholdPct: ruleKind === "rebalance" ? Number.parseFloat(driftThreshold) || 10 : undefined,
    });
    setName("");
  };

  return (
    <div className="border border-line bg-panel/30 p-3 font-mono text-[10px] space-y-2">
      <p className="text-[9px] uppercase tracking-widest text-muted">Visual rule builder</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRuleKind("signal")}
          className={`px-2 py-0.5 text-[9px] uppercase ${ruleKind === "signal" ? "border border-cursor-glow text-cursor-glow" : "border border-line text-muted"}`}
        >
          Signal
        </button>
        <button
          type="button"
          onClick={() => setRuleKind("rebalance")}
          className={`px-2 py-0.5 text-[9px] uppercase ${ruleKind === "rebalance" ? "border border-cursor-glow text-cursor-glow" : "border border-line text-muted"}`}
        >
          Rebalance
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="NVDA dip buy"
            className="w-full border border-line bg-transparent px-2 py-1 text-stark outline-none focus:border-cursor-glow"
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted">Asset</span>
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value.toUpperCase())}
            className="w-full border border-line bg-transparent px-2 py-1 text-stark outline-none focus:border-cursor-glow"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {ruleKind === "rebalance" ? (
          <>
            <label className="space-y-1">
              <span className="text-muted">Target weight %</span>
              <input
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-20 border border-line bg-transparent px-2 py-1 text-stark"
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Drift threshold %</span>
              <input
                value={driftThreshold}
                onChange={(e) => setDriftThreshold(e.target.value)}
                className="w-20 border border-line bg-transparent px-2 py-1 text-stark"
              />
            </label>
            <p className="text-[9px] text-muted pb-1">Rebalance rules evaluate on heartbeat when armed</p>
          </>
        ) : (
          <>
        <label className="space-y-1">
          <span className="text-muted">WHEN</span>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value as ConditionType)}
            className="block border border-line bg-transparent px-2 py-1 text-stark"
          >
            {CONDITIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {cond?.params?.length ? (
          <label className="space-y-1">
            <span className="text-muted">Param</span>
            <input
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="w-20 border border-line bg-transparent px-2 py-1 text-stark"
            />
          </label>
        ) : null}
        <label className="space-y-1">
          <span className="text-muted">THEN</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as TradeAction)}
            className="block border border-line bg-transparent px-2 py-1 text-stark"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted">Qty</span>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-16 border border-line bg-transparent px-2 py-1 text-stark"
          />
        </label>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="space-y-1">
          <span className="text-muted">Take profit %</span>
          <input
            value={takeProfitPct}
            onChange={(e) => setTakeProfitPct(e.target.value)}
            placeholder="optional"
            className="w-20 border border-line bg-transparent px-2 py-1 text-stark"
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted">Stop loss %</span>
          <input
            value={stopLossPct}
            onChange={(e) => setStopLossPct(e.target.value)}
            placeholder="optional"
            className="w-20 border border-line bg-transparent px-2 py-1 text-stark"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        className="border border-cursor-glow px-3 py-1 text-[9px] uppercase text-cursor-glow"
      >
        Create rule
      </button>
    </div>
  );
}
