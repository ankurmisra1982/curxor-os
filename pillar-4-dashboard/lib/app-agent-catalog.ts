import type { OotbAppId } from "./ootb-apps";
import { getOotbApp } from "./ootb-apps";

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
      { id: "scan_inbox", label: "Scan Inbox", description: "Index offline mail queue", kind: "plan" },
      { id: "sort_tray", label: "Sort Tray", description: "Claw sorts by priority labels", kind: "physical" },
      { id: "summarize_day", label: "Summarize Day", description: "Local LLM day brief", kind: "plan" },
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
    tagline: "Market and social signal ingestion agent",
    ootbLabel: "Signal Claw",
    purpose: [
      "Watch feeds, mentions, and news triggers for alpha moments.",
      "Spin up other Claws or alerts when conditions match — all local.",
      "Optional mesh hooks for physical bots when hardware is attached.",
    ],
    howToUse: [
      "Configure signal sources and thresholds in FRE.",
      "Tap skills to test triggers or tune sensitivity.",
      "Chat: “Alert me when NVDA mentions spike on X.”",
    ],
    skills: [
      { id: "home_position", label: "Home Position", description: "Safe homing sequence", kind: "physical" },
      { id: "test_grip", label: "Test Grip", description: "Calibrated grip test", kind: "physical" },
      { id: "tune_joint", label: "Tune Joint", description: "Apply slider values to mesh", kind: "physical" },
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
        "Signals evaluate locally — outbound alerts use eno2 bridges only.",
        "Pair with Capital or Creator Claws for automated responses.",
        "Mesh motor hooks available when physical hardware is connected.",
      ],
    },
    bootMessage: "Signal Claw listening. Ask me to watch a feed or tighten alert thresholds.",
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
    tagline: "Content pipeline employee — draft, schedule, publish",
    ootbLabel: "Creator Claw",
    purpose: [
      "Manage social channels and headless video pipelines on appliance.",
      "Creator Claw drafts scripts locally; publishes via digital bridge (no LLM → internet).",
      "Vision assist for thumbnails from live mesh or uploaded frames.",
    ],
    howToUse: [
      "Select a post in the queue, then tap Draft Post or Publish.",
      "Publish sends intent to telemetry/digital_out — Python bridge handles X API.",
      "Chat: “Write a thread about today’s demo” or “Schedule POST-883 for 6pm.”",
      "Platform vault shows linked channels — credentials in /etc/curxor/digital.env.",
    ],
    skills: [
      { id: "draft_post", label: "Draft Post", description: "Local LLM script generation", kind: "plan" },
      { id: "schedule_post", label: "Schedule", description: "Queue for local scheduler", kind: "plan" },
      { id: "publish_post", label: "Publish", description: "Digital bridge → X API", kind: "digital" },
      { id: "thumbnail_vision", label: "Thumbnail", description: "Vision frame → thumbnail", kind: "plan" },
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
          defaultValue: ["youtube", "x"],
          options: [
            { value: "youtube", label: "YouTube" },
            { value: "tiktok", label: "TikTok" },
            { value: "x", label: "X / Threads" },
            { value: "instagram", label: "Instagram" },
          ],
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
        { id: "autoSchedule", label: "Auto-schedule drafts", type: "toggle", defaultValue: false },
      ],
      activateTitle: "Activate Creator Claw",
      activateTips: [
        "LLM never talks to the internet — only digital bridges publish.",
        "Configure Alpaca/X credentials in digital.env before live publish.",
        "Receipts stream to Publish Receipts panel via digital_in.",
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
      "Review rules in the engine table — Arm or Pause as needed.",
      "Tap Create Rule to open the template builder (mock until saved).",
      "Execute Trade sends paper order through digital bridge when armed.",
      "Chat: “Arm BTC dip rule” or “Show watchlist movers.”",
    ],
    skills: [
      { id: "create_rule", label: "Create Rule", description: "Open rule builder", kind: "plan" },
      { id: "arm_rule", label: "Arm Rule", description: "Enable selected rule", kind: "plan" },
      { id: "execute_trade", label: "Execute Trade", description: "Paper trade via Alpaca bridge", kind: "digital" },
      { id: "rebalance", label: "Rebalance", description: "Simulate allocation drift fix", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Capital Claw",
      welcomeLead: "Capital Claw automates investing with local rules — your LLM plans, bridges execute.",
      configureTitle: "Risk profile",
      configureLead: "Set paper trading defaults and watchlist seeds.",
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
        "Default is paper trading — no live brokerage without explicit config.",
        "Rules evaluate locally; trades publish to digital_out.",
        "Trade receipts appear in the execution panel when bridge is running.",
      ],
    },
    bootMessage: "Capital Claw armed in paper mode. Ask about rules or watchlist.",
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
