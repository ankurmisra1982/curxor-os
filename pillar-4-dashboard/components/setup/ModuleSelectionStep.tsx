"use client";

import { OOTB_APPS, type OotbAppId } from "@/lib/ootb-apps";

interface ModuleSelectionStepProps {
  selectedApps: OotbAppId[];
  onToggle: (id: OotbAppId) => void;
}

export function ModuleSelectionStep({ selectedApps, onToggle }: ModuleSelectionStepProps) {
  return (
    <div className="p-6">
      <h2 className="font-display text-sm uppercase tracking-[0.24em] text-stark">Choose Your Modules</h2>
      <p className="mt-2 font-mono text-xs text-muted">
        Toggle the apps you want pre-installed. You can change these later from the appliance settings.
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
                <span className="font-mono text-xs uppercase tracking-widest text-stark">{app.name}</span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    active ? "text-cursor-glow" : "text-muted"
                  }`}
                >
                  {active ? "ON" : "OFF"}
                </span>
              </div>
              <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">{app.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
