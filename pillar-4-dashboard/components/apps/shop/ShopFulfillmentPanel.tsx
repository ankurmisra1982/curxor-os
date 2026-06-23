"use client";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ShopPrintifyConnectStrip } from "@/components/apps/shop/ShopPrintifyConnectStrip";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { shopFeatureVisible } from "@/lib/shop-level-gates";
import type { PrintifyBridgeStatus } from "@/lib/shop-dashboard-types";

interface ShopFulfillmentPanelProps {
  growthLevel: GrowthLevel;
  fulfillmentMode: string;
  clawLanes: string[];
  connected: boolean;
  printify: PrintifyBridgeStatus;
  onPrintifyUpdated: () => void;
}

const MODE_LABELS: Record<string, string> = {
  pick_pack_ship: "Pick → Pack → Ship",
  claw_only: "Claw sort only",
  counter_pickup: "Counter pickup",
};

export function ShopFulfillmentPanel({
  growthLevel,
  fulfillmentMode,
  clawLanes,
  connected,
  printify,
  onPrintifyUpdated,
}: ShopFulfillmentPanelProps) {
  const modeLabel = MODE_LABELS[fulfillmentMode] ?? fulfillmentMode;

  return (
    <div className="space-y-4">
      {shopFeatureVisible(growthLevel, "fulfillment-lanes") && (
        <ExperienceAppSection
          appId="my-shop"
          sectionId="fulfillment-lanes"
          minLevel="standard"
          title="Fulfillment lanes"
          subtitle="FRE configuration · Printify POD costs on Margins when synced"
        >
          <ShopPrintifyConnectStrip printify={printify} onUpdated={onPrintifyUpdated} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="border border-line bg-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Mode</p>
              <p className="mt-1 font-mono text-sm text-stark">{modeLabel}</p>
            </div>
            <div className="border border-line bg-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Claw lanes</p>
              <p className="mt-1 font-mono text-sm text-stark">{clawLanes.length ? clawLanes.join(" · ") : "—"}</p>
            </div>
          </div>
        </ExperienceAppSection>
      )}

      {shopFeatureVisible(growthLevel, "mesh-bridge") && (
        <ExperienceAppSection
          appId="my-shop"
          sectionId="mesh-bridge"
          minLevel="expert"
          title="eno2 fulfillment bridge"
          subtitle="Preview · commerce egress via digital bridges only"
        >
          <div className="border border-line bg-panel p-4 font-mono text-[10px] text-muted">
            <p>Motor mesh: {connected ? "connected · sort rate from telemetry" : "offline · demo sort rate hidden"}</p>
            <p className="mt-2">
              Digital bridge: {printify.connected ? "Printify catalog receipt validated" : "receipt-gated — sync Printify or eBay from channel strips"}
            </p>
          </div>
        </ExperienceAppSection>
      )}
    </div>
  );
}
