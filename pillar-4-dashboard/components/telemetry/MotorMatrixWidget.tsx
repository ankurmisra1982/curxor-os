"use client";

import { useEffect, useMemo, useState } from "react";

import { formatMotorMatrix, type MotorCommand } from "@/lib/motor-matrix";
import { Panel } from "../shell/Panel";

export function MotorMatrixWidget() {
  const [cmd, setCmd] = useState<MotorCommand | null>(null);
  const [connected, setConnected] = useState(false);
  const [ageMs, setAgeMs] = useState<number | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/stream/motor");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      setCmd(JSON.parse(event.data) as MotorCommand);
      setAgeMs(0);
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    if (!cmd) return;
    const timer = setInterval(() => setAgeMs((prev) => (prev === null ? null : prev + 100)), 100);
    return () => clearInterval(timer);
  }, [cmd]);

  const matrix = useMemo(() => (cmd ? formatMotorMatrix(cmd) : null), [cmd]);

  return (
    <Panel
      title="MOTOR OUT"
      subtitle="telemetry/motor_out · XPUB :9201 · 40B wire"
      active={connected}
      className="col-span-12 lg:col-span-5"
    >
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>COORDINATE MATRIX</span>
        <span className={ageMs !== null && ageMs < 250 ? "text-cursor-glow" : "text-muted"}>
          {ageMs === null ? "NO DATA" : `${ageMs}ms AGE`}
        </span>
      </div>

      <div className="overflow-x-auto border border-line bg-void">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {(matrix ?? [["FIELD", "VALUE", "UNIT"]]).map((row, idx) => (
              <tr key={`${row[0]}-${idx}`} className="border-b border-line/50">
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className={`px-3 py-1.5 ${
                      idx === 0
                        ? "bg-surface text-[10px] uppercase tracking-widest text-muted"
                        : cellIdx === 1 && row[0].startsWith("τ")
                          ? "text-cursor-glow"
                          : cellIdx === 1 && ["x", "y", "z"].includes(row[0])
                            ? "text-stark"
                            : "text-muted"
                    } ${cellIdx === 0 ? "w-24" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px]">
        <CoordTile axis="X" value={cmd?.x} unit="m" />
        <CoordTile axis="Y" value={cmd?.y} unit="m" />
        <CoordTile axis="Z" value={cmd?.z} unit="m" />
      </div>
    </Panel>
  );
}

function CoordTile({ axis, value, unit }: { axis: string; value?: number; unit: string }) {
  return (
    <div className="border border-line bg-panel px-3 py-2 shadow-panel">
      <div className="text-muted">{axis}</div>
      <div className="text-lg text-cursor-glow">{value !== undefined ? value.toFixed(4) : "—"}</div>
      <div className="text-[10px] text-muted">{unit}</div>
    </div>
  );
}
