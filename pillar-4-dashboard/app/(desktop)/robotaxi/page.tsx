"use client";

import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const MOCK_FLEET = [
  { id: "RX-01", grid: "A3", latency: 12, charge: 82 },
  { id: "RX-02", grid: "B1", latency: 18, charge: 64 },
  { id: "RX-03", grid: "C4", latency: 9, charge: 91 },
  { id: "RX-04", grid: "D2", latency: 24, charge: 37 },
];

const GRID = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "D3", "D4"];

export default function RobotaxiPage() {
  const { frame } = useVisionStream();
  const { command } = useMotorStream();

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="border border-line bg-void lg:col-span-3">
        <header className="border-b border-line px-4 py-3">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Geospatial Grid</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">Mock fleet positions · vision seq {frame?.seq ?? "—"}</p>
        </header>
        <div className="grid grid-cols-4 gap-1 p-4">
          {GRID.map((cell) => {
            const occupied = MOCK_FLEET.some((v) => v.grid === cell);
            return (
              <div
                key={cell}
                className={`aspect-square border p-2 font-mono text-[10px] ${
                  occupied ? "border-cursor-glow bg-surface text-cursor-glow" : "border-line bg-panel text-muted"
                }`}
              >
                {cell}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border border-line bg-void lg:col-span-2">
        <header className="border-b border-line px-4 py-3">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Fleet Status</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">Latency & charging · motor claw {command?.clawId ?? "—"}</p>
        </header>
        <div className="space-y-2 p-4 font-mono text-xs">
          {MOCK_FLEET.map((v) => (
            <div key={v.id} className="grid grid-cols-4 gap-2 border border-line bg-panel px-3 py-2">
              <span className="text-cursor-glow">{v.id}</span>
              <span className="text-stark">{v.grid}</span>
              <span className="text-muted">{v.latency}ms</span>
              <span className={v.charge < 40 ? "text-stark" : "text-cursor-glow"}>{v.charge}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
