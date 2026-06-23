export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { clearEbayLink, writeEbayLink } from "@/lib/commerce-ebay-store";
import { clearPrintifyLink, writePrintifyLink } from "@/lib/commerce-printify-store";
import {
  clearShopifyLink,
  writeShopifyLink,
} from "@/lib/commerce-shopify-store";
import { buildShopDashboardBootstrap } from "@/lib/shop-dashboard-bootstrap";
import { syncShopifyCatalog } from "@/lib/shop-commerce-sync";
import { syncEbayFulfillment } from "@/lib/shop-ebay-sync";
import { syncPrintifyCatalog } from "@/lib/shop-printify-sync";
import { activateShopDeskShowcase } from "@/lib/shop-desk-showcase-activate";
import { emptyShopSyncState, writeShopSync } from "@/lib/shop-sync-store";

export async function GET(): Promise<Response> {
  const boot = await buildShopDashboardBootstrap();
  return Response.json(boot, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    shopDomain?: string;
    accessToken?: string;
    apiVersion?: string;
    environment?: string;
    shopId?: string;
    shopTitle?: string;
    refreshToken?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";

  try {
    switch (action) {
      case "dashboard_bootstrap": {
        const boot = await buildShopDashboardBootstrap();
        return Response.json(boot);
      }
      case "save_shopify_credentials": {
        const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain.trim() : "";
        const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
        if (!shopDomain || !accessToken) {
          return Response.json({ ok: false, error: "shopDomain and accessToken required" }, { status: 400 });
        }
        const link = await writeShopifyLink({
          shopDomain,
          accessToken,
          apiVersion: typeof body.apiVersion === "string" ? body.apiVersion : undefined,
        });
        return Response.json({ ok: true, link: { shopDomain: link.shopDomain, apiVersion: link.apiVersion, linkedAt: link.linkedAt } });
      }
      case "clear_shopify_credentials": {
        await clearShopifyLink();
        return Response.json({ ok: true });
      }
      case "sync_shopify": {
        const boot = await buildShopDashboardBootstrap();
        const result = await syncShopifyCatalog({
          storeName: boot.storeName,
          allowMock: process.env.CURXOR_SHOPIFY_MOCK === "1",
        });
        const refreshed = await buildShopDashboardBootstrap();
        return Response.json({ ok: result.ok, result, bootstrap: refreshed });
      }
      case "save_ebay_credentials": {
        const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
        if (!accessToken) {
          return Response.json({ ok: false, error: "accessToken required" }, { status: 400 });
        }
        const envRaw = typeof body.environment === "string" ? body.environment.toLowerCase() : "production";
        const link = await writeEbayLink({
          accessToken,
          refreshToken: typeof body.refreshToken === "string" ? body.refreshToken : null,
          environment: envRaw === "sandbox" ? "sandbox" : "production",
        });
        return Response.json({ ok: true, link: { environment: link.environment, linkedAt: link.linkedAt } });
      }
      case "clear_ebay_credentials": {
        await clearEbayLink();
        return Response.json({ ok: true });
      }
      case "sync_ebay": {
        const boot = await buildShopDashboardBootstrap();
        const result = await syncEbayFulfillment({
          storeName: boot.storeName,
          allowMock: process.env.CURXOR_EBAY_MOCK === "1",
        });
        const refreshed = await buildShopDashboardBootstrap();
        return Response.json({ ok: result.ok, result, bootstrap: refreshed });
      }
      case "save_printify_credentials": {
        const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
        const shopId = typeof body.shopId === "string" ? body.shopId.trim() : "";
        if (!accessToken || !shopId) {
          return Response.json({ ok: false, error: "accessToken and shopId required" }, { status: 400 });
        }
        const link = await writePrintifyLink({
          accessToken,
          shopId,
          shopTitle: typeof body.shopTitle === "string" ? body.shopTitle : null,
        });
        return Response.json({ ok: true, link: { shopId: link.shopId, shopTitle: link.shopTitle, linkedAt: link.linkedAt } });
      }
      case "clear_printify_credentials": {
        await clearPrintifyLink();
        return Response.json({ ok: true });
      }
      case "sync_printify": {
        const boot = await buildShopDashboardBootstrap();
        const result = await syncPrintifyCatalog({
          storeName: boot.storeName,
          allowMock: process.env.CURXOR_PRINTIFY_MOCK === "1",
        });
        const refreshed = await buildShopDashboardBootstrap();
        return Response.json({ ok: result.ok, result, bootstrap: refreshed });
      }
      case "reset_commerce_demo": {
        await Promise.all([clearShopifyLink(), clearEbayLink(), clearPrintifyLink()]);
        await writeShopSync(emptyShopSyncState());
        const boot = await buildShopDashboardBootstrap();
        return Response.json({ ok: true, bootstrap: boot });
      }
      case "activate_desk_showcase": {
        const boot = await buildShopDashboardBootstrap();
        const result = await activateShopDeskShowcase(boot.storeName);
        const refreshed = await buildShopDashboardBootstrap();
        return Response.json({ ok: result.ok, result, bootstrap: refreshed });
      }
      case "sync_all_channels": {
        const boot = await buildShopDashboardBootstrap();
        const [shopify, ebay, printify] = await Promise.all([
          syncShopifyCatalog({ storeName: boot.storeName, allowMock: process.env.CURXOR_SHOPIFY_MOCK === "1" }),
          syncEbayFulfillment({ storeName: boot.storeName, allowMock: process.env.CURXOR_EBAY_MOCK === "1" }),
          syncPrintifyCatalog({ storeName: boot.storeName, allowMock: process.env.CURXOR_PRINTIFY_MOCK === "1" }),
        ]);
        const refreshed = await buildShopDashboardBootstrap();
        return Response.json({ ok: shopify.ok || ebay.ok || printify.ok, shopify, ebay, printify, bootstrap: refreshed });
      }
      default:
        return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.warn("[shop/status] action failed:", err);
    return Response.json({ ok: false, error: "Shop status failed" }, { status: 500 });
  }
}
