"use client";

import { useEffect, useRef, useState } from "react";

import type { ForgeTemplateId } from "@/lib/forge-templates";
import type { GrowthLevel } from "@/lib/os-growth-level";

const STEPS = ["Growth intent", "Connection mode", "First mint"] as const;

type ConnectionMode = "island" | "framework" | "import";

interface ForgeSetupWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (result?: { forgedHref?: string; openImportTab?: boolean }) => void;
}

type ApiJson = Record<string, unknown> & { ok?: boolean; error?: string };

export function ForgeSetupWizard({ open, onClose, onComplete }: ForgeSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [growthLevel, setGrowthLevel] = useState<GrowthLevel>("L2");
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("framework");
  const [templateId, setTemplateId] = useState<ForgeTemplateId>("work-desk");
  const [intent, setIntent] = useState("Outreach desk for my side hustle — local sequences on appliance.");
  const [mintResult, setMintResult] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setStep(0);
      setBusy(false);
      setError(null);
      setGrowthLevel("L2");
      setConnectionMode("framework");
      setTemplateId("work-desk");
      setIntent("Outreach desk for my side hustle — local sequences on appliance.");
      setMintResult(null);
    }
    wasOpen.current = open;
  }, [open]);

  if (!open) return null;

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      if (step === 0) {
        await fetch("/api/app-fre/claw-forge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: { growthLevel } }),
        });
        setStep(1);
        return;
      }
      if (step === 1) {
        setStep(2);
        return;
      }
      if (step === 2) {
        if (connectionMode === "import") {
          await fetch("/api/app-fre/claw-forge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: { forgeSetupComplete: true, growthLevel } }),
          });
          onComplete({ openImportTab: true });
          return;
        }
        const res = await fetch("/api/claw/provision-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: intent.trim(),
            templateId,
            name: "Wizard Desk",
            budgetTier: "balanced",
          }),
        });
        const json = (await res.json()) as ApiJson & {
          forgedApp?: { id?: string; href?: string; slug?: string };
        };
        if (!res.ok || json.ok === false) {
          throw new Error(typeof json.error === "string" ? json.error : "Provision failed");
        }
        const href = json.forgedApp?.href ?? (json.forgedApp?.slug ? `/${json.forgedApp.slug}` : undefined);
        setMintResult(href ?? json.forgedApp?.id ?? "Mint complete");
        await fetch("/api/app-fre/claw-forge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: { forgeSetupComplete: true, growthLevel } }),
        });
        onComplete(href ? { forgedHref: href } : undefined);
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
          <p className="text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Forge setup wizard</p>
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
          <div className="space-y-2">
            <p className="text-[10px] text-muted">Pick a growth tier — controls tabs and desk depth in The Forge.</p>
            <div className="flex flex-wrap gap-2">
              {(["L1", "L2", "L3"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setGrowthLevel(level)}
                  className={`border px-2 py-1 text-[10px] uppercase ${
                    growthLevel === level ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-muted">How will this claw connect to CurXor?</p>
            {(
              [
                ["framework", "Framework desk", "Nav tile + forged workspace — recommended for GTM"],
                ["island", "Island profile", "Claw profile only — promote to framework later"],
                ["import", "Import bundle", "Skip mint — use Import tab after wizard"],
              ] as const
            ).map(([mode, label, detail]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setConnectionMode(mode)}
                className={`block w-full border px-2 py-2 text-left ${
                  connectionMode === mode ? "border-cursor-glow text-cursor-glow" : "border-line text-stark"
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest">{label}</span>
                <p className="mt-0.5 text-[10px] text-muted">{detail}</p>
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 && connectionMode !== "import" ? (
          <div className="space-y-2">
            <p className="text-[10px] text-muted">Template and intent for your first forged desk.</p>
            <div className="flex flex-wrap gap-2">
              {(["work-desk", "creator-desk", "capital-desk", "blank-desk"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTemplateId(id)}
                  className={`border px-2 py-1 text-[10px] uppercase ${
                    templateId === id ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
              className="w-full border border-line bg-void px-2 py-1.5 text-stark outline-none focus:border-cursor-glow"
            />
          </div>
        ) : null}

        {step === 2 && connectionMode === "import" ? (
          <p className="text-[10px] text-muted">
            Finish to open the Import tab — drop a claw bundle from another appliance or dev export.
          </p>
        ) : null}

        {mintResult ? <p className="text-[10px] text-cursor-glow">Minted · {mintResult}</p> : null}
        {error ? <p className="mb-2 text-[10px] text-red-400">{error}</p> : null}

        <button
          type="button"
          disabled={busy || (step === 2 && connectionMode !== "import" && intent.trim().length < 8)}
          onClick={() => void runStep()}
          className="mt-4 border border-cursor-glow px-3 py-1 uppercase text-cursor-glow disabled:opacity-40"
        >
          {busy ? "Working…" : step === 2 ? "Finish" : "Continue"}
        </button>
      </div>
    </div>
  );
}
