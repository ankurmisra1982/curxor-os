"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ComingSoonBadge } from "@/components/app-shared/ComingSoonBadge";
import { PreviewModuleBanner } from "@/components/app-shared/PreviewModuleBanner";
import { ShopFulfillmentPanel } from "@/components/apps/shop/ShopFulfillmentPanel";
import { ShopLevelBadge } from "@/components/apps/shop/ShopLevelBadge";
import { ShopLevelUpNudge } from "@/components/apps/shop/ShopLevelUpNudge";
import { ShopMarginWatchPanel } from "@/components/apps/shop/ShopMarginWatchPanel";
import {
  applyShopSkillToOrders,
  ShopPipelinePanel,
  type Order,
} from "@/components/apps/shop/ShopPipelinePanel";
import { ShopMultiChannelDeskStrip } from "@/components/apps/shop/ShopMultiChannelDeskStrip";
import {
  defaultShopTab,
  shopSectionVisible,
  ShopWorkspaceTabs,
  type ShopWorkspaceTab,
} from "@/components/apps/shop/ShopWorkspaceTabs";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import { getOotbApp } from "@/lib/ootb-apps";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { isGrowthLevel } from "@/lib/os-growth-level";
import { resolveShopGrowthLevel } from "@/lib/shop-growth";
import { shopFeatureVisible, shopTabsForGrowth } from "@/lib/shop-level-gates";
import { shopLevelCopy, shopTerm } from "@/lib/shop-level-copy";
import type { SkuSpreadRow } from "@/lib/shop-margin-watch";
import { ShopPreviewHeroPanel } from "@/components/apps/shop/ShopPreviewHeroPanel";
import type { ShopDeskShowcase } from "@/lib/shop-desk-showcase";
import type {
  EbayBridgeStatus,
  PrintifyBridgeStatus,
  ShopifyBridgeStatus,
  ShopPipelineOrder,
} from "@/lib/shop-dashboard-types";

const DEFAULT_DESK: ShopDeskShowcase = {
  mode: "empty",
  connectedChannelCount: 0,
  totalChannels: 3,
  spreadCount: 0,
  liveSpreadCount: 0,
  pipelineOrderCount: 0,
  channels: [],
  headline: "Multi-channel desk · preview",
  subline: "Activate desk preview to showcase the sovereign margin desk.",
};

const DEFAULT_SHOPIFY: ShopifyBridgeStatus = {
  configured: false,
  connected: false,
  shopDomain: null,
  lastSyncAt: null,
  lastReceiptId: null,
  lastSyncOk: null,
  spreadSource: "demo",
};

const DEFAULT_EBAY: EbayBridgeStatus = {
  configured: false,
  connected: false,
  environment: null,
  lastSyncAt: null,
  lastReceiptId: null,
  lastSyncOk: null,
  orderSource: "demo",
  pipelineOrderCount: 0,
};

const DEFAULT_PRINTIFY: PrintifyBridgeStatus = {
  configured: false,
  connected: false,
  shopId: null,
  shopTitle: null,
  lastSyncAt: null,
  lastReceiptId: null,
  lastSyncOk: null,
  spreadSource: "demo",
};

const INITIAL_ORDERS: Order[] = [
  { id: "ORD-1042", sku: "GEAR-KIT-A", stage: "INGEST", eta: "12s" },
  { id: "ORD-1043", sku: "CLAW-PRIZE-03", stage: "SORT", eta: "4s" },
  { id: "ORD-1044", sku: "ROBOTAXI-MAT", stage: "PICK", eta: "18s" },
];

export function MyShopApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  useVisionStream();
  const { connected } = useMotorStream();
  const { level: experienceLevel } = useExperienceLevel();

  const [settingsGrowth, setSettingsGrowth] = useState<GrowthLevel | null>(null);
  const growthLevel = resolveShopGrowthLevel(config, experienceLevel, settingsGrowth);
  const levelCopy = shopLevelCopy(growthLevel);

  const [workspaceTab, setWorkspaceTab] = useState<ShopWorkspaceTab>(() => defaultShopTab(growthLevel));
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selected, setSelected] = useState("ORD-1042");
  const [selectedSku, setSelectedSku] = useState("GEAR-KIT-A");
  const [spreads, setSpreads] = useState<SkuSpreadRow[]>([]);
  const [shopify, setShopify] = useState<ShopifyBridgeStatus>(DEFAULT_SHOPIFY);
  const [ebay, setEbay] = useState<EbayBridgeStatus>(DEFAULT_EBAY);
  const [printify, setPrintify] = useState<PrintifyBridgeStatus>(DEFAULT_PRINTIFY);
  const [deskShowcase, setDeskShowcase] = useState<ShopDeskShowcase>(DEFAULT_DESK);
  const [deskBusy, setDeskBusy] = useState(false);

  const store = typeof config.storeName === "string" ? config.storeName : "Arbitrage Desk";
  const fulfillmentMode = typeof config.fulfillmentMode === "string" ? config.fulfillmentMode : "pick_pack_ship";
  const clawLanes = Array.isArray(config.clawLanes)
    ? config.clawLanes.filter((v): v is string => typeof v === "string")
    : ["INGEST", "SORT"];

  const ordersMetric = growthLevel === "L1" ? "3" : "128";

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const g = data?.settings?.appearance?.shopGrowthLevel;
        if (isGrowthLevel(g)) setSettingsGrowth(g);
      })
      .catch(() => undefined);
  }, []);

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard_bootstrap" }),
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        spreads?: SkuSpreadRow[];
        shopify?: ShopifyBridgeStatus;
        ebay?: EbayBridgeStatus;
        printify?: PrintifyBridgeStatus;
        pipelineOrders?: ShopPipelineOrder[];
        deskShowcase?: ShopDeskShowcase;
      };
      if (Array.isArray(data.spreads)) setSpreads(data.spreads);
      if (data.shopify) setShopify(data.shopify);
      if (data.ebay) setEbay(data.ebay);
      if (data.printify) setPrintify(data.printify);
      if (data.deskShowcase) setDeskShowcase(data.deskShowcase);
      if (data.ebay?.connected && Array.isArray(data.pipelineOrders) && data.pipelineOrders.length > 0) {
        setOrders(data.pipelineOrders);
        setSelected(data.pipelineOrders[0]!.id);
      }
    } catch {
      /* dev offline */
    }
  }, []);

  const runDeskAction = useCallback(
    async (action: "activate_desk_showcase" | "sync_all_channels") => {
      setDeskBusy(true);
      try {
        const res = await fetch("/api/shop/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) await loadBootstrap();
      } finally {
        setDeskBusy(false);
      }
    },
    [loadBootstrap],
  );

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    const visible = shopTabsForGrowth(growthLevel);
    if (!visible.includes(workspaceTab)) setWorkspaceTab(defaultShopTab(growthLevel));
  }, [growthLevel, workspaceTab]);

  useEffect(() => {
    const order = orders.find((o) => o.id === selected);
    if (!order) return;
    updateWorkspaceContext({
      selectedOrderId: order.id,
      selectedSku: order.sku,
      selectedOrderStage: order.stage,
    });
    setSelectedSku(order.sku);
  }, [selected, orders, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    setOrders((prev) => {
      const next = applyShopSkillToOrders(prev, selected, skillTick, lastSkillId);
      return next ?? prev;
    });
  }, [skillTick, lastSkillId, selected]);

  const hideSection = useCallback(
    (sectionId: string) => !shopSectionVisible(sectionId, workspaceTab, growthLevel),
    [workspaceTab, growthLevel],
  );

  const showPipelineMetrics = useMemo(() => shopFeatureVisible(growthLevel, "pipeline-demo"), [growthLevel]);
  const liveDesk = deskShowcase.mode === "live";

  return (
    <div className="space-y-4 p-4">
      <PreviewModuleBanner appId="my-shop" />

      <header className="border border-line bg-panel px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
            OOTB · {getOotbApp("my-shop").name}
          </p>
          <ComingSoonBadge />
          <ShopLevelBadge growthLevel={growthLevel} />
        </div>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{store}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          {liveDesk ? "Live multi-channel desk · preview showcase" : levelCopy.subtitle}
        </p>
      </header>

      <ShopMultiChannelDeskStrip
        desk={deskShowcase}
        busy={deskBusy}
        onActivate={
          deskShowcase.mode !== "live"
            ? () => void runDeskAction("activate_desk_showcase")
            : undefined
        }
        onResync={
          deskShowcase.connectedChannelCount > 0
            ? () => void runDeskAction("sync_all_channels")
            : undefined
        }
      />

      <ShopWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} growthLevel={growthLevel} />

      {shopFeatureVisible(growthLevel, "level-up-nudge") && growthLevel !== "L5" && (
        <ShopLevelUpNudge growthLevel={growthLevel} />
      )}

      {showPipelineMetrics && workspaceTab === "pipeline" && (
        <div className="grid gap-4 md:grid-cols-3">
          <AppMetric
            label={shopTerm(growthLevel, "ordersMetric")}
            value={liveDesk ? String(deskShowcase.pipelineOrderCount) : ordersMetric}
            unit={liveDesk ? "eBay · receipt" : ebay.connected ? "eBay · live" : "demo · local only"}
          />
          <AppMetric
            label="Live spreads"
            value={liveDesk ? String(deskShowcase.liveSpreadCount) : "—"}
            unit={liveDesk ? "shopify · ebay · printify" : "sync channels"}
            highlight={liveDesk}
          />
          <AppMetric label="Active Order" value={selected} unit="tap row to select" />
        </div>
      )}

      {showPipelineMetrics && workspaceTab === "overview" && liveDesk && (
        <div className="grid gap-4 md:grid-cols-3">
          <AppMetric label="Channels live" value={`${deskShowcase.connectedChannelCount}`} unit="receipt validated" highlight />
          <AppMetric label="Margin rows" value={String(deskShowcase.liveSpreadCount)} unit="merged desk" />
          <AppMetric label="Pipeline" value={String(deskShowcase.pipelineOrderCount)} unit="eBay fulfillment" />
        </div>
      )}

      {!hideSection("preview-hero") && (
        <ShopPreviewHeroPanel
          growthLevel={growthLevel}
          storeName={store}
          desk={deskShowcase}
          busy={deskBusy}
          onActivateDesk={() => void runDeskAction("activate_desk_showcase")}
        />
      )}

      {!hideSection("pipeline") && (
        <ShopPipelinePanel
          growthLevel={growthLevel}
          orders={orders}
          selected={selected}
          setSelected={setSelected}
          updateWorkspaceContext={updateWorkspaceContext}
          ebayConnected={ebay.connected}
          ebay={ebay}
          onEbayUpdated={() => void loadBootstrap()}
        />
      )}

      {!hideSection("margin-watch") && (
        <ShopMarginWatchPanel
          growthLevel={growthLevel}
          spreads={spreads}
          selectedSku={selectedSku}
          onSelectSku={(sku) => {
            setSelectedSku(sku);
            updateWorkspaceContext({ selectedSku: sku });
          }}
          shopify={shopify}
          onShopifyUpdated={() => void loadBootstrap()}
          anyLiveSpreads={(shopify.connected || printify.connected) && spreads.some((s) => s.source !== "demo")}
        />
      )}

      {!hideSection("fulfillment-lanes") && (
        <ShopFulfillmentPanel
          growthLevel={growthLevel}
          fulfillmentMode={fulfillmentMode}
          clawLanes={clawLanes}
          connected={connected}
          printify={printify}
          onPrintifyUpdated={() => void loadBootstrap()}
        />
      )}
    </div>
  );
}
