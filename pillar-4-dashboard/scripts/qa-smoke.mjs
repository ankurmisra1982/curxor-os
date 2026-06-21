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
  return Array.isArray(data.rules) && typeof data.tradingMode === "string";
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
    typeof json.goLive?.partiallyReady === "boolean" &&
    json.goLive?.today?.recoveryCount !== undefined
  );
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
  const current = await getJson("/api/content/status");
  const draftPost =
    current.posts?.find((p) => p.stage === "DRAFT" || p.stage === "SCHEDULED") ?? current.posts?.[0];
  if (!draftPost?.id) return false;
  const { ok, json } = await postJson("/api/content/status", {
    action: "publish_now",
    postId: draftPost.id,
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

await check("app-agent assist (capital digital skill)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-capital",
    skillId: "execute_trade",
    config: { tradingMode: "paper", selectedAsset: "BTC-USD" },
  });
  return typeof json.reply === "string";
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
