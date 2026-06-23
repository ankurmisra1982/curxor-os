"use client";

import type { MedicalReport } from "@/lib/vital-health-types";

interface VitalReportsPanelProps {
  reports: MedicalReport[];
}

export function VitalReportsPanel({ reports }: VitalReportsPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-sans text-sm font-semibold text-stark">Medical report vault</h3>
        <p className="mt-1 font-sans text-xs text-muted">
          PDF summaries and lab tags stay in vital-health.json on this appliance — use Ingest Report in chat.
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="border border-line px-3 py-4 font-sans text-sm text-muted">No reports yet — ingest via chat skill.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="border border-line bg-void p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-sans text-sm font-medium text-stark">{report.title}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {report.provider} · {new Date(report.receivedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-cursor-glow">{report.id}</span>
              </div>
              <p className="mt-2 font-sans text-xs text-muted">{report.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {report.tags.map((tag) => (
                  <span key={tag} className="border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
