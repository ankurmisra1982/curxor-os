import "server-only";

import { getAppAgent } from "./app-agent-catalog";
import { getForgedAppById } from "./forged-apps-store";
import { forgedAgentFromRecord, type ResolvedAppAgent } from "./forged-agent-catalog";
import { isValidAppId, type OotbAppId } from "./ootb-apps";
import { isForgedAppId } from "./workspace-app-id";

export async function resolveAppAgent(appId: string): Promise<ResolvedAppAgent> {
  if (isValidAppId(appId)) {
    return getAppAgent(appId as OotbAppId);
  }
  if (isForgedAppId(appId)) {
    const record = await getForgedAppById(appId);
    if (!record) {
      return {
        appId,
        agentName: "Forged Claw",
        tagline: "Custom forged desk",
        ootbLabel: "Forged Claw",
        purpose: ["Custom operator desk minted via The Forge."],
        howToUse: ["Chat in the agent panel.", "Tap skills for actions."],
        skills: [],
        fre: {
          welcomeTitle: "Welcome",
          welcomeLead: "Complete setup for your forged desk.",
          configureTitle: "Configure",
          configureLead: "Set desk defaults.",
          fields: [],
          activateTitle: "Activate",
          activateTips: ["Desk persists on appliance."],
        },
        bootMessage: "Forged Claw ready.",
      };
    }
    return forgedAgentFromRecord(record);
  }
  throw new Error(`Unknown app id: ${appId}`);
}
