"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { OOTB_APPS, type OotbAppId } from "@/lib/ootb-apps";
import { ModuleSelectionStep } from "./ModuleSelectionStep";
import { ProvisioningStep } from "./ProvisioningStep";
import { SystemHandshakeStep } from "./SystemHandshakeStep";

const STEPS = ["System Handshake", "Module Selection", "Provisioning"] as const;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedApps, setSelectedApps] = useState<OotbAppId[]>(["claw-cafe"]);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleApp = useCallback((id: OotbAppId) => {
    setSelectedApps((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const canAdvance = useMemo(() => {
    if (step === 1) return selectedApps.length > 0;
    return true;
  }, [step, selectedApps.length]);

  const runProvision = useCallback(async () => {
    setError(null);
    setStep(2);
    setProvisioning(true);

    try {
      const res = await fetch("/api/setup/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apps: selectedApps }),
      });
      if (!res.ok) throw new Error("Provision failed");
      await res.json();
      router.push("/my-work");
      router.refresh();
    } catch {
      setError("Provisioning failed. Check appliance logs and retry.");
      setProvisioning(false);
      setStep(1);
    }
  }, [router, selectedApps]);

  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-line px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">CurXor OS</p>
            <h1 className="font-display text-2xl uppercase tracking-[0.16em] text-stark">First Run Setup</h1>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            STEP {step + 1} / {STEPS.length}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <nav className="mb-8 grid grid-cols-3 gap-2">
          {STEPS.map((label, idx) => (
            <div
              key={label}
              className={`border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest ${
                idx === step
                  ? "border-cursor-glow bg-surface text-cursor-glow shadow-cursor"
                  : idx < step
                    ? "border-line bg-panel text-stark"
                    : "border-line bg-void text-muted"
              }`}
            >
              {label}
            </div>
          ))}
        </nav>

        {error ? (
          <p className="mb-4 border border-cursor/30 bg-surface px-4 py-2 font-mono text-xs text-cursor-glow">
            {error}
          </p>
        ) : null}

        <section className="border border-line bg-panel shadow-panel">
          {step === 0 && <SystemHandshakeStep onComplete={() => setStep(1)} />}
          {step === 1 && <ModuleSelectionStep selectedApps={selectedApps} onToggle={toggleApp} />}
          {step === 2 && <ProvisioningStep apps={selectedApps} active={provisioning} />}

          <footer className="flex items-center justify-between border-t border-line px-6 py-4">
            <button
              type="button"
              disabled={step === 0 || provisioning}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="font-mono text-[10px] uppercase tracking-widest text-muted disabled:opacity-30"
            >
              ← Back
            </button>

            {step < 2 ? (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={() => (step === 1 ? void runProvision() : setStep((s) => s + 1))}
                className="border border-cursor-glow bg-surface px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor disabled:opacity-30"
              >
                {step === 1 ? "Begin Provisioning →" : "Continue →"}
              </button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow animate-pulse-cursor">
                Downloading & configuring…
              </span>
            )}
          </footer>
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Sovereign appliance · No cloud · {OOTB_APPS.length} OOTB modules available
        </p>
      </div>
    </div>
  );
}
