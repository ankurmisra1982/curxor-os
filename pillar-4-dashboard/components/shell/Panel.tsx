import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, subtitle, active, className = "", children }: PanelProps) {
  return (
    <section
      className={`border border-line bg-panel shadow-panel ${active ? "ring-1 ring-cursor/40" : ""} ${className}`}
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-medium uppercase tracking-[0.24em] text-stark">{title}</h2>
          {subtitle ? <p className="mt-1 font-mono text-[10px] text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          <span
            className={`inline-block h-2 w-2 rounded-full ${active ? "animate-pulse-cursor bg-cursor-glow shadow-cursor" : "bg-line"}`}
          />
          <span className={active ? "text-cursor-glow" : "text-muted"}>{active ? "ACTIVE" : "STANDBY"}</span>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
