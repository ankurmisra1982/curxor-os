"use client";

import { useState } from "react";

import type { ShopifyBridgeStatus } from "@/lib/shop-dashboard-types";

interface ShopShopifyConnectStripProps {
  shopify: ShopifyBridgeStatus;
  onUpdated: () => void;
}

export function ShopShopifyConnectStrip({ shopify, onUpdated }: ShopShopifyConnectStripProps) {
  const [open, setOpen] = useState(!shopify.configured);
  const [shopDomain, setShopDomain] = useState(shopify.shopDomain ?? "");
  const [accessToken, setAccessToken] = useState("");
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
          action: "save_shopify_credentials",
          shopDomain,
          accessToken,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setAccessToken("");
      setOpen(false);
      setMessage("Credentials saved on appliance — sync to pull catalog via eno2.");
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
        body: JSON.stringify({ action: "sync_shopify" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; result?: { error?: string; via?: string } };
      if (!data.ok) throw new Error(data.result?.error ?? data.error ?? "Sync failed");
      setMessage(
        data.result?.via === "eno2"
          ? "Shopify catalog synced via eno2 receipt."
          : data.result?.via === "inline"
            ? "Shopify catalog synced (inline dev fallback — start digital bridges for eno2 path)."
            : "Shopify catalog synced.",
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
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Shopify bridge · Wave 1</p>
          <p className="mt-1 font-mono text-xs text-stark">
            {shopify.connected ? (
              <>
                Connected · <span className="text-cursor-glow">{shopify.shopDomain}</span>
                {shopify.spreadSource === "shopify" ? " · live COGS" : ""}
              </>
            ) : shopify.configured ? (
              <>Linked · sync required for live margin rows</>
            ) : (
              <>Not linked — custom app token stays on appliance</>
            )}
          </p>
          {shopify.lastSyncAt ? (
            <p className="mt-1 font-mono text-[10px] text-muted">
              Last sync {new Date(shopify.lastSyncAt).toLocaleString()}
              {shopify.lastReceiptId ? ` · receipt ${shopify.lastReceiptId.slice(0, 8)}` : ""}
              {shopify.lastSyncOk === false ? " · failed" : shopify.lastSyncOk ? " · ok" : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {shopify.configured ? (
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
            {open ? "Hide" : shopify.configured ? "Update token" : "Connect"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="font-mono text-[10px] text-muted">
            Shop domain
            <input
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="my-store.myshopify.com"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            />
          </label>
          <label className="font-mono text-[10px] text-muted">
            Admin API access token
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="shpat_…"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-xs text-stark"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              disabled={busy || !shopDomain.trim() || !accessToken.trim()}
              onClick={() => void saveCredentials()}
              className="border border-cursor-glow/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Save on appliance
            </button>
            <p className="mt-2 font-mono text-[10px] text-muted">
              Creates a custom app in Shopify Admin → Settings → Apps → Develop apps. Scopes: read_products,
              read_orders, read_inventory.
            </p>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-2 font-mono text-[10px] text-cursor-glow">{message}</p> : null}
    </div>
  );
}
