import "server-only";

import { getAppAgent, type AgentSkill, type AppAgentDefinition } from "./app-agent-catalog";
import type { AgentAssistRequest, AgentAssistResult } from "./app-agent-types";
import {
  chatCompletion,
  generateText,
  isLocalInferenceAvailable,
  parseJsonLoose,
} from "./local-inference";
import { chatCompletionRouted } from "./inference-router";
import type { OotbAppId } from "./ootb-apps";
import { appendMemory, buildWorkspacePromptBlock } from "./agent-runtime/workspace-store";
import { buildSkillsPromptBlock, getResolvedAgent } from "./agent-runtime/skills-loader";
import { buildContextPromptBlock } from "./claw-context-service";

export type { AgentAssistRequest, AgentAssistResult, AgentChatTurn } from "./app-agent-types";

const LLM_CHAT_APPS: OotbAppId[] = [
  "my-work",
  "my-shop",
  "my-content-creator",
  "my-capital",
  "my-vital",
  "my-family",
  "tesla-optimus-engine",
];
const LLM_PLAN_SKILLS: Partial<Record<OotbAppId, string[]>> = {
  "my-work": ["summarize_day"],
  "my-shop": ["ingest_order"],
  "my-content-creator": ["draft_post"],
  "my-capital": ["create_rule"],
};

function cfgStr(config: Record<string, unknown>, key: string, fallback: string): string {
  const v = config[key];
  return typeof v === "string" ? v : fallback;
}

function skillById(appId: OotbAppId, id: string, skills: AgentSkill[]): AgentSkill | undefined {
  return skills.find((s) => s.id === id);
}

async function buildAgentSystemPrompt(agent: AppAgentDefinition, appId: OotbAppId): Promise<string> {
  const resolved = await getResolvedAgent(appId);
  const skills = resolved.skills.map((s) => `${s.id}: ${s.label} — ${s.description}`).join("\n");
  const workspaceBlock = await buildWorkspacePromptBlock(appId);
  const skillsBlock = await buildSkillsPromptBlock(appId);
  return `You are ${agent.agentName} on a sovereign CurXor appliance. ${agent.tagline}
Purpose:
${agent.purpose.map((p) => `- ${p}`).join("\n")}
${workspaceBlock}
${skillsBlock}
Available skills (the operator must tap a skill button to execute — you cannot trade, publish, or call external APIs directly):
${skills}
Rules:
- All reasoning stays on localhost. Never mention cloud LLM APIs.
- For trades or posts, tell the operator which skill to tap (execute_trade, publish_post, etc.).
- Respond with JSON only: {"reply":"string","suggestedSkill":"skill_id_or_null"}`;
}

function isValidSuggestedSkill(agent: AppAgentDefinition, skillId: string | null | undefined): skillId is string {
  if (!skillId) return false;
  return agent.skills.some((s) => s.id === skillId);
}

async function tryLlmAgentChat(
  req: AgentAssistRequest,
  fallback: AgentAssistResult,
): Promise<AgentAssistResult | null> {
  if (!LLM_CHAT_APPS.includes(req.appId)) return null;
  if (!(await isLocalInferenceAvailable())) return null;

  const agent = getAppAgent(req.appId);
  const resolved = await getResolvedAgent(req.appId);
  const message = req.message.trim();
  if (!message) return null;

  const history = (req.history ?? []).slice(-8).map((t) => ({
    role: t.role,
    content: t.text,
  }));

  const configNote = `Config: ${JSON.stringify(req.config ?? {})}`;
  const profileId =
    req.profileId ??
    (typeof req.config?.selectedProfileId === "string" ? req.config.selectedProfileId : null);
  const contextBlock = await buildContextPromptBlock(req.appId, profileId);
  const systemContent = (await buildAgentSystemPrompt(agent, req.appId)) + contextBlock;
  const messages = [
    { role: "system" as const, content: systemContent },
    ...history,
    { role: "user" as const, content: `${message}\n\n${configNote}` },
  ];

  const result = await chatCompletionRouted(
    { format: "json", messages, temperature: 0.25 },
    () => chatCompletion({ format: "json", messages, temperature: 0.25 }),
  );

  const parsed = parseJsonLoose<{ reply?: string; suggestedSkill?: string | null }>(result.content);
  if (!parsed?.reply?.trim()) {
    if (result.content.trim()) {
      return { reply: result.content.trim(), suggestedSkill: fallback.suggestedSkill };
    }
    return null;
  }

  return {
    reply: parsed.reply.trim(),
    suggestedSkill: isValidSuggestedSkill(resolved, parsed.suggestedSkill)
      ? parsed.suggestedSkill
      : fallback.suggestedSkill,
  };
}

async function tryLlmPlanSkill(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
  message: string,
): Promise<string | null> {
  const skills = LLM_PLAN_SKILLS[appId];
  if (!skills?.includes(skillId)) return null;

  if (appId === "my-work" && skillId === "summarize_day") {
    const workspace = cfgStr(config, "workspaceName", "Outreach Desk");
    const task = cfgStr(config, "selectedTaskTitle", "Outreach demo prep");
    const priority = cfgStr(config, "selectedTaskPriority", "P1");
    const prompt =
      message.trim() ||
      `Summarize today's local priorities for ${workspace}. Focus task: ${task} (${priority}).`;
    return generateText(
      "You are Outreach Claw. Output a concise day brief from local calendar, mail queue, and task matrix — no cloud sync.",
      prompt,
    );
  }

  if (appId === "my-shop" && skillId === "ingest_order") {
    const store = cfgStr(config, "storeName", "Arbitrage Desk");
    const orderId = cfgStr(config, "selectedOrderId", "ORD-1042");
    const sku = cfgStr(config, "selectedSku", "GEAR-KIT-A");
    const prompt =
      message.trim() ||
      `Brief margin outlook for ${sku} on order ${orderId} at ${store}. Flag spread risk in one paragraph.`;
    return generateText(
      "You are Arbitrage Claw. Output a short margin/spread brief for local review — no marketplace API calls.",
      prompt,
    );
  }

  if (appId === "my-content-creator" && skillId === "draft_post") {
    const tone = cfgStr(config, "contentTone", "technical");
    const channel = cfgStr(config, "primaryChannel", "x");
    const prompt = message.trim() || `Draft a ${tone} ${channel} post about sovereign edge AI and local Claws.`;
    return generateText(
      `You are Creator Claw. Draft concise social content for local review only — do not include URLs to post.`,
      prompt,
    );
  }

  if (appId === "my-capital" && skillId === "create_rule") {
    const mode = cfgStr(config, "tradingMode", "paper");
    const asset = cfgStr(config, "selectedAsset", "BTC-USD");
    const prompt =
      message.trim() ||
      `Propose one IF/THEN trading rule for ${asset} in ${mode} mode. Keep it conservative.`;
    return generateText(
      `You are Capital Claw. Output a single WHEN/THEN rule block for local evaluation only — no live orders.`,
      prompt,
    );
  }

  return null;
}

function ruleBasedReply(req: AgentAssistRequest): AgentAssistResult {
  const agent = getAppAgent(req.appId);
  const config = req.config ?? {};
  const msg = req.message.trim().toLowerCase();
  const history = req.history ?? [];

  if (!msg) {
    return {
      reply: `${agent.agentName} listening. Try: ${agent.skills.slice(0, 2).map((s) => s.label).join(" · ")} — or ask in plain language.`,
    };
  }

  const combined = `${history.map((h) => h.text).join(" ")} ${msg}`;

  switch (req.appId) {
    case "my-work":
      if (/lead|scrape|outbound|email|sequence|crm/.test(combined)) {
        return {
          reply: `I'll stage a sequence on lane ${cfgStr(config, "clawLane", "A")}. Tap Sort Tray or Move to Tray to publish the next step.`,
          suggestedSkill: "sort_tray",
          activity: "Planned outbound sequence from chat intent",
        };
      }
      if (/focus|priority|today|summarize/.test(combined)) {
        return {
          reply: "Here's your local day brief: 2 synced calendar blocks, 1 P1 task (Outreach Claw demo prep), mail queue indexed offline.",
          suggestedSkill: "summarize_day",
        };
      }
      return {
        reply: `Tracking ${cfgStr(config, "workspaceName", "your desk")}. Ask me to prioritize tasks or draft a cold sequence — all local.`,
        suggestedSkill: "scan_inbox",
      };

    case "my-shop":
      if (/margin|spread|sku|price|ord/.test(combined)) {
        return {
          reply: "Routing to margin watch. Tap Sort SKU when a spread clears your threshold.",
          suggestedSkill: "sort_sku",
          activity: "Arbitrage lane planned",
        };
      }
      if (/ship|bin|ready|fulfill/.test(combined)) {
        return { reply: "Marking order ready for eno2 fulfillment bridge. Tap Ship Bin to complete the pipeline.", suggestedSkill: "ship_bin" };
      }
      return {
        reply: `${cfgStr(config, "storeName", "Arbitrage Desk")} pipeline idle. Ingest an order or name an ORD id to watch spread.`,
        suggestedSkill: "ingest_order",
      };

    case "tesla-optimus-engine":
      if (/feed|signal|alert|trigger|mention/.test(combined)) {
        return { reply: "Signal feed armed. Tap Home Position to reset alert baselines.", suggestedSkill: "home_position" };
      }
      if (/grip|grasp|hand/.test(combined)) {
        return { reply: "Grip test uses current torque envelope. Tap Test Grip when ready.", suggestedSkill: "test_grip" };
      }
      if (/torque|joint|slider/.test(combined)) {
        return { reply: "Apply slider values to mesh with Tune Joint. Safety profile limits enforced locally.", suggestedSkill: "tune_joint" };
      }
      return { reply: `Signal unit ${cfgStr(config, "unitId", "SIG-01")} linked. Adjust thresholds or run RL step.`, suggestedSkill: "rl_step" };

    case "robotaxi-fleet-manager":
      if (/assign|dispatch|send|route|workload/.test(combined)) {
        return {
          reply: "Select a Claw, then Assign Route. Policy: " + cfgStr(config, "dispatchPolicy", "latency") + ".",
          suggestedSkill: "assign_route",
        };
      }
      if (/recall|depot|return|scale/.test(combined)) {
        return { reply: `Recalling to depot ${cfgStr(config, "depotGrid", "A1")}.`, suggestedSkill: "recall_vehicle" };
      }
      if (/latency|ping|health|uptime/.test(combined)) {
        return { reply: "Ping Unit checks mesh RTT. RX-03 lowest latency in mock swarm.", suggestedSkill: "ping_unit" };
      }
      return { reply: "Swarm grid active. Select a Claw unit or ask for rebalance.", suggestedSkill: "rebalance" };

    case "claw-cafe":
      if (/reply|dm|thread|engage|post/.test(combined)) {
        return { reply: "Pick a lane and tap Drop Claw to queue the next engagement.", suggestedSkill: "drop_claw" };
      }
      if (/reset|clear/.test(combined)) {
        return { reply: "Reset Lane clears thread state for selected lane.", suggestedSkill: "reset_lane" };
      }
      if (/photo|picture|booth|capture/.test(combined)) {
        return { reply: "Photo Booth captures current vision_in frame for thread assets.", suggestedSkill: "photo_booth" };
      }
      return { reply: `${cfgStr(config, "kioskName", "Engage Desk")} ready. Start Game on lane A for live demos.`, suggestedSkill: "start_game" };

    case "my-content-creator":
      if (/publish|post|tweet|x\b/.test(combined)) {
        return {
          reply: "Publish routes intent to digital_out — bridge handles X API. LLM never touches internet.",
          suggestedSkill: "publish_post",
        };
      }
      if (/draft|write|script/.test(combined)) {
        return {
          reply: "Draft Post runs local LLM on selected queue item. Tone: " + cfgStr(config, "contentTone", "technical") + ".",
          suggestedSkill: "draft_post",
        };
      }
      if (/schedule|time|queue/.test(combined)) {
        return {
          reply: "Schedule adds post to local cron. Auto-schedule is " + (config.autoSchedule ? "ON" : "OFF") + ".",
          suggestedSkill: "schedule_post",
        };
      }
      return { reply: "Select a post in the queue or ask me to draft for a channel.", suggestedSkill: "draft_post" };

    case "my-capital":
      if (/trade|buy|sell|execute/.test(combined)) {
        return {
          reply: "Execute Trade sends paper order via Alpaca bridge. Mode: " + cfgStr(config, "tradingMode", "paper") + ".",
          suggestedSkill: "execute_trade",
        };
      }
      if (/arm|enable|rule/.test(combined)) {
        return { reply: "Arm Rule enables selected IF/THEN block. Evaluation stays on appliance.", suggestedSkill: "arm_rule" };
      }
      if (/rebalance|alloc/.test(combined)) {
        return { reply: "Rebalance simulates drift correction against target allocation.", suggestedSkill: "rebalance" };
      }
      return { reply: "Capital Claw in paper mode. Ask about watchlist or create a new rule.", suggestedSkill: "create_rule" };

    case "claw-forge":
      if (/forge|create|deploy|provision|add/.test(combined)) {
        return { reply: "Intent captured. Tap + Forge Claw to open the provisioning wizard.", suggestedSkill: "forge_claw" };
      }
      if (/recommend|model|llm|stack/.test(combined)) {
        return { reply: "Recommend Stack analyzes intent + budget tier for local models.", suggestedSkill: "recommend_stack" };
      }
      if (/fleet|list|claws/.test(combined)) {
        return { reply: "List Fleet shows profiles from claw-profiles.json.", suggestedSkill: "list_fleet" };
      }
      return { reply: agent.bootMessage, suggestedSkill: "forge_claw" };

    default:
      return { reply: agent.bootMessage };
  }
}

export async function assistAppAgent(req: AgentAssistRequest): Promise<AgentAssistResult> {
  const config = req.config ?? {};

  if (req.skillId) {
    const resolved = await getResolvedAgent(req.appId);
    const skill = skillById(req.appId, req.skillId, resolved.skills);
    if (!skill) return { reply: "Unknown skill.", activity: undefined };
    return runSkillReply(req.appId, req.skillId, config, skill, req.message);
  }

  const fallback = ruleBasedReply(req);

  try {
    const llm = await tryLlmAgentChat(req, fallback);
    if (llm) return llm;
  } catch {
    /* rule fallback */
  }

  return fallback;
}

async function runSkillReply(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
  skill: AgentSkill,
  message: string,
): Promise<AgentAssistResult> {
  if (skill.kind === "plan") {
    const draft = await tryLlmPlanSkill(appId, skillId, config, message);
    if (draft) {
      if (message.trim().length > 12) {
        await appendMemory(`${appId}/${skillId}: ${message.trim().slice(0, 200)}`);
      }
      return {
        reply: draft,
        activity: `[${skill.label}] generated on local inference`,
        mesh: { kind: "plan", ok: true },
      };
    }
  }

  const { executeSkillMesh } = await import("./skill-executors");
  const meshResult = await executeSkillMesh(appId, skillId, config);

  if (meshResult.kind === "plan" || !meshResult.executed) {
    if (skill.kind === "plan" || meshResult.skipReason === "local-only skill" || meshResult.skipReason === "vision attach is UI-only") {
      return {
        reply: `${skill.label}: completed locally on appliance. See activity log for details.`,
        activity: `[${skill.label}] ${skill.description}`,
        mesh: { kind: "plan", ok: true },
      };
    }
    return {
      reply: `${skill.label}: could not publish to mesh — ${meshResult.skipReason ?? meshResult.motor?.error ?? meshResult.digital?.error ?? "unknown error"}.`,
      activity: `[${skill.label}] mesh publish failed`,
      mesh: {
        kind: meshResult.kind,
        ok: false,
        error: meshResult.skipReason ?? meshResult.motor?.error ?? meshResult.digital?.error,
      },
    };
  }

  if (meshResult.kind === "digital" && meshResult.digital) {
    const ctx = cfgStr(config, "selectedRuleId", "") || cfgStr(config, "selectedOrderId", "");
    const ctxNote = ctx ? ` · ctx ${ctx}` : "";
    return {
      reply: `${skill.label}: intent ${meshResult.digital.id.slice(0, 8)} published to telemetry/digital_out (${meshResult.digital.tool})${ctxNote}. Watch receipts panel.`,
      activity: `[${skill.label}] digital_out · ${meshResult.digital.tool}`,
      mesh: { kind: "digital", ok: true, id: meshResult.digital.id, tool: meshResult.digital.tool },
    };
  }

  if (meshResult.kind === "physical" && meshResult.motor) {
    const ctx =
      cfgStr(config, "selectedOrderId", "") ||
      cfgStr(config, "selectedTaskId", "") ||
      cfgStr(config, "selectedRuleId", "");
    const ctxNote = ctx ? ` · ${ctx}` : "";
    return {
      reply: `${skill.label}: motor seq ${meshResult.motor.seq} queued on telemetry/motor_out (claw ${meshResult.motor.clawId})${ctxNote}. Check live telemetry strip.`,
      activity: `[${skill.label}] motor_out · seq ${meshResult.motor.seq}`,
      mesh: { kind: "physical", ok: true, seq: meshResult.motor.seq },
    };
  }

  return {
    reply: `${skill.label}: mesh action completed.`,
    activity: `[${skill.label}] ${skill.description}`,
    mesh: { kind: meshResult.kind, ok: true },
  };
}
