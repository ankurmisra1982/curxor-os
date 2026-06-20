"use client";

import { useEffect, useRef } from "react";

import { useOtaLogStream } from "@/hooks/useOtaLogStream";
import type { OtaLogLevel } from "@/lib/ota-logs";

interface OtaTerminalWidgetProps {
  active?: boolean;
  className?: string;
}

export function OtaTerminalWidget({ active = true, className = "" }: OtaTerminalWidgetProps) {
  const { lines, connected } = useOtaLogStream(active);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div
      className={`relative flex h-full min-h-[240px] flex-col overflow-hidden border border-line bg-void ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(188,19,254,0.03)_0px,rgba(188,19,254,0.03)_1px,transparent_1px,transparent_3px)] opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cursor-glow/40 to-transparent" />

      <header className="relative z-10 flex items-center justify-between border-b border-line bg-panel/80 px-3 py-2 backdrop-blur-sm">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">System Health</p>
          <p className="font-mono text-[10px] text-muted">/var/log/curxor/ota-update.log</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? "animate-pulse-cursor bg-cursor-glow shadow-cursor" : "bg-line"}`}
          />
          <span className={connected ? "text-cursor-glow" : "text-muted"}>{connected ? "LIVE" : "OFFLINE"}</span>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-3 font-mono text-[11px] leading-relaxed"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <p className="text-muted">
            <span className="text-cursor-glow">&gt;</span> Awaiting OTA telemetry stream…
          </p>
        ) : (
          lines.map((entry) => (
            <div key={entry.seq} className="whitespace-pre-wrap break-all">
              <span className="mr-2 select-none text-[10px] text-muted/70">{formatClock(entry.ts)}</span>
              <span className={lineClass(entry.level)}>{entry.line}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <footer className="relative z-10 border-t border-line bg-panel/80 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span className="text-cursor-glow">&gt;</span> tail -f ota-update.log · sovereign edge · zero cloud
      </footer>
    </div>
  );
}

function lineClass(level: OtaLogLevel): string {
  if (level === "error") return "text-red-400";
  if (level === "system") return "text-cursor-glow";
  return "text-stark";
}

function formatClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
  } catch {
    return "--:--:--";
  }
}
