"use client";

import { useEffect, useMemo, useState } from "react";

import { OOTB_APPS, type OotbAppId } from "@/lib/ootb-apps";

interface ProvisioningStepProps {
  apps: OotbAppId[];
  active: boolean;
  essential?: boolean;
}

type RowStatus = "pending" | "downloading" | "configuring" | "done";

interface MatrixRow {
  id: string;
  label: string;
  status: RowStatus;
  progress: number;
}

const ESSENTIAL_LABELS: Partial<Record<OotbAppId, string>> = {
  "my-capital": "Money",
  "my-content-creator": "Content",
  "my-work": "Outreach",
};

export function ProvisioningStep({ apps, active, essential = false }: ProvisioningStepProps) {
  const appRows = useMemo(
    () =>
      OOTB_APPS.filter((a) => apps.includes(a.id)).map((a) => ({
        id: `app-${a.id}`,
        label: essential && ESSENTIAL_LABELS[a.id] ? ESSENTIAL_LABELS[a.id]! : a.name,
      })),
    [apps, essential],
  );

  const [rows, setRows] = useState<MatrixRow[]>(() =>
    appRows.map((r) => ({ ...r, status: "pending", progress: 0 })),
  );

  useEffect(() => {
    setRows(appRows.map((r) => ({ ...r, status: "pending", progress: 0 })));
  }, [appRows]);

  useEffect(() => {
    if (!active || appRows.length === 0) return;

    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= appRows.length) {
        clearInterval(timer);
        return;
      }
      const current = appRows[idx];
      if (!current) return;

      setRows((prev) =>
        prev.map((row) =>
          row.id === current.id ? { ...row, status: "downloading", progress: 40 } : row,
        ),
      );

      setTimeout(() => {
        setRows((prev) =>
          prev.map((row) =>
            row.id === current.id ? { ...row, status: "configuring", progress: 72 } : row,
          ),
        );
      }, 450);

      setTimeout(() => {
        setRows((prev) =>
          prev.map((row) =>
            row.id === current.id ? { ...row, status: "done", progress: 100 } : row,
          ),
        );
      }, 900);

      idx += 1;
    }, 1000);

    return () => clearInterval(timer);
  }, [active, appRows]);

  if (essential) {
    return (
      <div className="p-6">
        <h2 className="font-sans text-lg font-semibold text-stark">Setting up your jobs</h2>
        <p className="mt-2 font-sans text-sm text-muted">
          Installing specialists on this box — stays local, no cloud download.
        </p>
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="border border-line bg-void px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-sm text-stark">{row.label}</span>
                <span
                  className={`font-sans text-xs ${
                    row.status === "done" ? "text-cursor-glow" : "text-muted"
                  }`}
                >
                  {row.status === "done" ? "Ready" : row.status === "pending" ? "Waiting…" : "Working…"}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden border border-line bg-panel">
                <div
                  className={`h-full transition-all duration-500 ${
                    row.status === "done" ? "bg-cursor-glow" : "bg-cursor-dim animate-pulse"
                  }`}
                  style={{ width: `${row.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="font-display text-sm uppercase tracking-[0.24em] text-stark">Provisioning Matrix</h2>
      <p className="mt-2 font-mono text-xs text-muted">
        Simulated download and local configuration of selected modules — no external network.
      </p>

      <div className="mt-6 overflow-x-auto border border-line">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-line bg-surface text-[10px] uppercase tracking-widest text-muted">
              <th className="px-4 py-2 text-left">Module</th>
              <th className="px-4 py-2 text-left">Progress</th>
              <th className="px-4 py-2 text-right">Phase</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line/60">
                <td className="px-4 py-3 text-stark">{row.label}</td>
                <td className="px-4 py-3">
                  <div className="h-2 overflow-hidden border border-line bg-void">
                    <div
                      className={`h-full transition-all duration-500 ${
                        row.status === "done"
                          ? "bg-cursor-glow"
                          : row.status === "configuring"
                            ? "bg-cursor"
                            : row.status === "downloading"
                              ? "animate-pulse bg-cursor-dim"
                              : "bg-line"
                      }`}
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right uppercase tracking-widest">
                  <span
                    className={
                      row.status === "done"
                        ? "text-cursor-glow"
                        : row.status !== "pending"
                          ? "text-stark"
                          : "text-muted"
                    }
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
