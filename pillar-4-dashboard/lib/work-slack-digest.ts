import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { publishDigitalIntent } from "./mesh-publish";
import { ensureWorkQueue } from "./work-store";

export async function buildSlackDigest(channel?: string): Promise<string> {
  const file = await ensureWorkQueue();
  const active = file.sequences.filter((s) => s.status === "active").length;
  const replied = file.leads.filter((l) => l.stage === "replied").length;
  const pending = file.sends.filter((s) => s.status === "queued" || s.status === "pending_approval").length;
  const openTasks = file.tasks.filter((t) => !t.done).length;

  return [
    `Outreach desk digest · ${new Date().toLocaleDateString()}`,
    `Active sequences: ${active}`,
    `Replied leads: ${replied}`,
    `Pending sends: ${pending}`,
    `Open tasks: ${openTasks}`,
    channel ? `Channel: ${channel}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendSlackDigest(channel?: string): Promise<{ ok: boolean; demo: boolean; detail: string }> {
  const env = await loadDigitalEnv();
  const token = env.SLACK_BOT_TOKEN?.trim() || process.env.SLACK_BOT_TOKEN?.trim();
  const targetChannel = channel?.trim() || env.SLACK_DEFAULT_CHANNEL?.trim() || process.env.SLACK_DEFAULT_CHANNEL?.trim();
  const text = await buildSlackDigest(targetChannel ?? undefined);

  if (!token || !targetChannel) {
    return { ok: true, demo: true, detail: `Demo digest:\n${text}` };
  }

  const result = await publishDigitalIntent({
    tool: "channel.slack.send",
    payload: { channel: targetChannel, text },
  });

  return {
    ok: result.ok,
    demo: false,
    detail: result.ok ? "Slack digest sent" : (result.error ?? "Slack send failed"),
  };
}
