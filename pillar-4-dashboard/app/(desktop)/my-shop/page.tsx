"use client";

import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const MOCK_ORDERS = [
  { id: "ORD-1042", sku: "GEAR-KIT-A", stage: "INGEST", eta: "12s" },
  { id: "ORD-1043", sku: "CLAW-PRIZE-03", stage: "SORT", eta: "4s" },
  { id: "ORD-1044", sku: "ROBOTAXI-MAT", stage: "PICK", eta: "18s" },
];

export default function MyShopPage() {
  const { command, connected } = useMotorStream();
  useVisionStream();
  const sortRate = command ? (command.seq % 9) + 12 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Orders Ingested" value="128" unit="today" />
        <Metric label="Claw Sort Rate" value={connected ? `${sortRate}` : "—"} unit="units/min" highlight />
        <Metric label="Pipeline Lag" value={connected ? "0.8" : "—"} unit="sec" />
      </div>

      <section className="border border-line bg-void">
        <header className="border-b border-line px-4 py-3">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Fulfillment Pipeline</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            Mock order ingestion vs physical claw sorting · motor seq {command?.seq ?? "—"}
          </p>
        </header>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {["INGEST", "SORT", "SHIP"].map((stage, idx) => (
            <div key={stage} className="border border-line bg-panel p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{stage}</div>
              <div className="mt-3 h-2 overflow-hidden border border-line bg-void">
                <div
                  className="h-full bg-cursor-glow transition-all"
                  style={{ width: `${40 + idx * 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-4 font-mono text-xs">
          {MOCK_ORDERS.map((o) => (
            <div key={o.id} className="grid grid-cols-4 gap-2 border-b border-line/40 py-2 last:border-0">
              <span className="text-cursor-glow">{o.id}</span>
              <span className="text-stark">{o.sku}</span>
              <span className="text-muted">{o.stage}</span>
              <span className="text-right text-stark">{o.eta}</span>
            </div>
          ))}
        </div>
      </section>
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
