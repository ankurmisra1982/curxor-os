"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, metadata: { institution?: { name?: string } }) => void;
        onExit: (err: unknown, metadata: unknown) => void;
      }) => { open: () => void };
    };
  }
}

interface PlaidStatusRow {
  configured: boolean;
  linked: boolean;
  institutionName: string | null;
  lastSyncAt: string | null;
  mode: string;
  note: string;
}

function loadPlaidScript(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Plaid Link"));
    document.head.appendChild(script);
  });
}

export function CapitalPlaidLinkSection({ onLinked }: { onLinked?: () => void }) {
  const [status, setStatus] = useState<PlaidStatusRow | null>(null);
  const [signal, setSignal] = useState("Loading Plaid…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/capital/plaid", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as PlaidStatusRow & { ok?: boolean };
    setStatus(data);
    setSignal(data.note);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openLink = async () => {
    setBusy(true);
    try {
      const tokenRes = await fetch("/api/capital/plaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_link_token" }),
      });
      const tokenJson = (await tokenRes.json()) as { ok?: boolean; linkToken?: string; error?: string };
      if (!tokenJson.linkToken) {
        setSignal(tokenJson.error ?? "Link token failed");
        return;
      }
      await loadPlaidScript();
      if (!window.Plaid) {
        setSignal("Plaid Link script unavailable");
        return;
      }
      window.Plaid.create({
        token: tokenJson.linkToken,
        onSuccess: (publicToken, metadata) => {
          void (async () => {
            const ex = await fetch("/api/capital/plaid", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "exchange_public_token",
                publicToken,
                institutionName: metadata.institution?.name,
              }),
            });
            const json = (await ex.json()) as { ok?: boolean; error?: string };
            setSignal(json.ok ? "Bank linked · syncing PFM" : json.error ?? "Exchange failed");
            await load();
            onLinked?.();
          })();
        },
        onExit: (err) => {
          if (err) setSignal("Plaid Link exited");
        },
      }).open();
    } catch (err) {
      setSignal(err instanceof Error ? err.message : "Plaid Link failed");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    const res = await fetch("/api/capital/plaid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSignal(json.ok ? "Plaid sync complete" : json.error ?? "Sync failed");
    await load();
    onLinked?.();
    setBusy(false);
  };

  const unlink = async () => {
    if (!window.confirm("Unlink Plaid and revert to demo PFM data?")) return;
    await fetch("/api/capital/plaid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlink" }),
    });
    await load();
    onLinked?.();
    setSignal("Plaid unlinked");
  };

  if (!status) return <p className="font-mono text-[10px] text-muted">{signal}</p>;

  return (
    <div className="border border-dashed border-line/60 p-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="uppercase tracking-widest text-muted">Bank link (Plaid)</p>
        <span className={status.linked ? "text-cursor-glow" : "text-muted"}>
          {status.linked ? status.institutionName ?? "Linked" : status.configured ? "Ready to link" : "Not configured"}
        </span>
      </div>
      <p className="mt-1 text-muted">{signal}</p>
      {status.lastSyncAt ? (
        <p className="text-muted">Last sync {new Date(status.lastSyncAt).toLocaleString()}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!status.configured || busy}
          onClick={() => void openLink()}
          className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
        >
          Link bank
        </button>
        {status.linked ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sync()}
              className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark"
            >
              Sync now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void unlink()}
              className="border border-line px-2 py-0.5 uppercase text-muted"
            >
              Unlink
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
