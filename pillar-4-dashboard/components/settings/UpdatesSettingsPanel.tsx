"use client";

import { useCallback, useEffect, useState } from "react";

import { OtaTerminalWidget } from "@/components/system/OtaTerminalWidget";

interface OtaStatus {
  installed: { version: string; channel: string; installedAt: string | null };
  remote: {
    version: string | null;
    channel: string | null;
    released: string | null;
    releaseNotesUrl: string | null;
    severity: string | null;
  };
  updateAvailable: boolean;
  otaConfigured: boolean;
  versionUrl: string | null;
  updaterReady: boolean;
  lastCheckedAt: string | null;
}

interface OtaActionResult {
  ok: boolean;
  message: string;
  updateAvailable?: boolean;
  installed?: string;
  remote?: string | null;
  error?: string;
}

export function UpdatesSettingsPanel() {
  const [status, setStatus] = useState<OtaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/updates", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load update status");
      setStatus((await res.json()) as OtaStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/system/updates/check", { method: "POST", cache: "no-store" });
      const data = (await res.json()) as OtaActionResult;
      if (!res.ok && !data.message) throw new Error(data.error ?? "Check failed");
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  }, [load]);

  const installUpdate = useCallback(async () => {
    setInstalling(true);
    setConfirmOpen(false);
    setError(null);
    setMessage(null);
    setShowLog(true);
    try {
      const res = await fetch("/api/system/updates/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
        cache: "no-store",
      });
      const data = (await res.json()) as OtaActionResult;
      if (!res.ok) throw new Error(data.message || data.error || "Install failed");
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  }, []);

  if (loading && !status) {
    return (
      <div className="p-6 font-sans text-sm text-muted">Loading update status…</div>
    );
  }

  const installed = status?.installed;
  const remote = status?.remote;

  return (
    <div className="space-y-6 p-6">
      <section>
        <h2 className="font-sans text-lg font-semibold text-stark">System updates</h2>
        <p className="mt-1 font-sans text-sm text-muted">
          Check for CurXor OS patches on your release mirror. Updates backup first, verify checksum,
          and roll back automatically if health checks fail.
        </p>
      </section>

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
            <dt className="text-muted">Installed version</dt>
            <dd className="font-mono text-xs text-stark">{installed?.version ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">Channel</dt>
            <dd className="font-mono text-xs text-stark">{installed?.channel ?? "stable"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">Installed at</dt>
            <dd className="font-mono text-xs text-stark">
              {installed?.installedAt ? new Date(installed.installedAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">Latest available</dt>
            <dd className="font-mono text-xs text-stark">
              {remote?.version ?? "—"}
              {status?.updateAvailable ? (
                <span className="ml-2 text-cursor-glow">· update ready</span>
              ) : null}
            </dd>
          </div>
          {remote?.released ? (
            <div className="flex justify-between gap-4 border-b border-line py-2">
              <dt className="text-muted">Released</dt>
              <dd className="font-mono text-xs text-stark">{remote.released}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-muted">OTA mirror</dt>
            <dd className="max-w-[60%] truncate font-mono text-[10px] text-muted" title={status?.versionUrl ?? undefined}>
              {status?.otaConfigured ? status.versionUrl : "Not configured (/etc/curxor/ota.env)"}
            </dd>
          </div>
          {status?.lastCheckedAt ? (
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Last checked</dt>
              <dd className="font-mono text-xs text-stark">
                {new Date(status.lastCheckedAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={checking || installing}
          onClick={() => void checkForUpdates()}
          className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor transition hover:text-cursor-glow disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check for updates"}
        </button>
        <button
          type="button"
          disabled={!status?.updateAvailable || installing || checking}
          onClick={() => setConfirmOpen(true)}
          className="border border-line px-4 py-2 font-sans text-sm text-stark transition hover:border-cursor-glow disabled:opacity-40"
        >
          {installing ? "Installing…" : "Install update"}
        </button>
        {remote?.releaseNotesUrl ? (
          <a
            href={remote.releaseNotesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-4 py-2 font-sans text-sm text-muted hover:text-cursor-glow"
          >
            Release notes
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setShowLog((v) => !v)}
          className="font-sans text-sm text-muted hover:text-cursor-glow"
        >
          {showLog ? "Hide log" : "Show log"}
        </button>
      </div>

      {!status?.updaterReady ? (
        <p className="font-sans text-xs text-muted">
          OTA updater script not found on this host — version check uses local manifest only (dev mode).
        </p>
      ) : null}

      {confirmOpen ? (
        <div className="border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="font-sans text-sm text-stark">
            Install <span className="font-mono text-cursor-glow">{remote?.version}</span> now?
          </p>
          <p className="mt-2 font-sans text-xs text-muted">
            CurXor will back up /opt/curxor, apply the patch, restart services, and roll back on failure.
            Expect a brief dashboard interruption.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={installing}
              onClick={() => void installUpdate()}
              className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
            >
              Confirm install
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="font-sans text-sm text-muted hover:text-stark"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showLog || installing ? (
        <section>
          <h3 className="mb-2 font-sans text-sm font-medium text-stark">Update log</h3>
          <OtaTerminalWidget active className="min-h-[280px]" />
        </section>
      ) : null}
    </div>
  );
}
