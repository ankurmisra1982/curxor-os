#!/usr/bin/env node
/**
 * Manual browser checklist — API verification for Capital Claw demo flows.
 * Usage: node scripts/capital-checklist.mjs [baseUrl]
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

console.log(`==> Capital checklist · base=${BASE}\n`);

// 1. Demo tour → simulated fill
{
  const { ok, json } = await post("/api/capital/status", { action: "run_demo_tour" });
  const tradeStatus = json.tradeId
    ? (await get("/api/capital/status")).json.trades?.find((t) => t.id === json.tradeId)?.status
    : null;
  if (ok && json.ok && tradeStatus === "simulated") {
    pass("demo tour → simulated fill", json.tradeId);
  } else {
    fail("demo tour → simulated fill", `ok=${ok} tourOk=${json.ok} status=${tradeStatus}`);
  }
}

// 2. Arm + execute → single simulated trade
{
  const status = (await get("/api/capital/status")).json;
  const rule = status.rules?.find((r) => r.state === "ARMED") ?? status.rules?.[0];
  if (!rule?.id) {
    fail("arm + execute", "no rule");
  } else {
    if (rule.state !== "ARMED") {
      await post("/api/capital/status", { action: "arm_rule", ruleId: rule.id });
    }
    const before = (await get("/api/capital/status")).json.trades?.length ?? 0;
    const { ok, json } = await post("/api/capital/status", { action: "execute_trade", ruleId: rule.id });
    const after = (await get("/api/capital/status")).json.trades?.length ?? 0;
    const st = json.trade?.status;
    if (ok && after === before + 1 && (st === "simulated" || st === "queued" || st === "submitted" || st === "pending_approval")) {
      pass("arm + execute → one trade", st);
    } else {
      fail("arm + execute → one trade", `added=${after - before} status=${st}`);
    }
  }
}

// 3. Agent preview gate (requireAgentPreview on → phase preview, no trade yet)
{
  await post("/api/capital/status", {
    action: "set_auto_approval",
    autoApproval: { requireAgentPreview: true },
  });
  const { ok, json } = await post("/api/capital/status", {
    action: "agent_execute_trade",
    ticker: "SPY",
    qty: 1,
    actionTrade: "buy",
    confirm: false,
  });
  if (ok && json.phase === "preview" && !json.trade) {
    pass("agent preview gate", "phase=preview");
  } else {
    fail("agent preview gate", `phase=${json.phase} trade=${Boolean(json.trade)}`);
  }
}

// 4. Agent confirm after preview
{
  const { ok, json } = await post("/api/capital/status", {
    action: "agent_execute_trade",
    ticker: "SPY",
    qty: 1,
    actionTrade: "buy",
    confirm: true,
  });
  const st = json.trade?.status;
  if (ok && (json.phase === "executed" || st === "simulated" || st === "pending_approval" || st === "queued")) {
    pass("agent confirm execute", st ?? json.phase);
  } else {
    fail("agent confirm execute", `phase=${json.phase} status=${st}`);
  }
}

// 5. Claw skill single execute (via webchat → skill-executors)
{
  const status = (await get("/api/capital/status")).json;
  const armed = status.rules?.find((r) => r.state === "ARMED");
  const before = status.trades?.length ?? 0;
  const { ok, json } = await post("/api/channels/webchat", {
    message: "/execute_trade",
    appId: "my-capital",
    sessionId: `checklist-${Date.now()}`,
    config: { selectedRuleId: armed?.id ?? status.rules?.[0]?.id ?? "RULE-01" },
  });
  const after = (await get("/api/capital/status")).json.trades?.length ?? 0;
  const added = after - before;
  if (ok && added <= 1) {
    pass("claw skill single execute", `tradesAdded=${added}`);
  } else {
    fail("claw skill single execute", `added=${added} webchatOk=${ok}`);
  }
}

// 6. Status fields for demo header
{
  const { ok, json } = await get("/api/capital/status");
  const hasDemoFields = ok && Array.isArray(json.rules) && Array.isArray(json.trades);
  if (hasDemoFields) {
    pass("status bootstrap", `${json.trades.length} trades · source=${json.source ?? "demo"}`);
  } else {
    fail("status bootstrap", "missing fields");
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
