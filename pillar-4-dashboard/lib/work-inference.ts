import "server-only";

import { readAppFreState } from "./app-fre-state";
import { createSequence, ensureWorkQueue, upsertLead } from "./work-store";

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
    name: input.name ?? `Sequence · ${lead?.name ?? "prospect"}`,
    leadId,
    steps,
  });

  return { sequenceId: seq.id, steps: seq.steps.length };
}

export async function buildDayBrief(): Promise<string> {
  const file = await ensureWorkQueue();
  const openTasks = file.tasks.filter((t) => !t.done);
  const active = file.sequences.filter((s) => s.status === "active");
  const replied = file.leads.filter((l) => l.stage === "replied");

  const lines = [
    `Outreach day brief · ${new Date().toLocaleDateString()}`,
    "",
    `Open tasks: ${openTasks.length} (${openTasks.filter((t) => t.priority === "P1").length} P1)`,
    `Active sequences: ${active.length}`,
    `Replied leads: ${replied.length}`,
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
