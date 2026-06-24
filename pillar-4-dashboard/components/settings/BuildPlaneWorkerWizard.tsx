"use client";

import { useCallback, useEffect, useState } from "react";

import type { BuildWorkerWizardStepId } from "@/lib/user-settings-types";

interface WizardStep {
  id: BuildWorkerWizardStepId;
  title: string;
  detail: string;
  complete: boolean;
}

interface WizardReport {
  ok: boolean;
  enabled: boolean;
  workerStatus: string;
  workerHost: string | null;
  workerSshPort: number;
  workerSshUser: string;
  steps: WizardStep[];
  progress: { complete: number; total: number };
  ready: boolean;
  commands: {
    installCursor: string;
    mcpAdd: string;
    sshTunnel: string;
    workerStart: string;
  };
  probe: { online: boolean; reason: string } | null;
  delegationQueueCount: number;
}

interface BuildPlaneWorkerWizardProps {
  enabled: boolean;
  onRefresh?: () => void;
}

export function BuildPlaneWorkerWizard({ enabled, onRefresh }: BuildPlaneWorkerWizardProps) {
  const [report, setReport] = useState<WizardReport | null>(null);
  const [hostDraft, setHostDraft] = useState("127.0.0.1");
  const [portDraft, setPortDraft] = useState("22");
  const [userDraft, setUserDraft] = useState("curxor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/build/worker", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as WizardReport;
    setReport(data);
    if (data.workerHost) setHostDraft(data.workerHost);
    if (data.workerSshPort) setPortDraft(String(data.workerSshPort));
    if (data.workerSshUser) setUserDraft(data.workerSshUser);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const postAction = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/build/worker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as WizardReport & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setReport(data);
        onRefresh?.();
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onRefresh],
  );

  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading remote worker wizard…</p>;
  }

  return (
    <div className="space-y-3 border border-line/60 bg-void/30 px-3 py-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="uppercase tracking-widest text-cursor-glow">Remote worker wizard (v0.9)</p>
        <span className="text-muted">
          {report.progress.complete}/{report.progress.total} steps · worker{" "}
          <span className="text-stark">{report.workerStatus}</span>
          {report.ready ? " · ready" : ""}
        </span>
      </div>

      <ol className="space-y-2">
        {report.steps.map((step, idx) => (
          <li key={step.id} className="border border-line/40 bg-panel/20 px-2 py-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-stark ${step.complete ? "text-cursor-glow" : ""}`}>
                  {idx + 1}. {step.title} {step.complete ? "✓" : ""}
                </p>
                <p className="mt-0.5 text-muted">{step.detail}</p>
              </div>
              {!step.complete && enabled ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void postAction({ action: "complete_step", stepId: step.id })}
                  className="shrink-0 border border-line px-2 py-0.5 uppercase tracking-widest text-muted hover:text-stark disabled:opacity-40"
                >
                  Done
                </button>
              ) : null}
            </div>
            {step.id === "connect_mcp" ? (
              <code className="mt-1 block break-all text-[9px] text-stark">{report.commands.mcpAdd}</code>
            ) : null}
            {step.id === "phone_control" ? (
              <code className="mt-1 block break-all text-[9px] text-stark">{report.commands.sshTunnel}</code>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block font-sans text-xs text-muted">
          Worker host (eno1)
          <input
            value={hostDraft}
            disabled={!enabled || busy}
            onChange={(e) => setHostDraft(e.target.value)}
            className="mt-1 w-full border border-line bg-void px-2 py-1 font-mono text-[11px] text-stark"
          />
        </label>
        <label className="block font-sans text-xs text-muted">
          SSH port
          <input
            value={portDraft}
            disabled={!enabled || busy}
            onChange={(e) => setPortDraft(e.target.value)}
            className="mt-1 w-full border border-line bg-void px-2 py-1 font-mono text-[11px] text-stark"
          />
        </label>
        <label className="block font-sans text-xs text-muted">
          SSH user
          <input
            value={userDraft}
            disabled={!enabled || busy}
            onChange={(e) => setUserDraft(e.target.value)}
            className="mt-1 w-full border border-line bg-void px-2 py-1 font-mono text-[11px] text-stark"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!enabled || busy}
          onClick={() =>
            void postAction({
              action: "set_host",
              workerHost: hostDraft,
              workerSshPort: parseInt(portDraft, 10) || 22,
              workerSshUser: userDraft,
            }).then(() => setMessage("Worker host saved."))
          }
          className="border border-line px-2 py-1 uppercase tracking-widest text-muted hover:text-stark disabled:opacity-40"
        >
          Save host
        </button>
        <button
          type="button"
          disabled={!enabled || busy}
          onClick={() => void postAction({ action: "probe" }).then((d) => d && setMessage(d.probe?.reason ?? "Probed"))}
          className="border border-cursor-glow px-2 py-1 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
        >
          Probe worker
        </button>
        <button
          type="button"
          disabled={!enabled || busy}
          onClick={() =>
            void postAction({ action: "mark_online_demo", workerHost: hostDraft }).then(() =>
              setMessage("Worker marked online (demo)."),
            )
          }
          className="border border-line px-2 py-1 uppercase tracking-widest text-muted hover:text-stark disabled:opacity-40"
        >
          Mark online (demo)
        </button>
      </div>

      {report.probe ? (
        <p className="text-muted">
          Last probe: <span className={report.probe.online ? "text-cursor-glow" : "text-amber-300"}>{report.probe.reason}</span>
        </p>
      ) : null}

      {error ? <p className="text-red-300">{error}</p> : null}
      {message ? <p className="text-cursor-glow">{message}</p> : null}
    </div>
  );
}
