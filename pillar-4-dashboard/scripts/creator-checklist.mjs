#!/usr/bin/env node
/**
 * Manual API checklist — Creator Claw demo flows.
 * Usage: node scripts/creator-checklist.mjs [baseUrl]
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

console.log(`==> Creator checklist · base=${BASE}\n`);

// 1. Status bootstrap
{
  const { ok, json } = await get("/api/content/status");
  if (ok && Array.isArray(json.posts) && json.platformVault?.platforms?.length >= 1) {
    pass("status bootstrap", `${json.posts.length} posts`);
  } else {
    fail("status bootstrap", "missing posts or platform vault");
  }
}

// 2. dashboard_bootstrap
{
  const { ok, json } = await post("/api/content/status", { action: "dashboard_bootstrap" });
  if (ok && json.goLive?.steps?.length >= 4 && json.status?.posts) {
    pass("dashboard_bootstrap", `${json.goLive.steps.length} go-live steps`);
  } else {
    fail("dashboard_bootstrap", `steps=${json.goLive?.steps?.length}`);
  }
  if (json.growthProfile?.growthLevel && json.growthProfile?.growthLabel) {
    pass("growth profile", `${json.growthProfile.growthLevel} ${json.growthProfile.growthLabel}`);
  } else {
    fail("growth profile", "missing");
  }
}

// 3. create post
{
  const { ok, json } = await post("/api/content/status", {
    action: "create",
    platform: "x",
    channel: "Creator checklist",
    draftText: "Checklist draft — Creator Claw demo",
  });
  if (ok && json.post?.id && json.post.platform === "x") {
    pass("create post", json.post.id);
  } else {
    fail("create post", `post=${json.post?.id}`);
  }
}

// 4. preflight
{
  const status = (await get("/api/content/status")).json;
  const postId = status.posts?.[0]?.id;
  if (!postId) {
    fail("preflight_check", "no post");
  } else {
    const { ok, json } = await post("/api/content/status", { action: "preflight_check", postId });
    if (ok && typeof json.report?.ready === "boolean" && Array.isArray(json.report?.checks)) {
      pass("preflight_check", `ready=${json.report.ready}`);
    } else {
      fail("preflight_check", `ready=${json.report?.ready}`);
    }
  }
}

// 5. schedule
{
  const status = (await get("/api/content/status")).json;
  const draftPost = status.posts?.find((p) => p.stage !== "PUBLISHED") ?? status.posts?.[0];
  if (!draftPost?.id) {
    fail("schedule", "no post");
  } else {
    const { ok, json } = await post("/api/content/status", {
      action: "schedule",
      postId: draftPost.id,
      useBestTime: true,
    });
    if (ok && typeof json.scheduledAt === "string" && json.post?.stage === "SCHEDULED") {
      pass("schedule (best time)", json.scheduledAt.slice(0, 16));
    } else {
      fail("schedule", `stage=${json.post?.stage}`);
    }
  }
}

// 6. run_demo_tour → scheduled or simulated publish
{
  const { ok, json } = await post("/api/content/status", { action: "run_demo_tour" });
  const tourPost =
    json.postId && json.status?.posts
      ? json.status.posts.find((p) => p.id === json.postId)
      : null;
  const stageOk = tourPost?.stage === "SCHEDULED" || tourPost?.stage === "PUBLISHED";
  if (ok && json.ok && json.postId && Array.isArray(json.steps) && json.steps.length >= 4 && stageOk) {
    pass("run_demo_tour", `${json.postId} · ${tourPost?.stage}${tourPost?.publishedUrl === "demo://local" ? " · demo" : ""}`);
  } else {
    fail("run_demo_tour", `ok=${ok} tourOk=${json.ok} stage=${tourPost?.stage} steps=${json.steps?.length}`);
  }
}

// 7. go_live demoReady
{
  const { ok, json } = await post("/api/content/status", { action: "go_live" });
  if (ok && typeof json.goLive?.demoReady === "boolean" && json.goLive.demoReady === true) {
    pass("go_live demoReady", `${json.goLive.progress.complete}/${json.goLive.progress.total}`);
  } else {
    fail("go_live demoReady", `demoReady=${json.goLive?.demoReady}`);
  }
}

// 8. publish_now smoke (simulated when bridge unconfigured)
{
  const created = await post("/api/content/status", {
    action: "create",
    platform: "x",
    channel: "Checklist publish_now",
    draftText: "Checklist publish_now smoke draft",
  });
  const postId = created.json.post?.id;
  if (!postId) {
    fail("publish_now smoke", "no post");
  } else {
    const { ok, json } = await post("/api/content/status", { action: "publish_now", postId });
    if (ok && (json.mode === "published" || json.mode === "pending")) {
      pass("publish_now smoke", json.mode);
    } else {
      fail("publish_now smoke", `mode=${json.mode}`);
    }
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
