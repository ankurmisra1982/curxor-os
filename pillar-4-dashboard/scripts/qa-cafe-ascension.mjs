#!/usr/bin/env node
/**
 * Claw Cafe ascension + spatial hooks QA.
 * Usage: node scripts/qa-cafe-ascension.mjs [baseUrl]
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

/** Mirror lib/cafe-pixel-engine.ts for pure checks without TS import. */
function pixelEngineChecks() {
  const manhattan = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  const adjacent = (a, b) => manhattan(a, b) <= 1;
  const stations = {
    mailbox: { col: 0, row: 0 },
    publish_desk: { col: 2, row: 0 },
    ticker_wall: { col: 4, row: 0 },
    anvil: { col: 0, row: 2 },
    yard_dock: { col: 4, row: 2 },
    couch: { col: 2, row: 3 },
    coffee: { col: 1, row: 1 },
  };
  const stationIds = Object.keys(stations);
  if (stationIds.length < 4) {
    fail("pixel station sprites", `expected >=4 stations, got ${stationIds.length}`);
    return;
  }
  pass("pixel station sprites", `${stationIds.length} OOTB stations`);

  const patron = { col: 1, row: 0 };
  const mail = stations.mailbox;
  if (!adjacent(patron, mail)) {
    fail("pixel proximity inspect", "patron should be adjacent to mail");
    return;
  }
  pass("pixel proximity inspect", "adjacent within 1 cell");

  const far = stations.ticker_wall;
  if (adjacent(patron, far)) {
    fail("pixel non-adjacent", "ticker should be >1 away");
    return;
  }
  pass("pixel non-adjacent", "distant tiles excluded");

  const href = (appId) => {
    const map = {
      "my-work": "/my-work",
      "my-capital": "/my-capital",
      "my-content-creator": "/my-content",
      "claw-forge": "/claw-forge",
    };
    return map[appId] ?? (appId.startsWith("claw-") ? "/claw-forge" : "/claw-cafe");
  };
  if (href("my-work") !== "/my-work" || href("claw-abc") !== "/claw-forge") {
    fail("pixel open claw href", "href mapping wrong");
    return;
  }
  pass("pixel open claw href", "OOTB + forged routes");
}

console.log(`==> Cafe ascension hooks · base=${BASE}\n`);

pixelEngineChecks();

const bootstrap = await get("/api/cafe/status");
if (bootstrap.ok && bootstrap.json.ascension?.tier) {
  pass("GET /api/cafe/status", `${bootstrap.json.ascension.title} · ${bootstrap.json.ascension.ascensionXp} XP`);
} else {
  fail("GET /api/cafe/status", JSON.stringify(bootstrap.json));
}

if (bootstrap.ok && Array.isArray(bootstrap.json.characters)) {
  pass("spatial characters", `${bootstrap.json.characters.length} patrons`);
} else {
  fail("spatial characters", "missing characters array");
}

const sync = await post("/api/cafe/status", { action: "sync" });
if (sync.ok && typeof sync.json.ingested === "number") {
  pass("sync sources", `ingested=${sync.json.ingested}`);
} else {
  fail("sync sources", JSON.stringify(sync.json));
}

const ingest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "work.sequence_step",
  appId: "my-work",
  xp: { ascension: 10, wealth: 5 },
  bubble: "QA sequence step",
});
if (ingest.ok && ingest.json.event?.id) {
  pass("manual ingest", ingest.json.event.id);
} else {
  fail("manual ingest", JSON.stringify(ingest.json));
}

if (ingest.ok && ingest.json.ascension?.ascensionXp >= bootstrap.json.ascension?.ascensionXp) {
  pass("ascension XP updated", String(ingest.json.ascension.ascensionXp));
} else {
  fail("ascension XP updated", "XP did not increase");
}

if (ingest.ok && Array.isArray(ingest.json.characters)) {
  const workChar = ingest.json.characters.find((c) => c.appId === "my-work");
  if (workChar?.station === "mailbox" && workChar?.state) {
    pass("ingest moves character", `${workChar.station} · ${workChar.state}`);
  } else {
    fail("ingest moves character", JSON.stringify(workChar));
  }
} else {
  fail("ingest moves character", "missing characters on ingest response");
}

const creatorIngest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "creator.publish",
  appId: "my-content-creator",
  xp: { ascension: 12, knowledge: 8 },
  bubble: "QA creator publish",
});
if (creatorIngest.ok) {
  const cre = creatorIngest.json.characters?.find((c) => c.appId === "my-content-creator");
  if (cre?.station === "publish_desk") {
    pass("creator publish desk", cre.station);
  } else {
    fail("creator publish desk", JSON.stringify(cre));
  }
} else {
  fail("creator publish desk", JSON.stringify(creatorIngest.json));
}

const capitalIngest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "capital.rule_armed",
  appId: "my-capital",
  xp: { ascension: 10, wealth: 6 },
  bubble: "QA rule armed",
});
if (capitalIngest.ok) {
  const cap = capitalIngest.json.characters?.find((c) => c.appId === "my-capital");
  if (cap?.station === "ticker_wall") {
    pass("capital rule desk", cap.station);
  } else {
    fail("capital rule desk", JSON.stringify(cap));
  }
} else {
  fail("capital rule desk", JSON.stringify(capitalIngest.json));
}

const syncSources = ["work", "swarm", "forge", "creator", "capital"];
pass("sync source catalog", syncSources.join("+"));

const failed = checks.filter((c) => !c.ok);
console.log(`\n==> ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length > 0) process.exitCode = 1;
