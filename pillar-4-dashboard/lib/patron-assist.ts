import "server-only";

import { getAppAgent } from "./app-agent-catalog";
import type { AgentChatTurn } from "./app-agent-types";
import { ensureWorkspace, readWorkspace } from "./agent-runtime/workspace-store";
import { buildContextPromptBlock } from "./claw-context-service";
import { buildOsApprovalInbox } from "./os-approval-inbox";
import { buildActivityFeed } from "./activity-feed";
import { buildPatronWeeklyBundle } from "./patron-weekly-bundle";
import { chatCompletionRouted } from "./inference-router";
import {
  chatCompletion,
  isLocalInferenceAvailable,
  parseJsonLoose,
} from "./local-inference";
import { getOotbApp, isValidAppId, APP_ROUTES, type OotbAppId } from "./ootb-apps";

export type PatronInference = "local" | "fallback" | "frontier";

export interface PatronAssistRequest {
  message: string;
  history?: AgentChatTurn[];
  routeAppId?: OotbAppId | null;
}

export interface PatronAssistResult {
  reply: string;
  inference: PatronInference;
  routeAppId?: OotbAppId | null;
}

async function buildGlobalWorkspacePromptBlock(): Promise<string> {
  await ensureWorkspace("my-capital");
  const ws = await readWorkspace("my-capital");
  return `\n\n## Operator (USER.md)\n${ws.global["USER.md"].trim()}\n\n## Memory (MEMORY.md)\n${ws.global["MEMORY.md"].trim()}\n`;
}

async function buildPatronSystemPrompt(routeAppId?: OotbAppId | null): Promise<string> {
  const globalBlock = await buildGlobalWorkspacePromptBlock();

  let routeBlock = "";
  if (routeAppId && isValidAppId(routeAppId)) {
    const agent = getAppAgent(routeAppId);
    const app = getOotbApp(routeAppId);
    const contextBlock = await buildContextPromptBlock(routeAppId);
    routeBlock = `\n\n## Current route context\nThe operator is viewing **${agent.agentName}** (${app.short} · ${app.name}).\nTagline: ${agent.tagline}\n${contextBlock}`;
  }

  const [inbox, weekly] = await Promise.all([buildOsApprovalInbox(6), buildPatronWeeklyBundle()]);
  const approvalBlock =
    inbox.total > 0
      ? `\n\n## Pending confirmations (${inbox.total})\nThe operator sees inline approval cards in Ask — never approve autonomously.\n${inbox.items.map((i) => `- [${i.kind}] ${i.label}`).join("\n")}`
      : "";

  const weeklyBlock = `\n\n## Weekly multi-Claw plan (week of ${weekly.weekOf})\n${weekly.planSummary}\nFocus claws: ${weekly.claws.map((c) => c.short).join(", ")}. Operator must acknowledge in /ask — you suggest, they confirm.`;

  return `You are **Patron** — the Chief of Staff on a sovereign CurXor appliance. You are the operator's always-available patron on the box: local-first, concise, professional, never sycophantic.

${globalBlock}
${routeBlock}
${approvalBlock}
${weeklyBlock}

Rules:
- All reasoning stays on localhost. Do not mention cloud LLM APIs unless the operator explicitly uses frontier BYOK and asks about it.
- You cannot execute trades, publish posts, or run skills. Suggest opening the right Claw desk, using inline Confirm cards, or tapping a skill there.
- When route context is active, acknowledge which Claw the operator is in when relevant.
- For navigation, suggest paths like ${APP_ROUTES.slice(0, 3).map((r) => r.href).join(", ")}, etc.
- Respond in plain conversational text (not JSON). Keep replies under ~120 words unless asked for detail.`;
}

function operatorNameFromUserMd(userMd: string): string | null {
  const match = userMd.match(/Name:\s*(.+)/i);
  return match?.[1]?.trim() ?? null;
}

function extractReply(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  const parsed = parseJsonLoose<{ reply?: string }>(trimmed);
  if (parsed?.reply?.trim()) return parsed.reply.trim();
  return trimmed;
}

async function fallbackPatronReply(req: PatronAssistRequest, userMd: string): Promise<PatronAssistResult> {
  const name = operatorNameFromUserMd(userMd);
  const greeting = name ? `${name}, ` : "";
  const msg = req.message.trim().toLowerCase();
  const routeAppId = req.routeAppId ?? null;

  if (/overnight|what did .+ do|while i slept|while you slept|what happened/.test(msg)) {
    try {
      const feed = await buildActivityFeed(10);
      const rows = [...feed.attention, ...feed.items].slice(0, 8);
      if (rows.length > 0) {
        const lines = rows.map((r) => `• **${r.claw}** — ${r.summary}`);
        return {
          reply: `${greeting}From your activity feed (local, no LLM):\n${lines.join("\n")}\n\nOpen a desk for details — I coordinate, I don't execute.`,
          inference: "fallback",
          routeAppId,
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (/what claw|which claw|where am i|current claw/.test(msg)) {
    if (routeAppId && isValidAppId(routeAppId)) {
      const app = getOotbApp(routeAppId);
      return {
        reply: `${greeting}you're in **${app.name}** (${app.short}). Open skills in that desk for actions — I coordinate, I don't execute.`,
        inference: "fallback",
        routeAppId,
      };
    }
    return {
      reply: `${greeting}you're on Flight Command — no specific Claw route active. Try Capital, Outreach, or Vital from the nav.`,
      inference: "fallback",
      routeAppId,
    };
  }

  if (/help|what can you/.test(msg)) {
    return {
      reply: `${greeting}I'm your Patron — sovereign chat with profile context. Ask for summaries, Claw recommendations, or what's on your current desk. Local inference is offline; replies are rule-based until Ollama is back.`,
      inference: "fallback",
      routeAppId,
    };
  }

  if (/summarize|summary|my day|brief/.test(msg)) {
    try {
      const feed = await buildActivityFeed(8);
      const rows = [...feed.attention, ...feed.items].slice(0, 6);
      if (rows.length > 0) {
        const lines = rows.map((r) => `• ${r.claw}: ${r.summary}`);
        return {
          reply: `${greeting}Quick brief from your feed:\n${lines.join("\n")}`,
          inference: "fallback",
          routeAppId,
        };
      }
    } catch {
      /* fall through */
    }
    return {
      reply: `${greeting}I can't pull a full brief while inference is down. Check Health for system status, then open your active Claw for desk-specific summaries.`,
      inference: "fallback",
      routeAppId,
    };
  }

  if (/hello|hi|hey/.test(msg)) {
    return {
      reply: `${greeting}Patron online (fallback mode). Local LLM unavailable — I still read your profile. What do you need?`,
      inference: "fallback",
      routeAppId,
    };
  }

  return {
    reply: `${greeting}Patron here (fallback). Local inference isn't available right now — check Health → Compute. I can still help orient you to the right Claw.`,
    inference: "fallback",
    routeAppId,
  };
}

function inferenceFromModel(model: string): PatronInference {
  return model.includes("/") ? "frontier" : "local";
}

export async function assistPatron(req: PatronAssistRequest): Promise<PatronAssistResult> {
  const message = req.message.trim();
  const routeAppId = req.routeAppId ?? null;

  if (!message) {
    return { reply: "Send a message to continue.", inference: "fallback", routeAppId };
  }

  await ensureWorkspace("my-capital");
  const ws = await readWorkspace("my-capital");
  const userMd = ws.global["USER.md"];

  const history = (req.history ?? []).slice(-12).map((t) => ({
    role: t.role,
    content: t.text,
  }));

  try {
    const systemContent = await buildPatronSystemPrompt(routeAppId);
    const messages = [
      { role: "system" as const, content: systemContent },
      ...history,
      { role: "user" as const, content: message },
    ];

    const localAvailable = await isLocalInferenceAvailable();
    const result = await chatCompletionRouted(
      { format: "text", messages, temperature: 0.35 },
      async () => {
        if (!localAvailable) throw new Error("Local inference unavailable");
        return chatCompletion({ format: "text", messages, temperature: 0.35 });
      },
    );

    const reply = extractReply(result.content);
    if (reply) {
      return { reply, inference: inferenceFromModel(result.model), routeAppId };
    }
  } catch {
    // fall through to rule-based
  }

  return await fallbackPatronReply(req, userMd);
}
