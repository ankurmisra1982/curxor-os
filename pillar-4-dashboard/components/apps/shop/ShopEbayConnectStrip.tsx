"use client";

import { useState } from "react";

import type { EbayBridgeStatus } from "@/lib/shop-dashboard-types";

interface ShopEbayConnectStripProps {
  ebay: EbayBridgeStatus;
  onUpdated: () => void;
}

export function ShopEbayConnectStrip({ ebay, onUpdated }: ShopEbayConnectStripProps) {
  const [open, setOpen] = useState(!ebay.configured);
  const [accessToken, setAccessToken] = useState("");
  const [environment, setEnvironment] = useState<"production" | "sandbox">(
    ebay.environment === "sandbox" ? "sandbox" : "production",
  );
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
          action: "save_ebay_credentials",
          accessToken,
          environment,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setAccessToken("");
      setOpen(false);
      setMessage("eBay token saved — sync to pull fulfillment orders via eno2.");
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const syncOrders = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_ebay" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; result?: { error?: string; via?: string } };
      if (!data.ok) throw new Error(data.result?.error ?? data.error ?? "Sync failed");
      setMessage(
        data.result?.via === "eno2"
          ? "eBay orders synced via eno2 receipt."
          : data.result?.via === "inline"
            ? "eBay orders synced (inline dev fallback)."
            : "eBay orders synced.",
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
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">eBay bridge · Wave 3</p>
          <p className="mt-1 font-mono text-xs text-stark">
            {ebay.connected ? (
              <>
                Connected · <span className="text-cursor-glow">{ebay.environment ?? "production"}</span>
                {` · ${ebay.pipelineOrderCount} pipeline rows`}
              </>
            ) : ebay.configured ? (
              <>Linked · sync required for live pipeline</>
            ) : (
              <>Not linked — OAuth user token stays on appliance</>
            )}
          </p>
          {ebay.lastSyncAt ? (
            <p className="mt-1 font-mono text-[10px] text-muted">
              Last sync {new Date(ebay.lastSyncAt).toLocaleString()}
              {ebay.lastReceiptId ? ` · receipt ${ebay.lastReceiptId.slice(0, 8)}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {ebay.configured ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void syncOrders()}
              className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Sync orders
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen((v) => !v)}
            className="border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted"
          >
            {open ? "Hide" : ebay.configured ? "Update token" : "Connect"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="font-mono text-[10px] text-muted">
            Environment
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "production" | "sandbox")}
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            >
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </label>
          <label className="font-mono text-[10px] text-muted md:col-span-2">
            User access token
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="v^1.1#…"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              disabled={busy || !accessToken.trim()}
              onClick={() => void saveCredentials()}
              className="border border-cursor-glow/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Save on appliance
            </button>
            <p className="mt-2 font-mono text-[10px] text-muted">
              eBay Developer Portal → User Tokens with sell.fulfillment.readonly scope. Flips, sports cards,
              collectibles.
            </p>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-2 font-mono text-[10px] text-cursor-glow">{message}</p> : null}
    </div>
  );
}
