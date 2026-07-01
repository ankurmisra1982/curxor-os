"use client";

import { frePickableApps } from "@/lib/shell-nav";
import type { OotbAppId } from "@/lib/ootb-apps";

interface ModuleSelectionStepProps {
  selectedApps: OotbAppId[];
  onToggle: (id: OotbAppId) => void;
  /** Plain-language labels for Essential / thin setup (ONB-3). */
  essential?: boolean;
}

const ESSENTIAL_LABELS: Partial<Record<OotbAppId, string>> = {
  "my-capital": "Money",
  "my-content-creator": "Content",
  "my-work": "Outreach",
  "my-shop": "Deals",
  "my-vital": "Health",
  "robotaxi-fleet-manager": "Fleet",
  "claw-forge": "Custom apps",
};

export function ModuleSelectionStep({
  selectedApps,
  onToggle,
  essential = false,
}: ModuleSelectionStepProps) {
  const pickable = frePickableApps();

  return (
    <div className="p-6">
      <h2 className="font-sans text-lg font-semibold text-stark">
        {essential ? "Which jobs do you want help with?" : "Choose your operate Claws"}
      </h2>
      <p className="mt-2 font-sans text-sm text-muted">
        {essential
          ? "Turn on the specialists you want on this box. You can add more anytime in Settings."
          : "Turn on the specialists you want on this appliance. Claw Cafe, Signal, and Kin stay available in the universal strip — they are not hired here."}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pickable.map((app) => {
          const active = selectedApps.includes(app.id);
          const label =
            essential && ESSENTIAL_LABELS[app.id]
              ? ESSENTIAL_LABELS[app.id]
              : app.id === "my-work"
                ? "Outreach Claw"
                : app.name;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onToggle(app.id)}
              className={`border p-4 text-left transition ${
                active
                  ? "border-cursor-glow bg-surface shadow-cursor"
                  : "border-line bg-void hover:border-cursor/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-sans text-sm font-medium text-stark">{label}</span>
                <span
                  className={`font-sans text-xs ${active ? "text-cursor-glow" : "text-muted"}`}
                >
                  {active ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-3 font-sans text-xs leading-relaxed text-muted">{app.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
