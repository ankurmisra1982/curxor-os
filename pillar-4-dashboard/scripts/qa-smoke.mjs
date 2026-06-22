#!/usr/bin/env node
/**
 * Cross-platform dashboard QA smoke tests.
 * Usage: node scripts/qa-smoke.mjs [baseUrl]
 */
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

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

console.log(`==> QA smoke · base=${BASE}\n`);

await check("setup status", async () => {
  const data = await getJson("/api/setup/status");
  return typeof data.initialized === "boolean";
});

await check("settings GET", async () => {
  const data = await getJson("/api/settings");
  return data.settings?.version === 1 && Array.isArray(data.providers);
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
  return data.ok === true && Array.isArray(data.providers) && data.providers.length >= 5;
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
  return data.version === 1 && Array.isArray(data.protocol);
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

await check("mesh consent registry", async () => {
  const data = await getJson("/api/mesh/consent");
  return Array.isArray(data.consent?.entries) && data.consent.entries.length >= 1;
});

await check("agent workspace (capital)", async () => {
  const data = await getJson("/api/agent-workspace/my-capital");
  return data.ok === true && data.workspace?.app?.["SOUL.md"];
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
  const res = await fetch(`${BASE}/api/channels/slack/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "url_verification", challenge: "qa-challenge" }),
  });
  const json = await res.json();
  return json.challenge === "qa-challenge";
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
process.exit(fail > 0 ? 1 : 0);
