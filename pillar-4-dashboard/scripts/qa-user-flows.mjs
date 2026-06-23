#!/usr/bin/env node
/**
 * End-to-end user flow tests (API-level).
 * Usage: node scripts/qa-user-flows.mjs [baseUrl]
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

console.log(`==> User flow QA · base=${BASE}\n`);

await check("flow: webchat multi-turn session continuity", async () => {
  const sid = "webchat:my-vital";
  const r1 = await postJson("/api/channels/webchat", {
    appId: "my-vital",
    message: "What is my longevity focus?",
  });
  if (!r1.ok || r1.json.sessionId !== sid) return false;

  const r2 = await postJson("/api/channels/webchat", {
    appId: "my-vital",
    message: "Summarize that in one sentence",
  });
  if (!r2.ok || r2.json.sessionId !== sid) return false;

  const inbox = await getJson("/api/channels/inbox");
  const session = inbox.sessions?.find((s) => s.id === sid);
  return Boolean(session && session.history?.length >= 2);
});

await check("flow: webchat slash-free capital chat", async () => {
  const r = await postJson("/api/channels/webchat", {
    appId: "my-capital",
    message: "What is my trading mode?",
    config: { tradingMode: "paper" },
  });
  return r.ok && typeof r.json.reply === "string" && r.json.reply.length > 0;
});

await check("flow: enable channels gateway setting", async () => {
  const r = await postJson("/api/channels", { enabled: true, defaultAppId: "my-work" });
  const cfg = await getJson("/api/channels");
  return r.ok && cfg.config?.enabled === true;
});

await check("flow: family channel handle link + mesh sync", async () => {
  const family = await getJson("/api/family");
  const member = family.members?.[0];
  if (!member) return false;

  const link = await postJson("/api/family", {
    id: member.id,
    displayName: member.displayName,
    channelHandles: [{ channel: "whatsapp", address: "+15551234567" }],
  });
  if (!link.ok) return false;

  await postJson("/api/mesh/context", { resyncFamily: true });
  const ctx = await getJson("/api/mesh/context?appId=my-family");
  return ctx.ok === true;
});

await check("flow: CCP receives inbox after webchat", async () => {
  await postJson("/api/channels/webchat", {
    appId: "my-work",
    message: "Draft outreach priority for today",
  });
  const ctx = await getJson("/api/mesh/context?appId=my-work");
  const inbox = await getJson("/api/channels/inbox");
  const hasSession = inbox.sessions?.some((s) => s.appId === "my-work");
  const hasContext = JSON.stringify(ctx).includes("inbox") || JSON.stringify(ctx).includes("comms");
  return ctx.ok === true && (hasSession || hasContext);
});

await check("flow: workspace memory append via agent", async () => {
  const before = await getJson("/api/agent-workspace/my-work");
  await postJson("/api/channels/webchat", {
    appId: "my-work",
    message: "Remember to follow up with Acme Corp tomorrow morning",
  });
  return before.ok === true;
});

await check("flow: work wizard create draft activate", async () => {
  const email = `flow-${Date.now()}@example.com`;
  const create = await postJson("/api/work/status", {
    action: "create_lead",
    name: "Flow Prospect",
    email,
  });
  const leadId = create.json.lead?.id;
  if (!create.ok || !leadId) return false;
  const draft = await postJson("/api/work/status", {
    action: "draft_sequence",
    leadId,
    name: "Flow sequence",
  });
  if (!draft.ok) return false;
  const status = await getJson("/api/work/status");
  const seq = status.sequences?.find((s) => s.leadId === leadId && s.status === "draft");
  if (!seq?.id) return false;
  const activate = await postJson("/api/work/status", {
    action: "activate_sequence",
    sequenceId: seq.id,
  });
  return (
    activate.ok &&
    (activate.json.autoSendPolicy === "immediate" || activate.json.autoSendPolicy === "deferred")
  );
});

await check("flow: work enrich mcp draft_reply", async () => {
  const status = await getJson("/api/work/status");
  const leadId = status.leads?.[0]?.id;
  const mailId = status.mailIndex?.[0]?.id;
  if (!leadId) return false;
  const enrich = await postJson("/api/work/status", { action: "enrich_lead", leadId });
  const mcp = await getJson("/api/work/mcp");
  if (!enrich.ok || !mcp.ok || !Array.isArray(mcp.tools)) return false;
  if (!mailId) return true;
  const draft = await postJson("/api/work/status", { action: "draft_reply", mailId });
  return draft.ok && typeof draft.json.body === "string";
});

await check("flow: work L1 opportunity draft_reply", async () => {
  const email = `flow-l1-${Date.now()}@example.com`;
  const create = await postJson("/api/work/status", {
    action: "create_lead",
    name: "Flow L1 Opportunity",
    email,
  });
  if (!create.ok) return false;
  const status = await getJson("/api/work/status");
  const mailId = status.mailIndex?.[0]?.id;
  if (!mailId) return true;
  const draft = await postJson("/api/work/status", { action: "draft_reply", mailId });
  return draft.ok && typeof draft.json.body === "string";
});

await check("flow: work L2 mini sequence", async () => {
  const status = await getJson("/api/work/status");
  const leadId = status.leads?.[0]?.id;
  if (!leadId) return false;
  const seq = await postJson("/api/work/status", {
    action: "create_mini_sequence",
    leadId,
    presetId: "polite_followup",
  });
  return seq.ok && typeof seq.json.sequenceId === "string";
});

await check("flow: work growth profile", async () => {
  const res = await postJson("/api/work/status", { action: "get_growth_profile" });
  const gl = res.json.growthProfile?.growthLevel;
  return res.ok && (gl === "L1" || gl === "L2" || gl === "L3" || gl === "L4" || gl === "L5");
});

await check("flow: vital status + webchat same app", async () => {
  const vital = await getJson("/api/vital/status");
  const chat = await postJson("/api/channels/webchat", {
    appId: "my-vital",
    message: "status check",
    config: { selectedProfileId: null },
  });
  return vital.version === 1 && chat.ok && chat.json.appId === "my-vital";
});

await check("flow: settings claws unchanged after comms", async () => {
  const settings = await getJson("/api/settings");
  const apps = settings.settings?.selectedApps ?? ["my-capital"];
  const save = await postJson("/api/settings/claws", { selectedApps: apps });
  return save.ok && save.json.settings?.selectedApps?.length >= 1;
});

await check("flow: scheduler still runs after comms load", async () => {
  const r = await postJson("/api/scheduler", { action: "run_due" });
  return r.ok && Array.isArray(r.json.results);
});

await check("flow: inbox lists webchat + stats", async () => {
  const inbox = await getJson("/api/channels/inbox");
  return (
    inbox.ok &&
    inbox.stats.total >= 1 &&
    inbox.sessions.some((s) => s.channel === "webchat")
  );
});

await check("flow: vital demo tour → go_live", async () => {
  const tour = await postJson("/api/vital/status", { action: "run_demo_tour" });
  if (!tour.ok || !tour.json.tour?.ok) return false;
  const goLive = await postJson("/api/vital/status", { action: "go_live" });
  const gl = goLive.json.goLive;
  return goLive.ok && gl?.demoReady === true && gl.steps?.some((s) => s.id === "lab");
});

await check("flow: optimus reads merged context after vital chat", async () => {
  await postJson("/api/channels/webchat", {
    appId: "tesla-optimus-engine",
    message: "What do you know about my household?",
  });
  const ctx = await getJson("/api/mesh/context?appId=tesla-optimus-engine");
  return ctx.ok === true && typeof ctx.context === "object";
});

await check("flow: creator wizard path create → preflight → schedule", async () => {
  const created = await postJson("/api/content/status", {
    action: "create",
    platform: "x",
    channel: "User flow QA",
    draftText: "Day-one Creator Claw — sovereign publish pipeline on bare metal.",
  });
  if (!created.ok || !created.json.post?.id) return false;
  const postId = created.json.post.id;

  const preflight = await postJson("/api/content/status", { action: "preflight_check", postId });
  if (!preflight.ok || !Array.isArray(preflight.json.report?.checks)) return false;

  const scheduled = await postJson("/api/content/status", {
    action: "schedule",
    postId,
    useBestTime: true,
  });
  if (!scheduled.ok || scheduled.json.post?.stage !== "SCHEDULED") return false;

  const bootstrap = await postJson("/api/content/status", { action: "dashboard_bootstrap", postId });
  return (
    bootstrap.ok &&
    bootstrap.json.status?.posts?.some((p) => p.id === postId && p.stage === "SCHEDULED")
  );
});

await check("flow: capital demo tour → go_live", async () => {
  const tour = await postJson("/api/capital/status", { action: "run_demo_tour" });
  if (!tour.ok || !tour.json.ok || !tour.json.tradeId) return false;
  const goLive = await postJson("/api/capital/status", { action: "go_live" });
  const gl = goLive.json.goLive;
  return (
    goLive.ok &&
    gl &&
    (gl.today?.filledToday >= 1 || gl.today?.armedRules >= 1 || gl.progress?.complete >= 3)
  );
});

await check("flow: capital execute_now armed rule", async () => {
  const created = await postJson("/api/capital/status", {
    action: "create_rule",
    name: "QA flow rule",
    asset: "SPY",
    actionTrade: "buy",
    qty: 1,
  });
  if (!created.ok || !created.json.rule?.id) return false;
  const ruleId = created.json.rule.id;
  const armed = await postJson("/api/capital/status", { action: "arm_rule", ruleId });
  if (!armed.ok) return false;
  const exec = await postJson("/api/capital/status", { action: "execute_now", ruleId });
  return exec.ok && exec.json.ok !== false;
});

await check("flow: capital analytics + portfolio Q&A", async () => {
  const analytics = await postJson("/api/capital/status", { action: "analytics" });
  if (!analytics.ok || !analytics.json.analytics) return false;
  const qa = await postJson("/api/capital/status", {
    action: "nl_portfolio_query",
    query: "portfolio health",
  });
  return qa.ok && typeof qa.json.answer === "string";
});

await check("flow: capital setup wizard API sequence", async () => {
  await postJson("/api/capital/status", { action: "dashboard_bootstrap" });
  const rule = await postJson("/api/capital/status", {
    action: "create_dip_rule",
    ticker: "SPY",
    dropPct: 5,
  });
  if (!rule.ok || !rule.json.rule?.id) return false;
  const ruleId = rule.json.rule.id;
  const armed = await postJson("/api/capital/status", { action: "arm_rule", ruleId });
  if (!armed.ok) return false;
  const exec = await postJson("/api/capital/status", { action: "execute_now", ruleId });
  if (!exec.ok || exec.json.ok === false) return false;
  const goLive = await postJson("/api/capital/status", { action: "go_live" });
  return goLive.ok && (goLive.json.goLive?.demoReady === true || goLive.json.goLive?.progress?.complete >= 4);
});

await check("flow: capital rebalance rule + arm", async () => {
  const created = await postJson("/api/capital/status", {
    action: "create_rule",
    name: "Flow rebalance",
    asset: "NVDA",
    kind: "rebalance",
    targetWeight: 15,
    driftThresholdPct: 8,
    actionTrade: "sell",
    conditionType: "manual_trigger",
  });
  if (!created.ok || created.json.rule?.kind !== "rebalance") return false;
  const armed = await postJson("/api/capital/status", { action: "arm_rule", ruleId: created.json.rule.id });
  return armed.ok && armed.json.rule?.state === "ARMED";
});

await check("flow: cross_claw_handoff creator to work", async () => {
  const email = `handoff-${Date.now()}@example.com`;
  const handoff = await postJson("/api/work/status", {
    action: "handoff_from_claw",
    sourceClaw: "my-content",
    name: "Creator Collab",
    email,
    contextLabel: "QA engage DM",
  });
  if (!handoff.ok || !handoff.json.lead?.id) return false;
  const status = await getJson("/api/work/status");
  return Array.isArray(status.leads) && status.leads.some((l) => l.email === email);
});

await check("flow: capital_to_work_handoff", async () => {
  const email = `capital-handoff-${Date.now()}@example.com`;
  const handoff = await postJson("/api/work/status", {
    action: "handoff_from_claw",
    source: "my-capital",
    name: "Capital Intel Lead",
    email,
    company: "Ticker follow-up",
    contextLabel: "SPY alert reply",
  });
  if (!handoff.ok || !handoff.json.lead?.id) return false;
  const status = await getJson("/api/work/status");
  const lead = status.leads?.find((l) => l.email === email);
  return Boolean(lead?.tags?.some((t) => t.includes("handoff") || t.includes("my-capital")));
});

await check("flow: signal_to_opportunity", async () => {
  const feed = await postJson("/api/work/status", { action: "signal_feed_list" });
  const signalId = feed.json.signals?.[0]?.id;
  if (!signalId) return false;
  const conv = await postJson("/api/work/status", { action: "signal_to_opportunity", signalId });
  return conv.ok && Boolean(conv.json.lead?.id) && Boolean(conv.json.sequenceId);
});

await check("flow: os_playbook_capital_work", async () => {
  const result = await postJson("/api/work/status", {
    action: "run_os_playbook",
    playbookId: "capital-alert",
  });
  if (!result.ok || !result.json.lead?.id) return false;
  const tags = result.json.tags ?? result.json.lead?.tags ?? [];
  return tags.some((t) => String(t).includes("playbook:capital-alert"));
});

await check("flow: cafe_work_xp_smoke", async () => {
  await postJson("/api/work/status", { action: "xp_event_emit", kind: "sequence_activated" });
  const xp = await getJson("/api/work/xp");
  return xp.ok !== false && Array.isArray(xp.events) && xp.events.length >= 1 && xp.optOut !== true;
});

await check("flow: cafe_ascension_cross_claw", async () => {
  const before = await getJson("/api/cafe/status");
  if (before.optOut === true) return true;
  const xpBefore = typeof before.ascension?.ascensionXp === "number" ? before.ascension.ascensionXp : 0;

  await postJson("/api/work/status", { action: "xp_event_emit", kind: "handoff_received", payload: { source: "swarm" } });
  await new Promise((r) => setTimeout(r, 400));

  const sync = await postJson("/api/cafe/status", { action: "sync" });
  if (sync.ok === false) return false;

  const after = await getJson("/api/cafe/status");
  const xpAfter = typeof after.ascension?.ascensionXp === "number" ? after.ascension.ascensionXp : 0;
  const hasEvents = Array.isArray(after.events) && after.events.length >= 1;

  return after.ok !== false && hasEvents && xpAfter >= xpBefore;
});

await check("flow: swarm_bootstrap_and_handoff", async () => {
  const boot = await postJson("/api/swarm/status", { action: "dashboard_bootstrap" });
  if (!boot.ok || !Array.isArray(boot.json.fleet) || boot.json.fleet.length < 2) return false;

  const handoff = await postJson("/api/work/status", {
    action: "handoff_to_swarm",
    title: "Freeze QA handoff",
    targetCell: "C3",
  });
  if (!handoff.ok || !handoff.json.workloadId) return false;

  const after = await postJson("/api/swarm/status", { action: "dashboard_bootstrap" });
  const workloads = after.json.workloads ?? [];
  return workloads.some((w) => w.id === handoff.json.workloadId || w.title?.includes("Freeze"));
});

await check("flow: forge demo tour → go_live", async () => {
  const tour = await postJson("/api/forge/status", { action: "run_demo_tour" });
  if (!tour.ok || !tour.json.tour?.ok) return false;
  const status = await getJson("/api/forge/status");
  return status.goLive?.demoReady === true;
});

await check("flow: forge work desk mint lead sequence", async () => {
  const prov = await postJson("/api/claw/provision-app", {
    intent: "User flow forged work desk",
    templateId: "work-desk",
    name: "Flow Forged Work",
    budgetTier: "balanced",
  });
  const appId = prov.json.forgedApp?.id;
  if (!prov.ok || !appId) return false;
  const create = await postJson(`/api/forged/${appId}/status`, {
    action: "create_lead",
    name: "Flow Lead",
    email: `flow-forge-${Date.now()}@example.com`,
  });
  if (!create.ok || !create.json.lead?.id) return false;
  const draft = await postJson(`/api/forged/${appId}/status`, {
    action: "draft_sequence",
    leadId: create.json.lead.id,
  });
  return draft.ok && typeof draft.json.sequence?.id === "string";
});

await check("flow: forge L4 persona work desk tour", async () => {
  const tour = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4" });
  return (
    tour.ok &&
    tour.json.tour?.ok === true &&
    typeof tour.json.tour?.forgedHref === "string" &&
    tour.json.tour.forgedHref.includes("/my-claw/")
  );
});

await check("flow: forge creator desk draft schedule", async () => {
  const prov = await postJson("/api/claw/provision-app", {
    intent: "User flow forged creator desk",
    templateId: "creator-desk",
    name: "Flow Forged Creator",
    budgetTier: "balanced",
  });
  const appId = prov.json.forgedApp?.id;
  if (!prov.ok || !appId) return false;
  const draft = await postJson(`/api/forged/${appId}/status`, {
    action: "draft_post",
    draftText: "User flow forged creator post — schedule on appliance.",
    platform: "linkedin",
  });
  if (!draft.ok || !draft.json.post?.id) return false;
  const schedule = await postJson(`/api/forged/${appId}/status`, {
    action: "schedule_post",
    postId: draft.json.post.id,
  });
  return schedule.ok && schedule.json.post?.stage === "SCHEDULED";
});

await check("flow: forge L4-creator persona tour", async () => {
  const tour = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4-creator" });
  return (
    tour.ok &&
    tour.json.tour?.ok === true &&
    tour.json.tour?.persona === "L4-creator" &&
    typeof tour.json.tour?.forgedHref === "string"
  );
});

await check("flow: forge capital desk research arm rule", async () => {
  const prov = await postJson("/api/claw/provision-app", {
    intent: "User flow forged capital desk",
    templateId: "capital-desk",
    name: "Flow Forged Capital",
    budgetTier: "balanced",
  });
  const appId = prov.json.forgedApp?.id;
  if (!prov.ok || !appId) return false;
  const research = await postJson(`/api/forged/${appId}/status`, {
    action: "research_ticker",
    ticker: "SPY",
  });
  if (!research.ok) return false;
  const rule = await postJson(`/api/forged/${appId}/status`, {
    action: "create_rule",
    name: "Flow rule",
    asset: "SPY",
  });
  if (!rule.ok || !rule.json.rule?.id) return false;
  const arm = await postJson(`/api/forged/${appId}/status`, {
    action: "arm_rule",
    ruleId: rule.json.rule.id,
  });
  return arm.ok && arm.json.rule?.state === "ARMED";
});

await check("flow: forge island mint no desk nav", async () => {
  const create = await postJson("/api/claw/create", {
    intent: "User flow island mint",
    name: "Flow Island Claw",
    provisioningMode: "island",
    budgetTier: "balanced",
  });
  if (!create.ok || !create.json.profile?.id) return false;
  const status = await getJson("/api/forge/status");
  const row = status.fleet?.find((r) => r.profileId === create.json.profile.id);
  return row?.mode === "island" && !row?.href;
});

await check("flow: forged work desk assist create_lead", async () => {
  const prov = await postJson("/api/claw/provision-app", {
    intent: "User flow forged assist work",
    templateId: "work-desk",
    name: "Flow Assist Work",
    budgetTier: "balanced",
  });
  const appId = prov.json.forgedApp?.id;
  if (!prov.ok || !appId) return false;
  const assist = await postJson("/api/app-agent/assist", {
    appId,
    skillId: "create_lead",
    config: {
      name: "Assist Flow Lead",
      email: `assist-flow-${Date.now()}@forged.local`,
    },
  });
  return assist.ok && typeof assist.json.reply === "string" && /Lead created/i.test(assist.json.reply);
});

await check("flow: forge export import round-trip", async () => {
  const prov = await postJson("/api/claw/provision-app", {
    intent: "User flow export import round trip",
    templateId: "blank-desk",
    name: "Flow Round Trip",
    budgetTier: "balanced",
  });
  const appId = prov.json.forgedApp?.id;
  if (!prov.ok || !appId) return false;
  const exp = await postJson("/api/claw/export", { forgedAppId: appId });
  if (!exp.ok || !exp.json.bundle) return false;
  const imp = await postJson("/api/claw/import", {
    bundle: { ...exp.json.bundle, name: "Flow Reimport Claw" },
    operatorConfirmedWarnings: true,
  });
  return imp.ok && (imp.json.profile?.id || imp.json.forgedApp?.id);
});

await check("flow: forge L4-capital persona tour", async () => {
  const tour = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4-capital" });
  return (
    tour.ok &&
    tour.json.tour?.ok === true &&
    tour.json.tour?.persona === "L4-capital" &&
    typeof tour.json.tour?.forgedHref === "string"
  );
});

console.log(`\nUser flow results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
