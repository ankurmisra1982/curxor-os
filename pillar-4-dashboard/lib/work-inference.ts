import "server-only";

import { readAppFreState } from "./app-fre-state";
import { createSequence, ensureWorkQueue, getLead, upsertLead } from "./work-store";
import { sanitizeMailForLlm } from "./work-mail-sanitize";
import { getCrmStatus } from "./work-crm-sync";
import { buildWorkConnectorHealthReport } from "./work-connector-health";
import { fetchWorkCalendarPreview } from "./work-google-client";

export async function draftSequenceWithLlm(input: {
  leadId?: string;
  prompt?: string;
  name?: string;
}): Promise<{ sequenceId: string; steps: number }> {
  const file = await ensureWorkQueue();
  const fre = await readAppFreState("my-work");
  const lead =
    (input.leadId ? file.leads.find((l) => l.id === input.leadId) : null) ??
    file.leads.find((l) => l.stage === "new") ??
    file.leads[0];

  if (!lead && input.prompt?.includes("@")) {
    const email = input.prompt.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? "";
    if (email) {
      const created = await upsertLead({ name: email.split("@")[0] ?? "Prospect", email });
      return draftSequenceWithLlm({ ...input, leadId: created.id });
    }
  }

  const leadId = lead?.id ?? (await upsertLead({ name: "New prospect", email: "prospect@example.com" })).id;
  const company = lead?.company || "your company";
  const tone = typeof fre.config.outreachTone === "string" ? fre.config.outreachTone : "direct";
  const sanitizedPrompt = input.prompt ? sanitizeMailForLlm("", input.prompt).body : "";

  const steps =
    tone === "warm"
      ? [
          {
            delayDays: 0,
            subject: `Quick idea for ${company}`,
            body: `Hi {{name}} — noticed ${company} is scaling outbound. We run sovereign Creator + Outreach on bare metal. Worth a quick look?`,
          },
          {
            delayDays: 4,
            subject: "Following up",
            body: `Hi {{name}} — happy to share how we pause sequences on reply and keep CRM local. Open to 10 minutes this week?`,
          },
        ]
      : [
          {
            delayDays: 0,
            subject: `{{company}} + local outbound stack`,
            subjectAlt: "{{name}}, quick question on outbound",
            body: `Hi {{name}} — CurXor Outreach runs sequences on-appliance with zero SaaS rent. Interested in a demo?`,
          },
          {
            delayDays: 3,
            subject: "Re: local outbound",
            body: `{{name}} — following up once. We auto-pause on reply and index mail offline. Still relevant?`,
          },
          {
            delayDays: 5,
            subject: "Last note",
            body: `Closing the loop — if timing is off, no worries. Reply anytime if sovereign outbound becomes a priority.`,
          },
        ];

  const seq = await createSequence({
    name: input.name ?? `Sequence · ${lead?.name ?? "prospect"}${sanitizedPrompt ? " · reply context" : ""}`,
    leadId,
    steps,
  });

  return { sequenceId: seq.id, steps: seq.steps.length };
}

export async function buildDayBrief(): Promise<string> {
  const [file, calendar, crm, vault] = await Promise.all([
    ensureWorkQueue(),
    fetchWorkCalendarPreview(5),
    getCrmStatus(),
    buildWorkConnectorHealthReport(),
  ]);

  const openTasks = file.tasks.filter((t) => !t.done);
  const active = file.sequences.filter((s) => s.status === "active");
  const replied = file.leads.filter((l) => l.stage === "replied");
  const notionSync = (file.syncLog ?? []).find((e) => e.connector === "notion");
  const googleLinked = vault.connectors.find((c) => c.id === "google_workspace")?.configured;

  const lines = [
    `Outreach day brief v2 · ${new Date().toLocaleDateString()}`,
    "",
    `Open tasks: ${openTasks.length} (${openTasks.filter((t) => t.priority === "P1").length} P1)`,
    `Active sequences: ${active.length}`,
    `Replied leads: ${replied.length}`,
    "",
    `Connectors: ${vault.summary.ready}/${vault.summary.total} ready`,
    `Google calendar: ${calendar.events.length} events (${calendar.source})${googleLinked ? " · linked" : ""}`,
    `CRM backend: ${crm.backend}${crm.demo ? " (demo)" : ""}`,
    notionSync ? `Notion: ${notionSync.detail}` : "Notion: no recent sync",
    "",
  ];

  if (openTasks[0]) lines.push(`Top task: ${openTasks[0].title}`);
  if (replied[0]) lines.push(`Hot lead: ${replied[0].name} (${replied[0].company}) — follow up`);
  if (active[0]) {
    const step = active[0].steps[active[0].currentStepIndex];
    lines.push(`Next send: ${active[0].name}${step?.scheduledAt ? ` @ ${step.scheduledAt}` : ""}`);
  }

  return lines.join("\n");
}

export async function draftReplyWithLlm(input: {
  mailId?: string;
  leadId?: string;
  prompt?: string;
}): Promise<{ subject: string; body: string; leadId: string | null }> {
  const file = await ensureWorkQueue();
  const mail = input.mailId ? file.mailIndex.find((m) => m.id === input.mailId) : null;
  const lead =
    (input.leadId ? file.leads.find((l) => l.id === input.leadId) : null) ??
    (mail?.leadId ? file.leads.find((l) => l.id === mail.leadId) : null) ??
    file.leads[0] ??
    null;

  const rawSubject = mail?.subject ? `Re: ${mail.subject.replace(/^Re:\s*/i, "")}` : "Re: your note";
  const rawBody = mail?.snippet ?? input.prompt ?? "Thanks for reaching out.";
  const sanitized = sanitizeMailForLlm(rawSubject, rawBody);

  const name = lead?.name.split(" ")[0] ?? "there";
  const body = [
    `Hi ${name},`,
    "",
    sanitized.body.includes("interested") || sanitized.body.includes("schedule")
      ? "Great to hear — happy to find time this week. What does your calendar look like?"
      : "Thanks for the note — let me know if sovereign outbound is still on your radar.",
    "",
    "Best,",
    "Outreach Desk",
  ].join("\n");

  return { subject: sanitized.subject, body, leadId: lead?.id ?? null };
}
