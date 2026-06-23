"use client";

import { useState } from "react";

import type { PrintifyBridgeStatus } from "@/lib/shop-dashboard-types";

interface ShopPrintifyConnectStripProps {
  printify: PrintifyBridgeStatus;
  onUpdated: () => void;
}

export function ShopPrintifyConnectStrip({ printify, onUpdated }: ShopPrintifyConnectStripProps) {
  const [open, setOpen] = useState(!printify.configured);
  const [accessToken, setAccessToken] = useState("");
  const [shopId, setShopId] = useState(printify.shopId ?? "");
  const [shopTitle, setShopTitle] = useState(printify.shopTitle ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveCredentials = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_printify_credentials",
          accessToken,
          shopId,
          shopTitle: shopTitle.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setAccessToken("");
      setOpen(false);
      setMessage("Printify PAT saved — sync to pull production costs via eno2.");
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const syncCatalog = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_printify" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; result?: { error?: string; via?: string } };
      if (!data.ok) throw new Error(data.result?.error ?? data.error ?? "Sync failed");
      setMessage(
        data.result?.via === "eno2"
          ? "Printify catalog synced via eno2 receipt."
          : data.result?.via === "inline"
            ? "Printify catalog synced (inline dev fallback)."
            : "Printify catalog synced.",
      );
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 border border-line bg-panel px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Printify bridge · Wave 5</p>
          <p className="mt-1 font-mono text-xs text-stark">
            {printify.connected ? (
              <>
                Connected · <span className="text-cursor-glow">{printify.shopTitle ?? printify.shopId}</span>
                {printify.spreadSource === "printify" ? " · live COGS" : ""}
              </>
            ) : printify.configured ? (
              <>Linked · sync required for POD margin rows</>
            ) : (
              <>Not linked — personal access token stays on appliance</>
            )}
          </p>
          {printify.lastSyncAt ? (
            <p className="mt-1 font-mono text-[10px] text-muted">
              Last sync {new Date(printify.lastSyncAt).toLocaleString()}
              {printify.lastReceiptId ? ` · receipt ${printify.lastReceiptId.slice(0, 8)}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {printify.configured ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void syncCatalog()}
              className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Sync catalog
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen((v) => !v)}
            className="border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted"
          >
            {open ? "Hide" : printify.configured ? "Update token" : "Connect"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="font-mono text-[10px] text-muted">
            Shop ID
            <input
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              placeholder="12345678"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            />
          </label>
          <label className="font-mono text-[10px] text-muted">
            Shop label (optional)
            <input
              value={shopTitle}
              onChange={(e) => setShopTitle(e.target.value)}
              placeholder="My POD shop"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            />
          </label>
          <label className="font-mono text-[10px] text-muted md:col-span-2">
            Personal access token
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="eyJ…"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              disabled={busy || !accessToken.trim() || !shopId.trim()}
              onClick={() => void saveCredentials()}
              className="border border-cursor-glow/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Save on appliance
            </button>
            <p className="mt-2 font-mono text-[10px] text-muted">
              Printify → My Profile → Connections → Personal Access Tokens. Shop ID from Printify shop URL.
            </p>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-2 font-mono text-[10px] text-cursor-glow">{message}</p> : null}
    </div>
  );
}
