"use client";

import { OOTB_APPS, type OotbAppId } from "@/lib/ootb-apps";

interface ModuleSelectionStepProps {
  selectedApps: OotbAppId[];
  onToggle: (id: OotbAppId) => void;
}

export function ModuleSelectionStep({ selectedApps, onToggle }: ModuleSelectionStepProps) {
  return (
    <div className="p-6">
      <h2 className="font-sans text-lg font-semibold text-stark">Choose your Claws</h2>
      <p className="mt-2 font-sans text-sm text-muted">
        Turn on the digital employees you want on this appliance. You can change this later in Settings.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OOTB_APPS.map((app) => {
          const active = selectedApps.includes(app.id);
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
                <span className="font-sans text-sm font-medium text-stark">{app.name}</span>
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
