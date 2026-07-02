"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PowerUnitStatus {
  name: string;
  active: "active" | "inactive" | "failed" | "unknown";
}

interface PowerStatus {
  ok: true;
  mode: "appliance" | "dry-run";
  sudoReady: boolean;
  applianceHost: boolean;
  units: PowerUnitStatus[];
  message: string | null;
}

interface PowerActionResult {
  ok: boolean;
  mode: "apply" | "dry-run";
  action: string;
  jobId: string;
  message: string;
  error?: string;
}

type PendingAction = "restart_stack" | "reboot" | "shutdown" | null;

function unitLabel(active: PowerUnitStatus["active"]): string {
  if (active === "active") return "active";
  if (active === "inactive") return "inactive";
  if (active === "failed") return "failed";
  return "unknown";
}

export function SystemSettingsPanel() {
  const [status, setStatus] = useState<PowerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/power", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load system power status");
      setStatus((await res.json()) as PowerStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (action: NonNullable<PendingAction>, confirm: boolean | string) => {
      setBusy(true);
      setPending(null);
      setTypedConfirm("");
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/system/power", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, confirm }),
          cache: "no-store",
        });
        const data = (await res.json()) as PowerActionResult;
        if (!res.ok) throw new Error(data.message || data.error || "Action failed");
        setMessage(data.message);
        if (data.mode === "apply" && action === "restart_stack") {
          window.setTimeout(() => {
            window.location.reload();
          }, 30000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
        void load();
      }
    },
    [load],
  );

  if (loading && !status) {
    return (
      <div className="p-6 font-sans text-sm text-muted">Loading system status…</div>
    );
  }

  const dryRun = status?.mode === "dry-run";

  return (
    <div className="space-y-6 p-6">
      <section>
        <h2 className="font-sans text-lg font-semibold text-stark">Appliance power</h2>
        <p className="mt-1 font-sans text-sm text-muted">
          Restart the CurXor stack, reboot, or shut down this box — no SSH required. Actions are
          audited and require confirmation.
        </p>
      </section>

      {dryRun && status?.message ? (
        <p className="border border-amber-900/50 bg-amber-950/20 px-4 py-3 font-sans text-sm text-amber-200">
          {status.message}
        </p>
      ) : null}

      {error ? (
        <p className="border border-red-900/60 bg-red-950/30 px-4 py-3 font-sans text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-line bg-surface px-4 py-3 font-sans text-sm text-cursor-glow">
          {message}
        </p>
      ) : null}

      <section className="border border-line bg-void p-4">
        <dl className="space-y-2 font-sans text-sm">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">Host mode</dt>
            <dd className="font-mono text-xs text-stark">{status?.mode ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">Passwordless sudo</dt>
            <dd className="font-mono text-xs text-stark">
              {status?.sudoReady ? "ready" : "not ready"}
            </dd>
          </div>
          {status?.units.map((unit) => (
            <div key={unit.name} className="flex justify-between gap-4 border-b border-line py-2">
              <dt className="font-mono text-[11px] text-muted">{unit.name}</dt>
              <dd className="font-mono text-xs text-stark">{unitLabel(unit.active)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => setPending("restart_stack")}
          className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor transition hover:text-cursor-glow disabled:opacity-50"
        >
          {busy && pending === "restart_stack" ? "Restarting…" : "Restart CurXor"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setTypedConfirm("");
            setPending("reboot");
          }}
          className="border border-line px-4 py-2 font-sans text-sm text-stark transition hover:border-cursor-glow disabled:opacity-40"
        >
          Reboot box
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setTypedConfirm("");
            setPending("shutdown");
          }}
          className="border border-line px-4 py-2 font-sans text-sm text-stark transition hover:border-red-400/60 disabled:opacity-40"
        >
          Shut down
        </button>
      </div>

      {pending === "restart_stack" ? (
        <div className="border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="font-sans text-sm text-stark">Restart the CurXor software stack now?</p>
          <p className="mt-2 font-sans text-xs text-muted">
            Services restart via systemctl — expect a brief dashboard interruption (~30 seconds).
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("restart_stack", true)}
              className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
            >
              Confirm restart
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="font-sans text-sm text-muted hover:text-stark"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {pending === "reboot" ? (
        <div className="border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="font-sans text-sm text-stark">Reboot the entire appliance?</p>
          <p className="mt-2 font-sans text-xs text-muted">
            Type <span className="font-mono text-cursor-glow">REBOOT</span> to confirm.
          </p>
          <input
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            className="mt-3 w-full max-w-xs border border-line bg-void px-3 py-2 font-mono text-sm text-stark"
            placeholder="REBOOT"
            autoComplete="off"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={busy || typedConfirm !== "REBOOT"}
              onClick={() => void runAction("reboot", "REBOOT")}
              className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
            >
              Reboot now
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setTypedConfirm("");
              }}
              className="font-sans text-sm text-muted hover:text-stark"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {pending === "shutdown" ? (
        <div className="border border-red-900/40 bg-red-950/20 p-4">
          <p className="font-sans text-sm text-stark">Shut down the appliance?</p>
          <p className="mt-2 font-sans text-xs text-muted">
            Type <span className="font-mono text-red-300">SHUTDOWN</span> to confirm. Use the power
            button to turn the box back on.
          </p>
          <input
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            className="mt-3 w-full max-w-xs border border-line bg-void px-3 py-2 font-mono text-sm text-stark"
            placeholder="SHUTDOWN"
            autoComplete="off"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={busy || typedConfirm !== "SHUTDOWN"}
              onClick={() => void runAction("shutdown", "SHUTDOWN")}
              className="border border-red-800/60 px-4 py-2 font-sans text-sm text-stark hover:text-red-300 disabled:opacity-50"
            >
              Shut down now
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setTypedConfirm("");
              }}
              className="font-sans text-sm text-muted hover:text-stark"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <p className="font-sans text-xs text-muted">
        Metrics and OTA logs live in{" "}
        <Link href="/home" className="text-cursor-glow hover:underline">
          Flight Command → System Health
        </Link>
        . Power actions stay here for safety.
      </p>
    </div>
  );
}
