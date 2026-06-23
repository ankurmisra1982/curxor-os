"use client";

import { useEffect, useState } from "react";

import type { HumanoidHubStatus, HumanoidUnit, PairWizardSession } from "@/lib/humanoid-hub-types";
import { PAIR_WIZARD_STEPS } from "@/lib/humanoid-hub-types";
import { pairPhaseIndex } from "@/lib/humanoid-fleet-meta";

interface HumanoidPairWizardProps {
  unit: HumanoidUnit;
  session: PairWizardSession | null;
  knowledgeSynced: boolean;
  busy: boolean;
  onClose: () => void;
  onPost: (body: Record<string, unknown>) => Promise<HumanoidHubStatus | null>;
  onComplete: () => void;
}

export function HumanoidPairWizard({
  unit,
  session,
  knowledgeSynced,
  busy,
  onClose,
  onPost,
  onComplete,
}: HumanoidPairWizardProps) {
  const [phase, setPhase] = useState(session?.phase ?? "idle");
  const [discoverName, setDiscoverName] = useState(unit.discoverName ?? "");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (session?.phase) setPhase(session.phase);
  }, [session?.phase]);

  const stepIndex = pairPhaseIndex(phase);
  const isComplete = phase === "complete";

  async function startWizard() {
    setAnimating(true);
    const json = await onPost({ action: "start_pair", unitId: unit.id });
    if (json?.hub.pairWizard) {
      setPhase("discover");
      setDiscoverName(unit.discoverName ?? `CURXOR-${unit.displayName.replace(/\s+/g, "-").toUpperCase()}`);
    }
    await delay(1200);
    setAnimating(false);
  }

  async function advance() {
    setAnimating(true);
    const json = await onPost({ action: "advance_pair", unitId: unit.id });
    if (json?.hub.pairWizard?.phase) setPhase(json.hub.pairWizard.phase);
    else if (stepIndex >= 3) setPhase("complete");
    await delay(800);
    setAnimating(false);
  }

  async function finish() {
    setAnimating(true);
    await onPost({ action: "complete_pair", unitId: unit.id });
    setAnimating(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-cursor-glow/40 bg-panel shadow-[0_0_40px_rgba(188,19,254,0.15)]">
        <header className="border-b border-line px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Pair day · preview</p>
          <h2 className="mt-1 font-display text-sm uppercase tracking-[0.14em] text-stark">{unit.displayName}</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            Simulated Bluetooth + motor mesh handshake on your CurXor appliance — not live hardware motion.
          </p>
        </header>

        <div className="px-5 py-4">
          <ol className="space-y-2">
            {PAIR_WIZARD_STEPS.map((step, idx) => {
              const done = stepIndex > idx;
              const active = stepIndex === idx || (phase === "idle" && idx === 0);
              return (
                <li
                  key={step.phase}
                  className={`flex gap-3 border px-3 py-2 font-mono text-[10px] ${
                    active ? "border-cursor-glow/50 bg-cursor-glow/5" : done ? "border-line/60 opacity-80" : "border-line/30 opacity-50"
                  }`}
                >
                  <span className={done ? "text-cursor-glow" : active ? "text-stark" : "text-muted"}>
                    {done ? "✓" : idx + 1}
                  </span>
                  <div>
                    <p className={active ? "text-stark" : "text-muted"}>{step.label}</p>
                    <p className="text-[9px] text-muted">{step.detail}</p>
                    {active && step.phase === "discover" && phase !== "idle" ? (
                      <p className="mt-1 text-cursor-glow animate-pulse">
                        {animating ? "Scanning BLE + mesh…" : `Found ${discoverName || session?.discoveredNodeId}`}
                      </p>
                    ) : null}
                    {active && step.phase === "load_knowledge" && !knowledgeSynced ? (
                      <p className="mt-1 text-amber-300/90">Tip: push knowledge from Home first for full package</p>
                    ) : null}
                    {active && step.phase === "mesh_handshake" && unit.meshNodeId ? (
                      <p className="mt-1 text-cursor-glow">{unit.meshNodeId}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {isComplete ? (
            <div className="mt-4 border border-cursor-glow/30 bg-cursor-glow/5 p-3 font-mono text-[10px] text-stark">
              Preview pair ready — your robot inherits house rules, Kin tone, and armed routines. Live torque on hardware
              validation.
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase text-muted">
            Cancel
          </button>
          <div className="flex gap-2">
            {phase === "idle" ? (
              <button
                type="button"
                disabled={busy || animating}
                onClick={() => void startWizard()}
                className="border border-cursor-glow px-4 py-1.5 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
              >
                Start discovery
              </button>
            ) : isComplete ? (
              <button
                type="button"
                disabled={busy || animating}
                onClick={() => void finish()}
                className="border border-cursor-glow bg-surface px-4 py-1.5 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
              >
                Finish preview pair
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || animating}
                onClick={() => void advance()}
                className="border border-cursor-glow px-4 py-1.5 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
              >
                {animating ? "Working…" : "Continue →"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
