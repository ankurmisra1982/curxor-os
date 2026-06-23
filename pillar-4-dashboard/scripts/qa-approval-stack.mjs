#!/usr/bin/env node
/**
 * Cross-claw approval stack — OS inbox, Capital cpt callbacks, Work send gate, Creator trust tiers.
 * Usage: node scripts/qa-approval-stack.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  return { ok: res.ok, json: await res.json() };
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

/** Mirrors lib/capital-approval-telegram.ts parseCapitalTradeApprovalTelegramCallback */
function parseCptCallback(data) {
  const parts = data.split(":");
  if (parts[0] !== "cpt" || parts.length < 3) return null;
  const action = parts[1];
  const tradeId = parts.slice(2).join(":");
  if (!tradeId) return null;
  if (action === "ap") return { kind: "approve", tradeId };
  if (action === "rj") return { kind: "reject", tradeId };
  return null;
}

console.log(`==> Approval stack QA · base=${BASE}\n`);

// 1. OS approval inbox
{
  const { ok, json } = await get("/api/os/approvals");
  if (
    ok &&
    json.ok &&
    typeof json.total === "number" &&
    json.counts &&
    typeof json.counts.capital === "number" &&
    typeof json.counts.work === "number" &&
    typeof json.counts.creator === "number" &&
    Array.isArray(json.items)
  ) {
    pass("os approval inbox", `total=${json.total}`);
  } else {
    fail("os approval inbox", JSON.stringify(json));
  }
}

// 2. Capital approval callback demo + cpt: parse smoke
{
  const approve = parseCptCallback("cpt:ap:trade-demo-1");
  const reject = parseCptCallback("cpt:rj:trade-demo-2");
  const bad = parseCptCallback("cap:ap:post-1");
  if (approve?.kind === "approve" && reject?.kind === "reject" && bad === null) {
    pass("cpt callback parse", `${approve.tradeId} · ${reject.tradeId}`);
  } else {
    fail("cpt callback parse", "parse mismatch");
  }

  const { ok, json } = await post("/api/capital/status", { action: "approval_callback_demo" });
  if (ok && json.ok && typeof json.demoLogged === "boolean") {
    pass("capital approval_callback_demo", json.demoLogged ? json.tradeId : "no pending");
  } else {
    fail("capital approval_callback_demo", `demoLogged=${json.demoLogged}`);
  }
}

// 3. Work send approval policy
{
  const statusRes = await get("/api/work/status");
  const status = statusRes.json;
  if (typeof status.requireSendApproval === "boolean") {
    pass("work requireSendApproval status", String(status.requireSendApproval));
  } else {
    fail("work requireSendApproval status", "missing field");
  }

  const next = !status.requireSendApproval;
  const { ok, json } = await post("/api/work/status", {
    action: "set_require_send_approval",
    requireSendApproval: next,
  });
  if (ok && json.ok && json.status?.requireSendApproval === next) {
    pass("work set_require_send_approval", String(next));
    await post("/api/work/status", {
      action: "set_require_send_approval",
      requireSendApproval: status.requireSendApproval,
    });
  } else {
    fail("work set_require_send_approval", json.error ?? "failed");
  }
}

// 4. Creator publish trust tiers
{
  const { ok, json } = await post("/api/content/status", { action: "publish_trust_report" });
  if (
    ok &&
    json.ok &&
    json.config &&
    typeof json.config.minApprovals === "number" &&
    Array.isArray(json.config.platforms) &&
    Array.isArray(json.tiers)
  ) {
    const tierOk =
      json.tiers.length === 0 ||
      json.tiers.every(
        (t) =>
          typeof t.platform === "string" &&
          typeof t.approvedCount === "number" &&
          typeof t.minApprovals === "number" &&
          typeof t.autoEligible === "boolean" &&
          typeof t.enabled === "boolean",
      );
    if (tierOk) {
      pass("creator publish_trust_report", `${json.tiers.length} tiers · min=${json.config.minApprovals}`);
    } else {
      fail("creator publish_trust_report", "invalid tier shape");
    }
  } else {
    fail("creator publish_trust_report", JSON.stringify(json));
  }

  const list = await post("/api/content/status", { action: "approval_list" });
  if (list.ok && list.json.publishTrust?.tiers && typeof list.json.publishTrust.minApprovals === "number") {
    pass("creator approval_list publishTrust", `${list.json.publishTrust.tiers.length} tiers`);
  } else {
    fail("creator approval_list publishTrust", "missing publishTrust block");
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
