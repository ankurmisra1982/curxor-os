import type { OotbAppId } from "./ootb-apps";
import { getOotbApp } from "./ootb-apps";
import { creatorFreChannelOptions } from "./social-channels";

export type AppFreFieldType = "text" | "select" | "toggle" | "multiselect";

export interface AppFreField {
  id: string;
  label: string;
  type: AppFreFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | string[] | boolean;
  help?: string;
  required?: boolean;
}

export interface AgentSkill {
  id: string;
  label: string;
  description: string;
  kind: "physical" | "digital" | "plan";
}

export interface AppAgentDefinition {
  appId: OotbAppId;
  agentName: string;
  tagline: string;
  ootbLabel: string;
  purpose: string[];
  howToUse: string[];
  skills: AgentSkill[];
  fre: {
    welcomeTitle: string;
    welcomeLead: string;
    configureTitle: string;
    configureLead: string;
    fields: AppFreField[];
    activateTitle: string;
    activateTips: string[];
  };
  bootMessage: string;
}

export const APP_AGENTS: Record<OotbAppId, AppAgentDefinition> = {
  "my-work": {
    appId: "my-work",
    agentName: "Outreach Claw",
    tagline: "Outbound digital employee — leads, sequences, CRM",
    ootbLabel: "Outreach Claw",
    purpose: [
      "Scrape and qualify leads locally — no SaaS CRM bill.",
      "Personalized cold email sequences and follow-ups via eno2 bridges.",
      "Always-on agent: chat, skills, or scheduled outreach runs 24/7.",
    ],
    howToUse: [
      "Chat: “Find leads in fintech” or “Draft a sequence for SaaS founders.”",
      "Use Scan Inbox to index local mail; skills queue outbound actions.",
      "Outbound publishes through digital bridges — your playbook stays on-box.",
    ],
    skills: [
      { id: "scan_inbox", label: "Scan Inbox", description: "Index offline mail · pause sequences on reply", kind: "plan" },
      { id: "draft_sequence", label: "Draft Sequence", description: "Local LLM multi-step cold email", kind: "plan" },
      { id: "send_sequence_step", label: "Send Step", description: "Send current sequence step via SMTP bridge", kind: "digital" },
      { id: "summarize_day", label: "Summarize Day", description: "Local LLM day brief", kind: "plan" },
      { id: "sort_tray", label: "Sort Tray", description: "Claw sorts by priority labels", kind: "physical" },
      { id: "move_to_tray", label: "Move to Tray", description: "Physical move via motor_out", kind: "physical" },
    ],
    fre: {
      welcomeTitle: "Welcome to Outreach Claw",
      welcomeLead: "Your outbound digital employee runs 24/7 on sovereign hardware — no cloud CRM, no leaked playbooks.",
      configureTitle: "Configure outbound desk",
      configureLead: "Name your pipeline and choose what Outreach Claw tracks first.",
      fields: [
        { id: "workspaceName", label: "Workspace name", type: "text", defaultValue: "Outreach Desk", required: true },
        {
          id: "focusAreas",
          label: "Focus areas",
          type: "multiselect",
          defaultValue: ["tasks", "calendar", "mail"],
          options: [
            { value: "tasks", label: "Tasks" },
            { value: "calendar", label: "Calendar" },
            { value: "mail", label: "Mail" },
            { value: "notes", label: "Notes" },
          ],
        },
        {
          id: "clawLane",
          label: "Outreach lane",
          type: "select",
          defaultValue: "A",
          options: [
            { value: "A", label: "Lane A — primary sequence" },
            { value: "B", label: "Lane B — follow-up" },
            { value: "none", label: "No lane yet" },
          ],
        },
        {
          id: "dailySendLimit",
          label: "Daily send limit (per mailbox)",
          type: "text",
          defaultValue: "50",
          placeholder: "50",
        },
        {
          id: "sendStaggerMinutes",
          label: "Minutes between sends (stagger)",
          type: "text",
          defaultValue: "5",
          placeholder: "5",
        },
        {
          id: "outreachTone",
          label: "Sequence tone",
          type: "select",
          defaultValue: "direct",
          options: [
            { value: "direct", label: "Direct" },
            { value: "warm", label: "Warm" },
          ],
        },
      ],
      activateTitle: "Activate Outreach Claw",
      activateTips: [
        "Outreach Claw appears in the agent panel — chat anytime.",
        "Sequences and CRM actions egress via eno2 only.",
        "Unplug eno2 to pause all outbound agent traffic.",
      ],
    },
    bootMessage: "Outreach Claw online. Ask me to scrape leads or draft a cold sequence.",
  },
  "my-shop": {
    appId: "my-shop",
    agentName: "Arbitrage Claw",
    tagline: "E-commerce arbitrage and fulfillment employee",
    ootbLabel: "Arbitrage Claw",
    purpose: [
      "Monitor prices, margins, and SKU spread across channels — locally.",
      "Automate ingest → sort → ship pipelines for dropshipping and retail ops.",
      "Publishes fulfillment intents via mesh and digital bridges on eno2.",
    ],
    howToUse: [
      "Add orders or let Arbitrage Claw ingest from your watchlist.",
      "Tap Sort SKU or Retry Pick to advance pipeline stages.",
      "Chat: “Alert me when margin on SKU X exceeds 12%.”",
    ],
    skills: [
      { id: "ingest_order", label: "Ingest Order", description: "Pull next order into pipeline", kind: "plan" },
      { id: "sort_sku", label: "Sort SKU", description: "Claw pick-and-place for active SKU", kind: "physical" },
      { id: "ship_bin", label: "Ship Bin", description: "Mark ready for pickup", kind: "plan" },
      { id: "retry_pick", label: "Retry Pick", description: "Re-run failed pick with vision", kind: "physical" },
    ],
    fre: {
      welcomeTitle: "Welcome to Arbitrage Claw",
      welcomeLead: "Your e-commerce ops employee finds spread and acts on it — sovereign, always-on, zero SaaS rent.",
      configureTitle: "Store setup",
      configureLead: "Tell Arbitrage Claw about your desk and fulfillment style.",
      fields: [
        { id: "storeName", label: "Desk name", type: "text", defaultValue: "Arbitrage Desk", required: true },
        {
          id: "fulfillmentMode",
          label: "Fulfillment mode",
          type: "select",
          defaultValue: "pick_pack_ship",
          options: [
            { value: "pick_pack_ship", label: "Pick → Pack → Ship" },
            { value: "claw_only", label: "Claw sort only" },
            { value: "counter_pickup", label: "Counter pickup" },
          ],
        },
        {
          id: "clawLanes",
          label: "Claw lanes",
          type: "multiselect",
          defaultValue: ["INGEST", "SORT"],
          options: [
            { value: "INGEST", label: "Ingest belt" },
            { value: "SORT", label: "Sort table" },
            { value: "SHIP", label: "Ship staging" },
          ],
        },
      ],
      activateTitle: "Activate Arbitrage Claw",
      activateTips: [
        "Orders appear in the fulfillment pipeline — tap skills to advance stages.",
        "Connect vision_in for SKU verification during Sort SKU.",
        "Paper mode: all data stays on appliance until you enable outbound sync.",
      ],
    },
    bootMessage: "Arbitrage Claw ready. Ingest an order or ask me to watch a SKU spread.",
  },
  "tesla-optimus-engine": {
    appId: "tesla-optimus-engine",
    agentName: "Signal Claw",
    tagline: "Optimus robot + signal desk — deep user context via Claw Context Protocol",
    ootbLabel: "Signal Claw",
    purpose: [
      "Optimus hardware syncs personal, health, work, and family context from the Claw Context mesh.",
      "Watch feeds, mentions, and news triggers for alpha moments.",
      "Physical skills (home, grip, tune) publish to motor_out; context stays local.",
    ],
    howToUse: [
      "Configure unit ID and safety profile in FRE.",
      "Optimus subscribes to CCP scopes: personal, health, work, finance, family, hardware.",
      "Chat: “What do you know about my sleep?” or “Home position — guest mode.”",
    ],
    skills: [
      { id: "home_position", label: "Home Position", description: "Safe homing sequence", kind: "physical" },
      { id: "test_grip", label: "Test Grip", description: "Calibrated grip test", kind: "physical" },
      { id: "tune_joint", label: "Tune Joint", description: "Apply slider values to mesh", kind: "physical" },
      { id: "sync_context", label: "Sync Context", description: "Refresh CCP subscription from mesh", kind: "plan" },
      { id: "rl_step", label: "RL Step", description: "Single policy improvement step", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Signal Claw",
      welcomeLead: "Signal Claw watches the world for alpha — triggers your other digital employees instantly.",
      configureTitle: "Signal sources",
      configureLead: "Register feeds and alert thresholds.",
      fields: [
        { id: "unitId", label: "Unit ID", type: "text", defaultValue: "OPTIMUS-01", required: true },
        {
          id: "safetyProfile",
          label: "Safety profile",
          type: "select",
          defaultValue: "standard",
          options: [
            { value: "lab", label: "Lab — relaxed limits" },
            { value: "standard", label: "Standard — balanced" },
            { value: "strict", label: "Strict — demo / public" },
          ],
        },
        { id: "enableRl", label: "Enable local RL loop", type: "toggle", defaultValue: true },
      ],
      activateTitle: "Activate Signal Claw",
      activateTips: [
        "Optimus reads Claw Context mesh — enable Vital Claw and Kin Claw for richer personalization.",
        "Signals evaluate locally — outbound alerts use eno2 bridges only.",
        "Mesh motor hooks available when Optimus hardware is connected.",
      ],
    },
    bootMessage: "Signal Claw / Optimus online. Context mesh linked — ask about the operator or run a physical skill.",
  },
  "robotaxi-fleet-manager": {
    appId: "robotaxi-fleet-manager",
    agentName: "Swarm Claw",
    tagline: "Orchestrator for your digital employee fleet",
    ootbLabel: "Swarm Claw",
    purpose: [
      "Assign workloads across many Claws — uptime, latency, and health.",
      "Scale your autonomous workforce from one Flight Command desk.",
      "Grid view for dispatch; integrates with mesh when ground units exist.",
    ],
    howToUse: [
      "Select a unit or workload row, then Assign Route or Recall.",
      "Chat: “Which Claw has lowest latency?” or “Rebalance the swarm.”",
      "Monitor fleet health and charge in the activity log.",
    ],
    skills: [
      { id: "assign_route", label: "Assign Route", description: "Dispatch selected unit", kind: "physical" },
      { id: "recall_vehicle", label: "Recall Vehicle", description: "Return unit to depot", kind: "physical" },
      { id: "ping_unit", label: "Ping Unit", description: "Latency check via mesh", kind: "plan" },
      { id: "rebalance", label: "Rebalance", description: "Spread load across grid", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Swarm Claw",
      welcomeLead: "Swarm Claw is your fleet operator for digital employees — scale Claws without cloud orchestration.",
      configureTitle: "Fleet parameters",
      configureLead: "Define depot, fleet size, and dispatch policy.",
      fields: [
        { id: "depotGrid", label: "Depot cell", type: "select", defaultValue: "A1", options: ["A1", "B1", "C1", "D1"].map((v) => ({ value: v, label: v })) },
        {
          id: "fleetSize",
          label: "Active units",
          type: "select",
          defaultValue: "4",
          options: [
            { value: "2", label: "2 vehicles" },
            { value: "4", label: "4 vehicles" },
            { value: "8", label: "8 vehicles" },
          ],
        },
        {
          id: "dispatchPolicy",
          label: "Dispatch policy",
          type: "select",
          defaultValue: "latency",
          options: [
            { value: "latency", label: "Lowest latency first" },
            { value: "charge", label: "Highest charge first" },
            { value: "round_robin", label: "Round robin" },
          ],
        },
      ],
      activateTitle: "Activate Swarm Claw",
      activateTips: [
        "Select a vehicle in the grid before Assign Route.",
        "Mesh motor claw ID links ground robots to fleet telemetry.",
        "All dispatch decisions logged locally for audit.",
      ],
    },
    bootMessage: "Swarm Claw online. Select a unit or ask for workload rebalance.",
  },
  "claw-cafe": {
    appId: "claw-cafe",
    agentName: "Engage Claw",
    tagline: "Community and DM engagement employee",
    ootbLabel: "Engage Claw",
    purpose: [
      "Auto-replies, DM triage, and thread engagement on X and LinkedIn.",
      "Grow audience while you sleep — all egress via eno2.",
      "Event kiosk mode for live demos of your sovereign stack.",
    ],
    howToUse: [
      "Configure channels and engagement rules in FRE.",
      "Tap skills to simulate guest sessions or publish replies.",
      "Chat: “Draft replies for my mentions queue.”",
    ],
    skills: [
      { id: "start_game", label: "Start Game", description: "Begin guest session on lane", kind: "plan" },
      { id: "drop_claw", label: "Drop Claw", description: "Execute prize grab motion", kind: "physical" },
      { id: "reset_lane", label: "Reset Lane", description: "Clear lane state", kind: "plan" },
      { id: "photo_booth", label: "Photo Booth", description: "Capture vision frame for guest", kind: "physical" },
    ],
    fre: {
      welcomeTitle: "Welcome to Engage Claw",
      welcomeLead: "Engage Claw grows your audience — replies and DMs handled locally, published via eno2.",
      configureTitle: "Engagement desk",
      configureLead: "Name your desk and configure demo engagement mode.",
      fields: [
        { id: "kioskName", label: "Engage desk name", type: "text", defaultValue: "Engage Desk", required: true },
        {
          id: "prizeMode",
          label: "Prize mode",
          type: "select",
          defaultValue: "demo",
          options: [
            { value: "demo", label: "Demo — free plays" },
            { value: "token", label: "Token — paid plays" },
            { value: "event", label: "Event — staff operated" },
          ],
        },
        {
          id: "activeLanes",
          label: "Active lanes",
          type: "multiselect",
          defaultValue: ["A", "B", "C", "D"],
          options: [
            { value: "A", label: "Lane A" },
            { value: "B", label: "Lane B" },
            { value: "C", label: "Lane C" },
            { value: "D", label: "Lane D" },
          ],
        },
      ],
      activateTitle: "Activate Engage Claw",
      activateTips: [
        "Lane A shows live vision when mesh is up — wire cameras to vision_in.",
        "Drop Claw publishes to motor_out — verify safety zone before guests.",
        "Use Photo Booth to save a frame locally for guest takeaways.",
      ],
    },
    bootMessage: "Engage Claw ready. Ask me to triage DMs or queue thread replies.",
  },
  "my-content-creator": {
    appId: "my-content-creator",
    agentName: "Creator Claw",
    tagline: "Content pipeline — draft, create, adapt, publish",
    ootbLabel: "Creator Claw",
    purpose: [
      "Manage social channels and headless video pipelines on appliance.",
      "Creator Claw drafts scripts locally; publishes via digital bridge (no LLM → internet).",
      "Creation Studio: vision thumbnails, ffmpeg video renders, multi-channel format adaptation.",
    ],
    howToUse: [
      "Select a post → Draft Post → Thumbnail (vision) → Render Video for TikTok/YouTube.",
      "Adapt for Platforms rewrites your master draft per channel; Fan Out creates queue posts.",
      "Batch Publish sends all media-ready posts via digital_out bridges.",
      "Set CURXOR_CONTENT_PUBLIC_BASE for public image_url on IG/Pinterest.",
    ],
    skills: [
      { id: "draft_post", label: "Draft Post", description: "Local LLM — platform-aware", kind: "plan" },
      { id: "adapt_for_platforms", label: "Adapt All", description: "Rewrite master draft per FRE channel", kind: "plan" },
      { id: "thumbnail_vision", label: "Thumbnail", description: "Vision frame → saved asset", kind: "plan" },
      { id: "generate_ai_image", label: "AI Image", description: "Local Ollama flux/sd thumbnail", kind: "plan" },
      { id: "render_video", label: "Render Video", description: "ffmpeg 9:16 + TTS voiceover", kind: "plan" },
      { id: "fan_out_channels", label: "Fan Out", description: "Create posts for all FRE channels", kind: "plan" },
      { id: "generate_hooks", label: "Hook Variants", description: "A/B opener lines for draft", kind: "plan" },
      { id: "repurpose_content", label: "Repurpose", description: "Long → social / video → thread", kind: "plan" },
      { id: "schedule_post", label: "Schedule", description: "Queue for local scheduler", kind: "plan" },
      { id: "publish_post", label: "Publish", description: "Digital bridge → platform API", kind: "digital" },
      { id: "publish_reply", label: "Publish Reply", description: "Thread reply via content.publish_reply", kind: "digital" },
      { id: "engage_reply", label: "Engage Reply", description: "Draft + queue reply from engage inbox", kind: "plan" },
      { id: "pull_recommendations", label: "Learn Winners", description: "Analytics recommendations from metrics", kind: "plan" },
      { id: "batch_publish", label: "Batch Publish", description: "Publish all media-ready posts", kind: "digital" },
    ],
    fre: {
      welcomeTitle: "Welcome to Creator Claw",
      welcomeLead: "Creator Claw is your sovereign social operator — OpenClaw-style skills with NemoClaw-style governance on outbound actions.",
      configureTitle: "Channel setup",
      configureLead: "Choose channels and content tone.",
      fields: [
        {
          id: "channels",
          label: "Channels",
          type: "multiselect",
          defaultValue: ["tiktok", "instagram", "youtube", "x"],
          options: creatorFreChannelOptions(),
        },
        {
          id: "contentTone",
          label: "Content tone",
          type: "select",
          defaultValue: "technical",
          options: [
            { value: "technical", label: "Technical / dev" },
            { value: "casual", label: "Casual" },
            { value: "brand", label: "Brand marketing" },
          ],
        },
        { id: "autoSchedule", label: "Auto-schedule after Fan Out", type: "toggle", defaultValue: false },
        { id: "autoScheduleAdapt", label: "Auto-schedule after Adapt All", type: "toggle", defaultValue: false },
        {
          id: "requirePublishApproval",
          label: "Require approval before publish",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: "requireReplyApproval",
          label: "Require approval before replies",
          type: "toggle",
          defaultValue: false,
        },
        {
          id: "notifyApprovalOnTelegram",
          label: "Notify operators on Telegram when items need approval",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: "approvalTelegramChatIds",
          label: "Telegram operator chat IDs (comma-separated)",
          type: "text",
          defaultValue: "",
          placeholder: "123456789,-1009876543210",
        },
        {
          id: "notifyApprovalOnSlack",
          label: "Notify operators on Slack when items need approval",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: "approvalSlackChannelIds",
          label: "Slack approval channel IDs (comma-separated)",
          type: "text",
          defaultValue: "",
          placeholder: "C0123456789",
        },
        {
          id: "autoMetricsRules",
          label: "Auto-apply metrics rules (learn winners)",
          type: "toggle",
          defaultValue: false,
        },
        {
          id: "useDataDrivenSchedule",
          label: "Use learned best times for scheduling",
          type: "toggle",
          defaultValue: true,
        },
        {
          id: "timezone",
          label: "Calendar timezone",
          type: "text",
          defaultValue: "America/New_York",
          placeholder: "IANA timezone e.g. America/Los_Angeles",
        },
        {
          id: "brandHashtags",
          label: "Brand hashtags",
          type: "text",
          defaultValue: "#CurXor #SovereignAI",
          placeholder: "#tag1 #tag2",
        },
        {
          id: "brandKit",
          label: "Brand kit (JSON)",
          type: "text",
          defaultValue: '{"captionPrefix":"","ttsVoice":"","bannedWords":[]}',
          placeholder: '{"hashtags":[],"ttsVoice":"en-us"}',
        },
      ],
      activateTitle: "Activate Creator Claw",
      activateTips: [
        "LLM never talks to the internet — only digital bridges publish.",
        "Creation Studio: AI Image → Render Video (TTS) → Adapt All → Fan Out (auto-schedule).",
        "Set CURXOR_CONTENT_PUBLIC_BASE for IG/Pinterest image_url from appliance assets.",
      ],
    },
    bootMessage: "Creator Claw online. Select a post or ask me to draft content.",
  },
  "my-capital": {
    appId: "my-capital",
    agentName: "Capital Claw",
    tagline: "Rule-based investing agent — stocks, crypto, local evaluation",
    ootbLabel: "Capital Claw",
    purpose: [
      "Build flexible IF/THEN rules for stocks, crypto, and ETFs.",
      "Capital Claw evaluates signals locally; trades via Alpaca paper bridge.",
      "Portfolio, watchlist, and execution receipts — governed, auditable.",
    ],
    howToUse: [
      "Demo mode: no digital.env keys required — portfolio, PFM, and trade log use local demo data.",
      "Complete Go Live when ready — Alpaca paper keys, first rule, arm, execute.",
      "Review rules in the engine table — Arm or Pause as needed.",
      "Execute Trade logs locally; paper orders need Alpaca keys in digital.env.",
      "Agent & MCP: connect /api/capital/mcp — preview_trade then agent_execute_trade (or MCP review_equity_order / place_equity_order).",
      "Chat: “Arm BTC dip rule”, “Preview SPY buy”, or “Execute trade on RULE-01.”",
    ],
    skills: [
      { id: "create_rule", label: "Create Rule", description: "Add WHEN/THEN rule to local store", kind: "plan" },
      { id: "arm_rule", label: "Arm Rule", description: "Enable selected rule for execution", kind: "plan" },
      { id: "execute_trade", label: "Execute Trade", description: "Paper trade via Alpaca bridge", kind: "digital" },
      { id: "rebalance", label: "Rebalance", description: "Create armed rebalance rule from portfolio health hints", kind: "plan" },
      { id: "subscribe_pilot", label: "Subscribe Pilot", description: "Mirror a marketplace pilot portfolio", kind: "plan" },
      { id: "sync_pilots", label: "Sync Pilots", description: "Rebalance all active pilot subscriptions", kind: "digital" },
      { id: "research_ticker", label: "Research Ticker", description: "Fundamentals + news + WSB/FinTwit chatter", kind: "plan" },
      { id: "create_rule_from_thesis", label: "Rule from Thesis", description: "Build rule from ticker intel smart take", kind: "plan" },
      { id: "preview_trade", label: "Preview Trade", description: "Notional, risk note, auto-approve eligibility", kind: "plan" },
      { id: "run_demo_tour", label: "Demo Tour", description: "Rule → arm → simulated fill (no broker keys)", kind: "digital" },
      { id: "execute_now", label: "Execute Now", description: "Fire first armed rule immediately", kind: "digital" },
      { id: "portfolio_query", label: "Portfolio Q&A", description: "Ask exposure, health, armed rules, pending trades", kind: "plan" },
      { id: "agent_execute_trade", label: "Agent Execute", description: "Preview then confirm paper trade (agent pipeline)", kind: "digital" },
      { id: "pfm_refresh", label: "Refresh PFM", description: "Reload cash flow and net worth snapshot", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Capital Claw",
      welcomeLead: "Capital Claw automates investing with local rules — demo mode works without broker keys; bridges execute when you configure digital.env.",
      configureTitle: "Risk profile",
      configureLead: "Paper-only defaults and watchlist seeds — stay on Paper for demo release.",
      fields: [
        {
          id: "riskProfile",
          label: "Risk profile",
          type: "select",
          defaultValue: "balanced",
          options: [
            { value: "conservative", label: "Conservative" },
            { value: "balanced", label: "Balanced" },
            { value: "aggressive", label: "Aggressive" },
          ],
        },
        {
          id: "tradingMode",
          label: "Trading mode",
          type: "select",
          defaultValue: "paper",
          options: [
            { value: "paper", label: "Paper only (default)" },
            { value: "dry_run", label: "Dry run — log only" },
            { value: "live", label: "Live money (requires env gate + desk confirm)" },
          ],
        },
        {
          id: "seedWatchlist",
          label: "Seed watchlist",
          type: "multiselect",
          defaultValue: ["BTC-USD", "NVDA", "SPY"],
          options: [
            { value: "BTC-USD", label: "BTC-USD" },
            { value: "ETH-USD", label: "ETH-USD" },
            { value: "NVDA", label: "NVDA" },
            { value: "SPY", label: "SPY" },
          ],
        },
      ],
      activateTitle: "Activate Capital Claw",
      activateTips: [
        "Demo release: no Alpaca keys needed — explore rules, research, and trade log locally.",
        "Default is paper trading — no live brokerage without explicit config.",
        "Rules evaluate locally; trades publish to digital_out when bridge is configured.",
        "Trade receipts appear in the execution panel when bridge is running.",
      ],
    },
    bootMessage: "Capital Claw in demo mode. Ask about rules, watchlist, or research — broker setup optional.",
  },
  "my-vital": {
    appId: "my-vital",
    agentName: "Vital Claw",
    tagline: "Longevity desk — vitals, labs, diet sync, and health protocol",
    ootbLabel: "Vital Claw",
    purpose: [
      "Ingest wearable vitals (Oura, Apple Health, Garmin, Whoop) via local bridges.",
      "Store and summarize medical reports; sync diet and health apps on your terms.",
      "Publish health context to the Claw Context mesh for Optimus and Kin Claw.",
    ],
    howToUse: [
      "Connect health bridges in FRE, then tap Sync Wearables.",
      "Review the longevity protocol — chat to adjust sleep, nutrition, or movement goals.",
      "Tap Publish Context to share vitals with subscribed Claws (never auto-egress).",
    ],
    skills: [
      { id: "sync_wearables", label: "Sync Wearables", description: "Pull latest vitals from connected bridges", kind: "digital" },
      { id: "ingest_report", label: "Ingest Report", description: "Add medical PDF summary to vault", kind: "plan" },
      { id: "update_protocol", label: "Update Protocol", description: "Regenerate longevity steps locally", kind: "plan" },
      { id: "publish_context", label: "Publish Context", description: "Push health slice to CCP mesh", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Vital Claw",
      welcomeLead: "Your longevity employee runs on sovereign hardware — vitals and protocols stay on-box until you choose to share.",
      configureTitle: "Health sources",
      configureLead: "Select wearables and apps to sync.",
      fields: [
        {
          id: "wearableSources",
          label: "Wearable sources",
          type: "multiselect",
          defaultValue: ["oura", "apple_health"],
          options: [
            { value: "oura", label: "Oura Ring" },
            { value: "apple_health", label: "Apple Health" },
            { value: "garmin", label: "Garmin" },
            { value: "whoop", label: "Whoop" },
            { value: "fitbit", label: "Fitbit" },
          ],
        },
        {
          id: "longevityFocus",
          label: "Primary focus",
          type: "select",
          defaultValue: "metabolic",
          options: [
            { value: "metabolic", label: "Metabolic health" },
            { value: "cardio", label: "Cardiovascular" },
            { value: "cognitive", label: "Cognitive longevity" },
            { value: "athletic", label: "Athletic performance" },
          ],
        },
        { id: "shareWithOptimus", label: "Share health context with Optimus", type: "toggle", defaultValue: true },
      ],
      activateTitle: "Activate Vital Claw",
      activateTips: [
        "Health bridges connect via eno2 — unplug to pause wearable sync.",
        "Medical reports stay in /etc/curxor/vital-health.json on this appliance.",
        "Optimus and Kin Claw subscribe to health scope when enabled.",
      ],
    },
    bootMessage: "Vital Claw online. Ask about vitals, protocol, or tap Sync Wearables.",
  },
  "my-family": {
    appId: "my-family",
    agentName: "Kin Claw",
    tagline: "Household profiles — devices, personalities, and shared context",
    ootbLabel: "Kin Claw",
    purpose: [
      "Manage family members with their own devices, traits, and privacy scopes.",
      "Sync household context to every Claw via the Claw Context Protocol.",
      "Bind Optimus, wearables, and appliances per profile.",
    ],
    howToUse: [
      "Add members and assign roles (owner, partner, child, elder).",
      "Set communication style and shared scopes per person.",
      "Tap Resync Mesh after changes — subscribed Claws update instantly.",
    ],
    skills: [
      { id: "add_member", label: "Add Member", description: "Create a new household profile", kind: "plan" },
      { id: "bind_device", label: "Bind Device", description: "Link watch, phone, or robot to profile", kind: "plan" },
      { id: "resync_mesh", label: "Resync Mesh", description: "Publish family context to CCP", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Kin Claw",
      welcomeLead: "Your household gets its own context layer — each member's personality and devices sync to Claws that need them.",
      configureTitle: "Household setup",
      configureLead: "Name your household and set the primary operator profile.",
      fields: [
        { id: "householdName", label: "Household name", type: "text", defaultValue: "My Household", required: true },
        {
          id: "defaultCommStyle",
          label: "Default communication style",
          type: "select",
          defaultValue: "warm",
          options: [
            { value: "warm", label: "Warm" },
            { value: "direct", label: "Direct" },
            { value: "formal", label: "Formal" },
            { value: "playful", label: "Playful" },
          ],
        },
        { id: "allowChildProfiles", label: "Enable child profiles", type: "toggle", defaultValue: true },
      ],
      activateTitle: "Activate Kin Claw",
      activateTips: [
        "Each member controls which scopes they share (health, work, etc.).",
        "Optimus uses family context for guest-aware physical interactions.",
        "Profiles persist to /etc/curxor/family-profiles.json.",
      ],
    },
    bootMessage: "Kin Claw ready. Add a family member or ask who is synced to the mesh.",
  },
  "claw-forge": {
    appId: "claw-forge",
    agentName: "Forge Master",
    tagline: "Agent factory — design and deploy new claw bots in natural language",
    ootbLabel: "The Forge",
    purpose: [
      "Create new claw profiles with multimodal chat — text, photos, live vision.",
      "Forge Master recommends local LLM stacks and provisions via wizard.",
      "Continuous addition: tap + to forge another bot anytime.",
    ],
    howToUse: [
      "Describe the bot you want in chat; attach photo or enable live vision.",
      "When intent is clear, tap + Forge Claw to open the provisioning wizard.",
      "Review LLM budget tier and auto-selected models before deploy.",
      "Forged claws appear in fleet registry and can become active profile.",
    ],
    skills: [
      { id: "forge_claw", label: "Forge Claw", description: "Open provisioning wizard", kind: "plan" },
      { id: "recommend_stack", label: "Recommend Stack", description: "LLM recommendation from intent", kind: "plan" },
      { id: "attach_vision", label: "Attach Vision", description: "Use live mesh frame", kind: "plan" },
      { id: "list_fleet", label: "List Fleet", description: "Show provisioned claws", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to The Forge",
      welcomeLead: "Forge Master mints new digital employees from natural language — your create-to-earn engine.",
      configureTitle: "Forge defaults",
      configureLead: "Set default budget and auto-recommend preferences.",
      fields: [
        {
          id: "defaultBudget",
          label: "Default UMA budget",
          type: "select",
          defaultValue: "balanced",
          options: [
            { value: "economy", label: "Economy" },
            { value: "balanced", label: "Balanced" },
            { value: "performance", label: "Performance" },
          ],
        },
        { id: "autoRecommend", label: "Auto-recommend models from intent", type: "toggle", defaultValue: true },
        { id: "multimodalDefault", label: "Prefer vision grounding when photo attached", type: "toggle", defaultValue: true },
      ],
      activateTitle: "Activate Forge Master",
      activateTips: [
        "Chat naturally — say “forge claw” when ready to provision.",
        "Header + Forge shortcut opens this studio from anywhere.",
        "Profiles persist to /etc/curxor/claw-profiles.json.",
      ],
    },
    bootMessage: "Forge Master online. Describe the next claw bot you want to add.",
  },
};

export function getAppAgent(appId: OotbAppId): AppAgentDefinition {
  const def = APP_AGENTS[appId];
  return { ...def, ootbLabel: getOotbApp(appId).name };
}

export function defaultFreConfig(appId: OotbAppId): Record<string, unknown> {
  const def = APP_AGENTS[appId];
  const config: Record<string, unknown> = {};
  for (const field of def.fre.fields) {
    if (field.defaultValue !== undefined) config[field.id] = field.defaultValue;
  }
  return config;
}
