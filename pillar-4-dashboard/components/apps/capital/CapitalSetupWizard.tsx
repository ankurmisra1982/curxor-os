"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = ["Risk & watchlist", "Create rule", "Arm & preview", "Execute", "Go Live"] as const;

interface CapitalSetupWizardProps {
  open: boolean;
  onClose: () => void;
  defaultAsset: string;
  onComplete: (result: { ruleId?: string; tradeId?: string }) => void;
}

type ApiJson = Record<string, unknown> & { ok?: boolean; error?: string };

export function CapitalSetupWizard({ open, onClose, defaultAsset, onComplete }: CapitalSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState(defaultAsset);
  const [dropPct, setDropPct] = useState("5");
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [previewNotional, setPreviewNotional] = useState<string | null>(null);
  const [tradeId, setTradeId] = useState<string | null>(null);
  const [goLiveProgress, setGoLiveProgress] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setStep(0);
      setBusy(false);
      setError(null);
      setAsset(defaultAsset);
      setDropPct("5");
      setRuleId(null);
      setPreviewNotional(null);
      setTradeId(null);
      setGoLiveProgress(null);
    }
    wasOpen.current = open;
  }, [open, defaultAsset]);

  if (!open) return null;

  const api = async (action: string, extra: Record<string, unknown> = {}): Promise<ApiJson> => {
    const res = await fetch("/api/capital/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = (await res.json()) as ApiJson;
    if (!res.ok || json.ok === false) {
      throw new Error(typeof json.error === "string" ? json.error : `Request failed (${res.status})`);
    }
    return json;
  };

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      if (step === 0) {
        await api("dashboard_bootstrap");
        setStep(1);
        return;
      }
      if (step === 1) {
        const sym = asset.trim().toUpperCase() || "SPY";
        const json = await api("create_dip_rule", { ticker: sym, dropPct: Number.parseFloat(dropPct) || 5 });
        const rule = json.rule as { id?: string } | undefined;
        if (!rule?.id) throw new Error("Rule creation failed");
        setRuleId(rule.id);
        setStep(2);
        return;
      }
      if (step === 2) {
        if (!ruleId) throw new Error("No rule");
        await api("arm_rule", { ruleId });
        const prev = await api("preview_trade", {
          ticker: asset.trim().toUpperCase(),
          qty: 1,
          actionTrade: "buy",
        });
        const p = prev.preview as { estimatedNotionalUsd?: number } | undefined;
        setPreviewNotional(p?.estimatedNotionalUsd != null ? `$${p.estimatedNotionalUsd.toFixed(0)}` : "~demo");
        setStep(3);
        return;
      }
      if (step === 3) {
        const json = await api("execute_now", { ruleId: ruleId ?? undefined });
        const t = json.trade as { id?: string } | undefined;
        if (!t?.id && json.ok !== true) throw new Error("Execute did not produce a trade");
        if (t?.id) setTradeId(t.id);
        setStep(4);
        return;
      }
      if (step === 4) {
        const json = await api("go_live");
        const gl = json.goLive as {
          progress?: { complete: number; total: number };
          demoReady?: boolean;
          paperReady?: boolean;
        } | undefined;
        if (!gl?.demoReady && !gl?.paperReady) {
          throw new Error("Go Live checklist incomplete — arm a rule and execute first");
        }
        setGoLiveProgress(
          gl?.paperReady
            ? "Paper ready — bridge path proven"
            : gl?.demoReady
              ? "Demo ready — desk is live for day-one use"
              : `Checklist ${gl?.progress?.complete ?? 0}/${gl?.progress?.total ?? 0}`,
        );
        onComplete({ ruleId: ruleId ?? undefined, tradeId: tradeId ?? undefined });
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Step failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-line bg-panel p-4 font-mono text-xs shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Capital setup wizard</p>
          <button type="button" onClick={onClose} className="text-muted hover:text-stark">
            ✕
          </button>
        </div>
        <p className="mb-2 text-[10px] text-muted">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div className="mb-4 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 ${i <= step ? "bg-cursor-glow" : "bg-line"}`} />
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-2 text-[10px] text-muted">
            <p>Paper mode · balanced risk · demo portfolio until Alpaca keys are set.</p>
            <p>We will seed your watchlist and create your first dip-buy rule.</p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[10px] text-muted">Asset</span>
              <input
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                className="w-full border border-line bg-transparent px-2 py-1 text-stark"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] text-muted">Dip % trigger</span>
              <input
                value={dropPct}
                onChange={(e) => setDropPct(e.target.value)}
                className="w-20 border border-line bg-transparent px-2 py-1 text-stark"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <p className="text-[10px] text-muted">
            Rule {ruleId} will be armed. Preview estimates notional before execute.
          </p>
        ) : null}

        {step === 3 ? (
          <p className="text-[10px] text-muted">
            Execute now — simulated fill in demo mode, paper via Alpaca when configured. Preview:{" "}
            {previewNotional ?? "—"}
          </p>
        ) : null}

        {step === 4 ? (
          <p className="text-[10px] text-stark">{goLiveProgress ?? "Refresh Go Live checklist…"}</p>
        ) : null}

        {error ? <p className="mt-2 text-[10px] text-red-400">{error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {step > 0 && step < 4 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
              className="border border-line px-3 py-1 text-[10px] uppercase text-muted"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runStep()}
            className="border border-cursor-glow px-3 py-1 text-[10px] uppercase text-cursor-glow disabled:opacity-40"
          >
            {busy ? "Working…" : step === 4 ? "Finish" : "Continue"}
          </button>
          {step === 3 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                void api("run_demo_tour")
                  .then((j) => {
                    const t = j.tradeId as string | undefined;
                    if (!t) throw new Error("Demo tour did not produce a trade");
                    setTradeId(t);
                    setStep(4);
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : "Demo tour failed"))
                  .finally(() => setBusy(false));
              }}
              className="border border-line px-3 py-1 text-[10px] uppercase text-muted hover:text-stark"
            >
              Or run demo tour
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
