"use client";

import { useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

interface Vehicle {
  id: string;
  grid: string;
  latency: number;
  charge: number;
  status: string;
}

const GRID = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "D3", "D4"];

const INITIAL: Vehicle[] = [
  { id: "RX-01", grid: "A3", latency: 12, charge: 82, status: "idle" },
  { id: "RX-02", grid: "B1", latency: 18, charge: 64, status: "idle" },
  { id: "RX-03", grid: "C4", latency: 9, charge: 91, status: "idle" },
  { id: "RX-04", grid: "D2", latency: 24, charge: 37, status: "idle" },
];

export function RobotaxiApp({ config, skillTick, lastSkillId }: AgentAppContext) {
  const { frame } = useVisionStream();
  const { command } = useMotorStream();
  const depot = typeof config.depotGrid === "string" ? config.depotGrid : "A1";
  const policy = typeof config.dispatchPolicy === "string" ? config.dispatchPolicy : "latency";
  const [fleet, setFleet] = useState(INITIAL);
  const [selected, setSelected] = useState("RX-01");
  const [targetCell, setTargetCell] = useState("B3");

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId === "assign_route") {
      setFleet((prev) =>
        prev.map((v) => {
          if (v.id !== selected) return v;
          return { ...v, grid: targetCell, status: "en route", latency: Math.max(8, v.latency - 2) };
        }),
      );
      return;
    }
    if (lastSkillId === "recall_vehicle") {
      setFleet((prev) =>
        prev.map((v) => (v.id === selected ? { ...v, grid: depot, status: "idle" } : v)),
      );
    }
  }, [skillTick, lastSkillId, selected, targetCell, depot]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("robotaxi-fleet-manager").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Swarm Command</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Swarm Claw · depot {depot} · policy {policy} · vision seq {frame?.seq ?? "—"}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <AppMetric label="Active Unit" value={selected} unit="click row or cell" highlight />
        <AppMetric label="Target Cell" value={targetCell} unit="dispatch destination" />
        <AppMetric label="Ground Claw" value={command?.clawId ? String(command.clawId) : "—"} unit="motor link" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <AppSection className="lg:col-span-3" title="Geospatial Grid" subtitle="Click cell to set dispatch target · Assign Route skill dispatches">
          <div className="grid grid-cols-4 gap-1">
            {GRID.map((cell) => {
              const occupied = fleet.find((v) => v.grid === cell);
              const isTarget = cell === targetCell;
              return (
                <button
                  key={cell}
                  type="button"
                  onClick={() => setTargetCell(cell)}
                  className={`aspect-square border p-1 font-mono text-[10px] ${
                    isTarget
                      ? "border-cursor-glow bg-surface text-cursor-glow"
                      : occupied
                        ? "border-cursor-glow/50 bg-panel text-stark"
                        : "border-line bg-void text-muted"
                  }`}
                >
                  {cell}
                  {occupied ? <div className="text-[8px] text-cursor-glow">{occupied.id}</div> : null}
                </button>
              );
            })}
          </div>
        </AppSection>

        <AppSection className="lg:col-span-2" title="Fleet Status" subtitle="Select vehicle before dispatch skills">
          <div className="space-y-2 font-mono text-xs">
            {fleet.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                className={`grid w-full grid-cols-4 gap-2 border px-3 py-2 text-left ${
                  selected === v.id ? "border-cursor-glow bg-surface" : "border-line bg-panel"
                }`}
              >
                <span className="text-cursor-glow">{v.id}</span>
                <span>{v.grid}</span>
                <span className="text-muted">{v.latency}ms</span>
                <span className={v.charge < 40 ? "text-stark" : "text-cursor-glow"}>{v.charge}%</span>
              </button>
            ))}
          </div>
        </AppSection>
      </div>
    </div>
  );
}
