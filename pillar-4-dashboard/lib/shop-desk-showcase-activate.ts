import "server-only";

import { readShopSync, channelConnected } from "./shop-sync-store";
import { syncShopifyCatalog } from "./shop-commerce-sync";
import { syncEbayFulfillment } from "./shop-ebay-sync";
import { syncPrintifyCatalog } from "./shop-printify-sync";

/** Dev/GTM: auto-sync all commerce channels when showcase env is on and desk is incomplete. */
export async function ensureShopDeskShowcase(storeName: string): Promise<boolean> {
  if (process.env.CURXOR_SHOP_DESK_SHOWCASE !== "1") return false;

  const sync = await readShopSync();
  const connected = [
    sync?.channels.shopify,
    sync?.channels.ebay,
    sync?.channels.printify,
  ].filter((slice) => slice && channelConnected(slice)).length;

  if (connected >= 3) return false;

  const allowMock = {
    shopify: process.env.CURXOR_SHOPIFY_MOCK === "1",
    ebay: process.env.CURXOR_EBAY_MOCK === "1",
    printify: process.env.CURXOR_PRINTIFY_MOCK === "1",
  };

  await Promise.all([
    syncShopifyCatalog({ storeName, allowMock: allowMock.shopify }),
    syncEbayFulfillment({ storeName, allowMock: allowMock.ebay }),
    syncPrintifyCatalog({ storeName, allowMock: allowMock.printify }),
  ]);

  return true;
}

export async function activateShopDeskShowcase(storeName: string): Promise<{
  ok: boolean;
  shopify: Awaited<ReturnType<typeof syncShopifyCatalog>>;
  ebay: Awaited<ReturnType<typeof syncEbayFulfillment>>;
  printify: Awaited<ReturnType<typeof syncPrintifyCatalog>>;
}> {
  const allowMock = {
    shopify: process.env.CURXOR_SHOPIFY_MOCK === "1",
    ebay: process.env.CURXOR_EBAY_MOCK === "1",
    printify: process.env.CURXOR_PRINTIFY_MOCK === "1",
  };

  const [shopify, ebay, printify] = await Promise.all([
    syncShopifyCatalog({ storeName, allowMock: allowMock.shopify }),
    syncEbayFulfillment({ storeName, allowMock: allowMock.ebay }),
    syncPrintifyCatalog({ storeName, allowMock: allowMock.printify }),
  ]);

  return {
    ok: shopify.ok || ebay.ok || printify.ok,
    shopify,
    ebay,
    printify,
  };
}
