import type { ReactNode } from "react";

export function AppMetric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-line bg-panel px-4 py-3">
      <div className="font-sans text-xs text-muted">{label}</div>
      <div className={`mt-1 font-mono text-2xl tabular-nums ${highlight ? "text-cursor-glow" : "text-stark"}`}>
        {value}
      </div>
      <div className="font-sans text-xs text-muted">{unit}</div>
    </div>
  );
}

export function AppSection({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`border border-line bg-void ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-sans text-sm font-medium text-stark">{title}</h2>
          <p className="mt-1 font-sans text-xs text-muted">{subtitle}</p>
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
