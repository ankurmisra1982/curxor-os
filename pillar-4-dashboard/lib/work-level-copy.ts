import type { GrowthLevel } from "./os-growth-level";

export type WorkTermKey =
  | "lead"
  | "leadPlural"
  | "pipeline"
  | "sequence"
  | "outbound"
  | "crm"
  | "smtp"
  | "goLive"
  | "addLead"
  | "deskSubtitle";

const TERMS: Record<WorkTermKey, Record<GrowthLevel, string>> = {
  lead: {
    L1: "Opportunity",
    L2: "Inquiry",
    L3: "Lead",
    L4: "Lead",
    L5: "Contact",
  },
  leadPlural: {
    L1: "Opportunities",
    L2: "Inquiries",
    L3: "Leads",
    L4: "Leads",
    L5: "Contacts",
  },
  pipeline: {
    L1: "Opportunities",
    L2: "Inquiries",
    L3: "Pipeline",
    L4: "Pipeline",
    L5: "Pipeline",
  },
  sequence: {
    L1: "Follow-up plan",
    L2: "Follow-up sequence",
    L3: "Sequence",
    L4: "Sequence",
    L5: "Sequence",
  },
  outbound: {
    L1: "Sent messages",
    L2: "Outbound queue",
    L3: "Outbound queue",
    L4: "Outbound queue",
    L5: "Outbound queue",
  },
  crm: {
    L1: "People you're talking to",
    L2: "Customer list",
    L3: "CRM",
    L4: "CRM",
    L5: "CRM",
  },
  smtp: {
    L1: "Email setup (optional)",
    L2: "Email bridge",
    L3: "Email bridge",
    L4: "SMTP bridge",
    L5: "SMTP bridge",
  },
  goLive: {
    L1: "Get set up",
    L2: "Get set up",
    L3: "Go Live",
    L4: "Go Live",
    L5: "Go Live",
  },
  addLead: {
    L1: "+ Opportunity",
    L2: "+ Inquiry",
    L3: "+ Lead",
    L4: "+ Lead",
    L5: "+ Contact",
  },
  deskSubtitle: {
    L1: "Stay on top of messages and opportunities",
    L2: "Track buyers, collabs, and follow-ups",
    L3: "Campaigns, comms, and safe sending",
    L4: "Revenue outreach on sovereign hardware",
    L5: "Executive signal and governance",
  },
};

export function workTerm(growth: GrowthLevel, key: WorkTermKey): string {
  return TERMS[key][growth];
}
