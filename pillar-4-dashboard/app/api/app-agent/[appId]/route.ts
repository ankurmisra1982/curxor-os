export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildSkillsPromptBlock, getResolvedAgent, loadWorkspaceSkills } from "@/lib/agent-runtime/skills-loader";
import { readWorkspace } from "@/lib/agent-runtime/workspace-store";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appId: string }> },
): Promise<Response> {
  const { appId: raw } = await context.params;
  if (!isValidAppId(raw)) {
    return Response.json({ error: "Invalid appId" }, { status: 400 });
  }
  const appId = raw as OotbAppId;
  const agent = await getResolvedAgent(appId);
  const workspace = await readWorkspace(appId);
  const customSkills = await loadWorkspaceSkills(appId);
  return Response.json({
    ok: true,
    agent,
    workspace,
    customSkills,
    skillsPromptAvailable: true,
    skillsBlockLength: (await buildSkillsPromptBlock(appId)).length,
  });
}
