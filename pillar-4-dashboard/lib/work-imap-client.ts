import "server-only";

import { spawn } from "node:child_process";

import { loadDigitalEnv } from "./digital-env";
import { publishDigitalIntent } from "./mesh-publish";
import type { MailIndexEntry, ReplyIntent } from "./work-queue-types";
import { parseReplyForIntent } from "./work-reply-parser";

export async function isWorkImapConfigured(): Promise<boolean> {
  const env = await loadDigitalEnv();
  return Boolean(env.IMAP_HOST?.trim() && env.IMAP_USER?.trim() && env.IMAP_PASS?.trim());
}

export async function buildImapFetchIntent(limit = 25): Promise<{ tool: string; payload: Record<string, unknown> }> {
  return {
    tool: "work.email.fetch",
    payload: { limit, since_days: 7 },
  };
}

interface RawImapMessage {
  id?: string;
  from?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  received_at?: string;
}

export function parseImapMessagesToMailIndex(
  messages: RawImapMessage[],
  leadEmailMap: Map<string, string>,
): MailIndexEntry[] {
  const now = new Date().toISOString();
  return messages.map((m, i) => {
    const from = (m.from ?? "").trim().toLowerCase();
    const subject = m.subject ?? "(no subject)";
    const rawSnippet = m.snippet ?? m.body?.slice(0, 200) ?? "";
    const parsed = parseReplyForIntent(subject, m.body ?? rawSnippet);
    const snippet = parsed.snippet.slice(0, 200) || rawSnippet;
    const leadId = leadEmailMap.get(from) ?? null;
    const intent: ReplyIntent = parsed.intent;
    return {
      id: m.id ?? `IMAP-${i}-${Date.now()}`,
      from,
      subject,
      snippet,
      receivedAt: m.received_at ?? now,
      leadId,
      assignedTo: null,
      matchedReply: Boolean(leadId),
      replyIntent: intent,
    };
  });
}

async function fetchImapViaPython(limit: number): Promise<RawImapMessage[]> {
  const env = await loadDigitalEnv();
  const script = `
import imaplib, email, json, os, sys
from email.header import decode_header

host = os.environ.get("IMAP_HOST", "")
port = int(os.environ.get("IMAP_PORT", "993") or "993")
user = os.environ.get("IMAP_USER", "")
password = os.environ.get("IMAP_PASS", "")
use_tls = os.environ.get("IMAP_USE_TLS", "1").strip().lower() not in ("0", "false", "no")
limit = ${limit}

if not host or not user or not password:
    print("[]")
    sys.exit(0)

try:
    if use_tls:
        conn = imaplib.IMAP4_SSL(host, port)
    else:
        conn = imaplib.IMAP4(host, port)
    conn.login(user, password)
    conn.select("INBOX")
    _, data = conn.search(None, "ALL")
    ids = data[0].split()[-limit:] if data and data[0] else []
    out = []
    for mid in ids:
        _, msg_data = conn.fetch(mid, "(RFC822)")
        if not msg_data or not msg_data[0]:
            continue
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)
        subj = msg.get("Subject", "")
        if isinstance(subj, bytes):
            subj = subj.decode(errors="ignore")
        frm = msg.get("From", "")
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode(errors="ignore")[:500]
                    break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body = payload.decode(errors="ignore")[:500]
        out.append({
            "id": mid.decode() if isinstance(mid, bytes) else str(mid),
            "from": frm,
            "subject": subj,
            "snippet": body[:200],
            "body": body,
        })
    conn.logout()
    print(json.dumps(out))
except Exception:
    print("[]")
`;

  return new Promise((resolve) => {
    const child = spawn("python", ["-c", script], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout?.on("data", (c) => {
      stdout += c.toString();
    });
    child.on("close", () => {
      try {
        const parsed = JSON.parse(stdout.trim() || "[]") as RawImapMessage[];
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch {
        resolve([]);
      }
    });
    child.on("error", () => resolve([]));
  });
}

/** Sync IMAP fetch for scan_inbox — Python inline when configured, else bridge intent. */
export async function fetchImapMailForScan(leadEmailMap: Map<string, string>, limit = 25): Promise<MailIndexEntry[]> {
  if (!(await isWorkImapConfigured())) return [];

  const messages = await fetchImapViaPython(limit);
  if (messages.length > 0) {
    return parseImapMessagesToMailIndex(messages, leadEmailMap);
  }

  const intent = await buildImapFetchIntent(limit);
  await publishDigitalIntent(intent);
  return [];
}
