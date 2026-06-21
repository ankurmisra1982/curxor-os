"use client";

import { useEffect, useRef } from "react";

interface CurvePoint {
  t: string;
  value: number;
}

interface CapitalBacktestCompareChartProps {
  strategy: CurvePoint[];
  benchmark?: CurvePoint[];
  height?: number;
}

export function CapitalBacktestCompareChart({
  strategy,
  benchmark,
  height = 140,
}: CapitalBacktestCompareChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || strategy.length < 2) return;

    let disposed = false;
    let chart: { remove: () => void } | null = null;

    void (async () => {
      const { createChart, LineSeries, ColorType, CrosshairMode, LineStyle } = await import("lightweight-charts");
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

      const stratSeries = c.addSeries(LineSeries, {
        color: "#bc13fe",
        lineWidth: 2,
        title: "Strategy",
      });
      stratSeries.setData(
        strategy.map((p) => ({ time: p.t.slice(0, 10), value: p.value })),
      );

      if (benchmark && benchmark.length >= 2) {
        const benchSeries = c.addSeries(LineSeries, {
          color: "#6b7280",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: "SPY B&H",
        });
        benchSeries.setData(
          benchmark.map((p) => ({ time: p.t.slice(0, 10), value: p.value })),
        );
      }

      c.timeScale().fitContent();
      chart = c;

      const onResize = () => {
        if (containerRef.current) c.applyOptions({ width: containerRef.current.clientWidth });
      };
      window.addEventListener("resize", onResize);
    })();

    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [strategy, benchmark, height]);

  if (strategy.length < 2) {
    return <div className="text-[10px] text-muted">Chart unavailable</div>;
  }

  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-muted">
        Strategy vs SPY buy-and-hold
      </p>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
