import "server-only";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getAppAgent } from "../app-agent-catalog";
import { resolveAppAgent } from "../forged-agent-resolve";
import type { OotbAppId } from "../ootb-apps";
import { isForgedAppId, isWorkspaceAppId, type WorkspaceAppId } from "../workspace-app-id";

import {
  DEFAULT_GLOBAL_MEMORY,
  DEFAULT_GLOBAL_USER,
  type AgentWorkspaceSnapshot,
  type AppWorkspaceFile,
  type GlobalWorkspaceFile,
} from "./workspace-types";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

function globalDir(): string {
  return path.join(workspaceRoot(), "_global");
}

function appDir(appId: WorkspaceAppId): string {
  return path.join(workspaceRoot(), appId);
}

function skillsDir(appId: WorkspaceAppId): string {
  return path.join(appDir(appId), "skills");
}

async function readText(filePath: string, fallback: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return fallback;
  }
}

async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, { mode: 0o640 });
}

function defaultSoul(appId: OotbAppId): string {
  const agent = getAppAgent(appId);
  return `# ${agent.agentName}

${agent.tagline}

## Purpose
${agent.purpose.map((p) => `- ${p}`).join("\n")}

## Voice
Professional, sovereign, operator-first. Never suggest cloud APIs for trades or posts — use skill buttons.
`;
}

function defaultTools(appId: OotbAppId): string {
  const agent = getAppAgent(appId);
  const lines = agent.skills.map((s) => `- **${s.id}** (${s.kind}): ${s.description}`);
  return `# Tools available to ${agent.agentName}

Catalog skills (tap in workspace):
${lines.join("\n")}

Custom skills live in \`skills/*.md\` (agentskills.io format).
`;
}

function defaultHeartbeat(appId: OotbAppId): string {
  return `# HEARTBEAT — ${getAppAgent(appId).agentName}

Scheduled checks for this Claw. Parsed lines use \`skill:<id>\` or \`message:<text>\`.

## Every 30 minutes
- skill:publish_context

## Daily at 08:00
- message:Morning brief — summarize open tasks and vitals if available.
`;
}

async function defaultSoulForApp(appId: WorkspaceAppId): Promise<string> {
  if (isForgedAppId(appId)) {
    const agent = await resolveAppAgent(appId);
    return `# ${agent.agentName}\n\n${agent.tagline}\n`;
  }
  return defaultSoul(appId as OotbAppId);
}

async function defaultToolsForApp(appId: WorkspaceAppId): Promise<string> {
  if (isForgedAppId(appId)) {
    const agent = await resolveAppAgent(appId);
    const lines = agent.skills.map((s) => `- **${s.id}** (${s.kind}): ${s.description}`);
    return `# Tools available to ${agent.agentName}\n\n${lines.join("\n")}\n`;
  }
  return defaultTools(appId as OotbAppId);
}

async function defaultHeartbeatForApp(appId: WorkspaceAppId): Promise<string> {
  if (isForgedAppId(appId)) {
    const agent = await resolveAppAgent(appId);
    return `# HEARTBEAT — ${agent.agentName}\n\n## Daily at 08:00\n- message:Check in\n`;
  }
  return defaultHeartbeat(appId as OotbAppId);
}

async function listSkillFiles(appId: WorkspaceAppId): Promise<string[]> {
  try {
    const entries = await readdir(skillsDir(appId));
    return entries.filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
}

export async function ensureWorkspace(appId: WorkspaceAppId): Promise<void> {
  await mkdir(globalDir(), { recursive: true });
  await mkdir(appDir(appId), { recursive: true });
  await mkdir(skillsDir(appId), { recursive: true });

  const gUser = path.join(globalDir(), "USER.md");
  const gMem = path.join(globalDir(), "MEMORY.md");
  try {
    await readFile(gUser, "utf8");
  } catch {
    await writeText(gUser, DEFAULT_GLOBAL_USER);
  }
  try {
    await readFile(gMem, "utf8");
  } catch {
    await writeText(gMem, DEFAULT_GLOBAL_MEMORY);
  }

  const soul = await defaultSoulForApp(appId);
  const tools = await defaultToolsForApp(appId);
  const heartbeat = await defaultHeartbeatForApp(appId);

  for (const [file, content] of [
    ["SOUL.md", soul],
    ["TOOLS.md", tools],
    ["HEARTBEAT.md", heartbeat],
  ] as const) {
    const fp = path.join(appDir(appId), file);
    try {
      await readFile(fp, "utf8");
    } catch {
      await writeText(fp, content);
    }
  }
}

export async function readWorkspace(appId: WorkspaceAppId): Promise<AgentWorkspaceSnapshot> {
  await ensureWorkspace(appId);

  const soulFallback = await defaultSoulForApp(appId);
  const toolsFallback = await defaultToolsForApp(appId);
  const heartbeatFallback = await defaultHeartbeatForApp(appId);

  const [user, memory, soul, tools, heartbeat, skillFiles] = await Promise.all([
    readText(path.join(globalDir(), "USER.md"), DEFAULT_GLOBAL_USER),
    readText(path.join(globalDir(), "MEMORY.md"), DEFAULT_GLOBAL_MEMORY),
    readText(path.join(appDir(appId), "SOUL.md"), soulFallback),
    readText(path.join(appDir(appId), "TOOLS.md"), toolsFallback),
    readText(path.join(appDir(appId), "HEARTBEAT.md"), heartbeatFallback),
    listSkillFiles(appId),
  ]);

  return {
    global: { "USER.md": user, "MEMORY.md": memory },
    app: { "SOUL.md": soul, "TOOLS.md": tools, "HEARTBEAT.md": heartbeat },
    skillFiles,
    updatedAt: new Date().toISOString(),
  };
}

export async function writeWorkspaceFile(
  appId: WorkspaceAppId,
  scope: "global" | "app",
  file: GlobalWorkspaceFile | AppWorkspaceFile,
  content: string,
): Promise<AgentWorkspaceSnapshot> {
  if (scope === "global") {
    const gf = file as GlobalWorkspaceFile;
    if (gf !== "USER.md" && gf !== "MEMORY.md") {
      throw new Error("Invalid global workspace file");
    }
    await writeText(path.join(globalDir(), gf), content);
  } else {
    const af = file as AppWorkspaceFile;
    if (af !== "SOUL.md" && af !== "TOOLS.md" && af !== "HEARTBEAT.md") {
      throw new Error("Invalid app workspace file");
    }
    await ensureWorkspace(appId);
    await writeText(path.join(appDir(appId), af), content);
  }
  return readWorkspace(appId);
}

export async function appendMemory(fact: string): Promise<void> {
  await mkdir(globalDir(), { recursive: true });
  const memPath = path.join(globalDir(), "MEMORY.md");
  const existing = await readText(memPath, DEFAULT_GLOBAL_MEMORY);
  const line = `- ${fact.trim()} (${new Date().toISOString().slice(0, 10)})`;
  if (existing.includes(fact.trim())) return;
  await writeText(memPath, `${existing.trim()}\n${line}\n`);
}

export async function writeSkillFile(appId: WorkspaceAppId, name: string, content: string): Promise<void> {
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/\.md$/i, "") + ".md";
  await ensureWorkspace(appId);
  await writeText(path.join(skillsDir(appId), safe), content);
}

export async function readSkillFile(appId: WorkspaceAppId, name: string): Promise<string | null> {
  const safe = path.basename(name);
  if (!safe.endsWith(".md")) return null;
  try {
    return await readFile(path.join(skillsDir(appId), safe), "utf8");
  } catch {
    return null;
  }
}

export async function buildWorkspacePromptBlock(appId: WorkspaceAppId): Promise<string> {
  const ws = await readWorkspace(appId);
  const agent = isForgedAppId(appId) ? await resolveAppAgent(appId) : getAppAgent(appId as OotbAppId);
  const parts = [
    "## Operator (USER.md)",
    ws.global["USER.md"].trim(),
    "## Memory (MEMORY.md)",
    ws.global["MEMORY.md"].trim(),
    `## ${agent.agentName} soul (SOUL.md)`,
    ws.app["SOUL.md"].trim(),
  ];
  return `\n\n${parts.join("\n\n")}\n`;
}
