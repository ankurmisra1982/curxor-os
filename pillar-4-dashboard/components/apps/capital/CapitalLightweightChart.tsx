"use client";

import { useEffect, useRef } from "react";

import type { ChartTradeMarker } from "@/lib/capital-alpha-types";
import type { TickerChartPoint } from "@/lib/capital-intel-types";

interface CapitalLightweightChartProps {
  points: TickerChartPoint[];
  markers?: ChartTradeMarker[];
  height?: number;
}

export function CapitalLightweightChart({ points, markers = [], height = 220 }: CapitalLightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || points.length < 2) return;

    let disposed = false;
    let chart: { remove: () => void } | null = null;
    let onResize: (() => void) | null = null;

    void (async () => {
      const { createChart, AreaSeries, ColorType, CrosshairMode, createSeriesMarkers } = await import(
        "lightweight-charts"
      );
      if (disposed || !containerRef.current) return;

      const width = containerRef.current.clientWidth || 320;
      const c = createChart(containerRef.current, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9ca3af",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)" },
      });

      const series = c.addSeries(AreaSeries, {
        lineColor: "#bc13fe",
        topColor: "rgba(188, 19, 254, 0.35)",
        bottomColor: "rgba(188, 19, 254, 0.02)",
        lineWidth: 2,
      });

      const data = points.map((p) => ({
        time: p.t.slice(0, 10),
        value: p.close,
      }));
      series.setData(data);

      if (markers.length > 0) {
        const seriesMarkers = createSeriesMarkers(series);
        seriesMarkers.setMarkers(
          markers.map((m) => ({
            time: m.t.slice(0, 10),
            position: m.kind === "sell" ? ("aboveBar" as const) : ("belowBar" as const),
            color: m.kind === "sell" ? "#f87171" : m.kind === "pilot" ? "#fbbf24" : "#bc13fe",
            shape: m.kind === "sell" ? ("arrowDown" as const) : ("arrowUp" as const),
            text: m.label ?? m.kind,
          })),
        );
      }

      c.timeScale().fitContent();
      chart = c;

      if (disposed || !containerRef.current) {
        c.remove();
        return;
      }

      onResize = () => {
        if (containerRef.current) c.applyOptions({ width: containerRef.current.clientWidth });
      };
      window.addEventListener("resize", onResize);
    })();

    return () => {
      disposed = true;
      if (onResize) window.removeEventListener("resize", onResize);
      chart?.remove();
    };
  }, [points, markers, height]);

  if (points.length < 2) {
    return <div className="text-[10px] text-muted">Chart unavailable</div>;
  }

  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-muted">
        TradingView Lightweight Charts
        {markers.length > 0 ? ` · ${markers.length} overlay${markers.length === 1 ? "" : "s"}` : ""}
      </p>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
