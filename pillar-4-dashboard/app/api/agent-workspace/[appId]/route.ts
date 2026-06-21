export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  appendMemory,
  readWorkspace,
  writeSkillFile,
  writeWorkspaceFile,
} from "@/lib/agent-runtime/workspace-store";
import type { AppWorkspaceFile, GlobalWorkspaceFile } from "@/lib/agent-runtime/workspace-types";
import { syncHeartbeatToJobs } from "@/lib/agent-runtime/scheduler-store";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appId: string }> },
): Promise<Response> {
  const { appId: raw } = await context.params;
  if (!isValidAppId(raw)) {
    return Response.json({ error: "Invalid appId" }, { status: 400 });
  }
  const workspace = await readWorkspace(raw as OotbAppId);
  return Response.json({ ok: true, workspace });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ appId: string }> },
): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  const { appId: raw } = await context.params;
  if (!isValidAppId(raw)) {
    return Response.json({ error: "Invalid appId" }, { status: 400 });
  }
  const appId = raw as OotbAppId;

  let body: {
    action?: string;
    scope?: "global" | "app";
    file?: string;
    content?: string;
    skillName?: string;
    skillContent?: string;
    memoryFact?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "sync_heartbeat") {
    const state = await syncHeartbeatToJobs(appId);
    return Response.json({ ok: true, scheduler: state });
  }

  if (body.action === "append_memory" && body.memoryFact) {
    await appendMemory(body.memoryFact);
    const workspace = await readWorkspace(appId);
    return Response.json({ ok: true, workspace });
  }

  if (body.action === "write_skill" && body.skillName && body.skillContent) {
    await writeSkillFile(appId, body.skillName, body.skillContent);
    const workspace = await readWorkspace(appId);
    return Response.json({ ok: true, workspace });
  }

  if (body.scope && body.file && typeof body.content === "string") {
    const workspace = await writeWorkspaceFile(
      appId,
      body.scope,
      body.file as GlobalWorkspaceFile | AppWorkspaceFile,
      body.content,
    );
    if (body.file === "HEARTBEAT.md") {
      await syncHeartbeatToJobs(appId);
    }
    return Response.json({ ok: true, workspace });
  }

  return Response.json({ error: "Unknown action or missing fields" }, { status: 400 });
}
