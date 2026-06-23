"use client";

import { useCallback, useEffect, useState } from "react";

import type { DietSync, HealthAppSync } from "@/lib/vital-health-types";

interface GarminStatus {
  linked: boolean;
  expiresAt: string | null;
  clientConfigured: boolean;
  redirectUri?: string;
}

interface VitalBridgesPanelProps {
  healthAppSync: HealthAppSync[];
  dietSync: DietSync[];
  dietSyncVisible: boolean;
  onConnectApp: (app: string) => Promise<void>;
  onReload: () => Promise<void>;
}

export function VitalBridgesPanel({
  healthAppSync,
  dietSync,
  dietSyncVisible,
  onConnectApp,
  onReload,
}: VitalBridgesPanelProps) {
  const [garmin, setGarmin] = useState<GarminStatus | null>(null);
  const [garminAuthorizeUrl, setGarminAuthorizeUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [signal, setSignal] = useState<string | null>(null);

  const loadGarmin = useCallback(async () => {
    const res = await fetch("/api/vital/garmin", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as GarminStatus & { ok?: boolean };
    setGarmin(data);
  }, []);

  useEffect(() => {
    void loadGarmin();
  }, [loadGarmin]);

  const startGarminLink = async () => {
    setBusy("garmin");
    setSignal(null);
    try {
      const res = await fetch("/api/vital/garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = (await res.json()) as { authorizeUrl?: string; error?: string };
      if (data.authorizeUrl) {
        setGarminAuthorizeUrl(data.authorizeUrl);
        setSignal("Open Garmin authorize URL, then return and refresh.");
      } else {
        setSignal(data.error ?? "Could not start Garmin OAuth");
      }
    } finally {
      setBusy(null);
    }
  };

  const completeGarminLink = async () => {
    setBusy("garmin-complete");
    try {
      await fetch("/api/vital/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", app: "Garmin Connect" }),
      });
      await loadGarmin();
      await onReload();
      setSignal("Garmin bridge marked connected locally.");
    } finally {
      setBusy(null);
    }
  };

  const unlinkGarmin = async () => {
    setBusy("garmin-unlink");
    try {
      await fetch("/api/vital/garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      setGarminAuthorizeUrl("");
      await loadGarmin();
      setSignal("Garmin unlinked.");
    } finally {
      setBusy(null);
    }
  };

  const connectApp = async (app: string) => {
    setBusy(app);
    try {
      await onConnectApp(app);
      setSignal(`${app} marked connected.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-sans text-sm font-semibold text-stark">Health app bridges</h3>
        <p className="mt-1 font-sans text-xs text-muted">
          Preview until eno2 validation — Connect marks local state; live pull ships on hardware. Vitals never leave the
          appliance unless you opt in via mesh publish.
        </p>
      </div>

      <ul className="space-y-2 font-sans text-sm">
        {healthAppSync.map((app) => (
          <li key={app.app} className="flex flex-wrap items-center justify-between gap-2 border border-line px-3 py-2">
            <div>
              <span className="text-stark">{app.app}</span>
              {app.lastSyncAt ? (
                <p className="font-mono text-[9px] text-muted">Last sync {new Date(app.lastSyncAt).toLocaleString()}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={app.connected ? "text-cursor-glow" : "text-muted"}>
                {app.connected ? "Connected" : "Not connected"}
              </span>
              {!app.connected ? (
                <button
                  type="button"
                  disabled={busy === app.app}
                  onClick={() => void connectApp(app.app)}
                  className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-stark hover:border-cursor-glow"
                >
                  Connect
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <section className="border border-line bg-panel p-4">
        <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">Garmin Connect OAuth</h4>
        <p className="mt-2 font-sans text-xs text-muted">
          PKCE OAuth with token refresh — tokens stored at /etc/curxor/garmin-oauth.json for eno2 health sync.
        </p>
        <div className="mt-3 space-y-2 font-sans text-sm">
          <p>
            Status:{" "}
            <span className={garmin?.linked ? "text-green-400" : "text-muted"}>
              {garmin?.linked ? `linked · expires ${garmin.expiresAt ?? "?"}` : "not linked"}
            </span>
          </p>
          {!garmin?.clientConfigured ? (
            <p className="text-amber-300">Set GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET in dashboard.env to enable OAuth.</p>
          ) : null}
          {garminAuthorizeUrl ? (
            <a
              href={garminAuthorizeUrl}
              className="block break-all text-xs text-cursor-glow underline"
              target="_blank"
              rel="noreferrer"
            >
              {garminAuthorizeUrl}
            </a>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy !== null || !garmin?.clientConfigured}
              onClick={() => void startGarminLink()}
              className="border border-cursor-glow px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-stark disabled:opacity-50"
            >
              Link Garmin
            </button>
            {garmin?.linked ? (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void completeGarminLink()}
                  className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-stark"
                >
                  Mark bridge connected
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void unlinkGarmin()}
                  className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted"
                >
                  Unlink
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {dietSyncVisible ? (
        <section>
          <h4 className="font-sans text-sm font-semibold text-stark">Diet app sync</h4>
          <ul className="mt-2 space-y-2">
            {dietSync.map((row) => (
              <li key={row.app} className="border border-line px-3 py-2 font-sans text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-stark">{row.app}</span>
                  <span className="text-muted">{row.lastSyncAt ? "Synced" : "Pending bridge"}</span>
                </div>
                {row.caloriesTarget ? (
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    Target {row.caloriesTarget} kcal
                    {row.macros
                      ? ` · P${row.macros.protein} C${row.macros.carbs} F${row.macros.fat}`
                      : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {signal ? <p className="font-mono text-[10px] text-muted">{signal}</p> : null}
    </div>
  );
}
