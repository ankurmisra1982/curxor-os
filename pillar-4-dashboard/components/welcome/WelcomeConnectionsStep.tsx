"use client";

import { useCallback, useEffect, useState } from "react";

import type { ConnectorLinkId } from "@/lib/connector-link-catalog";
import { welcomeConnectionsForApps } from "@/lib/welcome-connections-catalog";
import type { OotbAppId } from "@/lib/ootb-apps";

interface WelcomeConnectionsStepProps {
  selectedApps: OotbAppId[];
  privacyAcknowledged: boolean;
  onSkipAll: () => void;
}

export function WelcomeConnectionsStep({
  selectedApps,
  privacyAcknowledged,
  onSkipAll,
}: WelcomeConnectionsStepProps) {
  const entries = welcomeConnectionsForApps(selectedApps);
  const [linkBusy, setLinkBusy] = useState<ConnectorLinkId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<ConnectorLinkId>>(new Set());
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");
  const [blueskyOpen, setBlueskyOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/shell/connectors", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        trade?: { brokers?: { id: string; configured: boolean }[] };
        publish?: { platforms?: { id: string; configured: boolean }[] };
        comms?: { connectors?: { id: string; configured: boolean }[] };
      };
      const live = new Set<ConnectorLinkId>();
      for (const b of data.trade?.brokers ?? []) {
        if (b.configured && b.id.includes("alpaca")) live.add("alpaca_paper");
      }
      for (const p of data.publish?.platforms ?? []) {
        if (p.configured && p.id === "bluesky") live.add("bluesky");
      }
      for (const c of data.comms?.connectors ?? []) {
        if (c.configured) {
          if (c.id.includes("google")) live.add("google_workspace");
          if (c.id.includes("hubspot")) live.add("hubspot");
        }
      }
      setConnected(live);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runLink = useCallback(
    async (connectorId: ConnectorLinkId, action = "start", extra?: Record<string, unknown>) => {
      if (!privacyAcknowledged) {
        setError("Acknowledge privacy on step 1 before connecting accounts.");
        return;
      }
      setLinkBusy(connectorId);
      setMessage(null);
      setError(null);
      try {
        const res = await fetch("/api/shell/connectors/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectorId, action, ...extra }),
        });
        const json = (await res.json()) as {
          authorizeUrl?: string;
          error?: string;
          detail?: string;
          message?: string;
          connected?: boolean;
          demo?: boolean;
          steps?: string[];
        };
        if (res.status === 403 && json.error === "privacy_required") {
          setError(json.detail ?? "Privacy acknowledgment required.");
          return;
        }
        if (!res.ok) {
          const raw = json.error ?? json.detail ?? "Link failed";
          if (json.demo || /not set|not configured/i.test(String(raw))) {
            setMessage(
              json.detail ??
                "This connector needs keys in digital.env — skip for now and finish in Settings → Integrations.",
            );
            if (Array.isArray(json.steps) && json.steps.length > 0) {
              setMessage(`${json.detail ?? raw} ${json.steps[0]}`);
            }
            return;
          }
          throw new Error(String(raw));
        }

        const url = json.authorizeUrl;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
          setMessage("Complete sign-in in the new tab, then refresh here or continue to Home.");
        } else if (json.connected) {
          setMessage(json.detail ?? "Connected.");
          setConnected((prev) => new Set(prev).add(connectorId));
        } else if (json.demo) {
          const steps = Array.isArray(json.steps) ? json.steps.join(" ") : "";
          setMessage(
            [json.detail ?? json.message ?? "Not configured on this box yet — skip and use Settings later.", steps]
              .filter(Boolean)
              .join(" "),
          );
        } else if (json.steps) {
          setMessage(json.steps.join(" "));
        } else {
          setMessage(json.detail ?? json.message ?? "Check Settings → Integrations for next steps.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Link failed");
      } finally {
        setLinkBusy(null);
      }
    },
    [privacyAcknowledged],
  );

  const saveBluesky = useCallback(async () => {
    await runLink("bluesky", "save", {
      credentials: {
        BLUESKY_HANDLE: blueskyHandle,
        BLUESKY_APP_PASSWORD: blueskyPassword,
      },
    });
    setBlueskyPassword("");
    setBlueskyOpen(false);
  }, [blueskyHandle, blueskyPassword, runLink]);

  if (entries.length === 0) {
    return (
      <div className="p-6">
        <h2 className="font-sans text-lg font-semibold text-stark">Connect accounts (optional)</h2>
        <p className="mt-2 font-sans text-sm text-muted">
          No day-one connectors for your selected jobs — you can wire integrations anytime in Settings.
        </p>
        <button
          type="button"
          onClick={onSkipAll}
          className="mt-4 border border-line px-4 py-2 font-sans text-sm text-muted hover:text-stark"
        >
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="font-sans text-lg font-semibold text-stark">Connect accounts (optional)</h2>
      <p className="mt-2 max-w-2xl font-sans text-sm text-muted">
        Link only what you need — nothing sends outbound until you approve an action. Skip anything
        and finish in Settings later.
      </p>

      {!privacyAcknowledged ? (
        <p className="mt-4 border border-amber-400/40 bg-amber-950/20 px-4 py-3 font-sans text-sm text-amber-200">
          Go back to <strong>Your metal</strong> and tap Continue to unlock connections, or skip this
          step for now.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 border border-red-900/60 bg-red-950/30 px-4 py-2 font-sans text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 border border-line bg-surface px-4 py-2 font-sans text-sm text-cursor-glow">
          {message}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {entries.map((entry) => {
          const isLive = connected.has(entry.connectorId);
          const busy = linkBusy === entry.connectorId;
          return (
            <li key={entry.connectorId} className="border border-line bg-void px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{entry.jobLabel}</p>
                  <p className="font-sans text-sm font-medium text-stark">{entry.plainTitle}</p>
                  <p className="mt-1 font-sans text-xs text-muted">{entry.plainBlurb}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isLive ? (
                    <span className="border border-emerald-500/40 px-3 py-1.5 font-sans text-xs text-emerald-400">
                      Connected
                    </span>
                  ) : entry.connectorId === "bluesky" ? (
                    <button
                      type="button"
                      disabled={!privacyAcknowledged || busy}
                      onClick={() => setBlueskyOpen((v) => !v)}
                      className="border border-cursor-glow px-3 py-1.5 font-sans text-xs text-cursor-glow disabled:opacity-40"
                    >
                      {blueskyOpen ? "Cancel" : "Connect"}
                    </button>
                  ) : entry.connectorId === "alpaca_paper" ? (
                    <>
                      <button
                        type="button"
                        disabled={!privacyAcknowledged || busy}
                        onClick={() => void runLink("alpaca_paper", "start")}
                        className="border border-line px-3 py-1.5 font-sans text-xs text-stark hover:border-cursor-glow disabled:opacity-40"
                      >
                        Setup guide
                      </button>
                      <button
                        type="button"
                        disabled={!privacyAcknowledged || busy}
                        onClick={() => void runLink("alpaca_paper", "verify")}
                        className="border border-cursor-glow px-3 py-1.5 font-sans text-xs text-cursor-glow disabled:opacity-40"
                      >
                        {busy ? "…" : "Verify"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!privacyAcknowledged || busy}
                      onClick={() => void runLink(entry.connectorId, "start")}
                      className="border border-cursor-glow px-3 py-1.5 font-sans text-xs text-cursor-glow disabled:opacity-40"
                    >
                      {busy ? "…" : "Connect"}
                    </button>
                  )}
                </div>
              </div>
              {entry.connectorId === "bluesky" && blueskyOpen ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={blueskyHandle}
                    onChange={(e) => setBlueskyHandle(e.target.value)}
                    placeholder="handle.bsky.social"
                    className="border border-line bg-panel px-3 py-2 font-sans text-sm text-stark"
                  />
                  <input
                    type="password"
                    value={blueskyPassword}
                    onChange={(e) => setBlueskyPassword(e.target.value)}
                    placeholder="App password"
                    className="border border-line bg-panel px-3 py-2 font-sans text-sm text-stark"
                  />
                  <button
                    type="button"
                    disabled={!blueskyHandle.trim() || !blueskyPassword.trim() || busy}
                    onClick={() => void saveBluesky()}
                    className="sm:col-span-2 border border-cursor-glow px-3 py-2 font-sans text-sm text-cursor-glow disabled:opacity-40"
                  >
                    Save Bluesky credentials
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onSkipAll}
        className="mt-6 font-sans text-sm text-muted underline-offset-2 hover:text-stark hover:underline"
      >
        Skip all for now — I&apos;ll connect in Settings
      </button>
    </div>
  );
}
