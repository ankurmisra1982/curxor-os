#!/usr/bin/env node
/**
 * Capture Kin day-one demo screenshot with dev-qa household fixture.
 * Starts next dev on a free port (or CURXOR_KIN_CAPTURE_PORT).
 *
 * Usage: node scripts/capture-kin-day-one.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const DEV_QA = path.join(DASHBOARD, "scripts", "dev-qa");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");

function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(String(port)));
    });
    s.on("error", reject);
  });
}

async function main() {
  const PORT = process.env.CURXOR_KIN_CAPTURE_PORT ?? (await findFreePort());
  const BASE = `http://127.0.0.1:${PORT}`;

  const env = {
    ...process.env,
    CURXOR_FRE_STATE_PATH: path.join(DEV_QA, "fre-state.json"),
    CURXOR_USER_SETTINGS_PATH: path.join(DEV_QA, "user-settings.json"),
    CURXOR_FAMILY_PROFILES_PATH: path.join(DEV_QA, "family-profiles.json"),
    CURXOR_APP_FRE_DIR: path.join(DEV_QA, "app-fre"),
    CURXOR_VITAL_STATE_PATH: path.join(DEV_QA, "vital-health.json"),
    CURXOR_CLAW_CONTEXT_PATH: path.join(DEV_QA, "claw-context.json"),
    CURXOR_HUMANOID_HUB_PATH: path.join(DEV_QA, "humanoid-hub.json"),
    PORT,
    HOSTNAME: "127.0.0.1",
  };

  console.log(`==> next dev on ${PORT} (dev-qa env)`);

  let serverExited = false;
  const server = spawn(
    process.execPath,
    [path.join(DASHBOARD, "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", PORT],
    { cwd: DASHBOARD, env, stdio: "inherit" },
  );

  server.on("exit", (code) => {
    serverExited = true;
    if (code !== 0 && code !== null) {
      console.error(`next dev exited with code ${code}`);
    }
  });

  const ready = await new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = async () => {
      if (serverExited) {
        reject(new Error(`next dev failed to bind on port ${PORT}`));
        return;
      }
      try {
        const res = await fetch(`${BASE}/api/family`);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        /* warming up */
      }
      if (Date.now() - start > 180_000) reject(new Error(`Server not ready on ${PORT}`));
      else setTimeout(tick, 1000);
    };
    tick();
  });

  await ready;

  try {
    mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const url = `${BASE}/my-family`;
    console.log(`==> ${url}`);
    await page.goto(url, { waitUntil: "load", timeout: 180_000 });
    await page.waitForTimeout(8000);
    await page.getByText("Why Kin matters").first().waitFor({ timeout: 60_000 });
    await page.getByText("Ankur").first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const dest = path.join(OUT, "06-kin-claw.png");
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`Saved ${dest}`);
    await browser.close();
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
