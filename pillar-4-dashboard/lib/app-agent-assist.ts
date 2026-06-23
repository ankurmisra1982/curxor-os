import "server-only";

import { getAppAgent, type AgentSkill, type AppAgentDefinition } from "./app-agent-catalog";
import { resolveAppAgent } from "./forged-agent-resolve";
import type { ResolvedAppAgent } from "./forged-agent-catalog";
import { isValidAppId, type OotbAppId } from "./ootb-apps";
import { isForgedAppId, isWorkspaceAppId, type WorkspaceAppId } from "./workspace-app-id";
import {
  chatCompletion,
  generateText,
  isLocalInferenceAvailable,
  parseJsonLoose,
} from "./local-inference";
import { chatCompletionRouted } from "./inference-router";
import type { AgentAssistRequest, AgentAssistResult } from "./app-agent-types";
import { appendMemory, buildWorkspacePromptBlock } from "./agent-runtime/workspace-store";
import { buildSkillsPromptBlock, getResolvedAgent } from "./agent-runtime/skills-loader";
import { buildContextPromptBlock } from "./claw-context-service";
import { isPreviewApp, previewAgentPromptBlock } from "./claw-preview-apps";
import { longevityPreviewReply, VITAL_LONGEVITY_DISCLAIMER } from "./vital-longevity-knowledge";

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
  "my-shop": ["ingest_order"],
  "my-content-creator": ["draft_post"],
  "my-capital": ["create_rule", "arm_rule", "run_demo_tour", "execute_now", "portfolio_query", "research_ticker", "create_rule_from_thesis", "preview_trade", "agent_execute_trade", "rebalance"],
  "my-vital": ["update_protocol"],
};

function cfgStr(config: Record<string, unknown>, key: string, fallback: string): string {
  const v = config[key];
  return typeof v === "string" ? v : fallback;
}

function skillById(appId: OotbAppId, id: string, skills: AgentSkill[]): AgentSkill | undefined {
  return skills.find((s) => s.id === id);
}

async function buildAgentSystemPrompt(
  agent: AppAgentDefinition | ResolvedAppAgent,
  appId: WorkspaceAppId,
): Promise<string> {
  const resolved = await getResolvedAgent(appId);
  const skills = resolved.skills.map((s) => `${s.id}: ${s.label} — ${s.description}`).join("\n");
  const workspaceBlock = await buildWorkspacePromptBlock(appId);
  const skillsBlock = await buildSkillsPromptBlock(appId);
  const previewBlock =
    isValidAppId(appId) && isPreviewApp(appId) ? previewAgentPromptBlock(agent.agentName) : "";
  return `You are ${agent.agentName} on a sovereign CurXor appliance. ${agent.tagline}
Purpose:
${agent.purpose.map((p) => `- ${p}`).join("\n")}
${previewBlock}
${workspaceBlock}
${skillsBlock}
Available skills (the operator must tap a skill button to execute — you cannot trade, publish, or call external APIs directly):
${skills}
Rules:
- All reasoning stays on localhost. Never mention cloud LLM APIs.
- For trades or posts, tell the operator which skill to tap (execute_trade, publish_post, etc.).
- Respond with JSON only: {"reply":"string","suggestedSkill":"skill_id_or_null"}`;
}

function isValidSuggestedSkill(agent: AppAgentDefinition | ResolvedAppAgent, skillId: string | null | undefined): skillId is string {
  if (!skillId) return false;
  return agent.skills.some((s) => s.id === skillId);
}

async function tryLlmAgentChat(
  req: AgentAssistRequest,
  fallback: AgentAssistResult,
): Promise<AgentAssistResult | null> {
  if (!LLM_CHAT_APPS.includes(req.appId as OotbAppId) && !isForgedAppId(req.appId)) return null;
  if (!(await isLocalInferenceAvailable())) return null;

  const agent = isForgedAppId(req.appId)
    ? await resolveAppAgent(req.appId)
    : getAppAgent(req.appId as OotbAppId);
  const resolved = isWorkspaceAppId(req.appId) ? await getResolvedAgent(req.appId) : null;
  const message = req.message.trim();
  if (!message || !resolved) return null;

  const history = (req.history ?? []).slice(-8).map((t) => ({
    role: t.role,
    content: t.text,
  }));

  const configNote = `Config: ${JSON.stringify(req.config ?? {})}`;
  const profileId =
    req.profileId ??
    (typeof req.config?.selectedProfileId === "string" ? req.config.selectedProfileId : null);
  const contextBlock =
    isValidAppId(req.appId) ? await buildContextPromptBlock(req.appId, profileId) : "";
  const systemContent = (await buildAgentSystemPrompt(agent, req.appId as WorkspaceAppId)) + contextBlock;
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
    const title = cfgStr(config, "selectedPostTitle", "");
    const { platformFormatSpec } = await import("./content-platform-format");
    const { getSocialChannel, isSocialPlatform } = await import("./social-channels");
    const platform = isSocialPlatform(channel) ? channel : "x";
    const spec = platformFormatSpec(platform);
    const topic = title ? `about "${title}"` : "about sovereign edge AI and local Claws";
    const prompt = message.trim() || `Draft a ${tone} ${getSocialChannel(platform).name} post ${topic}.`;
    return generateText(
      `You are Creator Claw. Draft social content for local review only — no URLs. Platform: ${getSocialChannel(platform).name}. Max ${spec.charLimit ?? 2000} chars. ${spec.lineOneRule ?? ""} ${spec.hashtagHint ?? ""}`.trim(),
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

  if (appId === "my-vital" && skillId === "update_protocol") {
    const focus = cfgStr(config, "longevityFocus", "metabolic");
    const prompt =
      message.trim() ||
      `Suggest 3–4 longevity protocol steps for ${focus} focus — sleep, movement, nutrition, optional labs. Educational only.`;
    return generateText(
      "You are Vital Claw. Output concise protocol steps for local review — not medical advice. Reference evidence-based habits (sleep window, Zone 2, protein-forward meals).",
      prompt,
    );
  }

  return null;
}

function ruleBasedReply(req: AgentAssistRequest, agent: AppAgentDefinition | ResolvedAppAgent): AgentAssistResult {
  const config = req.config ?? {};
  const msg = req.message.trim().toLowerCase();
  const history = req.history ?? [];

  if (isForgedAppId(req.appId)) {
    if (!msg) {
      return {
        reply: `${agent.agentName} listening on your forged desk. Tap a skill or describe the next move.`,
      };
    }
    const combined = `${history.map((h) => h.text).join(" ")} ${msg}`.toLowerCase();
    const skill = agent.skills.find((s) => combined.includes(s.id.replace(/_/g, " ")));
    if (skill) {
      return { reply: `Ready to run **${skill.label}**. Tap the skill button to execute.`, suggestedSkill: skill.id };
    }
    return {
      reply: `${agent.agentName}: noted. Use skills for explicit actions — chat stays local on your metal.`,
    };
  }

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
          reply:
            "Preview margin watch — local spread demo only. Tap Ingest Order for a brief or unlock Sort SKU at Flipper level.",
          suggestedSkill: "ingest_order",
          activity: "Margin watch (preview)",
        };
      }
      if (/ship|bin|ready|fulfill/.test(combined)) {
        return {
          reply: "Ship Bin is preview-only until L3 Operator — demo pipeline, no eno2 fulfillment egress yet.",
          suggestedSkill: "ingest_order",
        };
      }
      return {
        reply: `${cfgStr(config, "storeName", "Arbitrage Desk")} preview idle. Ingest Order is the demo skill at Scout level — no live marketplace.`,
        suggestedSkill: "ingest_order",
      };

    case "tesla-optimus-engine":
      if (/pair|fleet|rover|mobile|arm|bluetooth|mesh|discover|wizard/.test(combined)) {
        return {
          reply: "Fleet tab — add robot slots, run Pair day wizard (preview). Simulated BLE + motor handshake on appliance.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/audit|pair.day|pair day|memory pack|what will.*know|inherit|package summary/.test(combined)) {
        return {
          reply:
            "Knowledge tab — scroll to Pair-day memory audit · View audit. Shows rules, Kin policies, armed routines, fleet, and CCP consent before hardware pairs.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/policy|per.member|kitchen|bedroom|greet by name|tone.*kin|child.*robot|guest.*robot/.test(combined)) {
        return {
          reply:
            "Knowledge tab · Kin-aware robot policy — per-member tone, kitchen/bedroom boundaries, ask-first zones. Changes sync on Push to mesh.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/compose|natural language|plain language|describe.*routine|write.*routine|custom routine/.test(combined)) {
        return {
          reply:
            "Routines tab · Compose routine — describe in plain language, then Compose & arm. Also toggle built-in templates like morning welcome.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/rule|teach|know|learn|house|guest|family|kin|remember|instruction/.test(combined)) {
        return {
          reply:
            "Knowledge tab — Kin-aware policies + house rules, then Push to mesh. Run View audit to preview the full pair-day memory package.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/routine|morning|quiet|welcome|schedule|daily/.test(combined)) {
        return {
          reply:
            "Routines tab — arm templates or Compose & arm from plain language. They execute on pair day after you push knowledge.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/name|call me|relationship|intro/.test(combined)) {
        return {
          reply: "Home tab — set robot name and what it calls you. Save relationship, then push knowledge to mesh.",
          suggestedSkill: "push_knowledge",
        };
      }
      if (/optimus|motor|mesh|grip|torque|joint|hardware|robot|control|move/.test(combined)) {
        if (/grip|grasp|hand/.test(combined)) {
          return {
            reply: "Control tab · mesh preview. Grip test uses torque envelope — not live hardware until paired.",
            suggestedSkill: "test_grip",
          };
        }
        if (/torque|joint|slider/.test(combined)) {
          return {
            reply: "Control tab · tune sliders then Tune Joint. Preview only until your humanoid connects.",
            suggestedSkill: "tune_joint",
          };
        }
        return {
          reply: "Control tab · Home Position is the safe preview homing skill. Pair day enables real motion.",
          suggestedSkill: "home_position",
        };
      }
      if (/sleep|health|vital|context|ccp|mesh|who/.test(combined)) {
        return {
          reply: "I read Kin + Vital from CCP locally. Push Knowledge packages that for robot memory on pair day.",
          suggestedSkill: "sync_context",
        };
      }
      return {
        reply: `Humanoid Home Hub preview · ${cfgStr(config, "unitId", "Home Humanoid")}. Home → relationship · Knowledge → Kin policy + audit + rules · Routines → compose · Fleet → pair wizard.`,
        suggestedSkill: "push_knowledge",
      };

    case "robotaxi-fleet-manager":
      if (/tesla|robotaxi|autonomous|acquire|vin|vehicle fleet/.test(combined)) {
        return {
          reply:
            "Robotaxi fleet is preview-only today — use the grid and simulators to train dispatch. Tesla VIN roster, utilization, and live autonomous ops ship on the horizon tab (Coming Soon). No live pairing yet.",
          suggestedSkill: "rebalance",
        };
      }
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
        return { reply: "Ping Unit checks mesh RTT on the selected Claw.", suggestedSkill: "ping_unit" };
      }
      if (/forge|profile|mint|list/.test(combined)) {
        return { reply: "Forge roster loads from claw-profiles.json — mint Claws in The Forge first.", suggestedSkill: "rebalance" };
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
      if (/thumbnail|thumb|image|vision|frame/.test(combined)) {
        return {
          reply: "Capture Thumbnail (vision) or AI Image (Ollama flux) for IG/Pinterest/TikTok covers.",
          suggestedSkill: "generate_ai_image",
        };
      }
      if (/ai image|generate image|flux|sd\b/.test(combined)) {
        return {
          reply: "AI Image runs local Ollama image model — requires CURXOR_IMAGE_MODEL (e.g. flux).",
          suggestedSkill: "generate_ai_image",
        };
      }
      if (/video|render|ffmpeg|short|reel|tts|voice/.test(combined)) {
        return {
          reply: "Render Video builds 9:16 mp4 from thumbnail with TTS voiceover (espeak-ng/piper) when available.",
          suggestedSkill: "render_video",
        };
      }
      if (/adapt|multi|all channel|format|rewrite/.test(combined)) {
        return {
          reply: "Adapt All rewrites your master draft per FRE channel with platform-specific limits and hashtags.",
          suggestedSkill: "adapt_for_platforms",
        };
      }
      if (/fan out|cross post|every channel/.test(combined)) {
        return { reply: "Fan Out creates separate queue posts for each FRE channel.", suggestedSkill: "fan_out_channels" };
      }
      if (/batch|publish all/.test(combined)) {
        return { reply: "Batch Publish sends all media-ready queue posts via digital bridges.", suggestedSkill: "batch_publish" };
      }
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
      if (/demo tour|first fill|setup wizard|getting started/.test(combined)) {
        return {
          reply: "Demo tour creates a rule, arms it, and logs a simulated fill — no broker keys required.",
          suggestedSkill: "run_demo_tour",
        };
      }
      if (/execute now|fire now|execute armed/.test(combined)) {
        return {
          reply: "Execute now fires the first armed rule through the local risk guard.",
          suggestedSkill: "execute_now",
        };
      }
      if (/exposure|portfolio health|how many trades|pending approval|armed rule|buying power|portfolio value/.test(combined)) {
        return {
          reply: "Portfolio Q&A reads desk state — exposure, health, rules, and pending trades.",
          suggestedSkill: "portfolio_query",
        };
      }
      if (/thesis|smart take|dip rule|from intel/.test(combined)) {
        const sym = cfgStr(config, "selectedAsset", "SPY");
        return {
          reply: `Creating a rule from ${sym} research thesis — dip or manual buy based on sentiment.`,
          suggestedSkill: "create_rule_from_thesis",
        };
      }
      if (/research|intel|chatter|headline|news|wsb|cnbc/.test(combined)) {
        const sym = cfgStr(config, "selectedAsset", "SPY");
        return {
          reply: `Pulling intel for ${sym} — fundamentals, Alpaca/CNBC/SEC news, and WSB chatter with a smart take.`,
          suggestedSkill: "research_ticker",
        };
      }
      if (/pilot|copy|subscribe|mirror/.test(combined)) {
        return {
          reply: "Browse pilots on the marketplace — subscribe to mirror proportional paper trades on the sovereign bridge.",
          suggestedSkill: "subscribe_pilot",
        };
      }
      if (/sync pilot|rebalance pilot/.test(combined)) {
        return { reply: "Syncing active pilot subscriptions against latest signals.", suggestedSkill: "sync_pilots" };
      }
      if (/trade|buy|sell|execute/.test(combined)) {
        if (/preview|review|simulate/.test(combined)) {
          return {
            reply: "Preview Trade runs review_equity_order — notional, risk note, auto-approve check before execute.",
            suggestedSkill: "preview_trade",
          };
        }
        return {
          reply: "Agent Execute uses preview → confirm pipeline. Mode: " + cfgStr(config, "tradingMode", "paper") + ".",
          suggestedSkill: "agent_execute_trade",
        };
      }
      if (/arm|enable|rule/.test(combined)) {
        return { reply: "Arm Rule enables selected IF/THEN block. Evaluation stays on appliance.", suggestedSkill: "arm_rule" };
      }
      if (/rebalance|alloc|drift|concentration/.test(combined)) {
        return {
          reply: "Creating an armed rebalance rule from portfolio health hints — evaluates on heartbeat when drift exceeds threshold.",
          suggestedSkill: "rebalance",
        };
      }
      return { reply: "Capital Claw in paper mode. Ask about watchlist or create a new rule.", suggestedSkill: "create_rule" };

    case "my-vital": {
      const preview = longevityPreviewReply(combined);
      if (preview) {
        return {
          reply: `${preview}\n\nOpen the Ask / Lab tab for more preview Q&A. ${VITAL_LONGEVITY_DISCLAIMER}`,
          suggestedSkill: "ask_longevity",
        };
      }
      if (/sync|wearable|oura|garmin|samsung|fitbit|whoop/.test(combined)) {
        return {
          reply: "Connect bridges on the Bridges tab, then tap Sync Wearables. Live pulls ship with eno2 health sync.",
          suggestedSkill: "sync_wearables",
        };
      }
      if (/protocol|update|sleep window|zone 2|nutrition step/.test(combined)) {
        return {
          reply: "Review Protocol tab or tap Update Protocol to regenerate steps locally from your FRE focus.",
          suggestedSkill: "update_protocol",
        };
      }
      if (/report|lab result|pdf|ingest/.test(combined)) {
        return {
          reply: "Medical reports stay in your on-box vault — use Ingest Report or the Reports tab at Optimizer level.",
          suggestedSkill: "ingest_report",
        };
      }
      if (/mesh|ccp|publish|optimus|kin|share health/.test(combined)) {
        return {
          reply: "Health context publishes to Claw Context only when you tap Publish — never auto-egress.",
          suggestedSkill: "publish_context",
        };
      }
      if (/sinclair|johnson|blueprint|don'?t die|attia|huberman|longevity|aging|nad|healthspan/.test(combined)) {
        return {
          reply: `Longevity Lab is live — open the Lab tab for personalized Q&A, protocol diff, and literature search. ${VITAL_LONGEVITY_DISCLAIMER}`,
          suggestedSkill: "ask_longevity",
        };
      }
      return {
        reply: "Vital Claw — open Lab for longevity Q&A against your vitals, or use Protocol / Bridges tabs.",
        suggestedSkill: "ask_longevity",
      };
    }

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
  const agent = isForgedAppId(req.appId)
    ? await resolveAppAgent(req.appId)
    : getAppAgent(req.appId as OotbAppId);

  if (req.skillId) {
    if (!isWorkspaceAppId(req.appId)) {
      return { reply: "Unknown app.", activity: undefined };
    }
    const resolved = await getResolvedAgent(req.appId);
    const skill = resolved.skills.find((s) => s.id === req.skillId);
    if (!skill) return { reply: "Unknown skill.", activity: undefined };
    if (isForgedAppId(req.appId)) {
      const { executeSkillMesh } = await import("./skill-executors");
      const meshResult = await executeSkillMesh(req.appId, req.skillId, config);
      return {
        reply:
          meshResult.skipReason ??
          `**${skill.label}** completed on your forged desk.`,
        suggestedSkill: skill.id,
        activity: `Forged skill · ${skill.id} · ${meshResult.skipReason ?? "ok"}`,
        mesh: { kind: meshResult.kind, ok: meshResult.executed !== false },
      };
    }
    return runSkillReply(req.appId as OotbAppId, req.skillId, config, skill, req.message);
  }

  if (req.appId === "robotaxi-fleet-manager" && req.message.trim()) {
    const { readClawProfiles } = await import("./claw-profiles");
    const { buildSwarmFleet } = await import("./swarm-fleet");
    const { resolveSwarmDispatchPlan } = await import("./swarm-dispatch");
    const profiles = await readClawProfiles();
    const fleet = buildSwarmFleet(profiles.claws, config);
    const plan = resolveSwarmDispatchPlan(req.message, config, fleet);
    if (plan) {
      return {
        reply: plan.reply,
        suggestedSkill: plan.skillId,
        autoDispatchSkill: plan.autoDispatch,
        dispatchHints: { ...plan.hints } as Record<string, unknown>,
        activity: `[Swarm] ${plan.skillId}`,
      };
    }
  }

  const fallback = ruleBasedReply(req, agent);

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
  if (appId === "my-vital" && skillId === "ask_longevity") {
    const { fetchVitalStatus } = await import("./vital-health-store");
    const { readAppFreState } = await import("./app-fre-state");
    const { askVitalLongevityLab } = await import("./vital-longevity-lab");
    const [state, fre] = await Promise.all([fetchVitalStatus(), readAppFreState("my-vital")]);
    const q = message.trim() || "What should I prioritize for longevity given my vitals and labs?";
    const mergedConfig = { ...(fre.config ?? {}), ...config };
    const result = await askVitalLongevityLab(q, mergedConfig, state, mergedConfig.expertLens);
    const { markVitalLabUsed } = await import("./vital-health-store");
    await markVitalLabUsed();
    return {
      reply: `${result.answer}\n\n${result.disclaimer}`,
      activity: `[${skill.label}] ${result.mode} · ${result.citations.length} citation(s)`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-vital" && skillId === "sync_wearables") {
    const { syncWearablesDemo } = await import("./vital-health-store");
    const state = await syncWearablesDemo();
    return {
      reply: `Synced ${state.vitals.length} vitals from demo bridges. Overview refreshes automatically — live eno2 pull ships after hardware validation.`,
      activity: `[${skill.label}] ${state.vitals.length} vitals · demo sync`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-vital" && skillId === "ingest_report") {
    const { ingestDemoReport } = await import("./vital-health-store");
    const summary = message.trim() || "Operator-ingested summary — attach PDF when OCR bridge ships.";
    const report = await ingestDemoReport({ summary });
    return {
      reply: `Added **${report.title}** (${report.id}) to your Reports vault. Full PDF OCR is preview until eno2 validation.`,
      activity: `[${skill.label}] ${report.id}`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-vital" && skillId === "update_protocol") {
    const { refreshProtocolForFocus } = await import("./vital-health-store");
    const { readAppFreState } = await import("./app-fre-state");
    const fre = await readAppFreState("my-vital");
    const focus = cfgStr(config, "longevityFocus", "") || cfgStr(fre.config, "longevityFocus", "metabolic");
    const state = await refreshProtocolForFocus(focus);
    return {
      reply: `Protocol updated with ${state.protocol.length} steps for **${focus}** focus. Open Protocol tab to review — not medical advice.`,
      activity: `[${skill.label}] ${state.protocol.length} steps`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-vital" && skillId === "publish_context") {
    const { syncVitalContextToMesh } = await import("./vital-health-store");
    const profileId = cfgStr(config, "selectedProfileId", "") || null;
    await syncVitalContextToMesh(profileId);
    return {
      reply: "Published vitals and active protocol to Claw Context — Kin and Optimus can read scoped health slices when consented.",
      activity: `[${skill.label}] health/vitals.latest + protocol.active`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-content-creator" && skillId === "schedule_post") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a post in the queue before scheduling.", activity: "[Schedule] no post selected" };
    }
    const { scheduleContentPost } = await import("./content-queue-store");
    const post = await scheduleContentPost(postId);
    if (!post) {
      return { reply: "Post not found in queue.", activity: "[Schedule] post missing" };
    }
    const when = post.scheduledAt
      ? new Date(post.scheduledAt).toLocaleString()
      : "next available slot";
    return {
      reply: `${post.id} scheduled for ${when}. Scheduler will fire Publish at that time via digital bridge.`,
      activity: `[${skill.label}] ${post.id} → ${when}`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-content-creator" && skillId === "thumbnail_vision") {
    const postId = cfgStr(config, "selectedPostId", "");
    const b64 = cfgStr(config, "visionFrameBase64", "");
    if (!postId) {
      return { reply: "Select a post before capturing a thumbnail.", activity: "[Thumbnail] no post" };
    }
    if (!b64) {
      return {
        reply: "No vision frame attached — enable mesh camera or tap Capture Thumbnail in Creation Studio.",
        activity: "[Thumbnail] waiting for vision frame",
      };
    }
    const { captureThumbnailForPost } = await import("./content-creation-service");
    const saved = await captureThumbnailForPost(postId, b64);
    return {
      reply: `Thumbnail saved for ${postId}${saved.imageUrl ? ` · ${saved.imageUrl}` : ` · ${saved.imagePath}`}`,
      activity: `[${skill.label}] asset saved`,
      mesh: { kind: "plan", ok: true },
    };
  }

  if (appId === "my-content-creator" && skillId === "generate_ai_image") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a post before generating an AI thumbnail.", activity: "[AI Image] no post" };
    }
    try {
      const { generateAiThumbnailForPost } = await import("./content-creation-service");
      const saved = await generateAiThumbnailForPost(postId, cfgStr(config, "imagePrompt", "") || undefined);
      return {
        reply: `AI thumbnail saved for ${postId}${saved.imageUrl ? ` · ${saved.imageUrl}` : ""} · prompt: ${saved.prompt.slice(0, 80)}…`,
        activity: `[${skill.label}] Ollama image gen`,
        mesh: { kind: "plan", ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { reply: msg, activity: `[${skill.label}] error`, mesh: { kind: "plan", ok: false, error: msg } };
    }
  }

  if (appId === "my-content-creator" && skillId === "render_video") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a post before rendering video.", activity: "[Render] no post" };
    }
    try {
      const { renderVideoForPost } = await import("./content-creation-service");
      const rendered = await renderVideoForPost(postId);
      const ttsNote = rendered.ttsEngine !== "none" ? ` · TTS: ${rendered.ttsEngine}` : " · silent (no TTS)";
      return {
        reply: `Video rendered for ${postId}${rendered.videoUrl ? ` · ${rendered.videoUrl}` : ` · ${rendered.videoPath}`}${ttsNote}`,
        activity: `[${skill.label}] ffmpeg + voiceover`,
        mesh: { kind: "plan", ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { reply: `Render failed: ${msg}`, activity: `[${skill.label}] error`, mesh: { kind: "plan", ok: false, error: msg } };
    }
  }

  if (appId === "my-content-creator" && skillId === "adapt_for_platforms") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a post with a master draft first.", activity: "[Adapt] no post" };
    }
    const channels = Array.isArray(config.channels)
      ? config.channels.filter((c): c is string => typeof c === "string")
      : [];
    const { isSocialPlatform } = await import("./social-channels");
    const platforms = channels.filter((c): c is import("./social-channels").SocialPlatformId => isSocialPlatform(c));
    const tone = cfgStr(config, "contentTone", "technical");
    try {
      const { adaptPostForPlatforms } = await import("./content-creation-service");
      const adapted = await adaptPostForPlatforms(postId, platforms.length ? platforms : ["x", "tiktok", "youtube"], tone);
      const summary = adapted.map((a) => `${a.platform}: ${a.text.length} chars`).join(" · ");
      return {
        reply: `Adapted for ${adapted.length} platforms — ${summary}`,
        activity: `[${skill.label}] ${adapted.length} variants`,
        mesh: { kind: "plan", ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { reply: msg, activity: `[${skill.label}] error`, mesh: { kind: "plan", ok: false, error: msg } };
    }
  }

  if (appId === "my-content-creator" && skillId === "generate_hooks") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a post before generating hook variants.", activity: "[Hooks] no post" };
    }
    try {
      const { generateHookVariantsForPost } = await import("./content-creation-service");
      const hooks = await generateHookVariantsForPost(postId);
      return {
        reply: `Generated ${hooks.length} hooks — ${hooks.map((h) => h.label).join(", ")}. Tap a variant in Creation Studio.`,
        activity: `[${skill.label}] ${hooks.length} variants`,
        mesh: { kind: "plan", ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { reply: msg, activity: `[${skill.label}] error`, mesh: { kind: "plan", ok: false, error: msg } };
    }
  }

  if (appId === "my-content-creator" && skillId === "repurpose_content") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a source post to repurpose.", activity: "[Repurpose] no post" };
    }
    const tone = cfgStr(config, "contentTone", "technical");
    const preset = cfgStr(config, "repurposePreset", "long_to_social") as import("./content-creation-service").RepurposePreset;
    try {
      const { repurposeContent } = await import("./content-creation-service");
      const result = await repurposeContent(postId, preset, tone);
      return {
        reply: result.createdIds.length
          ? `Repurposed into ${result.createdIds.length} posts: ${result.createdIds.join(", ")}`
          : "Adapted copy but no new posts created (same platform only).",
        activity: `[${skill.label}] ${result.createdIds.length} posts`,
        mesh: { kind: "plan", ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { reply: msg, activity: `[${skill.label}] error`, mesh: { kind: "plan", ok: false, error: msg } };
    }
  }

  if (appId === "my-content-creator" && skillId === "fan_out_channels") {
    const postId = cfgStr(config, "selectedPostId", "");
    if (!postId) {
      return { reply: "Select a source post to fan out.", activity: "[Fan Out] no post" };
    }
    const channels = Array.isArray(config.channels)
      ? config.channels.filter((c): c is string => typeof c === "string")
      : [];
    const { isSocialPlatform } = await import("./social-channels");
    const platforms = channels.filter((c): c is import("./social-channels").SocialPlatformId => isSocialPlatform(c));
    const tone = cfgStr(config, "contentTone", "technical");
    const autoSchedule = config.autoSchedule === true;
    try {
      const { fanOutPostToPlatforms } = await import("./content-creation-service");
      const result = await fanOutPostToPlatforms(
        postId,
        platforms.length ? platforms : ["x", "tiktok", "youtube"],
        tone,
        { autoSchedule },
      );
      const scheduleNote =
        result.scheduledIds.length > 0
          ? ` · Scheduled ${result.scheduledIds.length} posts (stagger 30m)`
          : autoSchedule
            ? " · auto-schedule ON but nothing scheduled"
            : "";
      return {
        reply: result.createdIds.length
          ? `Created ${result.createdIds.length} channel posts: ${result.createdIds.join(", ")}${scheduleNote}`
          : `No new posts created${scheduleNote}`,
        activity: `[${skill.label}] ${result.createdIds.length} posts`,
        mesh: { kind: "plan", ok: true },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { reply: msg, activity: `[${skill.label}] error`, mesh: { kind: "plan", ok: false, error: msg } };
    }
  }

  if (appId === "robotaxi-fleet-manager" && skillId === "ping_unit") {
    const unitId = cfgStr(config, "selectedUnitId", "");
    if (!unitId) {
      return { reply: "Select a unit in the fleet table before ping.", activity: "[Ping] no unit selected" };
    }
    const { pingSwarmUnitLatency } = await import("./swarm-mesh-ping");
    const ping = await pingSwarmUnitLatency(unitId);
    return {
      reply: `Mesh RTT ${ping.rttMs}ms · source ${ping.source}${ping.motorSeq ? ` · motor seq ${ping.motorSeq}` : ""}.`,
      activity: `[${skill.label}] ${ping.rttMs}ms (${ping.source})`,
      mesh: { kind: "plan", ok: true },
      dispatchHints: { selectedUnitId: unitId, lastPingRttMs: ping.rttMs, lastPingSource: ping.source },
    };
  }

  if (skill.kind === "plan") {
    const draft = await tryLlmPlanSkill(appId, skillId, config, message);
    if (draft) {
      if (appId === "my-content-creator" && skillId === "draft_post") {
        const postId = cfgStr(config, "selectedPostId", "");
        if (postId) {
          const { savePostDraft, savePlatformVariants } = await import("./content-queue-store");
          await savePostDraft(postId, draft);
          await savePlatformVariants(postId, draft, {});
        }
      }
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
        reply: meshResult.skipReason ?? `${skill.label}: completed locally on appliance. See activity log for details.`,
        activity: `[${skill.label}] ${meshResult.skipReason ?? skill.description}`,
        mesh: { kind: "plan", ok: meshResult.executed !== false },
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
