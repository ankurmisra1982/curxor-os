import "server-only";

import type { AgentSkill, AppAgentDefinition } from "../app-agent-catalog";
import { getAppAgent } from "../app-agent-catalog";
import { resolveAppAgent } from "../forged-agent-resolve";
import type { ResolvedAppAgent } from "../forged-agent-catalog";
import type { OotbAppId } from "../ootb-apps";
import { isForgedAppId, type WorkspaceAppId } from "../workspace-app-id";

import { ensureWorkspace, readSkillFile, readWorkspace } from "./workspace-store";

/** agentskills.io-compatible SKILL.md frontmatter. */
export interface ParsedSkillDoc {
  name: string;
  description: string;
  kind: AgentSkill["kind"];
  source: "catalog" | "workspace" | "bundled";
  body: string;
  fileName?: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return { meta, body: match[2]!.trim() };
}

function inferKind(meta: Record<string, string>, body: string): AgentSkill["kind"] {
  const hint = `${meta.kind ?? ""} ${meta.tags ?? ""} ${body}`.toLowerCase();
  if (hint.includes("digital") || hint.includes("trade") || hint.includes("publish")) return "digital";
  if (hint.includes("motor") || hint.includes("physical") || hint.includes("move")) return "physical";
  return "plan";
}

export function parseSkillMarkdown(raw: string, fileName?: string): ParsedSkillDoc | null {
  const { meta, body } = parseFrontmatter(raw);
  const name = meta.name?.trim() || fileName?.replace(/\.md$/i, "") || "";
  if (!name) return null;
  const description = meta.description?.trim() || body.split("\n")[0]?.slice(0, 120) || name;
  return {
    name,
    description,
    kind: inferKind(meta, body),
    source: fileName ? "workspace" : "bundled",
    body,
    fileName,
  };
}

export async function loadWorkspaceSkills(appId: WorkspaceAppId): Promise<ParsedSkillDoc[]> {
  await ensureWorkspace(appId);
  const ws = await readWorkspace(appId);
  const docs: ParsedSkillDoc[] = [];
  for (const file of ws.skillFiles) {
    const raw = await readSkillFile(appId, file);
    if (!raw) continue;
    const parsed = parseSkillMarkdown(raw, file);
    if (parsed) docs.push(parsed);
  }
  return docs;
}

export function catalogSkillsToDocs(agent: AppAgentDefinition): ParsedSkillDoc[] {
  return agent.skills.map((s) => ({
    name: s.id,
    description: s.description,
    kind: s.kind,
    source: "catalog" as const,
    body: s.label,
  }));
}

export async function getResolvedSkills(appId: WorkspaceAppId): Promise<AgentSkill[]> {
  const agent = isForgedAppId(appId) ? await resolveAppAgent(appId) : getAppAgent(appId as OotbAppId);
  const catalog = agent.skills;
  const workspace = await loadWorkspaceSkills(appId);
  const byId = new Map<string, AgentSkill>();

  for (const s of catalog) {
    byId.set(s.id, s);
  }
  for (const doc of workspace) {
    const id = doc.name.replace(/\s+/g, "_").toLowerCase();
    if (byId.has(id)) continue;
    byId.set(id, {
      id,
      label: doc.name,
      description: doc.description,
      kind: doc.kind,
    });
  }
  return [...byId.values()];
}

export async function getResolvedAgent(appId: WorkspaceAppId): Promise<ResolvedAppAgent> {
  const base = isForgedAppId(appId)
    ? await resolveAppAgent(appId)
    : getAppAgent(appId as OotbAppId);
  const skills = await getResolvedSkills(appId);
  return { ...base, skills };
}

export async function buildSkillsPromptBlock(appId: WorkspaceAppId): Promise<string> {
  const ws = await readWorkspace(appId);
  const workspaceSkills = await loadWorkspaceSkills(appId);
  const custom = workspaceSkills
    .map((s) => `- ${s.name}: ${s.description}\n  ${s.body.split("\n").slice(0, 3).join("\n  ")}`)
    .join("\n");
  return `\n\n## Tools reference (TOOLS.md)\n${ws.app["TOOLS.md"].trim()}\n${
    custom ? `\n## Custom skills\n${custom}\n` : ""
  }`;
}
