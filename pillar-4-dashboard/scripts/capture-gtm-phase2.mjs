#!/usr/bin/env node
/**
 * Capture Capital + Outreach GTM assets and copy to curxor storefront.
 *
 * Prerequisites: dev-qa env + npm run dev (see docs/demo-pack/README.md)
 *
 * Usage:
 *   node scripts/capture-gtm-phase2.mjs
 *   node scripts/capture-gtm-phase2.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const CAPITAL_OUT = path.join(OUT, "capital");
const OUTREACH_OUT = path.join(OUT, "outreach");
const STOREFRONT_DEMO = path.resolve(DASHBOARD, "..", "..", "curxor storefront", "public", "demo");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

const VIEWPORT = { width: 1440, height: 900 };
const SETTLE_MS = 6000;

function copyToStorefront(relPath) {
  const src = path.join(OUT, relPath);
  const dest = path.join(STOREFRONT_DEMO, relPath);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`    → storefront ${relPath}`);
}

function withExperienceLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  const prev = settings.appearance?.experienceLevel ?? "beginner";
  settings.appearance = { ...settings.appearance, experienceLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    const restored = JSON.parse(raw);
    writeFileSync(USER_SETTINGS, `${JSON.stringify(restored, null, 2)}\n`, "utf8");
  });
}

function withWorkGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, workGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function waitForText(page, text) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 20_000 });
  } catch {
    console.warn(`    Warning: "${text}" not found — saving current view`);
  }
}

async function capturePage(page, url, dest, waitText) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  if (waitText) await waitForText(page, waitText);
  await page.screenshot({ path: dest, fullPage: false });
}

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const CAPITAL_FLOWS = [
  {
    file: "19-capital-go-live.png",
    label: "Go Live checklist",
    setup: async (page) => {
      await page.getByText("Go Live", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "17-setup-wizard.png",
    label: "Setup Wizard",
    setup: async (page) => {
      await page.getByRole("button", { name: /Setup Wizard/i }).first().click();
      await page.getByText("Capital setup wizard", { exact: false }).first().waitFor({ timeout: 10_000 });
    },
  },
  {
    file: "18-analytics-tab.png",
    label: "Analytics tab",
    setup: async (page) => {
      await page.getByRole("button", { name: /^Analytics$/i }).first().click();
      await page.waitForTimeout(800);
    },
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const OUTREACH_FLOWS_BEGINNER = [
  {
    file: "20-go-live.png",
    label: "Go Live",
    setup: async (page) => {
      await page.getByText("Go Live", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "21-pipeline.png",
    label: "Lead pipeline",
    setup: async (page) => {
      await page.getByText("Lead pipeline", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const OUTREACH_FLOWS_STANDARD = [
  {
    file: "22-sequences.png",
    label: "Sequences",
    setup: async (page) => {
      await page.getByText("Sequences", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "23-analytics.png",
    label: "Outreach analytics",
    setup: async (page) => {
      await page.getByText("Outreach analytics", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const OUTREACH_FLOWS_L1 = [
  {
    file: "24-l1-start-home.png",
    label: "L1 Start home",
    setup: async (page) => {
      await page.getByText("People waiting", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "25-l1-templates.png",
    label: "L1 Message templates",
    setup: async (page) => {
      await page.getByText("Message templates", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const OUTREACH_FLOWS_L2 = [
  {
    file: "26-l2-mini-sequence.png",
    label: "L2 Mini-sequence",
    setup: async (page) => {
      await page.getByRole("button", { name: /^Outreach$/i }).first().click();
      await page.waitForTimeout(600);
      await page.getByText("Mini-sequence wizard", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const OUTREACH_FLOWS_LIVE_PROOF = [
  {
    file: "29-live-proof.png",
    label: "Live proof panel",
    setup: async (page) => {
      await page.getByRole("button", { name: /^Integrations$/i }).first().click();
      await page.waitForTimeout(600);
      await page.getByText("Live proof", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const OUTREACH_FLOWS_L3 = [
  {
    file: "27-l3-deliverability.png",
    label: "L3 Deliverability",
    setup: async (page) => {
      await page.getByRole("button", { name: /^Ops$/i }).first().click();
      await page.waitForTimeout(600);
      await page.getByText("Deliverability", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "28-l3-approval.png",
    label: "L3 Send approval",
    setup: async (page) => {
      await page.getByRole("button", { name: /^Ops$/i }).first().click();
      await page.waitForTimeout(600);
      await page.getByText("Send approval", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CAPITAL_OUT, { recursive: true });
  mkdirSync(OUTREACH_OUT, { recursive: true });
  mkdirSync(STOREFRONT_DEMO, { recursive: true });

  const base = BASE.replace(/\/$/, "");
  console.log(`==> GTM phase-2 captures · base=${base}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  let failed = 0;

  console.log("==> Capital desk overview → 03-capital-claw.png\n");
  try {
    const dest = path.join(OUT, "03-capital-claw.png");
    await capturePage(page, `${base}/my-capital`, dest, "Capital");
    copyToStorefront("03-capital-claw.png");
  } catch (err) {
    failed += 1;
    console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
  }

  console.log("==> Capital Claw flows (standard — temporary settings patch)\n");
  const capitalUrl = `${base}/my-capital`;
  await withExperienceLevel("standard", async () => {
    for (const flow of CAPITAL_FLOWS) {
      const dest = path.join(CAPITAL_OUT, flow.file);
      console.log(`==> ${flow.label} → capital/${flow.file}`);
      try {
        await page.goto(capitalUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.waitForTimeout(SETTLE_MS);
        await flow.setup(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: dest, fullPage: false });
        copyToStorefront(path.join("capital", flow.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  console.log("==> Outreach desk overview → 07-unified-inbox.png\n");
  try {
    const dest = path.join(OUT, "07-unified-inbox.png");
    await capturePage(page, `${base}/my-work`, dest, "Outreach Desk");
    copyToStorefront("07-unified-inbox.png");
  } catch (err) {
    failed += 1;
    console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
  }

  console.log("==> Outreach Claw flows (beginner)\n");
  const outreachUrl = `${base}/my-work`;
  await page.goto(outreachUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  await waitForText(page, "Outreach Desk");

  for (const flow of OUTREACH_FLOWS_BEGINNER) {
    const dest = path.join(OUTREACH_OUT, flow.file);
    console.log(`==> ${flow.label} → outreach/${flow.file}`);
    try {
      await flow.setup(page);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: dest, fullPage: false });
      copyToStorefront(path.join("outreach", flow.file));
      console.log("");
    } catch (err) {
      failed += 1;
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log("==> Outreach Claw flows (standard — temporary settings patch)\n");
  await withExperienceLevel("standard", async () => {
    await page.goto(outreachUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
    await waitForText(page, "Outreach Desk");

    for (const flow of OUTREACH_FLOWS_STANDARD) {
      const dest = path.join(OUTREACH_OUT, flow.file);
      console.log(`==> ${flow.label} → outreach/${flow.file}`);
      try {
        await flow.setup(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: dest, fullPage: false });
        copyToStorefront(path.join("outreach", flow.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  console.log("==> Outreach Claw flows (L1 Explorer — workGrowthLevel patch)\n");
  await withWorkGrowthLevel("L1", async () => {
    await page.goto(outreachUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
    await waitForText(page, "Outreach Desk");
    for (const flow of OUTREACH_FLOWS_L1) {
      const dest = path.join(OUTREACH_OUT, flow.file);
      console.log(`==> ${flow.label} → outreach/${flow.file}`);
      try {
        await flow.setup(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: dest, fullPage: false });
        copyToStorefront(path.join("outreach", flow.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  console.log("==> Outreach Claw flows (L2 Side Hustler — workGrowthLevel patch)\n");
  await withWorkGrowthLevel("L2", async () => {
    await page.goto(outreachUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
    await waitForText(page, "Outreach Desk");
    for (const flow of OUTREACH_FLOWS_L2) {
      const dest = path.join(OUTREACH_OUT, flow.file);
      console.log(`==> ${flow.label} → outreach/${flow.file}`);
      try {
        await flow.setup(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: dest, fullPage: false });
        copyToStorefront(path.join("outreach", flow.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  console.log("==> Outreach Claw flows (L3 Operator — workGrowthLevel patch)\n");
  await withWorkGrowthLevel("L3", async () => {
    await page.goto(outreachUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
    await waitForText(page, "Outreach Desk");
    for (const flow of OUTREACH_FLOWS_L3) {
      const dest = path.join(OUTREACH_OUT, flow.file);
      console.log(`==> ${flow.label} → outreach/${flow.file}`);
      try {
        await flow.setup(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: dest, fullPage: false });
        copyToStorefront(path.join("outreach", flow.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  console.log("==> Outreach Claw live-proof panel (expert experience patch)\n");
  await withExperienceLevel("expert", async () => {
    await page.goto(outreachUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
    await waitForText(page, "Outreach Desk");
    for (const flow of OUTREACH_FLOWS_LIVE_PROOF) {
      const dest = path.join(OUTREACH_OUT, flow.file);
      console.log(`==> ${flow.label} → outreach/${flow.file}`);
      try {
        await flow.setup(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: dest, fullPage: false });
        copyToStorefront(path.join("outreach", flow.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  await browser.close();
  console.log(`Done · ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
