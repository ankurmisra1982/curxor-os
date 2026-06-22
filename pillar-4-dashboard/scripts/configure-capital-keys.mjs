#!/usr/bin/env node
/**
 * Interactive Capital broker key setup — writes scripts/dev-qa/digital.env
 *
 * Usage:
 *   node scripts/configure-capital-keys.mjs
 *   node scripts/configure-capital-keys.mjs --open-signup-pages
 *   node scripts/configure-capital-keys.mjs --non-interactive   # reads ALPACA_* PLAID_* SNAPTRADE_* from env
 */
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const DIGITAL_ENV = path.join(DASHBOARD, "scripts", "dev-qa", "digital.env");
const EXAMPLE = path.join(DASHBOARD, "scripts", "dev-qa", "digital.env.example");

const SIGNUP_URLS = {
  alpaca: "https://app.alpaca.markets/signup",
  alpacaKeys: "https://app.alpaca.markets/paper/dashboard/overview",
  plaid: "https://dashboard.plaid.com/signup",
  plaidKeys: "https://dashboard.plaid.com/developers/keys",
  snaptrade: "https://snaptrade.com/",
};

function parseEnvFile(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return map;
}

function serializeEnv(content, updates) {
  const lines = content.split("\n");
  const keysWritten = new Set();
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return line;
    const key = trimmed.slice(0, trimmed.indexOf("="));
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      keysWritten.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!keysWritten.has(key)) out.push(`${key}=${value}`);
  }
  return out.join("\n").replace(/\n?$/, "\n");
}

function openUrls(urls) {
  for (const url of urls) {
    const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(cmd, process.platform === "win32" ? ["", url] : [url], { shell: true, stdio: "ignore" });
  }
}

async function prompt(rl, label, current, secret = false) {
  const hint = current ? ` [${secret ? "•••• set" : current}]` : "";
  process.stdout.write(`${label}${hint}: `);
  const answer = (await rl.question("")).trim();
  return answer || current || "";
}

async function main() {
  const openPages = process.argv.includes("--open-signup-pages");
  const nonInteractive = process.argv.includes("--non-interactive");

  if (openPages) {
    console.log("Opening provider signup / key pages in your browser…\n");
    openUrls([
      SIGNUP_URLS.alpaca,
      SIGNUP_URLS.plaid,
      SIGNUP_URLS.snaptrade,
    ]);
  }

  if (!existsSync(DIGITAL_ENV)) {
    writeFileSync(DIGITAL_ENV, readFileSync(EXAMPLE, "utf8"), "utf8");
    console.log(`Created ${DIGITAL_ENV}\n`);
  }

  const base = readFileSync(DIGITAL_ENV, "utf8");
  const existing = parseEnvFile(base);

  let updates;

  if (nonInteractive) {
    updates = {
      CURXOR_CAPITAL_LIVE_ENABLED: process.env.CURXOR_CAPITAL_LIVE_ENABLED?.trim() || existing.get("CURXOR_CAPITAL_LIVE_ENABLED") || "0",
      ALPACA_API_KEY_ID: process.env.ALPACA_API_KEY_ID?.trim() || existing.get("ALPACA_API_KEY_ID") || "",
      ALPACA_API_SECRET_KEY:
        process.env.ALPACA_API_SECRET_KEY?.trim() || existing.get("ALPACA_API_SECRET_KEY") || "",
      ALPACA_PAPER_BASE_URL:
        process.env.ALPACA_PAPER_BASE_URL?.trim() ||
        existing.get("ALPACA_PAPER_BASE_URL") ||
        "https://paper-api.alpaca.markets",
      PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID?.trim() || existing.get("PLAID_CLIENT_ID") || "",
      PLAID_SECRET: process.env.PLAID_SECRET?.trim() || existing.get("PLAID_SECRET") || "",
      PLAID_ENV: process.env.PLAID_ENV?.trim() || existing.get("PLAID_ENV") || "sandbox",
      SNAPTRADE_CLIENT_ID:
        process.env.SNAPTRADE_CLIENT_ID?.trim() || existing.get("SNAPTRADE_CLIENT_ID") || "",
      SNAPTRADE_CONSUMER_SECRET:
        process.env.SNAPTRADE_CONSUMER_SECRET?.trim() || existing.get("SNAPTRADE_CONSUMER_SECRET") || "",
      SNAPTRADE_REDIRECT_URI:
        process.env.SNAPTRADE_REDIRECT_URI?.trim() ||
        existing.get("SNAPTRADE_REDIRECT_URI") ||
        "http://127.0.0.1:3080/api/capital/snaptrade",
    };
  } else {
    console.log("Capital Claw — broker key setup");
    console.log("Press Enter to keep existing values. Keys are saved only to scripts/dev-qa/digital.env (gitignored).\n");
    if (!openPages) {
      console.log("Tip: re-run with --open-signup-pages to open Alpaca / Plaid / SnapTrade in browser.\n");
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    updates = {
      CURXOR_CAPITAL_LIVE_ENABLED: process.env.CURXOR_CAPITAL_LIVE_ENABLED?.trim() || existing.get("CURXOR_CAPITAL_LIVE_ENABLED") || "0",
      ALPACA_API_KEY_ID: await prompt(rl, "Alpaca paper API Key ID", existing.get("ALPACA_API_KEY_ID")),
      ALPACA_API_SECRET_KEY: await prompt(
        rl,
        "Alpaca paper API Secret",
        existing.get("ALPACA_API_SECRET_KEY"),
        true,
      ),
      ALPACA_PAPER_BASE_URL:
        (await prompt(rl, "Alpaca paper base URL", existing.get("ALPACA_PAPER_BASE_URL") || "https://paper-api.alpaca.markets")) ||
        "https://paper-api.alpaca.markets",
      PLAID_CLIENT_ID: await prompt(rl, "Plaid Client ID (sandbox)", existing.get("PLAID_CLIENT_ID")),
      PLAID_SECRET: await prompt(rl, "Plaid Secret (sandbox)", existing.get("PLAID_SECRET"), true),
      PLAID_ENV: (await prompt(rl, "Plaid env (sandbox|production)", existing.get("PLAID_ENV") || "sandbox")) || "sandbox",
      SNAPTRADE_CLIENT_ID: await prompt(rl, "SnapTrade Client ID", existing.get("SNAPTRADE_CLIENT_ID")),
      SNAPTRADE_CONSUMER_SECRET: await prompt(
        rl,
        "SnapTrade Consumer Secret",
        existing.get("SNAPTRADE_CONSUMER_SECRET"),
        true,
      ),
      SNAPTRADE_REDIRECT_URI:
        (await prompt(
          rl,
          "SnapTrade redirect URI",
          existing.get("SNAPTRADE_REDIRECT_URI") || "http://127.0.0.1:3080/api/capital/snaptrade",
        )) || "http://127.0.0.1:3080/api/capital/snaptrade",
    };

    rl.close();
  }

  writeFileSync(DIGITAL_ENV, serializeEnv(base, updates), "utf8");

  const configured = [
    updates.ALPACA_API_KEY_ID && updates.ALPACA_API_SECRET_KEY ? "Alpaca" : null,
    updates.PLAID_CLIENT_ID && updates.PLAID_SECRET ? "Plaid" : null,
    updates.SNAPTRADE_CLIENT_ID && updates.SNAPTRADE_CONSUMER_SECRET ? "SnapTrade" : null,
  ].filter(Boolean);

  console.log(`\nWrote ${DIGITAL_ENV}`);
  console.log(`Live gate: CURXOR_CAPITAL_LIVE_ENABLED=${updates.CURXOR_CAPITAL_LIVE_ENABLED ?? "0"}`);
  console.log(configured.length ? `Configured: ${configured.join(", ")}` : "No broker keys set yet — desk stays in demo until keys are added.");
  console.log("Optional: WEBULL_* / ETRADE_* in digital.env.example · OAuth link in Brokers panel.");
  console.log("Verify scaffold: npm run verify:exit-demo-scaffold");
  console.log("Full guide: docs/capital-claw/EXIT-DEMO.md");
  console.log("\nRestart npm run dev, then Capital desk → Go Live / Brokers / PFM.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
