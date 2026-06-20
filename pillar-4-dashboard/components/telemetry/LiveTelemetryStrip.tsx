"use client";

import { formatMotorMatrix } from "@/lib/motor-matrix";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const ENCODING: Record<number, string> = { 1: "JPEG", 2: "RGB8", 3: "DEPTH16" };

export function LiveTelemetryStrip() {
  const { frame, connected: visionUp } = useVisionStream();
  const { command, connected: motorUp } = useMotorStream();

  const motorRows = command ? formatMotorMatrix(command) : null;

  return (
    <div className="border-b border-line bg-panel px-4 py-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>Live Mesh Telemetry</span>
        <span className="flex gap-4">
          <span className={visionUp ? "text-cursor-glow" : "text-muted"}>
            vision_in {visionUp ? "LIVE" : "—"}
          </span>
          <span className={motorUp ? "text-cursor-glow" : "text-muted"}>
            motor_out {motorUp ? "LIVE" : "—"}
          </span>
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="border border-line bg-void p-3 font-mono text-[10px]">
          <div className="mb-2 uppercase tracking-widest text-cursor-glow">telemetry/vision_in</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted">
            <span>seq</span>
            <span className="text-stark">{frame?.seq ?? "—"}</span>
            <span>res</span>
            <span className="text-stark">
              {frame ? `${frame.width}×${frame.height}` : "—"}
            </span>
            <span>enc</span>
            <span className="text-stark">{frame ? (ENCODING[frame.encoding] ?? frame.encoding) : "—"}</span>
            <span>payload</span>
            <span className="text-stark">{frame ? `${frame.payloadBytes} B` : "—"}</span>
          </div>
        </div>

        <div className="border border-line bg-void p-3 font-mono text-[10px]">
          <div className="mb-2 uppercase tracking-widest text-cursor-glow">telemetry/motor_out</div>
          {motorRows ? (
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
              {motorRows.slice(1).map((row) => (
                <div key={row[0]} className="contents">
                  <span className="text-muted">{row[0]}</span>
                  <span className="col-span-2 text-stark">
                    {row[1]} {row[2] !== "—" ? row[2] : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted">AWAITING MOTOR FRAME</span>
          )}
        </div>
      </div>
    </div>
  );
}
