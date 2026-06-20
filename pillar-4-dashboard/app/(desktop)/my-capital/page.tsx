"use client";

import { DigitalReceiptPanel } from "@/components/digital/DigitalReceiptPanel";
import { useDigitalStream } from "@/hooks/useDigitalStream";
import { useMotorStream } from "@/hooks/useMotorStream";
import type { ReactNode } from "react";
import { formatTradeReceipt } from "@/lib/digital-protocol";

const RULES = [
  {
    id: "RULE-01",
    name: "BTC dip DCA",
    asset: "BTC-USD",
    class: "CRYPTO",
    trigger: "price < SMA(20) · 4h",
    action: "BUY 2% portfolio",
    state: "ARMED",
  },
  {
    id: "RULE-02",
    name: "NVDA momentum",
    asset: "NVDA",
    class: "EQUITY",
    trigger: "RSI(14) < 35 · 1d",
    action: "BUY $500 notional",
    state: "ARMED",
  },
  {
    id: "RULE-03",
    name: "ETH take-profit",
    asset: "ETH-USD",
    class: "CRYPTO",
    trigger: "gain > 12% · 7d",
    action: "SELL 25% position",
    state: "PAUSED",
  },
  {
    id: "RULE-04",
    name: "SPY rebalance",
    asset: "SPY",
    class: "ETF",
    trigger: "allocation drift > 5%",
    action: "REBALANCE to target",
    state: "ARMED",
  },
];

const WATCHLIST = [
  { symbol: "BTC-USD", price: "67,842", change: "+1.2%", cls: "CRYPTO" },
  { symbol: "ETH-USD", price: "3,412", change: "-0.4%", cls: "CRYPTO" },
  { symbol: "NVDA", price: "892.10", change: "+2.1%", cls: "EQUITY" },
  { symbol: "SPY", price: "528.44", change: "+0.3%", cls: "ETF" },
  { symbol: "SOL-USD", price: "178.22", change: "+3.8%", cls: "CRYPTO" },
];

const RECENT_SIGNALS = [
  { time: "14:02", rule: "RULE-01", signal: "SMA crossunder", result: "DRY-RUN BUY queued" },
  { time: "13:41", rule: "RULE-04", signal: "Drift 5.2%", result: "Rebalance sim OK" },
  { time: "11:18", rule: "RULE-02", signal: "RSI 33.1", result: "Awaiting confirm" },
];

export default function MyCapitalPage() {
  const { command, connected } = useMotorStream();
  const digital = useDigitalStream("capital.execute_trade");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Portfolio (mock)" value="$124.8K" unit="paper trading" highlight />
        <Metric label="Active Rules" value="3" unit="of 4 defined" />
        <Metric label="24h P&L" value="+1.84%" unit="simulated" />
        <Metric label="Engine Link" value={connected ? "SYNC" : "IDLE"} unit={`claw ${command?.clawId ?? "—"}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Section
          className="lg:col-span-3"
          title="Rule Engine"
          subtitle="Flexible IF/THEN blocks · stocks · crypto · ETFs · local evaluation only"
        >
          <div className="mb-4 border border-line bg-panel p-4 font-mono text-[10px]">
            <div className="uppercase tracking-widest text-muted">New rule template</div>
            <div className="mt-2 text-stark">
              <span className="text-cursor-glow">WHEN</span> [asset] [indicator/condition]{" "}
              <span className="text-cursor-glow">THEN</span> [action] [size]
            </div>
            <div className="mt-2 text-muted">
              Examples: SMA cross · RSI band · % gain · allocation drift · time window
            </div>
          </div>
          <div className="overflow-x-auto border border-line">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-line bg-surface text-[10px] uppercase tracking-widest text-muted">
                  <th className="px-3 py-2 text-left">Rule</th>
                  <th className="px-3 py-2 text-left">Asset</th>
                  <th className="px-3 py-2 text-left">Trigger</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-right">State</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((r) => (
                  <tr key={r.id} className="border-b border-line/50">
                    <td className="px-3 py-2">
                      <div className="text-cursor-glow">{r.id}</div>
                      <div className="text-[10px] text-stark">{r.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-stark">{r.asset}</div>
                      <div className="text-[10px] text-muted">{r.class}</div>
                    </td>
                    <td className="px-3 py-2 text-muted">{r.trigger}</td>
                    <td className="px-3 py-2 text-stark">{r.action}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={r.state === "ARMED" ? "text-cursor-glow" : "text-muted"}>{r.state}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          className="lg:col-span-2"
          title="Watchlist"
          subtitle="Stocks & crypto · mock quotes · feed adapter offline-ready"
        >
          <div className="space-y-2 font-mono text-xs">
            {WATCHLIST.map((w) => (
              <div key={w.symbol} className="grid grid-cols-4 gap-2 border border-line bg-panel px-3 py-2">
                <span className="text-cursor-glow">{w.symbol}</span>
                <span className="text-stark">{w.price}</span>
                <span className={w.change.startsWith("+") ? "text-cursor-glow" : "text-muted"}>{w.change}</span>
                <span className="text-right text-[10px] text-muted">{w.cls}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="border border-line bg-void p-3">
              <div className="uppercase tracking-widest text-muted">Equities</div>
              <div className="mt-1 text-stark">42% alloc</div>
            </div>
            <div className="border border-line bg-void p-3">
              <div className="uppercase tracking-widest text-muted">Crypto</div>
              <div className="mt-1 text-stark">28% alloc</div>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Signal Log" subtitle="Recent rule evaluations · paper mode · no live brokerage by default">
        <div className="overflow-x-auto border border-line">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-line bg-surface text-[10px] uppercase tracking-widest text-muted">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Rule</th>
                <th className="px-3 py-2 text-left">Signal</th>
                <th className="px-3 py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_SIGNALS.map((row) => (
                <tr key={row.time + row.rule} className="border-b border-line/50">
                  <td className="px-3 py-2 text-muted">{row.time}</td>
                  <td className="px-3 py-2 text-cursor-glow">{row.rule}</td>
                  <td className="px-3 py-2 text-stark">{row.signal}</td>
                  <td className="px-3 py-2 text-right text-stark">{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <DigitalReceiptPanel
        title="Trade Execution Receipts"
        toolFilter="capital.execute_trade"
        receipts={digital.receipts}
        latest={digital.latest}
        connected={digital.connected}
        formatReceipt={formatTradeReceipt}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-line bg-panel px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-mono text-2xl ${highlight ? "text-cursor-glow" : "text-stark"}`}>{value}</div>
      <div className="font-mono text-[10px] text-muted">{unit}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-void ${className}`}>
      <header className="border-b border-line px-4 py-3">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">{title}</h2>
        <p className="mt-1 font-mono text-[10px] text-muted">{subtitle}</p>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
