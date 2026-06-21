"use client";

import { useState } from "react";

interface WorkImportPanelProps {
  onImport: (csv: string) => Promise<{ imported?: number; skipped?: number; error?: string }>;
}

export function WorkImportPanel({ onImport }: WorkImportPanelProps) {
  const [csv, setCsv] = useState("name,email,company,title\n");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase tracking-widest">CSV import</p>
      <p className="text-muted">Header row: name, email, company, title — duplicates skipped by email.</p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={4}
        className="w-full border border-line bg-void p-2 text-xs text-stark outline-none focus:border-cursor-glow"
        placeholder="name,email,company&#10;Jordan,j@co.io,Fintech Labs"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void onImport(csv)
            .then((r) => {
              if (r.error) setResult(r.error);
              else setResult(`Imported ${r.imported ?? 0} · skipped ${r.skipped ?? 0}`);
            })
            .finally(() => setBusy(false));
        }}
        className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
      >
        {busy ? "Importing…" : "Import leads"}
      </button>
      {result ? <p className="text-stark">{result}</p> : null}
    </div>
  );
}
