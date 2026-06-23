"use client";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ShopEbayConnectStrip } from "@/components/apps/shop/ShopEbayConnectStrip";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { shopTerm } from "@/lib/shop-level-copy";
import type { GrowthLevel } from "@/lib/os-growth-level";
import type { EbayBridgeStatus } from "@/lib/shop-dashboard-types";

type Stage = "INGEST" | "SORT" | "PICK" | "SHIP";

interface Order {
  id: string;
  sku: string;
  stage: Stage;
  eta: string;
}

const STAGES: Stage[] = ["INGEST", "SORT", "PICK", "SHIP"];

interface ShopPipelinePanelProps extends Pick<AgentAppContext, "updateWorkspaceContext"> {
  growthLevel: GrowthLevel;
  orders: Order[];
  selected: string;
  setSelected: (id: string) => void;
  ebayConnected?: boolean;
  ebay?: EbayBridgeStatus;
  onEbayUpdated?: () => void;
}

export function ShopPipelinePanel({
  growthLevel,
  orders,
  selected,
  setSelected,
  updateWorkspaceContext,
  ebayConnected = false,
  ebay,
  onEbayUpdated,
}: ShopPipelinePanelProps) {
  return (
    <ExperienceAppSection
      appId="my-shop"
      sectionId="pipeline"
      minLevel="beginner"
      title={shopTerm(growthLevel, "pipelineLabel")}
      subtitle={
        ebayConnected
          ? "eBay fulfillment via eno2 · select an order · agent skills advance stages"
          : "Demo canvas · select an order · use agent skills to advance stages"
      }
    >
      {ebay && onEbayUpdated ? <ShopEbayConnectStrip ebay={ebay} onUpdated={onEbayUpdated} /> : null}
      {!ebayConnected && (
        <p className="mb-4 font-mono text-[10px] text-amber-300/90">
          Preview only — connect eBay on Margins tab and sync to replace demo orders.
        </p>
      )}
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
            onClick={() => {
              setSelected(o.id);
              updateWorkspaceContext({
                selectedOrderId: o.id,
                selectedSku: o.sku,
                selectedOrderStage: o.stage,
              });
            }}
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
  );
}

export type { Order, Stage };
export { STAGES };

export function applyShopSkillToOrders(
  orders: Order[],
  selected: string,
  skillTick: number,
  lastSkillId: string | null,
): Order[] | null {
  if (skillTick === 0 || !lastSkillId) return null;

  if (lastSkillId === "ingest_order") {
    return [
      {
        id: `ORD-${1045 + orders.length}`,
        sku: "NEW-SKU",
        stage: "INGEST",
        eta: "12s",
      },
      ...orders,
    ];
  }

  if (lastSkillId !== "sort_sku" && lastSkillId !== "retry_pick" && lastSkillId !== "ship_bin") return null;

  return orders.map((o) => {
    if (o.id !== selected) return o;
    const idx = STAGES.indexOf(o.stage);
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)]!;
    return { ...o, stage: next, eta: next === "SHIP" ? "Ready" : `${4 + idx * 3}s` };
  });
}
