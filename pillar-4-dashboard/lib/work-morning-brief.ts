import "server-only";

import { fetchWorkCalendarPreview, fetchWorkMailPreview } from "./work-google-client";
import { fetchWorkMicrosoftCalendarPreview, fetchWorkMicrosoftMailPreview, getWorkMicrosoftStatus } from "./work-microsoft-client";
import { isWorkMicrosoftLinked } from "./work-microsoft-oauth";
import { ensureWorkQueue, readOutboundKillSwitch } from "./work-store";
import { getCrmStatus } from "./work-crm-sync";
import { buildWorkConnectorHealthReport } from "./work-connector-health";
import { buildNeedsYouSummary } from "./work-needs-you";

const CROSS_CLAW_DEMO = {
  contentOpenPosts: 2,
  capitalOpenAlerts: 1,
};

export async function buildMorningBrief(): Promise<string> {
  const m365Linked = await isWorkMicrosoftLinked();
  const [file, mail, calendar, crm, vault, needsYou, killSwitch, m365] = await Promise.all([
    ensureWorkQueue(),
    m365Linked ? fetchWorkMicrosoftMailPreview(5) : fetchWorkMailPreview(5),
    m365Linked ? fetchWorkMicrosoftCalendarPreview(5) : fetchWorkCalendarPreview(5),
    getCrmStatus(),
    buildWorkConnectorHealthReport(),
    buildNeedsYouSummary(),
    readOutboundKillSwitch(),
    getWorkMicrosoftStatus(),
  ]);

  const openTasks = file.tasks.filter((t) => !t.done);
  const p1 = openTasks.filter((t) => t.priority === "P1");

  const lines = [
    `Morning brief · ${new Date().toLocaleDateString()}`,
    "",
    `Tasks: ${openTasks.length} open (${p1.length} P1)`,
    `Needs you: ${needsYou.total} (${needsYou.pendingApprovals} approvals · ${needsYou.interestedMail} interested mail)`,
    `Pipeline: ${file.leads.filter((l) => !["won", "lost"].includes(l.stage)).length} active leads`,
    `Sequences: ${file.sequences.filter((s) => s.status === "active").length} running`,
    "",
    `Mail (${mail.source}): ${mail.messages.length} recent`,
  ];

  for (const m of mail.messages.slice(0, 3)) {
    lines.push(`  · ${m.from}: ${m.subject}`);
  }

  if (!m365Linked && (m365.demo || m365.linked)) {
    const m365Mail = await fetchWorkMicrosoftMailPreview(3);
    lines.push("", `Microsoft 365 (${m365Mail.source}): ${m365Mail.messages.length} preview`);
    for (const m of m365Mail.messages.slice(0, 2)) {
      lines.push(`  · ${m.from}: ${m.subject}`);
    }
  }

  lines.push("", `Calendar (${calendar.source}): ${calendar.events.length} upcoming`);
  for (const e of calendar.events.slice(0, 3)) {
    lines.push(`  · ${new Date(e.startAt).toLocaleTimeString()} — ${e.title}`);
  }

  lines.push("", `CRM: ${crm.backend} · ${crm.demo ? "demo" : "live"} · ${crm.localLeads} local`);
  lines.push(`Connectors: ${vault.summary.ready}/${vault.summary.total} ready`);

  const crossClaw = file.leads.filter((l) => l.tags?.some((t) => t.startsWith("handoff:")));
  if (crossClaw.length > 0) {
    lines.push("", `Cross-Claw handoffs: ${crossClaw.length} open`);
    for (const lead of crossClaw.slice(0, 3)) {
      lines.push(`  · ${lead.name} (${lead.source})`);
    }
  }
  lines.push(
    "",
    `Cross-Claw: Creator ${CROSS_CLAW_DEMO.contentOpenPosts} posts to review · Capital ${CROSS_CLAW_DEMO.capitalOpenAlerts} alert(s)`,
  );

  if (killSwitch) lines.push("", "⚠ Outbound kill switch ON");
  if (file.sends.some((s) => s.status === "pending_approval")) {
    lines.push(`Approvals: ${file.sends.filter((s) => s.status === "pending_approval").length} send(s) awaiting review`);
  }

  if (p1[0]) lines.push("", `Top P1: ${p1[0].title}`);

  return lines.join("\n");
}

export async function buildPrepMeetingBrief(attendeeEmail?: string): Promise<string> {
  const file = await ensureWorkQueue();
  const email = attendeeEmail?.trim().toLowerCase();
  const lead = email ? file.leads.find((l) => l.email.toLowerCase() === email) : file.leads.find((l) => l.stage === "replied");

  const [mail, calendar] = await Promise.all([fetchWorkMailPreview(10), fetchWorkCalendarPreview(10)]);

  const lines = [
    `Meeting prep · ${new Date().toLocaleDateString()}`,
    "",
  ];

  if (lead) {
    lines.push(`Lead: ${lead.name} (${lead.company}) · stage ${lead.stage}`);
    lines.push(`Notes: ${lead.notes || "—"}`);
    const seq = file.sequences.find((s) => s.leadId === lead.id && s.status === "active");
    if (seq) lines.push(`Active sequence: ${seq.name} · step ${seq.currentStepIndex + 1}/${seq.steps.length}`);
  } else {
    lines.push("No matching lead — add attendee email to CRM first.");
  }

  const relatedMail = mail.messages.filter((m) => !email || m.from.toLowerCase().includes(email.split("@")[0] ?? ""));
  lines.push("", `Related mail (${mail.source}):`);
  for (const m of relatedMail.slice(0, 3)) {
    lines.push(`  · ${m.subject} — ${m.snippet.slice(0, 80)}`);
  }

  const nextEvent = calendar.events[0];
  if (nextEvent) {
    lines.push("", `Next calendar: ${nextEvent.title} @ ${new Date(nextEvent.startAt).toLocaleString()}`);
  }

  return lines.join("\n");
}
