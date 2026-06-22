#!/usr/bin/env node
/**
 * Verify Work Claw live-proof scaffold (demo mode OK when keys absent).
 * Usage: node scripts/verify-work-live-proof.mjs [baseUrl]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

let pass = 0;
let fail = 0;

async function check(name, fn) {
  try {
    if (await fn()) {
      console.log(`PASS · ${name}`);
      pass++;
    } else {
      console.log(`FAIL · ${name}`);
      fail++;
    }
  } catch (err) {
    console.log(`FAIL · ${name} (${err instanceof Error ? err.message : String(err)})`);
    fail++;
  }
}

async function postJson(p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: res.ok, json: await res.json() };
}

console.log(`==> Work live-proof scaffold · base=${BASE}\n`);

await check("digital.env.example SMTP IMAP Google Microsoft", async () => {
  const example = path.join(REPO, "config", "digital", "digital.env.example");
  if (!existsSync(example)) return false;
  const text = readFileSync(example, "utf8");
  return (
    text.includes("SMTP_HOST") &&
    text.includes("IMAP_HOST") &&
    text.includes("CURXOR_GOOGLE_OAUTH_CLIENT_ID") &&
    text.includes("MICROSOFT_CLIENT_ID")
  );
});

await check("EXIT-DEMO live-ready section", async () => {
  const doc = path.join(REPO, "docs", "outreach-claw", "EXIT-DEMO.md");
  if (!existsSync(doc)) return false;
  const text = readFileSync(doc, "utf8");
  return text.includes("live-ready") && text.includes("verify:work-live-proof");
});

await check("record-work-exit-demo script exists", async () => {
  return existsSync(path.join(__dirname, "record-work-exit-demo.mjs"));
});

await check("live_proof API shape", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "live_proof" });
  const lp = json.liveProof;
  return (
    ok &&
    lp &&
    typeof lp.smtpConfigured === "boolean" &&
    typeof lp.googleLinked === "boolean" &&
    typeof lp.microsoftLinked === "boolean" &&
    typeof lp.liveReady === "boolean" &&
    typeof lp.liveProofBadge === "boolean" &&
    typeof lp.scaffoldMode === "boolean" &&
    lp.livePathDocumented === true
  );
});

await check("go_live liveReady field", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "go_live" });
  return ok && typeof json.goLive?.liveReady === "boolean";
});

await check("connector vault liveProof summary", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "dashboard_bootstrap" });
  const lp = json.status?.connectorVault?.liveProof;
  return ok && lp && typeof lp.detail === "string" && typeof lp.badge === "boolean";
});

await check("morning_brief mailSource metadata", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "morning_brief" });
  return (
    ok &&
    typeof json.brief === "string" &&
    typeof json.mailSource === "string" &&
    typeof json.mailSourceLive === "boolean"
  );
});

await check("work microsoft oauth status route", async () => {
  const res = await fetch(`${BASE}/api/work/microsoft`, { cache: "no-store" });
  const json = await res.json();
  return json.ok !== false && typeof json.clientConfigured === "boolean";
});

await check("scaffold documents live path when unconfigured", async () => {
  const { json } = await postJson("/api/work/status", { action: "live_proof" });
  const lp = json.liveProof;
  if (!lp) return false;
  if (lp.scaffoldMode) {
    return lp.liveProofDetail.includes("EXIT-DEMO") || lp.liveProofDetail.includes("Scaffold");
  }
  return Boolean(lp.liveProofDetail);
});

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
