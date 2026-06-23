#!/usr/bin/env node

/**
 * Arbitrage commerce bridge QA — Shopify, eBay, Printify mock sync + bootstrap shape.
 * Usage: node scripts/qa-shop-bridges.mjs [baseUrl]
 */
import { writeFile, unlink } from "node:fs/promises";

const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

async function resetCommerceDevState() {
  const emptyChannel = () => ({
    label: null,
    syncedAt: null,
    receiptId: null,
    spreads: [],
    orderLineCount: 0,
    pipelineOrders: [],
  });
  const shopSync = {
    version: 2,
    mergedSpreads: [],
    mergedPipelineOrders: [],
    channels: {
      shopify: emptyChannel(),
      ebay: emptyChannel(),
      printify: emptyChannel(),
    },
  };
  const syncPath = process.env.CURXOR_SHOP_SYNC_PATH;
  if (syncPath) await writeFile(syncPath, `${JSON.stringify(shopSync, null, 2)}\n`);
  for (const envKey of [
    "CURXOR_COMMERCE_SHOPIFY_PATH",
    "CURXOR_COMMERCE_EBAY_PATH",
    "CURXOR_COMMERCE_PRINTIFY_PATH",
  ]) {
    const filePath = process.env[envKey];
    if (!filePath) continue;
    try {
      await unlink(filePath);
    } catch {
      /* absent is fine */
    }
  }
}



async function post(path, body) {

  const res = await fetch(`${BASE}${path}`, {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify(body),

  });

  return { ok: res.ok, status: res.status, json: await res.json() };

}



const checks = [];

function pass(name, detail) {

  checks.push({ name, ok: true, detail });

  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);

}

function fail(name, detail) {

  checks.push({ name, ok: false, detail });

  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);

}



console.log(`==> Shop commerce bridges · base=${BASE}\n`);

await resetCommerceDevState();
await post("/api/shop/status", { action: "reset_commerce_demo" });

const boot = await post("/api/shop/status", { action: "dashboard_bootstrap" });

if (boot.ok && boot.json.shopify?.spreadSource === "demo") {

  pass("bootstrap shopify.demo", boot.json.shopify.configured ? "configured" : "unlinked");

} else {

  fail("bootstrap shopify.demo", JSON.stringify(boot.json.shopify));

}



if (boot.ok && boot.json.ebay?.orderSource === "demo") {

  pass("bootstrap ebay.demo", "unlinked ok");

} else {

  fail("bootstrap ebay.demo", JSON.stringify(boot.json.ebay));

}



if (boot.ok && boot.json.printify?.spreadSource === "demo") {

  pass("bootstrap printify.demo", "unlinked ok");

} else {

  fail("bootstrap printify.demo", JSON.stringify(boot.json.printify));

}



const syncShopify = await post("/api/shop/status", { action: "sync_shopify" });

if (syncShopify.ok && syncShopify.json.result?.via === "mock" && syncShopify.json.result?.spreads?.length > 0) {

  pass("mock shopify sync", `${syncShopify.json.result.spreads.length} spreads`);

} else if (syncShopify.ok && syncShopify.json.result?.ok) {

  pass("shopify sync", syncShopify.json.result.via ?? "ok");

} else {

  fail("shopify sync", syncShopify.json.result?.error ?? syncShopify.json.error ?? syncShopify.status);

}



const syncEbay = await post("/api/shop/status", { action: "sync_ebay" });

if (syncEbay.ok && syncEbay.json.result?.via === "mock" && syncEbay.json.result?.pipelineOrders?.length > 0) {

  pass("mock ebay sync", `${syncEbay.json.result.pipelineOrders.length} pipeline rows`);

} else if (syncEbay.ok && syncEbay.json.result?.ok) {

  pass("ebay sync", syncEbay.json.result.via ?? "ok");

} else {

  fail("ebay sync", syncEbay.json.result?.error ?? syncEbay.json.error ?? syncEbay.status);

}



const syncPrintify = await post("/api/shop/status", { action: "sync_printify" });

if (syncPrintify.ok && syncPrintify.json.result?.via === "mock" && syncPrintify.json.result?.spreads?.length > 0) {

  pass("mock printify sync", `${syncPrintify.json.result.spreads.length} spreads`);

} else if (syncPrintify.ok && syncPrintify.json.result?.ok) {

  pass("printify sync", syncPrintify.json.result.via ?? "ok");

} else {

  fail("printify sync", syncPrintify.json.result?.error ?? syncPrintify.json.error ?? syncPrintify.status);

}



const boot2 = await post("/api/shop/status", { action: "dashboard_bootstrap" });

if (boot2.ok && boot2.json.shopify?.connected === true) {

  pass("shopify connected", boot2.json.shopify.shopDomain ?? "shopify");

} else {

  fail("shopify connected", `connected=${boot2.json.shopify?.connected}`);

}



if (boot2.ok && boot2.json.ebay?.connected === true && boot2.json.ebay?.orderSource === "ebay") {

  pass("ebay connected", `${boot2.json.pipelineOrders?.length ?? 0} pipeline orders`);

} else {

  fail("ebay connected", `connected=${boot2.json.ebay?.connected} source=${boot2.json.ebay?.orderSource}`);

}



if (boot2.ok && boot2.json.printify?.connected === true) {

  pass("printify connected", boot2.json.printify.shopId ?? "printify");

} else {

  fail("printify connected", `connected=${boot2.json.printify?.connected}`);

}



if (boot2.ok && Array.isArray(boot2.json.spreadSources) && boot2.json.spreadSources.includes("shopify")) {

  pass("merged spread sources", boot2.json.spreadSources.join(","));

} else {

  fail("merged spread sources", JSON.stringify(boot2.json.spreadSources));

}



const activate = await post("/api/shop/status", { action: "activate_desk_showcase" });

if (activate.ok && activate.json.bootstrap?.deskShowcase?.mode === "live") {

  pass("live desk showcase", `${activate.json.bootstrap.deskShowcase.connectedChannelCount} channels`);

} else {

  fail("live desk showcase", activate.json.bootstrap?.deskShowcase?.mode ?? activate.json.error);

}



const failed = checks.filter((c) => !c.ok);

console.log(`\n==> ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;

