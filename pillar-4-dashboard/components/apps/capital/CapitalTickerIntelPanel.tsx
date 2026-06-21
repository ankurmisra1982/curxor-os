"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ExperienceGate } from "@/components/experience/ExperienceGate";
import { CapitalLightweightChart } from "@/components/apps/capital/CapitalLightweightChart";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { TickerChartPoint, TickerIntel } from "@/lib/capital-intel-types";
import type { IntelProviderStatus } from "@/lib/capital-data-providers";

function formatAge(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

type ChartRange = "1M" | "3M" | "ALL";

function PriceChart({ points }: { points: TickerChartPoint[] }) {
  const [range, setRange] = useState<ChartRange>("3M");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sliced = useMemo(() => {
    if (range === "ALL") return points;
    const days = range === "1M" ? 22 : 66;
    return points.slice(-days);
  }, [points, range]);

  const { path, areaPath, min, max, lastClose } = useMemo(() => {
    if (sliced.length < 2) return { path: "", areaPath: "", min: 0, max: 0, lastClose: 0 };
    const w = 320;
    const h = 72;
    const closes = sliced.map((p) => p.close);
    const lo = Math.min(...closes);
    const hi = Math.max(...closes);
    const span = hi - lo || 1;
    const coords = sliced.map((p, i) => {
      const x = (i / (sliced.length - 1)) * w;
      const y = h - ((p.close - lo) / span) * h;
      return { x, y, close: p.close, t: p.t };
    });
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    return { path: line, areaPath: area, min: lo, max: hi, lastClose: closes[closes.length - 1]! };
  }, [sliced]);

  if (!path) return <div className="h-[88px] text-[10px] text-muted">Chart unavailable</div>;

  const hover = hoverIdx != null ? sliced[hoverIdx] : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[9px] text-muted">
        <div className="flex gap-1">
          {(["1M", "3M", "ALL"] as ChartRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`border px-1.5 py-0.5 ${range === r ? "border-cursor-glow text-cursor-glow" : "border-line/50"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <span>
          ${min.toFixed(2)} – ${max.toFixed(2)}
          {hover ? ` · ${new Date(hover.t).toLocaleDateString()} $${hover.close.toFixed(2)}` : ` · $${lastClose.toFixed(2)}`}
        </span>
      </div>
      <svg
        viewBox="0 0 320 72"
        className="h-[72px] w-full"
        onMouseLeave={() => setHoverIdx(null)}
        aria-hidden
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chartFill)" className="text-cursor-glow" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cursor-glow" />
        {sliced.map((_, i) => (
          <rect
            key={i}
            x={(i / Math.max(sliced.length - 1, 1)) * 320 - 320 / sliced.length / 2}
            y={0}
            width={320 / sliced.length}
            height={72}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>
    </div>
  );
}

function formatCap(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
}

function formatVol(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function sentimentClass(label: string): string {
  if (label === "bullish") return "text-cursor-glow";
  if (label === "bearish") return "text-red-400";
  return "text-muted";
}

function MiniChart({ points }: { points: TickerChartPoint[] }) {
  return <PriceChart points={points} />;
}

interface CapitalTickerIntelPanelProps {
  watchlist: string[];
  focusTicker?: string | null;
  onTickerSelect?: (symbol: string) => void;
  onArmDipRule?: (symbol: string) => void;
  onAddWatchlist?: (symbol: string) => void;
  onCreateRuleFromThesis?: (symbol: string) => void;
}

export function CapitalTickerIntelPanel({
  watchlist,
  focusTicker,
  onTickerSelect,
  onArmDipRule,
  onAddWatchlist,
  onCreateRuleFromThesis,
}: CapitalTickerIntelPanelProps) {
  const { meetsLevel } = useExperienceLevel();
  const showStandard = meetsLevel("standard");
  const showExpert = meetsLevel("expert");

  const [query, setQuery] = useState(watchlist[0] ?? "NVDA");
  const [loading, setLoading] = useState(false);
  const [intel, setIntel] = useState<TickerIntel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<IntelProviderStatus[]>([]);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    void fetch("/api/capital/intel?meta=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { providers?: IntelProviderStatus[] }) => {
        if (j.providers) setProviders(j.providers);
      })
      .catch(() => {});
  }, []);

  const lookup = useCallback(
    async (symbol: string, refresh = true) => {
      const sym = symbol.trim().toUpperCase();
      if (!sym) return;
      setLoading(true);
      setError(null);
      try {
        const url = `/api/capital/intel?ticker=${encodeURIComponent(sym)}${refresh ? "&refresh=1" : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; intel?: TickerIntel; error?: string; cached?: boolean };
        if (!json.ok || !json.intel) {
          setError(json.error ?? "Lookup failed");
          return;
        }
        setIntel(json.intel);
        setCached(Boolean(json.cached));
        setQuery(sym);
        onTickerSelect?.(sym);
      } catch {
        setError("Intel offline");
      } finally {
        setLoading(false);
      }
    },
    [onTickerSelect],
  );

  useEffect(() => {
    if (focusTicker?.trim()) void lookup(focusTicker, true);
  }, [focusTicker, lookup]);

  const f = intel?.fundamentals;
  const newsLimit = showExpert ? 8 : showStandard ? 5 : 3;
  const chatterLimit = showExpert ? 12 : showStandard ? 6 : 0;
  const providersOk = providers.filter((p) => p.available).length;
  const providersTotal = providers.length || 6;

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") void lookup(query);
          }}
          placeholder="Enter ticker — NVDA, SPY, BTC-USD"
          className="min-w-[200px] flex-1 border border-line bg-transparent px-3 py-2 text-stark outline-none focus:border-cursor-glow"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void lookup(query)}
          className="border border-cursor-glow px-3 py-2 text-[10px] uppercase text-cursor-glow disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Research"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {watchlist.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => void lookup(t)}
            className="border border-line/60 px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
          >
            {t}
          </button>
        ))}
      </div>

      {error ? <p className="text-[10px] text-red-400">{error}</p> : null}

      {intel && f ? (
        <div className="border border-line bg-panel/40 p-3 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-lg text-stark">{intel.symbol}</p>
              <p className="text-[10px] text-muted">{f.name ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg text-stark">{f.price != null ? `$${f.price.toFixed(2)}` : "—"}</p>
              <p className={f.changePct1d != null && f.changePct1d >= 0 ? "text-cursor-glow" : "text-red-400"}>
                {f.changePct1d != null ? `${f.changePct1d >= 0 ? "+" : ""}${f.changePct1d.toFixed(2)}%` : "—"} 1D
                {showStandard && f.changePct5d != null
                  ? ` · ${f.changePct5d >= 0 ? "+" : ""}${f.changePct5d.toFixed(1)}% 5D`
                  : null}
              </p>
              <p className="text-[9px] text-muted">
                Updated {formatAge(intel.updatedAt)}
                {cached ? " · cached" : " · live"}
                {showStandard ? ` · ${providersOk}/${providersTotal} sources OK` : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onArmDipRule?.(intel.symbol)}
              className="border border-cursor-glow/60 px-2 py-1 text-[9px] uppercase text-cursor-glow hover:bg-cursor-glow/10"
            >
              Arm 5% dip rule
            </button>
            <button
              type="button"
              onClick={() => onAddWatchlist?.(intel.symbol)}
              className="border border-line px-2 py-1 text-[9px] uppercase text-muted hover:text-stark"
            >
              Add to watchlist
            </button>
            <button
              type="button"
              onClick={() => onCreateRuleFromThesis?.(intel.symbol)}
              className="border border-line px-2 py-1 text-[9px] uppercase text-muted hover:text-stark"
            >
              Rule from thesis
            </button>
          </div>

          {showStandard && intel.nextEarningsDate ? (
            <p className="text-[10px] text-muted">Next earnings · {intel.nextEarningsDate}</p>
          ) : null}

          {showStandard && intel.corporateActions?.length ? (
            <div className="flex flex-wrap gap-2 text-[9px] text-muted">
              {intel.corporateActions.slice(0, 3).map((ca) => (
                <span key={ca.id} className="border border-line/50 px-1.5 py-0.5">
                  {ca.label}
                  {ca.exDate ? ` · ${ca.exDate}` : ""}
                  {ca.amount ? ` · ${ca.amount}` : ""}
                </span>
              ))}
            </div>
          ) : null}

          {showStandard ? (
            <>
              {showExpert ? (
                <CapitalLightweightChart points={intel.chart} />
              ) : (
                <MiniChart points={intel.chart} />
              )}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-[10px]">
                <div>
                  <span className="text-muted">Mkt cap</span>
                  <br />
                  {formatCap(f.marketCap)}
                </div>
                <div>
                  <span className="text-muted">P/E</span>
                  <br />
                  {f.peRatio != null ? f.peRatio.toFixed(1) : "—"}
                </div>
                <div>
                  <span className="text-muted">Volume</span>
                  <br />
                  {formatVol(f.volume)}
                </div>
                <div>
                  <span className="text-muted">52W</span>
                  <br />
                  {f.fiftyTwoWeekLow != null && f.fiftyTwoWeekHigh != null
                    ? `$${f.fiftyTwoWeekLow.toFixed(0)}–$${f.fiftyTwoWeekHigh.toFixed(0)}`
                    : "—"}
                </div>
                {showExpert ? (
                  <div className="md:col-span-2">
                    <span className="text-muted">Avg volume</span>
                    <br />
                    {formatVol(f.avgVolume)}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-[10px] text-muted">Mkt cap {formatCap(f.marketCap)}</p>
          )}

          <div className="border border-line/50 p-2">
            <p className="text-[9px] uppercase tracking-widest text-muted">Smart take</p>
            <p className="mt-1 text-[11px] text-stark leading-relaxed">{intel.smartTake ?? "—"}</p>
            {intel.contradictionNote && showStandard ? (
              <p className="mt-2 text-[10px] text-amber-300/90">{intel.contradictionNote}</p>
            ) : null}
            {showStandard ? (
              <p className={`mt-1 text-[10px] ${sentimentClass(intel.sentiment.label)}`}>
                Chatter: {intel.sentiment.label} · {intel.sentiment.sampleSize} signals · {intel.sentiment.bullishPct}%
                bull
                {showExpert ? ` · ${intel.sentiment.bearishPct}% bear · score ${intel.sentiment.score.toFixed(2)}` : null}
              </p>
            ) : null}
            {showStandard && intel.citations?.length ? (
              <p className="mt-2 text-[9px] text-muted line-clamp-2">Sources: {intel.citations.join(" · ")}</p>
            ) : null}
          </div>

          <div className={showStandard ? "grid gap-3 md:grid-cols-2" : ""}>
            <div>
              <p className="mb-1 text-[9px] uppercase tracking-widest text-muted">News · Alpaca · CNBC · SEC</p>
              {intel.news.length === 0 ? (
                <p className="text-[10px] text-muted">No headlines — check network</p>
              ) : (
                intel.news.slice(0, newsLimit).map((n) => (
                  <div key={n.id} className="mb-2 border-b border-line/30 pb-2">
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noreferrer" className="text-stark hover:text-cursor-glow">
                        {n.title}
                      </a>
                    ) : (
                      <p className="text-stark">{n.title}</p>
                    )}
                    {showStandard ? (
                      <p className={`text-[9px] ${sentimentClass(n.sentiment)}`}>{n.sourceLabel}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {showStandard ? (
              <div>
                <p className="mb-1 text-[9px] uppercase tracking-widest text-muted">Chatter · WSB · Reddit · X</p>
                {intel.chatter.length === 0 ? (
                  <p className="text-[10px] text-muted">No social posts found</p>
                ) : (
                  intel.chatter.slice(0, chatterLimit).map((c) => (
                    <div key={c.id} className="mb-2 border-b border-line/30 pb-2">
                      <p className="text-stark line-clamp-2">{c.title}</p>
                      <p className="text-[9px] text-muted">
                        {c.sourceLabel}
                        {showExpert && c.engagement?.likes != null ? ` · ▲ ${c.engagement.likes}` : null}
                        {showExpert && c.engagement?.comments != null ? ` · 💬 ${c.engagement.comments}` : null}
                        <span className={` ml-1 ${sentimentClass(c.sentiment)}`}>{c.sentiment}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <ExperienceGate minLevel="standard" compact>
                {null}
              </ExperienceGate>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
