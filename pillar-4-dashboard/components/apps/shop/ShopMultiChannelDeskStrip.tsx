"use client";

import type { ShopDeskShowcase } from "@/lib/shop-desk-showcase";

interface ShopMultiChannelDeskStripProps {
  desk: ShopDeskShowcase;
  busy?: boolean;
  onActivate?: () => void;
  onResync?: () => void;
}

export function ShopMultiChannelDeskStrip({
  desk,
  busy = false,
  onActivate,
  onResync,
}: ShopMultiChannelDeskStripProps) {
  const live = desk.mode === "live";

  return (
    <div
      className={`border px-4 py-3 ${
        live ? "border-cursor-glow/60 bg-cursor-glow/5" : "border-line bg-panel"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cursor-glow">
              {live ? "Live desk preview" : "Multi-channel desk"}
            </p>
            {live ? (
              <span className="border border-cursor-glow/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cursor-glow">
                3 / 3 channels
              </span>
            ) : (
              <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                {desk.connectedChannelCount} / {desk.totalChannels} channels
              </span>
            )}
          </div>
          <h2 className="mt-1 font-display text-sm uppercase tracking-[0.12em] text-stark">{desk.headline}</h2>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">{desk.subline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {desk.mode !== "live" && onActivate ? (
            <button
              type="button"
              disabled={busy}
              onClick={onActivate}
              className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Activate desk preview
            </button>
          ) : null}
          {desk.connectedChannelCount > 0 && onResync ? (
            <button
              type="button"
              disabled={busy}
              onClick={onResync}
              className="border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted"
            >
              Re-sync all
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {desk.channels.map((ch) => (
          <div
            key={ch.id}
            className={`border px-3 py-2 ${
              ch.connected ? "border-cursor-glow/40 bg-void/40" : "border-line bg-void/20"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-stark">{ch.label}</p>
              <span
                className={`font-mono text-[9px] uppercase tracking-widest ${
                  ch.connected ? "text-cursor-glow" : "text-muted"
                }`}
              >
                {ch.connected ? "live" : "idle"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] text-muted">{ch.role}</p>
            {ch.detail ? (
              <p className="mt-1 truncate font-mono text-[10px] text-stark">{ch.detail}</p>
            ) : null}
          </div>
        ))}
      </div>

      {live ? (
        <div className="mt-3 grid gap-2 border-t border-line/60 pt-3 font-mono text-[10px] text-muted md:grid-cols-3">
          <span>{desk.liveSpreadCount} live margin rows</span>
          <span>{desk.pipelineOrderCount} pipeline orders</span>
          <span className="text-amber-300/90">Preview · eno2 egress on appliance</span>
        </div>
      ) : null}
    </div>
  );
}
