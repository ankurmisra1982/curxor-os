"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = ["FRE recap", "Add lead", "Draft sequence", "Activate", "Connector vault"] as const;

interface WorkSetupWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ApiJson = Record<string, unknown> & { ok?: boolean; error?: string };

export function WorkSetupWizard({ open, onClose, onComplete }: WorkSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const [vaultReady, setVaultReady] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setStep(0);
      setBusy(false);
      setError(null);
      setLeadId(null);
      setSequenceId(null);
      setVaultReady(null);
    }
    wasOpen.current = open;
  }, [open]);

  if (!open) return null;

  const api = async (action: string, extra: Record<string, unknown> = {}): Promise<ApiJson> => {
    const res = await fetch("/api/work/status", {
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
        const json = await api("dashboard_bootstrap");
        const status = json.status as { workspaceName?: string } | undefined;
        setVaultReady(status?.workspaceName ?? "Outreach Desk");
        setStep(1);
        return;
      }
      if (step === 1) {
        const email = `wizard-${Date.now()}@example.com`;
        const json = await api("create_lead", { name: "Wizard Prospect", email, company: "Setup Co" });
        const lead = json.lead as { id?: string } | undefined;
        if (!lead?.id) throw new Error("Lead creation failed");
        setLeadId(lead.id);
        setStep(2);
        return;
      }
      if (step === 2) {
        if (!leadId) throw new Error("No lead");
        const json = await api("draft_sequence", { leadId, name: "Wizard intro sequence" });
        const seqId = json.sequenceId as string | undefined;
        if (!seqId) throw new Error("Draft failed");
        setSequenceId(seqId);
        setStep(3);
        return;
      }
      if (step === 3) {
        if (!sequenceId) throw new Error("No sequence");
        await api("activate_sequence", { sequenceId });
        setStep(4);
        return;
      }
      if (step === 4) {
        const json = await api("go_live");
        const gl = json.goLive as { demoReady?: boolean; connectorVault?: { summary?: { ready: number } } } | undefined;
        if (!gl?.demoReady) throw new Error("Go Live checklist incomplete");
        setVaultReady(`${gl.connectorVault?.summary?.ready ?? 0} connectors ready`);
        onComplete();
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
          <p className="text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Work setup wizard</p>
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
          <p className="text-[10px] text-muted">Demo mode OK — FRE recap and connector vault health on bootstrap.</p>
        ) : null}
        {step === 4 && vaultReady ? (
          <p className="text-[10px] text-cursor-glow">{vaultReady}</p>
        ) : null}
        {error ? <p className="mb-2 text-[10px] text-red-400">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void runStep()}
          className="mt-4 border border-cursor-glow px-3 py-1 uppercase text-cursor-glow disabled:opacity-40"
        >
          {busy ? "Working…" : step === 4 ? "Finish" : "Continue"}
        </button>
      </div>
    </div>
  );
}
