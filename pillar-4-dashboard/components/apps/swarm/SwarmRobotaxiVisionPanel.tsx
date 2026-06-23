"use client";

import { ComingSoonBadge } from "@/components/app-shared/ComingSoonBadge";
import {
  ROBOTAXI_VISION_MILESTONES,
  SWARM_ROBOTAXI_VISION,
  robotaxiVisionStatusLabel,
} from "@/lib/swarm-robotaxi-vision";

const STATUS_CLASS: Record<string, string> = {
  preview: "border-cursor-glow/40 text-cursor-glow",
  coming_soon: "border-amber-500/40 text-amber-300",
  planned: "border-line text-muted",
};

export function SwarmRobotaxiVisionPanel() {
  return (
    <div className="space-y-3 border border-amber-500/25 bg-gradient-to-r from-panel via-void to-panel px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cursor-glow">
          {SWARM_ROBOTAXI_VISION.headline}
        </p>
        <ComingSoonBadge />
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-stark">{SWARM_ROBOTAXI_VISION.subhead}</p>
      <p className="font-mono text-[10px] leading-relaxed text-muted">{SWARM_ROBOTAXI_VISION.honestNote}</p>

      <div className="flex flex-wrap gap-4 font-mono text-[10px]">
        <span className="text-muted">
          {SWARM_ROBOTAXI_VISION.targetFleetLabel}:{" "}
          <span className="text-stark">{SWARM_ROBOTAXI_VISION.targetFleetSize} Robotaxis</span>
        </span>
        <span className="text-muted">
          Live: <span className="text-stark">{SWARM_ROBOTAXI_VISION.liveUnits}</span>
        </span>
        <span className="text-muted">
          Simulators: <span className="text-cursor-glow">{SWARM_ROBOTAXI_VISION.simUnits}</span>
        </span>
      </div>

      <ul className="space-y-2 font-mono text-[10px]">
        {ROBOTAXI_VISION_MILESTONES.map((m) => (
          <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 border border-line/60 px-3 py-2">
            <div>
              <p className="text-stark">{m.label}</p>
              <p className="mt-0.5 text-muted">{m.detail}</p>
            </div>
            <span
              className={`shrink-0 border px-2 py-0.5 uppercase tracking-widest ${STATUS_CLASS[m.status] ?? STATUS_CLASS.planned}`}
            >
              {robotaxiVisionStatusLabel(m.status)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
