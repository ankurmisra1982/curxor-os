"use client";

import { useEffect, useState } from "react";

const HANDSHAKE_CHECKS = [
  { id: "npu", label: "AMD NPU Complex", detail: "Ryzen AI Max+ 395 · 126 TOPS online" },
  { id: "uma", label: "64 GB UMA Pool", detail: "Unified memory carve-out verified" },
  { id: "zmq", label: "ZeroMQ Telemetry Spine", detail: "Pub/sub broker handshake OK" },
] as const;

interface SystemHandshakeStepProps {
  onComplete: () => void;
}

export function SystemHandshakeStep({ onComplete }: SystemHandshakeStepProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= HANDSHAKE_CHECKS.length) {
        clearInterval(timer);
        setRunning(false);
        setTimeout(onComplete, 500);
        return;
      }
      const check = HANDSHAKE_CHECKS[idx];
      if (check) setCompleted((prev) => [...prev, check.id]);
      idx += 1;
    }, 480);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="p-6">
      <h2 className="font-display text-sm uppercase tracking-[0.24em] text-stark">System Handshake</h2>
      <p className="mt-2 font-mono text-xs text-muted">
        Verifying local hardware and the robotics telemetry spine — no cloud calls.
      </p>

      <div className="mt-6 space-y-2">
        {HANDSHAKE_CHECKS.map((check) => {
          const done = completed.includes(check.id);
          return (
            <div
              key={check.id}
              className={`grid grid-cols-[24px_1fr_auto] items-center gap-3 border px-4 py-3 ${
                done ? "border-cursor/40 bg-surface" : "border-line bg-void"
              }`}
            >
              <span className={`font-mono text-xs ${done ? "text-cursor-glow" : "text-muted"}`}>
                {done ? "✓" : "·"}
              </span>
              <div>
                <div className="font-mono text-xs text-stark">{check.label}</div>
                <div className="font-mono text-[10px] text-muted">{check.detail}</div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {done ? "LINKED" : running ? "…" : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
