#!/usr/bin/env node
/**
 * Prepare dev-qa state for CI (digital.env from example, ensure dirs exist).
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_QA = path.join(__dirname, "dev-qa");

const digitalExample = path.join(DEV_QA, "digital.env.example");
const digitalEnv = path.join(DEV_QA, "digital.env");
if (!existsSync(digitalEnv) && existsSync(digitalExample)) {
  copyFileSync(digitalExample, digitalEnv);
  console.log(`Created ${digitalEnv} from example`);
}

const optionalFiles = [
  ["capital-plaid.json", "{}"],
  ["capital-snaptrade.json", "{}"],
  ["ccp-consent.json", "{}"],
  ["garmin-oauth.json", "{}"],
  ["llm-credentials.json", "{}"],
];

for (const [name, fallback] of optionalFiles) {
  const p = path.join(DEV_QA, name);
  if (!existsSync(p)) {
    writeFileSync(p, `${fallback}\n`, "utf8");
    console.log(`Created ${p}`);
  }
}

mkdirSync(path.join(DEV_QA, "channels"), { recursive: true });
mkdirSync(path.join(DEV_QA, "app-fre"), { recursive: true });
mkdirSync(path.join(DEV_QA, "agent-workspace"), { recursive: true });
mkdirSync(path.join(DEV_QA, "scheduler"), { recursive: true });

console.log("CI QA state ready");
