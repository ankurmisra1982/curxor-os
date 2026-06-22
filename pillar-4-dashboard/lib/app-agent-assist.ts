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
  "my-shop": ["ingest_order"],
  "my-content-creator": ["draft_post"],
  "my-capital": ["create_rule", "arm_rule", "run_demo_tour", "execute_now", "portfolio_query", "research_ticker", "create_rule_from_thesis", "preview_trade", "agent_execute_trade", "rebalance"],
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
