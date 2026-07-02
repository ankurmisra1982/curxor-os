"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ComputeMetricsWidget } from "./ComputeMetricsWidget";
import { OtaTerminalWidget } from "./OtaTerminalWidget";

interface SystemHealthDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SystemHealthDrawer({ open, onClose }: SystemHealthDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close system health panel"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-void shadow-[0_0_48px_rgba(188,19,254,0.12)]"
        role="dialog"
        aria-label="System Health"
      >
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Flight Command</p>
            <h2 className="font-display text-sm uppercase tracking-[0.2em] text-stark">System Health</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition hover:border-cursor-glow hover:text-cursor-glow"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <p className="border border-line bg-panel px-3 py-2 font-sans text-xs text-muted">
            Restart stack, reboot, or shut down from{" "}
            <Link href="/settings?tab=system" className="text-cursor-glow hover:underline">
              Settings → System
            </Link>
            .
          </p>
          <ComputeMetricsWidget active={open} />
          <OtaTerminalWidget active={open} className="h-full min-h-[50vh]" />
        </div>
      </aside>
    </>
  );
}
