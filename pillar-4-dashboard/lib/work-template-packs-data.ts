import type { GrowthLevel } from "./os-growth-level";

export interface WorkTemplateItem {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export interface WorkTemplatePack {
  id: string;
  label: string;
  minLevel: GrowthLevel;
  templates: WorkTemplateItem[];
}

export const WORK_TEMPLATE_PACKS: WorkTemplatePack[] = [
  {
    id: "student_opportunities",
    label: "School & applications",
    minLevel: "L1",
    templates: [
      { id: "internship", title: "Internship inquiry", subject: "Internship opportunity", body: "Hi {{name}},\n\nI'm reaching out about internship opportunities at {{company}}. I'd love to learn more about your team.\n\nBest,\n" },
      { id: "club_sponsor", title: "Club sponsor ask", subject: "Partnership with our club", body: "Hello,\n\nOur student club is looking for sponsors. Would {{company}} be open to a short chat?\n\nThanks,\n" },
      { id: "tournament", title: "Tournament organizer", subject: "Event coordination", body: "Hi,\n\nI'm organizing a tournament and wanted to confirm logistics with you.\n\nCheers,\n" },
      { id: "thank_you", title: "Thank-you note", subject: "Thank you", body: "Hi {{name}},\n\nThank you for your time today — I really appreciated the conversation.\n\nBest,\n" },
    ],
  },
  {
    id: "hobby_collab",
    label: "Creator & community",
    minLevel: "L1",
    templates: [
      { id: "creator_collab", title: "Creator collab", subject: "Collab idea", body: "Hey {{name}},\n\nLove your work — want to collab on a small project?\n\n" },
      { id: "community_invite", title: "Community invite", subject: "Join our community", body: "Hi,\n\nWe're building a community around {{topic}}. Would you like to join?\n\n" },
    ],
  },
  {
    id: "etsy_support",
    label: "Shop & orders",
    minLevel: "L2",
    templates: [
      { id: "order_delay", title: "Order delay", subject: "Update on your order", body: "Hi {{name}},\n\nThanks for your order. I wanted to let you know about a slight delay — new ETA is {{date}}.\n\n" },
      { id: "custom_request", title: "Custom request", subject: "Re: your custom request", body: "Hi,\n\nThanks for the custom request! A few quick questions before I quote.\n\n" },
      { id: "review_ask", title: "Review ask", subject: "How was your order?", body: "Hi {{name}},\n\nHope you love your order! If you have a moment, a review would mean a lot.\n\n" },
    ],
  },
  {
    id: "freelance_quote",
    label: "Freelance quotes",
    minLevel: "L2",
    templates: [
      { id: "quote_followup", title: "Quote follow-up", subject: "Following up on my quote", body: "Hi {{name}},\n\nWanted to check if you had questions about the quote I sent.\n\n" },
      { id: "scope_clarify", title: "Scope clarify", subject: "Quick scope question", body: "Hi,\n\nBefore I finalize the proposal, can you confirm scope on {{item}}?\n\n" },
      { id: "invoice_nudge", title: "Invoice nudge", subject: "Friendly invoice reminder", body: "Hi {{name}},\n\nFriendly reminder that invoice #{{id}} is due {{date}}.\n\n" },
    ],
  },
  {
    id: "creator_brand",
    label: "Creator brand deals",
    minLevel: "L2",
    templates: [
      { id: "sponsor_pitch", title: "Sponsor pitch", subject: "Partnership opportunity", body: "Hi,\n\nI create content for {{audience}}. Would love to explore a brand partnership.\n\n" },
      { id: "media_kit", title: "Media kit send", subject: "Media kit", body: "Hi {{name}},\n\nAttached is my media kit with rates and audience stats.\n\n" },
    ],
  },
  {
    id: "nonprofit_donor",
    label: "Donor outreach",
    minLevel: "L3",
    templates: [
      { id: "donor_thanks", title: "Donor thank-you", subject: "Thank you for your support", body: "Dear {{name}},\n\nYour support makes our work possible. Thank you.\n\n" },
      { id: "event_invite", title: "Event invite", subject: "You're invited", body: "Hi,\n\nJoin us on {{date}} for our community event.\n\n" },
      { id: "volunteer_shift", title: "Volunteer shift", subject: "Volunteer shift reminder", body: "Hi {{name}},\n\nReminder: your volunteer shift is {{date}}.\n\n" },
    ],
  },
  {
    id: "advocacy_campaign",
    label: "Advocacy campaign",
    minLevel: "L3",
    templates: [
      { id: "petition", title: "Petition share", subject: "Sign our petition", body: "Hi,\n\nWe're gathering signatures for {{cause}}. Can you sign and share?\n\n" },
      { id: "legislator", title: "Legislator outreach", subject: "Constituent concern", body: "Dear Representative,\n\nI urge you to support {{bill}} because {{reason}}.\n\n" },
      { id: "coalition", title: "Coalition invite", subject: "Join our coalition", body: "Hi,\n\nWe're building a coalition for {{cause}}. Would your org join?\n\n" },
    ],
  },
  {
    id: "solo_client",
    label: "Client acquisition",
    minLevel: "L4",
    templates: [
      { id: "discovery", title: "Discovery call", subject: "Quick discovery call?", body: "Hi {{name}},\n\nWould you be open to a 15-minute discovery call this week?\n\n" },
      { id: "proposal", title: "Proposal send", subject: "Proposal for {{company}}", body: "Hi,\n\nAttached is the proposal we discussed. Happy to walk through it.\n\n" },
      { id: "check_in", title: "Client check-in", subject: "Checking in", body: "Hi {{name}},\n\nWanted to check in on progress and next steps.\n\n" },
    ],
  },
];

const ORGANIZING_PACK: Record<string, string> = {
  school_applications: "student_opportunities",
  shop_orders: "etsy_support",
  gaming_community: "hobby_collab",
  creator_collabs: "creator_brand",
};

const LEVEL_DEFAULT_PACK: Record<GrowthLevel, string> = {
  L1: "student_opportunities",
  L2: "etsy_support",
  L3: "nonprofit_donor",
  L4: "solo_client",
  L5: "solo_client",
};

export function getTemplatePack(packId: string): WorkTemplatePack | undefined {
  return WORK_TEMPLATE_PACKS.find((p) => p.id === packId);
}

export function defaultTemplatePackForGrowth(growth: GrowthLevel, organizingFirst?: unknown): string {
  if (typeof organizingFirst === "string" && ORGANIZING_PACK[organizingFirst]) {
    return ORGANIZING_PACK[organizingFirst];
  }
  return LEVEL_DEFAULT_PACK[growth];
}

export function listTemplatePacksForGrowth(growth: GrowthLevel): WorkTemplatePack[] {
  const order: GrowthLevel[] = ["L1", "L2", "L3", "L4", "L5"];
  const idx = order.indexOf(growth);
  return WORK_TEMPLATE_PACKS.filter((p) => order.indexOf(p.minLevel) <= idx);
}

export type WorkTemplate = WorkTemplateItem;

export interface MiniSequencePreset {
  id: string;
  label: string;
  steps: Array<{ subject: string; body: string; delayDays: number }>;
}

export const MINI_SEQUENCE_PRESETS: MiniSequencePreset[] = [
  {
    id: "polite_followup",
    label: "Polite follow-up",
    steps: [
      { subject: "Following up", body: "Hi {{name}},\n\nJust checking in on my last note — happy to answer questions.\n\n", delayDays: 0 },
      { subject: "Quick bump", body: "Hi again,\n\nWanted to bump this in case it got buried. No pressure either way.\n\n", delayDays: 3 },
    ],
  },
  {
    id: "order_checkin",
    label: "Order check-in",
    steps: [
      { subject: "How is everything?", body: "Hi {{name}},\n\nHope your order arrived well — let me know if you need anything.\n\n", delayDays: 0 },
      { subject: "Review request", body: "Hi,\n\nIf you have a moment, a review would really help my shop.\n\n", delayDays: 5 },
    ],
  },
  {
    id: "collab_nudge",
    label: "Collab nudge",
    steps: [
      { subject: "Collab idea", body: "Hey {{name}},\n\nStill interested in exploring a collab?\n\n", delayDays: 0 },
      { subject: "Last note", body: "Hi — last quick note on the collab idea. Open if timing works.\n\n", delayDays: 4 },
    ],
  },
];
