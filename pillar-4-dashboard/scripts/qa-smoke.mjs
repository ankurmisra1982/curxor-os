#!/usr/bin/env node
/**
 * Cross-platform dashboard QA smoke tests.
 * Usage: node scripts/qa-smoke.mjs [baseUrl]
 */
import { createQaHttp } from "./qa-http.mjs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3080";
const { getJson, postJson } = createQaHttp(BASE);

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

console.log(`==> QA smoke · base=${BASE}\n`);

await check("setup status", async () => {
  const data = await getJson("/api/setup/status");
  return typeof data.initialized === "boolean";
});

await check("settings GET", async () => {
  const data = await getJson("/api/settings");
  return (
    data.settings?.version === 1 &&
    Array.isArray(data.providers) &&
    data.settings?.buildPlane &&
    typeof data.settings.buildPlane.linkStatus === "string"
  );
});

await check("settings sakana frontier provider", async () => {
  const data = await getJson("/api/settings");
  const sakana = data.providers?.find((p) => p.id === "sakana");
  return (
    sakana?.name === "Sakana Fugu" &&
    Array.isArray(sakana.models) &&
    sakana.models.length === 3 &&
    sakana.models.some((m) => m.id === "fugu") &&
    sakana.models.some((m) => m.id === "fugu-ultra") &&
    sakana.models.some((m) => m.id === "fugu-ultra-20260615")
  );
});

await check("build plane status", async () => {
  const data = await getJson("/api/build/status");
  return (
    data.ok === true &&
    data.buildPlane &&
    typeof data.buildPlane.enabled === "boolean" &&
    data.buildPlane.webhookSecret === undefined &&
    typeof data.bridgeLinked === "boolean" &&
    data.mcp?.endpoint === "/api/build/mcp" &&
    data.mcp?.toolCount === 5 &&
    data.eventBus?.endpoint === "/api/build/events" &&
    Array.isArray(data.eventBus?.kinds) &&
    data.eventBus.kinds.includes("forge.claw_minted") &&
    data.worker?.endpoint === "/api/build/worker" &&
    data.worker?.wizardSteps === 6 &&
    data.delegation?.endpoint === "/api/build/delegation" &&
    typeof data.delegation?.pendingCount === "number"
  );
});

await check("build plane delegation policy", async () => {
  const data = await getJson("/api/build/delegation");
  return (
    data.ok === true &&
    data.policy &&
    typeof data.policy.accessTier === "string" &&
    Array.isArray(data.items)
  );
});

await check("build plane delegation suggest approve", async () => {
  await postJson("/api/cafe/status", {
    action: "ingest",
    kind: "work.handshake",
    appId: "my-work",
    xp: { ascension: 750, knowledge: 50, wealth: 50 },
    bubble: "QA G5 unlock",
  });
  await postJson("/api/settings", {
    buildPlane: { enabled: true, allowDelegation: true },
  });
  const suggest = await postJson("/api/build/delegation", { action: "suggest_demo" });
  if (!suggest.ok || !Array.isArray(suggest.json.items) || suggest.json.items.length === 0) return false;
  const pending = suggest.json.items.find((i) => i.status === "pending");
  if (!pending?.id) return false;
  const resolve = await postJson("/api/build/delegation", {
    action: "resolve",
    delegationId: pending.id,
    status: "approved",
  });
  return resolve.ok && resolve.json.items?.some((i) => i.id === pending.id && i.status === "approved");
});

await check("build plane worker wizard", async () => {
  await postJson("/api/settings", { buildPlane: { enabled: true } });
  const data = await getJson("/api/build/worker");
  return (
    data.ok === true &&
    Array.isArray(data.steps) &&
    data.steps.length === 6 &&
    data.progress?.total === 6
  );
});

await check("build plane worker probe demo", async () => {
  const { ok, json } = await postJson("/api/build/worker", {
    action: "mark_online_demo",
    workerHost: "127.0.0.1",
  });
  return ok && json.workerStatus === "online";
});

await check("build plane event bus log", async () => {
  const data = await getJson("/api/build/events?limit=8");
  return data.ok === true && Array.isArray(data.events) && Array.isArray(data.kinds) && data.kinds.length === 4;
});

await check("build plane event bus emit demo", async () => {
  await postJson("/api/settings", { buildPlane: { enabled: true } });
  const { ok, json } = await postJson("/api/build/events", { action: "emit_demo" });
  if (!ok || !json.result?.id) return false;
  const log = await getJson("/api/build/events?limit=4");
  return log.events?.some((e) => e.event === "go_live.failed" && e.id === json.result.id);
});

await check("build plane event bus poll", async () => {
  const { ok, json } = await postJson("/api/build/events", { action: "poll" });
  return ok && json.ok === true && json.ota && typeof json.eno2?.down === "boolean";
});

await check("build plane mcp catalog", async () => {
  const data = await getJson("/api/build/mcp");
  return (
    data.ok === true &&
    data.name === "curxor-build-plane" &&
    Array.isArray(data.tools) &&
    data.tools.length === 5 &&
    data.tools.some((t) => t.name === "get_ccp_summary") &&
    data.tools.some((t) => t.name === "get_cafe_snapshot")
  );
});

await check("build plane mcp tools/list", async () => {
  const { ok, json } = await postJson("/api/build/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });
  return ok && Array.isArray(json.result?.tools) && json.result.tools.length === 5;
});

await check("build plane mcp get_build_status", async () => {
  await postJson("/api/settings", { buildPlane: { enabled: true } });
  const { ok, json } = await postJson("/api/build/mcp", {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "get_build_status", arguments: {} },
  });
  const text = json.result?.content?.[0]?.text;
  const parsed = text ? JSON.parse(text) : null;
  return ok && parsed?.ok === true && parsed?.buildPlane?.enabled === true;
});

await check("settings claws POST", async () => {
  const current = await getJson("/api/settings");
  const apps = current.settings?.selectedApps ?? ["my-capital"];
  const { ok, json } = await postJson("/api/settings/claws", { selectedApps: apps });
  return ok && json.settings?.selectedApps?.length >= 1;
});

await check("settings llm link-session (openai oauth)", async () => {
  const { ok, json } = await postJson("/api/settings/llm/link-session", {
    providerId: "openai",
    frontierModel: "gpt-4o-mini",
  });
  return ok && typeof json.linkPath === "string" && json.linkMode === "oauth" && typeof json.authorizeUrl === "string";
});

await check("capital status", async () => {
  const data = await getJson("/api/capital/status");
  return (
    Array.isArray(data.rules) &&
    Array.isArray(data.trades) &&
    typeof data.tradingMode === "string" &&
    data.permissions &&
    Array.isArray(data.brokers) &&
    Array.isArray(data.pilots) &&
    data.autoApproval &&
    typeof data.autoApproval.autoApproveAgentChat === "boolean" &&
    Array.isArray(data.agentAuditLog)
  );
});

await check("capital go_live checklist", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "go_live" });
  return ok && json.goLive && Array.isArray(json.goLive.steps);
});

await check("capital run_demo_tour", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "run_demo_tour" });
  return ok && json.ok === true && Array.isArray(json.steps) && json.tradeId;
});

await check("capital execute_now", async () => {
  const armed = await postJson("/api/capital/status", { action: "arm_rule", ruleId: "RULE-01" });
  if (!armed.ok) return false;
  const { ok, json } = await postJson("/api/capital/status", { action: "execute_now", ruleId: "RULE-01" });
  return ok && json.ok !== false;
});

await check("capital analytics", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "analytics" });
  return ok && json.analytics && Array.isArray(json.scorecards) && json.benchmark;
});

await check("capital nl_portfolio_query", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "nl_portfolio_query",
    query: "armed rules",
  });
  return ok && typeof json.answer === "string" && json.intent === "armed_rules";
});

await check("capital desk_health_alerts", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "desk_health_alerts" });
  return ok && Array.isArray(json.alerts);
});

await check("capital rebalance rule", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "create_rule",
    name: "QA rebalance",
    asset: "SPY",
    kind: "rebalance",
    targetWeight: 20,
    driftThresholdPct: 10,
    actionTrade: "sell",
    conditionType: "manual_trigger",
  });
  return ok && json.rule?.kind === "rebalance" && json.rule?.id;
});

await check("capital walk_forward_backtest", async () => {
  const status = await postJson("/api/capital/status", { action: "dashboard_bootstrap" });
  const ruleId = status.json?.status?.rules?.[0]?.id ?? "RULE-01";
  const { ok, json } = await postJson("/api/capital/status", { action: "walk_forward_backtest", ruleId });
  return ok && json.walkForward && typeof json.walkForward.note === "string";
});

await check("capital tools query_portfolio", async () => {
  const json = await getJson("/api/capital/tools?tool=query_portfolio&query=armed%20rules");
  return json.ok && typeof json.answer === "string";
});

await check("capital tools get_go_live_report", async () => {
  const json = await getJson("/api/capital/tools?tool=get_go_live_report");
  return json.ok && json.goLive && Array.isArray(json.goLive.steps);
});

await check("capital dashboard_bootstrap", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "dashboard_bootstrap" });
  return ok && json.status && Array.isArray(json.status.rules);
});

await check("capital create_rule", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "create_rule",
    name: "QA rule",
    asset: "SPY",
    qty: 1,
  });
  return ok && json.rule?.id;
});

await check("capital recovery_list", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "recovery_list" });
  return ok && Array.isArray(json.failed);
});

await check("capital execute_trade dry_run", async () => {
  const current = await getJson("/api/capital/status");
  const armed = current.rules?.find((r) => r.state === "ARMED") ?? current.rules?.[0];
  if (!armed?.id) return false;
  const { ok, json } = await postJson("/api/capital/status", {
    action: "execute_trade",
    ruleId: armed.id,
  });
  return ok && (json.trade?.status === "dry_run" || json.trade?.status === "queued" || json.trade?.status === "submitted" || json.trade?.status === "simulated" || json.trade?.status === "failed" || json.trade?.status === "blocked_risk" || json.trade?.status === "pending_approval");
});

await check("capital refresh_quotes", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "refresh_quotes" });
  return ok && Array.isArray(json.status?.movers);
});

await check("capital evaluate_rules", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "evaluate_rules" });
  return ok && typeof json.evaluated === "number";
});

await check("capital set_autonomous_mode", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "set_autonomous_mode",
    autonomousMode: "off",
  });
  return ok && json.permissions?.autonomousMode === "off";
});

await check("capital pfm snapshot", async () => {
  const data = await getJson("/api/capital/pfm");
  return (
    Array.isArray(data.accounts) &&
    Array.isArray(data.goals) &&
    typeof data.cashFlow?.savingsRatePct === "number" &&
    Array.isArray(data.suggestions)
  );
});

await check("capital set_auto_approval", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "set_auto_approval",
    autoApproval: { enabled: true, maxNotionalUsd: 750, paperOnly: true },
  });
  return ok && json.autoApproval?.maxNotionalUsd === 750 && json.autoApproval?.enabled === true;
});

await check("capital preview_trade", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "preview_trade",
    ticker: "SPY",
    previewQty: 1,
    actionTrade: "buy",
  });
  return ok && json.preview?.ticker === "SPY" && typeof json.preview?.autoApproveEligible === "boolean";
});

await check("capital mcp GET", async () => {
  const data = await getJson("/api/capital/mcp");
  return (
    data.ok === true &&
    data.name === "capital-claw" &&
    Array.isArray(data.tools) &&
    data.tools.some((t) => t.name === "review_equity_order") &&
    data.tools.some((t) => t.name === "place_equity_order")
  );
});

await check("capital mcp tools/list", async () => {
  const { ok, json } = await postJson("/api/capital/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });
  return (
    ok &&
    json.result?.tools?.length >= 8 &&
    json.result.tools.some((t) => t.name === "get_desk_status")
  );
});

await check("capital agent_execute_trade preview", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "agent_execute_trade",
    ticker: "SPY",
    qty: 1,
    actionTrade: "buy",
    confirm: false,
  });
  return ok && json.phase === "preview" && json.preview?.ticker === "SPY";
});

await check("capital set_agent_kill_switch", async () => {
  const on = await postJson("/api/capital/status", {
    action: "set_agent_kill_switch",
    agentKillSwitch: true,
  });
  const off = await postJson("/api/capital/status", {
    action: "set_agent_kill_switch",
    agentKillSwitch: false,
  });
  return (
    on.ok &&
    on.json.agentKillSwitch === true &&
    off.ok &&
    off.json.agentKillSwitch === false
  );
});

await check("capital broker oauth status (webull + etrade)", async () => {
  const [webull, etrade] = await Promise.all([
    getJson("/api/capital/webull"),
    getJson("/api/capital/etrade"),
  ]);
  return (
    webull.ok === true &&
    typeof webull.linked === "boolean" &&
    etrade.ok === true &&
    typeof etrade.linked === "boolean"
  );
});

await check("capital list_pilots", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "list_pilots" });
  return ok && Array.isArray(json.pilots) && json.pilots.length >= 3;
});

await check("capital subscribe_pilot dry_run", async () => {
  const pilots = await postJson("/api/capital/status", { action: "list_pilots" });
  const pilotId = pilots.json?.pilots?.[0]?.id;
  if (!pilotId) return false;
  const { ok, json } = await postJson("/api/capital/status", {
    action: "subscribe_pilot",
    pilotId,
    allocationUsd: 1000,
  });
  return ok && json.subscription?.pilotId === pilotId;
});

await check("capital intel digest", async () => {
  const data = await getJson("/api/capital/intel");
  return data.ok === true && Array.isArray(data.digest?.digest);
});

await check("capital intel ticker lookup", async () => {
  const data = await getJson("/api/capital/intel?ticker=SPY&refresh=1");
  return (
    data.ok === true &&
    data.intel?.symbol === "SPY" &&
    typeof data.intel?.fundamentals === "object" &&
    Array.isArray(data.intel?.chart) &&
    typeof data.intel?.smartTake === "string"
  );
});

await check("capital intel tools catalog", async () => {
  const data = await getJson("/api/capital/tools?tool=catalog");
  return (
    data.ok === true &&
    data.version === 2 &&
    Array.isArray(data.tools) &&
    data.tools.some((t) => t.id === "get_pfm_snapshot") &&
    data.tools.some((t) => t.id === "preview_trade")
  );
});

await check("capital tools pfm snapshot", async () => {
  const data = await getJson("/api/capital/tools?tool=get_pfm_snapshot");
  return data.ok === true && typeof data.pfm?.netWorthUsd === "number";
});

await check("capital tools portfolio health", async () => {
  const data = await getJson("/api/capital/tools?tool=get_portfolio_health");
  return data.ok === true && typeof data.health?.score === "number";
});

await check("capital tools quiver status", async () => {
  const data = await getJson("/api/capital/tools?tool=get_quiver_status");
  return data.ok === true && typeof data.quiver?.note === "string";
});

await check("capital plaid status", async () => {
  const data = await getJson("/api/capital/plaid");
  return data.ok === true && (data.mode === "demo" || data.mode === "plaid");
});

await check("capital intel meta providers", async () => {
  const data = await getJson("/api/capital/intel?meta=1");
  return (
    data.ok === true &&
    Array.isArray(data.providers) &&
    data.providers.length >= 5 &&
    typeof data.preferences?.moverSpikePct === "number"
  );
});

await check("capital alpha feed", async () => {
  const { ok, json } = await postJson("/api/capital/intel", { action: "alpha_feed" });
  return ok && Array.isArray(json.feed);
});

await check("capital thesis journal", async () => {
  const { ok, json } = await postJson("/api/capital/intel", {
    action: "add_thesis",
    ticker: "SPY",
    body: "QA sovereign alpha thesis entry",
  });
  return ok && json.entry?.symbol === "SPY";
});

await check("capital pilot leaderboard", async () => {
  const { ok, json } = await postJson("/api/capital/intel", {
    action: "pilot_leaderboard",
    window: "m1",
  });
  return ok && Array.isArray(json.rows) && json.rows.length >= 1;
});

await check("capital create_dip_rule", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "create_dip_rule",
    ticker: "SPY",
    dropPct: 5,
  });
  return ok && json.rule?.asset === "SPY";
});

await check("capital add_to_watchlist", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "add_to_watchlist",
    ticker: "QQQ",
  });
  return ok && Array.isArray(json.watchlist) && json.watchlist.includes("QQQ");
});

await check("capital create_rule_from_thesis", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "create_rule_from_thesis",
    ticker: "SPY",
  });
  return ok && typeof json.rule?.id === "string";
});

await check("capital refresh_pilot_feeds", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "refresh_pilot_feeds" });
  return ok && Array.isArray(json.updated) && json.updated.length >= 1;
});

await check("capital set_active_broker", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "set_active_broker",
    brokerId: "alpaca",
  });
  return ok && json.permissions?.activeBrokerId === "alpaca";
});

await check("capital robinhood mcp status", async () => {
  const data = await getJson("/api/capital/robinhood");
  return data.ok === true && typeof data.enabled === "boolean";
});

await check("capital backtest_rule", async () => {
  const current = await getJson("/api/capital/status");
  const rule = current.rules?.[0];
  if (!rule) return false;
  const { ok, json } = await postJson("/api/capital/status", {
    action: "backtest_rule",
    ruleId: rule.id,
  });
  return ok && json.rule?.backtest && typeof json.rule.backtest.fires90d === "number";
});

await check("capital snaptrade broker catalog", async () => {
  const data = await getJson("/api/capital/status");
  return Array.isArray(data.brokers) && data.brokers.some((b) => b.id === "snaptrade");
});

await check("capital snaptrade oauth status", async () => {
  const data = await getJson("/api/capital/snaptrade");
  return data.ok === true && typeof data.clientConfigured === "boolean";
});

await check("capital live gate fields", async () => {
  const data = await getJson("/api/capital/status");
  return typeof data.liveEnvEnabled === "boolean" && typeof data.liveMoneyConfirmed === "boolean";
});

await check("capital go_live live_money step", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "go_live" });
  return ok && Array.isArray(json.goLive?.steps) && json.goLive.steps.some((s) => s.id === "live_money");
});

await check("capital set_tv_secret", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "set_tv_secret",
    secret: "qa-smoke-test-secret",
  });
  return ok && json.status?.permissions?.tradingviewWebhookSecret === "qa-smoke-test-secret";
});

await check("capital plaid link token action", async () => {
  const { json } = await postJson("/api/capital/plaid", { action: "create_link_token" });
  return json.ok === false || typeof json.linkToken === "string";
});

await check("capital portfolio health cost basis beta", async () => {
  const data = await getJson("/api/capital/status");
  return Array.isArray(data.portfolioHealth?.costBasisBeta);
});

await check("content status", async () => {
  const data = await getJson("/api/content/status");
  return (
    Array.isArray(data.posts) &&
    data.posts.length >= 1 &&
    typeof data.contentTone === "string" &&
    Array.isArray(data.platformVault?.platforms) &&
    data.platformVault.platforms.length >= 10
  );
});

await check("content channels catalog", async () => {
  const data = await getJson("/api/content/channels");
  const ids = new Set((data.platforms ?? []).map((p) => p.id));
  return (
    data.ok === true &&
    ids.has("tiktok") &&
    ids.has("instagram") &&
    ids.has("linkedin") &&
    data.roadmap?.length >= 10 &&
    data.currentStep?.step === 9 &&
    data.currentStep?.status === "done"
  );
});

await check("mesh digital discord", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "channel.discord.send",
    payload: {
      text: "CurXor QA — sovereign Discord bridge for Creator + Engage Claw.",
      channel_id: "123456789012345678",
    },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital snapchat", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_snapchat",
    payload: {
      text: "CurXor QA — sovereign Snapchat bridge #creator",
      video_url: "https://example.com/demo.mp4",
      format: "spotlight",
      profile_id: "76da494b-76bc-4bbb-bb27-c5a66fb0d1ab",
    },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital pinterest", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_pinterest",
    payload: {
      text: "CurXor QA — sovereign Pinterest bridge\nVisual pin description for Creator Claw.",
      image_url: "https://example.com/pin.jpg",
      board_id: "123456789",
    },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital reddit", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_reddit",
    payload: {
      text: "CurXor QA — sovereign Reddit bridge\nBody text for self post on appliance.",
      subreddit: "test",
    },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital bluesky", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_bluesky",
    payload: { text: "CurXor QA — sovereign Bluesky bridge on bare metal." },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital linkedin", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_linkedin",
    payload: { text: "CurXor QA — sovereign LinkedIn bridge for B2B Creator Claw." },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital youtube", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_youtube",
    payload: {
      text: "CurXor QA — sovereign YouTube bridge\nTech Briefs Daily",
      video_url: "https://example.com/demo.mp4",
      format: "short",
    },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital tiktok", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_tiktok",
    payload: {
      text: "CurXor QA — sovereign TikTok bridge",
      video_url: "https://example.com/demo.mp4",
    },
  });
  return typeof json.ok === "boolean";
});

await check("mesh digital meta threads", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "content.publish_threads",
    payload: { text: "CurXor QA smoke — sovereign threads bridge test" },
  });
  return typeof json.ok === "boolean";
});

await check("content queue POST (update_draft)", async () => {
  const current = await getJson("/api/content/status");
  const postId = current.posts?.[0]?.id;
  if (!postId) return false;
  const { ok, json } = await postJson("/api/content/status", {
    action: "update_draft",
    postId,
    draftText: "QA smoke draft — sovereign Creator Claw on bare metal.",
  });
  return ok && json.post?.draftText?.includes("QA smoke");
});

await check("content go_live checklist", async () => {
  const { ok, json } = await postJson("/api/content/status", { action: "go_live" });
  return (
    ok &&
    json.goLive?.steps?.length >= 4 &&
    typeof json.goLive?.ready === "boolean" &&
    typeof json.goLive?.demoReady === "boolean" &&
    typeof json.goLive?.partiallyReady === "boolean" &&
    json.goLive?.today?.recoveryCount !== undefined
  );
});

await check("content run_demo_tour", async () => {
  const { ok, json } = await postJson("/api/content/status", { action: "run_demo_tour" });
  return ok && json.ok === true && Array.isArray(json.steps) && json.steps.length >= 4 && json.postId;
});

await check("content recovery_list", async () => {
  const { ok, json } = await postJson("/api/content/status", { action: "recovery_list" });
  return ok && Array.isArray(json.candidates);
});

await check("content create post", async () => {
  const { ok, json } = await postJson("/api/content/status", {
    action: "create",
    platform: "x",
    channel: "QA smoke create",
    draftText: "Creator Claw day-one QA draft",
  });
  return ok && typeof json.post?.id === "string" && json.post.platform === "x";
});

await check("content preflight_check", async () => {
  const current = await getJson("/api/content/status");
  const postId = current.posts?.[0]?.id;
  if (!postId) return false;
  const { ok, json } = await postJson("/api/content/status", { action: "preflight_check", postId });
  return ok && typeof json.report?.ready === "boolean" && Array.isArray(json.report?.checks);
});

await check("content schedule (useBestTime)", async () => {
  const current = await getJson("/api/content/status");
  const draftPost = current.posts?.find((p) => p.stage !== "PUBLISHED") ?? current.posts?.[0];
  if (!draftPost?.id) return false;
  const { ok, json } = await postJson("/api/content/status", {
    action: "schedule",
    postId: draftPost.id,
    useBestTime: true,
  });
  return ok && typeof json.scheduledAt === "string" && json.post?.stage === "SCHEDULED";
});

await check("content dashboard_bootstrap", async () => {
  const { ok, json } = await postJson("/api/content/status", { action: "dashboard_bootstrap" });
  return (
    ok &&
    json.status?.posts &&
    json.goLive?.steps?.length >= 4 &&
    typeof json.goLive?.partiallyReady === "boolean" &&
    json.growthProfile?.growthLevel &&
    json.growthProfile?.growthLabel &&
    json.bridgeHealth?.platforms &&
    json.calendar?.days?.length === 7 &&
    json.studio
  );
});

await check("content publish_now (X bridge path)", async () => {
  const created = await postJson("/api/content/status", {
    action: "create",
    platform: "x",
    channel: "QA publish_now smoke",
  });
  const postId = created.json.post?.id;
  if (!postId) return false;
  const { ok, json } = await postJson("/api/content/status", {
    action: "publish_now",
    postId,
  });
  return ok && (json.mode === "published" || json.mode === "pending");
});

await check("app-agent assist (outreach)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-work",
    message: "hello",
  });
  return typeof json.reply === "string" && json.reply.length > 0;
});

await check("work status bootstrap", async () => {
  const data = await getJson("/api/work/status");
  return Array.isArray(data.leads) && Array.isArray(data.sequences);
});

await check("work go_live checklist", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "go_live" });
  return (
    ok &&
    json.goLive &&
    Array.isArray(json.goLive.steps) &&
    typeof json.goLive.demoReady === "boolean"
  );
});

await check("work run_demo_tour", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "run_demo_tour" });
  const hasOutcome = Boolean(json.sequenceId || json.mailId || json.sendId);
  return ok && json.ok === true && Array.isArray(json.steps) && json.steps.length >= 3 && hasOutcome;
});

await check("work draft_sequence", async () => {
  const current = await getJson("/api/work/status");
  const leadId = current.leads?.[0]?.id;
  if (!leadId) return false;
  const { ok, json } = await postJson("/api/work/status", {
    action: "draft_sequence",
    leadId,
    name: "QA sequence",
  });
  return ok && typeof json.sequenceId === "string";
});

await check("work scan_inbox", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "scan_inbox" });
  return ok && typeof json.indexed === "number";
});

await check("work recovery_list", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "recovery_list" });
  return ok && Array.isArray(json.failed);
});

await check("work import_leads CSV", async () => {
  const unique = `qa-tierb-${Date.now()}@curxor.dev`;
  const { ok, json } = await postJson("/api/work/status", {
    action: "import_leads",
    csv: `name,email,company\nQA TierB,${unique},QA Co`,
  });
  return ok && typeof json.imported === "number" && json.imported >= 1;
});

await check("work process_due", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "process_due" });
  return ok && typeof json.processed === "number";
});

await check("work tag_reply_intent", async () => {
  await postJson("/api/work/status", { action: "scan_inbox" });
  const current = await getJson("/api/work/status");
  const mailId = current.mailIndex?.[0]?.id;
  if (!mailId) return false;
  const { ok, json } = await postJson("/api/work/status", {
    action: "tag_reply_intent",
    mailId,
    intent: "interested",
  });
  return ok && json.entry?.replyIntent === "interested";
});

await check("work analytics", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "analytics" });
  return ok && typeof json.analytics?.sentCount === "number" && json.sendPolicy?.dailySendLimit > 0;
});

await check("work deliverability", async () => {
  const json = await getJson("/api/work/status");
  const d = json.deliverability;
  return d != null && typeof d.reputationScore === "number" && typeof d.domainHealth === "string";
});

await check("work summarize_day", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "summarize_day" });
  return ok && typeof json.brief === "string" && json.brief.length > 0;
});

await check("work google status route", async () => {
  const data = await getJson("/api/work/google");
  return data.ok === true && typeof data.linked === "boolean" && typeof data.clientConfigured === "boolean";
});

await check("work morning_brief", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "morning_brief" });
  return ok && typeof json.brief === "string" && json.brief.includes("Morning brief");
});

await check("work crm_status demo", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "crm_status" });
  return ok && json.crm?.demo === true && typeof json.crm?.backend === "string";
});

await check("work connector_vault bootstrap", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "dashboard_bootstrap" });
  return ok && Array.isArray(json.status?.connectorVault?.connectors) && json.status.connectorVault.connectors.length >= 8;
});

await check("work activate_sequence policy", async () => {
  const current = await getJson("/api/work/status");
  const seq = current.sequences?.find((s) => s.status === "draft");
  if (!seq?.id) return true;
  const { ok, json } = await postJson("/api/work/status", { action: "activate_sequence", sequenceId: seq.id });
  return ok && (json.autoSendPolicy === "immediate" || json.autoSendPolicy === "deferred");
});

await check("work mcp GET", async () => {
  const json = await getJson("/api/work/mcp");
  return json.ok && Array.isArray(json.tools) && json.tools.length >= 5;
});

await check("work webhook noop", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "webhook_test" });
  return ok && json.demo === true;
});

await check("work draft_reply", async () => {
  const status = await getJson("/api/work/status");
  const mailId = status.mailIndex?.[0]?.id;
  if (!mailId) return true;
  const { ok, json } = await postJson("/api/work/status", { action: "draft_reply", mailId });
  return ok && typeof json.body === "string";
});

await check("work enrich_lead", async () => {
  const status = await getJson("/api/work/status");
  const leadId = status.leads?.[0]?.id;
  if (!leadId) return false;
  const { ok, json } = await postJson("/api/work/status", { action: "enrich_lead", leadId });
  return ok && json.ok === true;
});

await check("app-agent assist (capital digital skill)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-capital",
    skillId: "execute_trade",
    config: { tradingMode: "paper", selectedAsset: "BTC-USD" },
  });
  return typeof json.reply === "string";
});

await check("app-agent assist (capital create_rule skill)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-capital",
    skillId: "create_rule",
    config: { tradingMode: "paper", selectedAsset: "SPY" },
  });
  return typeof json.reply === "string" && json.reply.includes("Rule");
});

await check("app-agent assist (capital arm_rule skill)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-capital",
    skillId: "arm_rule",
    config: { tradingMode: "paper", selectedAsset: "SPY" },
  });
  return typeof json.reply === "string" && /armed|Rule/i.test(json.reply);
});

await check("claw assist", async () => {
  const { json } = await postJson("/api/claw/assist", {
    message: "forge a sorting claw",
  });
  return typeof json.reply === "string" && json.reply.length > 0;
});

await check("forge workspace tab gates", async () => {
  const order = { L1: 0, L2: 1, L3: 2, L4: 3 };
  const meets = (user, req) => order[user] >= order[req];
  const tabs = (g) => {
    const out = ["mint"];
    if (meets(g, "L2")) out.push("fleet");
    if (meets(g, "L3")) out.push("stacks");
    if (meets(g, "L4")) out.push("templates", "import");
    return out;
  };
  return (
    tabs("L1").length === 1 &&
    tabs("L3").length === 3 &&
    tabs("L4").length === 5 &&
    tabs("L2").includes("fleet")
  );
});

await check("cafe default tab for growth", async () => {
  const defaultTab = (g) => (["L2", "L3", "L4", "L5"].includes(g) ? "ascension" : "play");
  return defaultTab("L1") === "play" && defaultTab("L2") === "ascension" && defaultTab("L5") === "ascension";
});

await check("cafe workspace tab gates", async () => {
  const order = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4 };
  const meets = (user, req) => order[user] >= order[req];
  const tabs = (g) => {
    const out = ["play", "ascension"];
    if (meets(g, "L2")) out.push("host");
    return out;
  };
  return (
    tabs("L1").length === 2 &&
    tabs("L2").length === 3 &&
    tabs("L1").includes("ascension") &&
    tabs("L2").includes("host") &&
    !tabs("L1").includes("host") &&
    !tabs("L1").includes("progress")
  );
});

await check("cafe ascension status route", async () => {
  const data = await getJson("/api/cafe/status");
  return (
    data.ok === true &&
    data.ascension &&
    typeof data.ascension.tier === "string" &&
    typeof data.epithet === "string" &&
    data.epithet.length > 0 &&
    Array.isArray(data.characters) &&
    typeof data.bridgeLinked === "boolean"
  );
});

await check("cafe pixel engine proximity", async () => {
  const manhattan = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  const adjacent = (a, b) => manhattan(a, b) <= 1;
  const patron = { col: 1, row: 0 };
  const mail = { col: 0, row: 0 };
  const ticker = { col: 4, row: 0 };
  return adjacent(patron, mail) && !adjacent(patron, ticker);
});

await check("cafe go_live report", async () => {
  const { ok, json } = await postJson("/api/cafe/status", { action: "go_live" });
  return ok && json.goLive && typeof json.goLive.demoReady === "boolean" && Array.isArray(json.goLive.steps);
});

await check("cafe run_demo_tour", async () => {
  const { ok, json } = await postJson("/api/cafe/status", { action: "run_demo_tour" });
  return ok && json.tour && Array.isArray(json.tour.steps) && json.tour.steps.length >= 3;
});

await check("swarm feature gates", async () => {
  const order = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4 };
  const meets = (user, req) => order[user] >= order[req];
  return (
    meets("L1", "L1") &&
    !meets("L1", "L2") &&
    meets("L2", "L2") &&
    meets("L3", "L3") &&
    meets("L4", "L4") &&
    !meets("L3", "L4")
  );
});

await check("swarm status bootstrap", async () => {
  const { ok, json } = await postJson("/api/swarm/status", { action: "dashboard_bootstrap" });
  return (
    ok &&
    Array.isArray(json.fleet) &&
    json.fleet.length >= 2 &&
    json.growthProfile &&
    typeof json.growthProfile.growthLevel === "string"
  );
});

await check("swarm preview app registered", async () => {
  const preview = ["robotaxi-fleet-manager", "tesla-optimus-engine", "my-family", "my-vital", "my-shop"];
  return preview.includes("robotaxi-fleet-manager");
});

await check("work xp route", async () => {
  const data = await getJson("/api/work/xp");
  return data.ok === true && Array.isArray(data.events);
});

await check("forged apps registry GET", async () => {
  const data = await getJson("/api/claw/forged-apps");
  return data.ok === true && Array.isArray(data.apps);
});

await check("forge status bootstrap", async () => {
  const data = await getJson("/api/forge/status");
  return (
    data.ok === true &&
    Array.isArray(data.fleet) &&
    data.counts &&
    typeof data.counts.total === "number" &&
    Array.isArray(data.forgedApps)
  );
});

await check("forge import rejects invalid bundle", async () => {
  const { status, json } = await postJson("/api/claw/import", { bundle: { soul: "x" } });
  return status === 400 && typeof json.error === "string";
});

await check("forge provision-app mints framework desk", async () => {
  const { status, json } = await postJson("/api/claw/provision-app", {
    intent: "QA smoke framework desk for sorting pipeline",
    templateId: "blank-desk",
    budgetTier: "balanced",
  });
  return status === 200 && json.ok === true && typeof json.href === "string" && json.forgedApp?.slug;
});

await check("forge create rejects framework mode", async () => {
  const { status, json } = await postJson("/api/claw/create", {
    intent: "test framework claw intent string",
    provisioningMode: "framework",
  });
  return status === 400 && typeof json.error === "string" && /not available/i.test(json.error);
});

await check("forged work desk lead + sequence", async () => {
  const { status, json } = await postJson("/api/claw/provision-app", {
    intent: "QA smoke forged work desk pipeline",
    templateId: "work-desk",
    name: "QA Smoke Work Desk",
    budgetTier: "balanced",
  });
  if (status !== 200 || !json.forgedApp?.id) return false;
  const appId = json.forgedApp.id;
  const create = await postJson(`/api/forged/${appId}/status`, {
    action: "create_lead",
    name: "Smoke Lead",
    email: `smoke-${Date.now()}@forged.local`,
  });
  if (create.status !== 200 || !create.json.lead?.id) return false;
  const draft = await postJson(`/api/forged/${appId}/status`, {
    action: "draft_sequence",
    leadId: create.json.lead.id,
  });
  return draft.status === 200 && draft.json.sequence?.id;
});

await check("forged creator desk draft + schedule", async () => {
  const { status, json } = await postJson("/api/claw/provision-app", {
    intent: "QA smoke forged creator desk queue",
    templateId: "creator-desk",
    name: "QA Smoke Creator Desk",
    budgetTier: "balanced",
  });
  if (status !== 200 || !json.forgedApp?.id) return false;
  const appId = json.forgedApp.id;
  const draft = await postJson(`/api/forged/${appId}/status`, {
    action: "draft_post",
    draftText: "Smoke forged creator draft — sovereign publish path on appliance.",
    channel: "Smoke Channel",
    platform: "x",
  });
  if (draft.status !== 200 || !draft.json.post?.id) return false;
  const schedule = await postJson(`/api/forged/${appId}/status`, {
    action: "schedule_post",
    postId: draft.json.post.id,
  });
  return schedule.status === 200 && schedule.json.post?.stage === "SCHEDULED";
});

await check("forged capital desk research + arm rule", async () => {
  const { status, json } = await postJson("/api/claw/provision-app", {
    intent: "QA smoke forged capital desk",
    templateId: "capital-desk",
    name: "QA Smoke Capital Desk",
    budgetTier: "balanced",
  });
  if (status !== 200 || !json.forgedApp?.id) return false;
  const appId = json.forgedApp.id;
  const research = await postJson(`/api/forged/${appId}/status`, {
    action: "research_ticker",
    ticker: "QQQ",
  });
  if (research.status !== 200 || !research.json.watch?.ticker) return false;
  const rule = await postJson(`/api/forged/${appId}/status`, {
    action: "create_rule",
    name: "QQQ dip",
    asset: "QQQ",
  });
  if (rule.status !== 200 || !rule.json.rule?.id) return false;
  const arm = await postJson(`/api/forged/${appId}/status`, {
    action: "arm_rule",
    ruleId: rule.json.rule.id,
  });
  return arm.status === 200 && arm.json.rule?.state === "ARMED";
});

await check("forge island mint fleet badge no nav", async () => {
  const { status, json } = await postJson("/api/claw/create", {
    intent: "QA smoke island mint honest mode",
    name: "QA Island Mint",
    provisioningMode: "island",
    budgetTier: "balanced",
  });
  if (status !== 200 || !json.profile?.id) return false;
  const fleet = await getJson("/api/forge/status");
  const row = fleet.fleet?.find((r) => r.profileId === json.profile.id);
  return row?.mode === "island" && !row?.href;
});

await check("mesh motor route", async () => {
  const { json } = await postJson("/api/mesh/motor", { x: 0.1, y: 0, z: 0.2 });
  return typeof json.ok === "boolean";
});

await check("mesh digital route", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "capital.execute_trade",
    payload: { ticker: "BTC-USD", qty: 1, action: "buy" },
  });
  return typeof json.ok === "boolean";
});

await check("compute metrics", async () => {
  const data = await getJson("/api/metrics/compute");
  return data.backend === "ollama" || data.backend === "vllm" || data.backend === "unknown";
});

await check("claw profiles", async () => {
  const data = await getJson("/api/claw/profiles");
  return Array.isArray(data.claws);
});

await check("vital status", async () => {
  const data = await getJson("/api/vital/status");
  return (
    data.version === 1 &&
    Array.isArray(data.protocol) &&
    data.growthProfile?.growthLevel &&
    Array.isArray(data.reports)
  );
});

await check("vital lab status GET", async () => {
  const data = await getJson("/api/vital/lab");
  return data.ok === true && data.lab?.features?.personalizedQa === true && data.lab.literatureChunks >= 10;
});

await check("vital lab ask POST", async () => {
  const { ok, json } = await postJson("/api/vital/lab", {
    action: "ask",
    query: "What does Sinclair say about NAD given my sleep score?",
    expertLens: "sinclair",
  });
  return ok && typeof json.answer === "string" && json.answer.length > 20 && Array.isArray(json.citations);
});

await check("vital lab protocol diff", async () => {
  const { ok, json } = await postJson("/api/vital/lab", { action: "protocol_diff", expertLens: "attia" });
  return ok && json.diff && typeof json.diff.alignmentScore === "number" && Array.isArray(json.diff.missing);
});

await check("vital lab clinician export", async () => {
  const { ok, json } = await postJson("/api/vital/lab", { action: "clinician_export" });
  return ok && typeof json.markdown === "string" && json.markdown.includes("Vital Claw");
});

await check("family profiles GET", async () => {
  const data = await getJson("/api/family");
  return Array.isArray(data.members) && data.members.length >= 1;
});

await check("mesh context registry", async () => {
  const data = await getJson("/api/mesh/context?registry=1");
  return Array.isArray(data.registry?.publications) && Array.isArray(data.registry?.subscriptions);
});

await check("mesh context for optimus", async () => {
  const data = await getJson("/api/mesh/context?appId=tesla-optimus-engine");
  return data.ok === true && typeof data.context === "object";
});

await check("humanoid fleet add unit", async () => {
  const before = await getJson("/api/humanoid/hub");
  if (before.fleetSummary?.total >= 2) return true;
  const { ok, json } = await postJson("/api/humanoid/hub", {
    action: "add_unit",
    kind: "mobile",
    displayName: "QA Rover",
  });
  return ok && json.fleetSummary?.total >= 2;
});

await check("humanoid pair wizard preview", async () => {
  const hub = await getJson("/api/humanoid/hub");
  const unitId = hub.primaryUnit?.id ?? hub.hub?.units?.[0]?.id;
  if (!unitId) return false;
  const start = await postJson("/api/humanoid/hub", { action: "start_pair", unitId });
  if (!start.ok) return false;
  for (let i = 0; i < 4; i++) {
    const adv = await postJson("/api/humanoid/hub", { action: "advance_pair", unitId });
    if (!adv.ok) return false;
  }
  const done = await postJson("/api/humanoid/hub", { action: "complete_pair", unitId });
  return done.ok && done.json.hub?.units?.some((u) => u.id === unitId && u.pairedAt);
});

await check("humanoid hub GET", async () => {
  const data = await getJson("/api/humanoid/hub");
  return data.ok === true && data.readiness && Array.isArray(data.readiness.steps);
});

await check("humanoid hub push knowledge", async () => {
  const { ok, json } = await postJson("/api/humanoid/hub", { action: "sync_knowledge" });
  return ok && typeof json.hub?.lastKnowledgeSyncAt === "string";
});

await check("humanoid hub knowledge audit", async () => {
  const { ok, json } = await postJson("/api/humanoid/hub", { action: "knowledge_audit" });
  return ok && json.audit?.packageSummary && Array.isArray(json.audit.kinPolicies);
});

await check("humanoid hub kin policy update", async () => {
  const hub = await getJson("/api/humanoid/hub");
  const memberId = hub.kinPolicies?.[0]?.memberId;
  if (!memberId) return true;
  const { ok, json } = await postJson("/api/humanoid/hub", {
    action: "update_kin_policy",
    memberId,
    tone: "warm",
    greetByName: true,
  });
  return ok && json.kinPolicies?.some((p) => p.memberId === memberId && p.tone === "warm");
});

await check("humanoid hub compose routine", async () => {
  const { ok, json } = await postJson("/api/humanoid/hub", {
    action: "compose_routine",
    prompt: "When guests arrive, greet them warmly and offer to take coats.",
  });
  return (
    ok &&
    json.hub?.routines?.some((r) => r.source === "composed" && r.enabled && /guest|coat|warm/i.test(r.description ?? r.label))
  );
});

await check("signal unified feed GET", async () => {
  const data = await getJson("/api/signal/status");
  return data.ok === true && Array.isArray(data.signals) && data.signals.length >= 1;
});

await check("signal unified feed list POST", async () => {
  const { ok, json } = await postJson("/api/signal/status", { action: "list" });
  return ok && Array.isArray(json.signals);
});

await check("mesh consent registry", async () => {
  const data = await getJson("/api/mesh/consent");
  return Array.isArray(data.consent?.entries) && data.consent.entries.length >= 1;
});

await check("agent workspace (capital)", async () => {
  const data = await getJson("/api/agent-workspace/my-capital");
  return data.ok === true && data.workspace?.app?.["SOUL.md"];
});

await check("agent workspace (creator)", async () => {
  const data = await getJson("/api/agent-workspace/my-content-creator");
  const soul = data.workspace?.app?.["SOUL.md"];
  return data.ok === true && typeof soul === "string" && soul.includes("Creator Claw");
});

await check("scheduler GET", async () => {
  const data = await getJson("/api/scheduler");
  return data.version === 1 && Array.isArray(data.jobs);
});

await check("scheduler run_due", async () => {
  const { ok, json } = await postJson("/api/scheduler", { action: "run_due" });
  return ok && Array.isArray(json.results);
});

await check("channels GET", async () => {
  const data = await getJson("/api/channels");
  return data.ok === true && data.config?.version === 1;
});

await check("resolved agent (vital)", async () => {
  const data = await getJson("/api/app-agent/my-vital");
  return data.ok === true && Array.isArray(data.agent?.skills);
});

await check("mesh digital health sync", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "health.sync_wearables",
    payload: { sources: ["oura"] },
  });
  return typeof json.ok === "boolean";
});

await check("mcp GET", async () => {
  const data = await getJson("/api/mcp");
  return data.ok === true && typeof data.mcp === "object";
});

await check("settings multi-model POST", async () => {
  const current = await getJson("/api/settings");
  const { ok, json } = await postJson("/api/settings", {
    multiModel: {
      enabled: false,
      planningProviderId: current.settings?.intelligence?.frontierProviderId ?? null,
      codingProviderId: null,
      longContextProviderId: null,
    },
  });
  return ok && json.settings?.multiModel?.enabled === false;
});

await check("slack events url_verification", async () => {
  const { ok, json } = await postJson("/api/channels/slack/events", {
    type: "url_verification",
    challenge: "qa-challenge",
  });
  return ok && json.challenge === "qa-challenge";
});

await check("whatsapp webhook verify (GET)", async () => {
  const tokenRes = await postJson("/api/channels", { action: "ensure_whatsapp_verify_token" });
  const token = tokenRes.json.verifyToken;
  if (!token) return false;
  const res = await fetch(
    `${BASE}/api/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=wa-challenge`,
  );
  const text = await res.text();
  return text === "wa-challenge";
});

await check("imessage webhook GET", async () => {
  const data = await getJson("/api/channels/imessage/webhook");
  return data.ok === true && typeof data.webhook === "string";
});

await check("garmin oauth status GET", async () => {
  const data = await getJson("/api/vital/garmin");
  return data.ok === true && typeof data.linked === "boolean";
});

await check("garmin oauth start POST", async () => {
  const { ok, json } = await postJson("/api/vital/garmin", { action: "start" });
  if (ok && json.authorizeUrl) return true;
  return !ok && typeof json.error === "string";
});

await check("mesh digital browser automate", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "browser.automate",
    payload: { url: "https://example.com", action: "extract_text" },
  });
  return typeof json.ok === "boolean";
});

await check("patron chat POST", async () => {
  const { ok, json } = await postJson("/api/patron/chat", { message: "hello" });
  return ok && typeof json.reply === "string" && json.reply.length > 0;
});

await check("patron history GET", async () => {
  const data = await getJson("/api/patron/history");
  return Array.isArray(data.turns);
});

await check("channels webchat session history", async () => {
  await postJson("/api/channels/webchat", { appId: "my-shop", message: "margin check" });
  await postJson("/api/channels/webchat", { appId: "my-shop", message: "any alerts?" });
  const inbox = await getJson("/api/channels/inbox");
  const s = inbox.sessions?.find((x) => x.id === "webchat:my-shop");
  return Boolean(s?.history?.length >= 2);
});

await check("channels webchat POST", async () => {
  const { ok, json } = await postJson("/api/channels/webchat", {
    appId: "my-work",
    message: "inbox sync test",
  });
  return ok && typeof json.reply === "string" && typeof json.sessionId === "string";
});

await check("channels inbox GET", async () => {
  const data = await getJson("/api/channels/inbox");
  return data.ok === true && Array.isArray(data.sessions) && data.stats.total >= 1;
});

await check("mesh context inbox keys", async () => {
  const data = await getJson("/api/mesh/context?appId=my-work");
  return data.ok === true && typeof data.context === "object";
});

const appIds = [
  "my-shop",
  "my-content-creator",
  "my-vital",
  "my-family",
  "tesla-optimus-engine",
  "robotaxi-fleet-manager",
  "claw-cafe",
  "claw-forge",
];

for (const appId of appIds) {
  await check(`app-agent assist (${appId})`, async () => {
    const { json } = await postJson("/api/app-agent/assist", { appId, message: "status" });
    return typeof json.reply === "string" && json.reply.length > 0;
  });
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
