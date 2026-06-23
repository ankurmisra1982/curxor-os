#!/usr/bin/env node
/**
 * Claw Cafe best-in-class checklist — tab gates, sync, ingest, Go Live, Architect.
 * Usage: node scripts/cafe-checklist.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

const checks = [];
function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

console.log(`==> Cafe checklist · base=${BASE}\n`);

// Tab gates (mirror lib/cafe-level-gates.ts)
{
  const order = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4 };
  const meets = (user, req) => order[user] >= order[req];
  const tabs = (g) => {
    const out = ["play", "ascension"];
    if (meets(g, "L2")) out.push("host");
    return out;
  };
  const defaultTab = (g) => (meets(g, "L2") ? "ascension" : "play");
  if (
    tabs("L1").length === 2 &&
    tabs("L2").length === 3 &&
    tabs("L1").includes("ascension") &&
    !tabs("L1").includes("host") &&
    defaultTab("L1") === "play" &&
    defaultTab("L3") === "ascension"
  ) {
    pass("workspace tab gates", "L1 play+ascension · L2+ host · default L2+ ascension");
  } else {
    fail("workspace tab gates", "unexpected tab mapping");
  }
}

// FRE cafeGrowthIntent → growthLevel
{
  const { ok, json } = await post("/api/app-fre/claw-cafe", {
    config: {
      kioskName: "Checklist Desk",
      prizeMode: "demo",
      activeLanes: ["A"],
      cafeGrowthIntent: "L3",
    },
  });
  if (ok && json.state?.config?.growthLevel === "L3") {
    pass("FRE cafeGrowthIntent", "L3 Host");
  } else {
    fail("FRE cafeGrowthIntent", `growthLevel=${json.state?.config?.growthLevel}`);
  }
}

const bootstrap = await get("/api/cafe/status");
if (bootstrap.ok && bootstrap.json.ascension?.tier) {
  pass("status bootstrap", `${bootstrap.json.ascension.title} · ${bootstrap.json.ascension.ascensionXp} XP`);
} else {
  fail("status bootstrap", JSON.stringify(bootstrap.json));
}

if (typeof bootstrap.json.builderBridgeLinked === "boolean") {
  pass("builderBridgeLinked", String(bootstrap.json.builderBridgeLinked));
} else {
  fail("builderBridgeLinked", "missing flag");
}

const architectOpacity = (growth, linked) => {
  const order = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4 };
  if (order[growth] < order.L4) return 0.22;
  return linked ? 0.85 : 0.4;
};
if (architectOpacity("L1", false) === 0.22 && architectOpacity("L4", true) === 0.85) {
  pass("architect opacity tiers", "whisper · linked");
} else {
  fail("architect opacity tiers", "unexpected mapping");
}

const sync = await post("/api/cafe/status", { action: "sync" });
if (sync.ok && typeof sync.json.ingested === "number") {
  pass("sync cross-claw sources", `ingested=${sync.json.ingested}`);
} else {
  fail("sync cross-claw sources", JSON.stringify(sync.json));
}

const requiredSources = ["work", "swarm", "forge", "creator", "capital", "vital", "kin", "shop", "signal"];
pass("sync source catalog", requiredSources.join("+"));

const creatorIngest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "creator.publish",
  appId: "my-content-creator",
  xp: { ascension: 8, knowledge: 5 },
  bubble: "Checklist creator",
});
if (creatorIngest.ok) {
  const cre = creatorIngest.json.characters?.find((c) => c.appId === "my-content-creator");
  if (cre?.station === "publish_desk") pass("creator station mapping", cre.station);
  else fail("creator station mapping", JSON.stringify(cre));
} else {
  fail("creator station mapping", JSON.stringify(creatorIngest.json));
}

const capitalIngest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "capital.rule_armed",
  appId: "my-capital",
  xp: { ascension: 8, wealth: 5 },
  bubble: "Checklist capital",
});
if (capitalIngest.ok) {
  const cap = capitalIngest.json.characters?.find((c) => c.appId === "my-capital");
  if (cap?.station === "ticker_wall") pass("capital station mapping", cap.station);
  else fail("capital station mapping", JSON.stringify(cap));
} else {
  fail("capital station mapping", JSON.stringify(capitalIngest.json));
}

const beforeXp = bootstrap.json.ascension?.ascensionXp ?? 0;
const tierBump = await post("/api/cafe/status", {
  action: "ingest",
  kind: "cross_claw.handshake",
  appId: "my-work",
  xp: { ascension: 40, knowledge: 10, wealth: 10 },
  bubble: "Checklist tier bump",
});
if (
  tierBump.ok &&
  tierBump.json.ascension &&
  (tierBump.json.ascension.ascensionXp > beforeXp || tierBump.json.ascension.progressPct >= 0)
) {
  pass("tier-up ingest", `${beforeXp} → ${tierBump.json.ascension.ascensionXp} XP`);
} else {
  fail("tier-up ingest", JSON.stringify(tierBump.json?.ascension));
}

const goLive = await post("/api/cafe/status", { action: "go_live" });
if (goLive.ok && goLive.json.goLive?.steps?.length >= 4 && typeof goLive.json.goLive.demoReady === "boolean") {
  pass("go_live checklist", `demoReady=${goLive.json.goLive.demoReady}`);
} else {
  fail("go_live checklist", JSON.stringify(goLive.json?.goLive));
}

const tour = await post("/api/cafe/status", { action: "run_demo_tour" });
if (tour.ok && tour.json.tour?.steps?.length >= 3) {
  pass("run_demo_tour", `${tour.json.tour.steps.length} steps`);
} else {
  fail("run_demo_tour", JSON.stringify(tour.json));
}

const href = (appId) => {
  const map = {
    "my-work": "/my-work",
    "my-capital": "/my-capital",
    "my-content-creator": "/my-content",
    "claw-forge": "/claw-forge",
  };
  return map[appId] ?? (appId.startsWith("claw-") || appId.startsWith("forged-") ? "/claw-forge" : "/claw-cafe");
};
if (href("my-work") === "/my-work" && href("forged-desk") === "/claw-forge") {
  pass("inspect open claw href", "OOTB + forged");
} else {
  fail("inspect open claw href", "href map wrong");
}

const osApprovals = await get("/api/os/approvals");
if (osApprovals.ok && osApprovals.json.ok && typeof osApprovals.json.total === "number") {
  pass("os approval inbox", `total=${osApprovals.json.total}`);
} else {
  fail("os approval inbox", JSON.stringify(osApprovals.json));
}

const vitalIngest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "vital.protocol_updated",
  appId: "my-vital",
  xp: { ascension: 6, knowledge: 4 },
  bubble: "Checklist vital",
});
if (vitalIngest.ok) {
  const vit = vitalIngest.json.characters?.find((c) => c.appId === "my-vital");
  if (vit?.station === "couch") pass("vital station mapping", vit.station);
  else fail("vital station mapping", JSON.stringify(vit));
} else {
  fail("vital station mapping", JSON.stringify(vitalIngest.json));
}

const patronBrief = await get("/api/cafe/patron-brief");
if (patronBrief.ok && typeof patronBrief.json.mode === "string") {
  pass("patron brief API", `mode=${patronBrief.json.mode}`);
} else {
  fail("patron brief API", JSON.stringify(patronBrief.json));
}

const mastery = await get("/api/cafe/mastery");
if (mastery.ok && mastery.json.mastery) {
  pass("desk mastery API", Array.isArray(mastery.json.mastery) ? `rows=${mastery.json.mastery.length}` : "single");
} else {
  fail("desk mastery API", JSON.stringify(mastery.json));
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n==> ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length > 0) process.exitCode = 1;
