"use client";

import { useState } from "react";

import { SHOP_ROADMAP_WAVES } from "@/lib/shop-margin-watch";
import type { ShopDeskShowcase } from "@/lib/shop-desk-showcase";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { shopFeatureVisible } from "@/lib/shop-level-gates";

interface ShopPreviewHeroPanelProps {
  growthLevel: GrowthLevel;
  storeName: string;
  desk: ShopDeskShowcase;
  busy?: boolean;
  onActivateDesk?: () => void;
}

export function ShopPreviewHeroPanel({
  growthLevel,
  storeName,
  desk,
  busy = false,
  onActivateDesk,
}: ShopPreviewHeroPanelProps) {
  const [notifyOn, setNotifyOn] = useState(false);
  const live = desk.mode === "live";

  return (
    <div className="space-y-4">
      <div className={`border bg-panel px-4 py-4 ${live ? "border-cursor-glow/40" : "border-line"}`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cursor-glow">
          {live ? "Sovereign margin desk" : "Preview desk"}
        </p>
        <h2 className="mt-2 font-display text-sm uppercase tracking-[0.14em] text-stark">{storeName}</h2>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
          {live ? (
            <>
              Your desk pulls <span className="text-cursor-glow">Shopify COGS</span>,{" "}
              <span className="text-cursor-glow">eBay fulfillment</span>, and{" "}
              <span className="text-cursor-glow">Printify production cost</span> into one sovereign spread matrix —
              receipt-gated via eno2. This is a{" "}
              <span className="text-amber-300">preview showcase</span>; production buyers link real credentials on the
              appliance.
            </>
          ) : (
            <>
              Arbitrage Claw finds spread and acts on it — sovereign, always-on, zero SaaS rent. Commerce bridges ship in
              software; <span className="text-amber-300">activate the desk preview</span> to showcase the multi-channel
              journey before hardware validation.
            </>
          )}
        </p>
        {!live && desk.mode === "empty" && onActivateDesk ? (
          <button
            type="button"
            disabled={busy}
            onClick={onActivateDesk}
            className="mt-4 border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
          >
            Activate live desk preview
          </button>
        ) : null}
        {shopFeatureVisible(growthLevel, "notify-waitlist") && !live ? (
          <label className="mt-4 flex cursor-pointer items-center gap-2 font-mono text-[10px] text-muted">
            <input
              type="checkbox"
              checked={notifyOn}
              onChange={(e) => setNotifyOn(e.target.checked)}
              className="accent-cursor-glow"
            />
            Notify me when write paths + fulfillment automation ship (local flag only)
          </label>
        ) : null}
      </div>

      {shopFeatureVisible(growthLevel, "roadmap") && !live ? (
        <div className="grid gap-3 md:grid-cols-3">
          {SHOP_ROADMAP_WAVES.map((wave) => (
            <div
              key={wave.wave}
              className={`border bg-panel p-4 ${
                wave.status === "now" ? "border-cursor-glow/50" : "border-line"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{wave.wave}</p>
              <p
                className={`mt-1 font-mono text-[9px] uppercase tracking-widest ${
                  wave.status === "now" ? "text-cursor-glow" : wave.status === "next" ? "text-amber-300" : "text-muted"
                }`}
              >
                {wave.status === "now" ? "In preview" : wave.status === "next" ? "Next" : "Later"}
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[10px] text-stark">
                {wave.items.map((item) => (
                  <li key={item} className="text-muted">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
