"use client";

import { useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

type Stage = "INGEST" | "SORT" | "PICK" | "SHIP";

interface Order {
  id: string;
  sku: string;
  stage: Stage;
  eta: string;
}

const INITIAL: Order[] = [
  { id: "ORD-1042", sku: "GEAR-KIT-A", stage: "INGEST", eta: "12s" },
  { id: "ORD-1043", sku: "CLAW-PRIZE-03", stage: "SORT", eta: "4s" },
  { id: "ORD-1044", sku: "ROBOTAXI-MAT", stage: "PICK", eta: "18s" },
];

const STAGES: Stage[] = ["INGEST", "SORT", "PICK", "SHIP"];

export function MyShopApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { command, connected } = useMotorStream();
  useVisionStream();
  const [orders, setOrders] = useState(INITIAL);
  const [selected, setSelected] = useState<string>("ORD-1042");
  const store = typeof config.storeName === "string" ? config.storeName : "Arbitrage Desk";
  const sortRate = command ? (command.seq % 9) + 12 : 0;

  useEffect(() => {
    const order = orders.find((o) => o.id === selected);
    if (!order) return;
    updateWorkspaceContext({
      selectedOrderId: order.id,
      selectedSku: order.sku,
      selectedOrderStage: order.stage,
    });
  }, [selected, orders, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId === "ingest_order") {
      setOrders((prev) => [
        {
          id: `ORD-${1045 + prev.length}`,
          sku: "NEW-SKU",
          stage: "INGEST",
          eta: "12s",
        },
        ...prev,
      ]);
      return;
    }
    if (lastSkillId !== "sort_sku" && lastSkillId !== "retry_pick" && lastSkillId !== "ship_bin") return;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== selected) return o;
        const idx = STAGES.indexOf(o.stage);
        const next = STAGES[Math.min(idx + 1, STAGES.length - 1)]!;
        return { ...o, stage: next, eta: next === "SHIP" ? "Ready" : `${4 + idx * 3}s` };
      }),
    );
  }, [skillTick, lastSkillId, selected]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-shop").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{store}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Arbitrage Claw · margin watch · eno2 fulfillment bridge
          <ExperienceLevelBadge />
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <AppMetric label="Orders Today" value="128" unit="ingested locally" />
        <AppMetric label="Claw Sort Rate" value={connected ? String(sortRate) : "—"} unit="units/min" highlight />
        <AppMetric label="Active Order" value={selected} unit="tap row to select" />
      </div>

      <ExperienceAppSection
        appId="my-shop"
        sectionId="pipeline"
        minLevel="beginner"
        title="Fulfillment Pipeline"
        subtitle="Select an order · use agent skills to advance stages"
      >
        <div className="mb-4 grid gap-2 md:grid-cols-4">
          {STAGES.map((stage, idx) => {
            const count = orders.filter((o) => o.stage === stage).length;
            return (
              <div key={stage} className="border border-line bg-panel p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{stage}</div>
                <div className="mt-1 font-mono text-lg text-cursor-glow">{count}</div>
                <div className="mt-2 h-1 bg-void">
                  <div className="h-full bg-cursor-glow" style={{ width: `${30 + idx * 20}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="font-mono text-xs">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o.id)}
              className={`grid w-full grid-cols-4 gap-2 border-b py-2 text-left ${
                selected === o.id ? "bg-surface text-cursor-glow" : "text-stark"
              }`}
            >
              <span>{o.id}</span>
              <span>{o.sku}</span>
              <span className="text-muted">{o.stage}</span>
              <span className="text-right">{o.eta}</span>
            </button>
          ))}
        </div>
      </ExperienceAppSection>
    </div>
  );
}
