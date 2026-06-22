import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { publishDigitalIntent } from "./mesh-publish";
import type { WorkLead } from "./work-queue-types";

export async function notifySlackInterestedReply(lead: WorkLead, subject: string): Promise<void> {
  const env = await loadDigitalEnv();
  const token = env.SLACK_BOT_TOKEN?.trim() || process.env.SLACK_BOT_TOKEN?.trim();
  const channel = env.SLACK_DEFAULT_CHANNEL?.trim() || process.env.SLACK_DEFAULT_CHANNEL?.trim();
  if (!token || !channel) return;

  const text = [
    "Outreach Claw · interested reply",
    `${lead.name} (${lead.email}) · ${lead.company}`,
    `Subject: ${subject}`,
    `Stage: ${lead.stage}`,
  ].join("\n");

  await publishDigitalIntent({
    tool: "channel.slack.send",
    payload: { channel, text },
  });
}
