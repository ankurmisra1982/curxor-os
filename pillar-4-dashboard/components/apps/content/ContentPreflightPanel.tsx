"use client";

interface PreflightCheck {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  fixHint?: string;
}

export interface PreflightReportRow {
  postId: string;
  ready: boolean;
  blockers: number;
  warnings: number;
  checks: PreflightCheck[];
  performanceScore?: number | null;
  performanceBand?: "low" | "medium" | "high" | null;
  styleScore?: number | null;
}

interface ContentPreflightPanelProps {
  report: PreflightReportRow | null;
  loading?: boolean;
}

export function ContentPreflightPanel({ report, loading }: ContentPreflightPanelProps) {
  if (loading) return <p className="font-mono text-[10px] text-muted">Running pre-flight checks…</p>;
  if (!report) return null;

  return (
    <div className="mb-3 space-y-2 font-mono text-[10px]">
      <div className="flex flex-wrap gap-2">
        <span className="uppercase tracking-widest text-muted">Pre-flight</span>
        {report.ready ? (
          <span className="text-cursor-glow">
            Ready{report.warnings > 0 ? ` · ${report.warnings} warning(s)` : ""}
          </span>
        ) : (
          <span className="text-red-400">{report.blockers} blocker(s)</span>
        )}
        {typeof report.performanceScore === "number" ? (
          <span className="text-muted">
            Predicted {report.performanceScore}/100
            {report.performanceBand ? ` · ${report.performanceBand}` : ""}
          </span>
        ) : null}
        {typeof report.styleScore === "number" ? (
          <span className="text-muted">Voice {report.styleScore}/100</span>
        ) : null}
      </div>
      <ul className="space-y-1">
        {report.checks.map((c) => (
          <li
            key={c.id}
            className={
              c.severity === "error"
                ? "text-red-400"
                : c.severity === "warning"
                  ? "text-amber-400/90"
                  : "text-muted"
            }
          >
            {c.message}
            {c.fixHint ? <span className="ml-1 opacity-70">— {c.fixHint}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
