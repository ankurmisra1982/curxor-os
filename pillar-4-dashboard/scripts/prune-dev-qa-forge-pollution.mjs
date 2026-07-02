#!/usr/bin/env node
/**
 * Remove QA-run forge pollution from scripts/dev-qa (forged-checklist-*, forged-qa-*, etc.).
 * Keeps OOTB app workspaces + a small stable forged demo seed in JSON registries.
 *
 * Usage:
 *   node scripts/prune-dev-qa-forge-pollution.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, statSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_QA = path.join(__dirname, "dev-qa");
const DRY_RUN = process.argv.includes("--dry-run");

/** Stable forged demo slugs committed in dev-qa seed (L4 persona tours). */
const KEEP_FORGED_SLUGS = new Set([
  "demo-tour-desk",
  "fabricator-work-desk",
  "fabricator-creator-desk",
  "fabricator-capital-desk",
]);

const OOTB_APP_FRE = new Set([
  "claw-cafe.json",
  "claw-forge.json",
  "my-capital.json",
  "my-content-creator.json",
  "my-family.json",
  "my-shop.json",
  "my-vital.json",
  "my-work.json",
  "robotaxi-fleet-manager.json",
  "tesla-optimus-engine.json",
]);

const OOTB_WORKSPACE_DIRS = new Set([
  "_global",
  "my-capital",
  "my-content-creator",
  "my-family",
  "my-vital",
  "my-work",
]);

function isPollutedSlug(slug) {
  if (!slug || typeof slug !== "string") return false;
  if (KEEP_FORGED_SLUGS.has(slug)) return false;
  return (
    slug.startsWith("forged-checklist-") ||
    slug.startsWith("checklist-") ||
    slug.startsWith("qa-smoke-") ||
    slug.startsWith("flow-") ||
    slug.startsWith("user-flow-") ||
    /^qa-smoke-framework-desk-for/.test(slug)
  );
}

function isPollutedWorkspaceDir(name) {
  if (OOTB_WORKSPACE_DIRS.has(name)) return false;
  if (name.startsWith("forged-checklist-")) return true;
  if (name.startsWith("forged-")) return true;
  if (name.startsWith("checklist-")) return true;
  if (name.startsWith("flow-")) return true;
  if (name.startsWith("qa-")) return true;
  return false;
}

function readJson(rel) {
  const p = path.join(DEV_QA, rel);
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeJson(rel, data) {
  const p = path.join(DEV_QA, rel);
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (DRY_RUN) return;
  writeFileSync(p, text, "utf8");
}

function removePath(rel) {
  const p = path.join(DEV_QA, rel);
  if (DRY_RUN) return;
  rmSync(p, { recursive: true, force: true });
}

const stats = {
  workspaceDirsRemoved: 0,
  appFreRemoved: 0,
  forgedAppsBefore: 0,
  forgedAppsAfter: 0,
  clawsBefore: 0,
  clawsAfter: 0,
  contextRecordsBefore: 0,
  contextRecordsAfter: 0,
  cafeEventsBefore: 0,
  cafeEventsAfter: 0,
};

// agent-workspace/
const wsRoot = path.join(DEV_QA, "agent-workspace");
for (const name of readdirSync(wsRoot)) {
  const full = path.join(wsRoot, name);
  if (!statSync(full).isDirectory()) continue;
  if (!isPollutedWorkspaceDir(name)) continue;
  removePath(path.join("agent-workspace", name));
  stats.workspaceDirsRemoved++;
}

// app-fre/
const freRoot = path.join(DEV_QA, "app-fre");
for (const name of readdirSync(freRoot)) {
  if (!name.endsWith(".json")) continue;
  if (OOTB_APP_FRE.has(name)) continue;
  if (name.startsWith("forged-") || name.startsWith("checklist-") || name.startsWith("flow-")) {
    removePath(path.join("app-fre", name));
    stats.appFreRemoved++;
  }
}

// forged-apps.json
let keptForgedIds = new Set();
let keptClawIds = new Set();
{
  const forged = readJson("forged-apps.json");
  const apps = Array.isArray(forged.apps) ? forged.apps : [];
  stats.forgedAppsBefore = apps.length;
  forged.apps = apps.filter((a) => a?.slug && KEEP_FORGED_SLUGS.has(a.slug));
  stats.forgedAppsAfter = forged.apps.length;
  keptForgedIds = new Set(forged.apps.map((a) => a.id).filter(Boolean));
  keptClawIds = new Set(forged.apps.map((a) => a.clawProfileId).filter(Boolean));
  writeJson("forged-apps.json", forged);

  const settings = readJson("user-settings.json");
  const slugs = Array.isArray(settings.forgedAppSlugs) ? settings.forgedAppSlugs : [];
  stats.forgedSlugsBefore = slugs.length;
  settings.forgedAppSlugs = forged.apps.map((a) => a.slug).filter(Boolean);
  stats.forgedSlugsAfter = settings.forgedAppSlugs.length;
  writeJson("user-settings.json", settings);
}

// claw-profiles.json
{
  const profiles = readJson("claw-profiles.json");
  const claws = Array.isArray(profiles.claws) ? profiles.claws : [];
  stats.clawsBefore = claws.length;
  profiles.claws = claws.filter((c) => {
    if (c.forgedAppSlug && KEEP_FORGED_SLUGS.has(c.forgedAppSlug)) return true;
    if (keptClawIds.has(c.id)) return true;
    return false;
  });
  const active = profiles.claws.find((c) => c.forgedAppSlug === "fabricator-work-desk")?.id
    ?? profiles.claws.find((c) => c.forgedAppSlug === "demo-tour-desk")?.id
    ?? profiles.claws[0]?.id
    ?? null;
  profiles.activeClawId = active;
  stats.clawsAfter = profiles.claws.length;
  writeJson("claw-profiles.json", profiles);
}

// claw-context.json — drop forged/checklist pollution keys
{
  const ctxPath = path.join(DEV_QA, "claw-context.json");
  if (statSync(ctxPath).isFile()) {
    const ctx = JSON.parse(readFileSync(ctxPath, "utf8"));
    const records = Array.isArray(ctx.records) ? ctx.records : [];
    stats.contextRecordsBefore = records.length;
    ctx.records = records.filter((r) => {
      const key = String(r?.envelope?.key ?? r?.key ?? "");
      const payload = JSON.stringify(r?.envelope?.payload ?? r?.payload ?? r?.value ?? {});
      if (/forged-checklist|checklist-|qa-smoke|flow-assist|flow-round-trip/i.test(key)) return false;
      if (/forged-checklist|checklist-mesh-desk|qa-smoke-framework/i.test(payload)) return false;
      return true;
    });
    stats.contextRecordsAfter = ctx.records.length;
    if (!DRY_RUN) writeFileSync(ctxPath, `${JSON.stringify(ctx, null, 2)}\n`, "utf8");
  }
}

// forge-cafe-events.json — keep fabricator/demo slugs only, cap 25
{
  const cafePath = path.join(DEV_QA, "forge-cafe-events.json");
  if (statSync(cafePath).isFile()) {
    const ledger = JSON.parse(readFileSync(cafePath, "utf8"));
    const events = Array.isArray(ledger.events) ? ledger.events : [];
    stats.cafeEventsBefore = events.length;
    ledger.events = events
      .filter((e) => {
        const slug = String(e?.forgedSlug ?? "");
        if (!slug) return true;
        if (KEEP_FORGED_SLUGS.has(slug)) return true;
        return !isPollutedSlug(slug);
      })
      .slice(-25);
    stats.cafeEventsAfter = ledger.events.length;
    if (!DRY_RUN) writeFileSync(cafePath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  }
}

/** Minimal SOUL/TOOLS for stable forged demo exports (forge-checklist export bundle). */
const FORGED_SEED_WORKSPACES = [
  {
    id: "forged-demo-tour-desk",
    soul: "# Demo Tour Desk\n\nForge demo tour — sovereign agent factory on bare metal.\n",
    tools: "# Tools\n\n- **plan_day** (plan): Plan priorities locally\n",
  },
  {
    id: "forged-fabricator-work-desk",
    soul: "# Fabricator Work Desk\n\nL4 Fabricator tour — forged outreach desk with local pipeline.\n",
    tools: "# Tools\n\n- **create_lead** (work): Create a lead in the local queue\n- **draft_sequence** (work): Draft outreach sequence\n",
  },
  {
    id: "forged-fabricator-creator-desk",
    soul: "# Fabricator Creator Desk\n\nL4 Fabricator tour — forged creator desk with local content queue.\n",
    tools: "# Tools\n\n- **draft_post** (content): Draft a post in the local queue\n- **schedule_post** (content): Schedule a draft post\n",
  },
];

const heartbeat = "# Heartbeat\n\n- Monitor local desk queue on appliance\n";

for (const seed of FORGED_SEED_WORKSPACES) {
  const dir = path.join(wsRoot, seed.id);
  if (!DRY_RUN) {
    mkdirSync(dir, { recursive: true });
    mkdirSync(path.join(dir, "skills"), { recursive: true });
    for (const [file, content] of [
      ["SOUL.md", seed.soul],
      ["TOOLS.md", seed.tools],
      ["HEARTBEAT.md", heartbeat],
    ]) {
      writeFileSync(path.join(dir, file), content.endsWith("\n") ? content : `${content}\n`, "utf8");
    }
    const frePath = path.join(freRoot, `${seed.id}.json`);
    if (!existsSync(frePath)) {
      writeFileSync(
        frePath,
        `${JSON.stringify({ initialized: true, config: { meshPublish: true }, initializedAt: "2026-06-22T00:00:00.000Z" }, null, 2)}\n`,
        "utf8",
      );
    }
  }
  stats.seedWorkspacesEnsured = (stats.seedWorkspacesEnsured ?? 0) + 1;
}

console.log(DRY_RUN ? "==> DRY RUN prune dev-qa forge pollution\n" : "==> Pruned dev-qa forge pollution\n");
console.log(JSON.stringify(stats, null, 2));

if (stats.forgedAppsAfter === 0) {
  console.error("ERROR: forged-apps.json would be empty — aborting sanity check");
  process.exitCode = 1;
}
