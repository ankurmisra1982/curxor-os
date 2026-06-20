"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BUDGET_TIERS,
  LOCAL_LLM_CATALOG,
  modelsForTier,
  type BudgetTier,
} from "@/lib/local-llm-catalog";
import type { ClawModels } from "@/lib/claw-recommend";

const STEPS = ["State Intent", "Choose LLMs", "Provision Claw"] as const;

export interface NewClawWizardProps {
  onClose: () => void;
  onCreated?: (clawId: string) => void;
  variant?: "overlay" | "embedded";
  initialIntent?: string;
  initialBudgetTier?: BudgetTier;
  initialImagePreview?: string | null;
  initialLiveVision?: boolean;
  initialImageHint?: string | null;
}

export function NewClawWizard({
  onClose,
  onCreated,
  variant = "overlay",
  initialIntent = "",
  initialBudgetTier = "balanced",
  initialImagePreview = null,
  initialLiveVision = false,
  initialImageHint = null,
}: NewClawWizardProps) {
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState(initialIntent);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(initialBudgetTier);
  const [autoChoose, setAutoChoose] = useState(true);
  const [models, setModels] = useState<ClawModels>({
    vision: "moondream:1.8b",
    reasoning: "qwen2.5:7b-instruct-q4_K_M",
    vla: null,
  });
  const [rationale, setRationale] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [matrixRows, setMatrixRows] = useState<Array<{ label: string; status: string; progress: number }>>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [imagePreview] = useState(initialImagePreview);
  const [liveVision] = useState(initialLiveVision);
  const [imageHint] = useState(initialImageHint);

  const tierModels = useMemo(() => modelsForTier(budgetTier), [budgetTier]);

  const fetchRecommendation = useCallback(async () => {
    if (!intent.trim()) return;
    const res = await fetch("/api/claw/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, budgetTier }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { models: ClawModels; rationale: string };
    setModels(data.models);
    setRationale(data.rationale);
  }, [intent, budgetTier]);

  useEffect(() => {
    if (autoChoose && intent.trim()) void fetchRecommendation();
  }, [autoChoose, intent, budgetTier, fetchRecommendation]);

  useEffect(() => {
    if (initialIntent) setIntent(initialIntent);
  }, [initialIntent]);

  useEffect(() => {
    setBudgetTier(initialBudgetTier);
  }, [initialBudgetTier]);

  const canAdvance = step === 0 ? intent.trim().length >= 8 : true;

  async function createClaw() {
    setError(null);
    setStep(2);
    setProvisioning(true);
    setMatrixRows([
      { label: "Pull vision weights", status: "pending", progress: 0 },
      { label: "Pull reasoning weights", status: "pending", progress: 0 },
      { label: "Bind mesh endpoints", status: "pending", progress: 0 },
      { label: "Register claw profile", status: "pending", progress: 0 },
    ]);

    const animate = async () => {
      const labels = ["Pull vision weights", "Pull reasoning weights", "Bind mesh endpoints", "Register claw profile"];
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i]!;
        await new Promise((r) => setTimeout(r, 700));
        setMatrixRows((rows) =>
          rows.map((row) => (row.label === label ? { ...row, status: "running", progress: 55 } : row)),
        );
        await new Promise((r) => setTimeout(r, 500));
        setMatrixRows((rows) =>
          rows.map((row) => (row.label === label ? { ...row, status: "done", progress: 100 } : row)),
        );
      }
    };

    void animate();

    try {
      const res = await fetch("/api/claw/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          budgetTier,
          autoSelected: autoChoose,
          models,
          multimodal:
            imagePreview || liveVision
              ? {
                  hadReferenceImage: Boolean(imagePreview),
                  liveVision,
                  imageHint,
                }
              : undefined,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = (await res.json()) as { profile: { id: string } };
      onCreated?.(data.profile.id);
      onClose();
    } catch {
      setError("Failed to provision claw. Retry or check logs.");
      setProvisioning(false);
      setStep(1);
    }
  }

  const shellClass =
    variant === "overlay"
      ? "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      : "flex h-full flex-col";

  const panelClass =
    variant === "overlay"
      ? "flex max-h-[90vh] w-full max-w-2xl flex-col border border-line bg-panel shadow-cursor"
      : "flex min-h-0 flex-1 flex-col border border-line bg-panel shadow-cursor";

  return (
    <div className={shellClass}>
      <div className={panelClass}>
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Claw Forge</p>
            <h2 className="font-display text-lg uppercase tracking-[0.14em] text-stark">Forge New Claw</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={provisioning}
            className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-stark disabled:opacity-30"
          >
            ✕ Close
          </button>
        </header>

        <nav className="grid grid-cols-3 gap-1 border-b border-line px-4 py-2">
          {STEPS.map((label, idx) => (
            <div
              key={label}
              className={`py-1 text-center font-mono text-[10px] uppercase tracking-widest ${
                idx === step ? "text-cursor-glow" : idx < step ? "text-stark" : "text-muted"
              }`}
            >
              {label}
            </div>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <p className="mb-4 border border-cursor/30 bg-surface px-3 py-2 font-mono text-xs text-cursor-glow">
              {error}
            </p>
          ) : null}

          {step === 0 && (
            <div>
              <h3 className="font-display text-xs uppercase tracking-[0.2em] text-stark">State Your Intent</h3>
              <p className="mt-2 font-mono text-[11px] text-muted">
                Natural language mission brief — refined from your Forge chat or typed fresh.
              </p>
              {(imagePreview || liveVision) && (
                <div className="mt-4 flex gap-3 border border-line bg-void p-3">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Reference"
                      className="h-20 w-28 border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-28 items-center justify-center border border-line bg-panel font-mono text-[10px] text-muted">
                      LIVE
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-muted">
                    <div className="uppercase tracking-widest text-cursor-glow">Multimodal context</div>
                    <div className="mt-1">{imageHint ?? (liveVision ? "Live vision frame" : "Reference photo")}</div>
                  </div>
                </div>
              )}
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                rows={5}
                placeholder="> Run a claw cafe kiosk that grabs prizes when guests win…"
                className="mt-4 w-full border border-line bg-void px-3 py-3 font-mono text-xs text-stark outline-none focus:border-cursor-glow"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-xs uppercase tracking-[0.2em] text-stark">UMA Budget Tier</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {BUDGET_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setBudgetTier(tier.id)}
                      className={`border p-3 text-left ${
                        budgetTier === tier.id
                          ? "border-cursor-glow bg-surface shadow-cursor"
                          : "border-line bg-void"
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">
                        {tier.label}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted">{tier.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 border border-line bg-void px-4 py-3">
                <input
                  type="checkbox"
                  checked={autoChoose}
                  onChange={(e) => setAutoChoose(e.target.checked)}
                  className="accent-[#bc13fe]"
                />
                <span className="font-mono text-xs text-stark">
                  Intelligently auto-choose local LLMs from intent + budget
                </span>
              </label>

              {autoChoose && rationale ? (
                <p className="border-l-2 border-cursor-glow pl-3 font-mono text-[11px] text-muted">
                  {rationale}
                </p>
              ) : null}

              {!autoChoose && (
                <div className="space-y-3 font-mono text-xs">
                  {(["vision", "reasoning"] as const).map((role) => (
                    <label key={role} className="block">
                      <span className="text-[10px] uppercase tracking-widest text-muted">{role}</span>
                      <select
                        value={models[role]}
                        onChange={(e) => setModels((m) => ({ ...m, [role]: e.target.value }))}
                        className="mt-1 w-full border border-line bg-panel px-2 py-2 text-stark"
                      >
                        {tierModels
                          .filter((m) => m.role === role)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} · ~{m.umaGb}GB UMA
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-muted">vla (optional)</span>
                    <select
                      value={models.vla ?? ""}
                      onChange={(e) =>
                        setModels((m) => ({ ...m, vla: e.target.value || null }))
                      }
                      className="mt-1 w-full border border-line bg-panel px-2 py-2 text-stark"
                    >
                      <option value="">None</option>
                      {tierModels
                        .filter((m) => m.role === "vla")
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              )}

              {autoChoose && (
                <div className="border border-line bg-void p-3 font-mono text-[10px]">
                  <div className="mb-2 uppercase tracking-widest text-cursor-glow">Selected stack</div>
                  <div className="text-muted">vision · {models.vision}</div>
                  <div className="text-muted">reasoning · {models.reasoning}</div>
                  <div className="text-muted">vla · {models.vla ?? "—"}</div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Provisioning Matrix</h3>
              <table className="mt-4 w-full border-collapse font-mono text-xs">
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.label} className="border-b border-line/50">
                      <td className="py-2 text-stark">{row.label}</td>
                      <td className="py-2">
                        <div className="h-1.5 border border-line bg-void">
                          <div className="h-full bg-cursor-glow" style={{ width: `${row.progress}%` }} />
                        </div>
                      </td>
                      <td className="py-2 text-right uppercase text-muted">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex justify-between border-t border-line px-6 py-4">
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
              onClick={() => (step === 1 ? void createClaw() : setStep(1))}
              className="border border-cursor-glow px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              {step === 1 ? "Provision Claw →" : "Continue →"}
            </button>
          ) : (
            <span className="animate-pulse-cursor font-mono text-[10px] uppercase text-cursor-glow">
              Deploying…
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
