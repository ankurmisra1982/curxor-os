import type { AppAgentDefinition } from "./app-agent-catalog";
import { defaultFreConfig, getAppAgent } from "./app-agent-catalog";
import type { ForgedAppRecord } from "./forged-apps-types";
import { getForgeTemplate, type ForgeTemplateId } from "./forge-templates";
import { isValidAppId, type OotbAppId } from "./ootb-apps";

export type ResolvedAppAgent = Omit<AppAgentDefinition, "appId"> & { appId: string };

export function forgedAgentFromRecord(record: ForgedAppRecord): ResolvedAppAgent {
  const pack = getForgeTemplate(record.templateId as ForgeTemplateId);
  const agentName = record.name.includes("Claw") ? record.name : `${record.name} ${pack.agentNameSuffix}`.trim();
  return {
    appId: record.id,
    agentName,
    tagline: record.intent.slice(0, 120),
    ootbLabel: record.name,
    purpose: [
      record.intent,
      `Forged ${record.provisioningMode} app on CurXor OS.`,
      record.meshConnected ? "Subscribed to Claw Context mesh." : "Mesh publish opt-in via FRE.",
    ],
    howToUse: [
      "Complete FRE if prompted, then chat your mission in the agent panel.",
      "Tap skills for explicit actions — chat plans only.",
      "Growth level gates unlock panels as you operate the desk.",
    ],
    skills: pack.skills,
    fre: {
      welcomeTitle: `Welcome to ${record.name}`,
      welcomeLead: `Forged desk — ${pack.description}`,
      configureTitle: "Configure your desk",
      configureLead: "Set defaults seeded from your forge template.",
      fields: pack.freFields,
      activateTitle: `Activate ${agentName}`,
      activateTips: [
        "Profiles persist to agent-workspace on appliance.",
        "Outbound actions require skill taps — never direct LLM egress.",
        record.meshConnected ? "Mesh context publishes when FRE allows." : "Enable mesh in FRE when ready.",
      ],
    },
    bootMessage: `${agentName} online. ${record.intent.slice(0, 80)}…`,
  };
}

export function defaultFreConfigForApp(appId: string, record?: ForgedAppRecord | null): Record<string, unknown> {
  if (isValidAppId(appId)) {
    return defaultFreConfig(appId as OotbAppId);
  }
  if (record) {
    return { ...getForgeTemplate(record.templateId as ForgeTemplateId).defaultFreConfig, forgedIntent: record.intent };
  }
  return {};
}
