"use client";

import type { LongevityProtocolStep } from "@/lib/vital-health-types";

interface VitalProtocolPanelProps {
  protocol: LongevityProtocolStep[];
}

export function VitalProtocolPanel({ protocol }: VitalProtocolPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-sans text-sm font-semibold text-stark">Active longevity protocol</h3>
        <p className="mt-1 font-sans text-xs text-muted">
          Generated locally — chat or use Update Protocol to adjust sleep, nutrition, or movement goals.
        </p>
      </div>

      <ul className="space-y-3">
        {protocol.map((step) => (
          <li key={step.id} className="border border-line bg-void p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-sm font-medium text-stark">{step.title}</span>
              <span className="font-mono text-[10px] uppercase text-muted">{step.frequency}</span>
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-cursor-glow">{step.category}</p>
            <p className="mt-2 font-sans text-xs text-muted">{step.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
