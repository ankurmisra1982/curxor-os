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
    agentName: "Work Claw",
    tagline: "Daily coordination desk — leads, sequences, CRM",
    ootbLabel: "Work Claw",
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
      { id: "morning_brief", label: "Morning Brief", description: "Mail + calendar + tasks summary", kind: "plan" },
      { id: "prep_meeting", label: "Prep Meeting", description: "Attendee dossier from CRM + mail", kind: "plan" },
      { id: "slack_digest", label: "Slack Digest", description: "Channel summary via Slack bridge", kind: "digital" },
      { id: "draft_reply", label: "Draft Reply", description: "LLM reply draft from mail context (sanitized)", kind: "plan" },
      { id: "enrich_lead", label: "Enrich Lead", description: "Hunter/Apollo when keys set · demo otherwise", kind: "plan" },
      { id: "book_meeting", label: "Book Meeting", description: "Cal.com webhook from sequence CTA", kind: "digital" },
      { id: "run_demo_tour", label: "Demo Tour", description: "Lead → sequence → simulated send (no SMTP keys)", kind: "digital" },
      { id: "executive_brief", label: "Executive Brief", description: "L5 weekly impact digest + stall list", kind: "plan" },
      { id: "sort_tray", label: "Sort Tray", description: "Claw sorts by priority labels", kind: "physical" },
      { id: "move_to_tray", label: "Move to Tray", description: "Physical move via motor_out", kind: "physical" },
    ],
    fre: {
      welcomeTitle: "Welcome to Work Claw",
      welcomeLead: "Your outbound digital employee runs 24/7 on sovereign hardware — no cloud CRM, no leaked playbooks.",
      configureTitle: "Configure outbound desk",
      configureLead: "Name your pipeline and choose what Work Claw tracks first.",
      fields: [
        { id: "workspaceName", label: "Workspace name", type: "text", defaultValue: "Outreach Desk", required: true },
        {
          id: "growthIntent",
          label: "What best describes you right now?",
          type: "select",
          defaultValue: "student_hobbies",
          required: true,
          options: [
            { value: "student_hobbies", label: "Student, gamer, or hobby projects" },
            { value: "side_hustle", label: "Etsy, eBay, freelance, or creator side income" },
            { value: "nonprofit_advocacy", label: "Nonprofit, advocacy, or community operations" },
            { value: "solo_business", label: "Solo business or client acquisition" },
            { value: "executive_team", label: "Founder or executive team lead" },
          ],
        },
        {
          id: "organizingFirst",
          label: "What are you organizing first? (optional)",
          type: "select",
          defaultValue: "",
          options: [
            { value: "", label: "— pick later —" },
            { value: "school_applications", label: "School / applications" },
            { value: "shop_orders", label: "Shop or orders (Etsy, eBay)" },
            { value: "gaming_community", label: "Gaming / community" },
            { value: "creator_collabs", label: "Creator collabs" },
          ],
          help: "Sets your default message template pack for L1–L2.",
        },
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
          id: "secondarySmtpFrom",
          label: "Secondary mailbox (rotation)",
          type: "text",
          defaultValue: "",
          placeholder: "outbound2@yourdomain.com",
          help: "Optional second From address — round-robin on sequence sends (W23).",
        },
        {
          id: "sendStaggerMinutes",
          label: "Minutes between sends (stagger)",
          type: "text",
          defaultValue: "5",
          placeholder: "5",
        },
        {
          id: "autoSendOnActivate",
          label: "Auto-send step 1 on activate",
          type: "select",
          defaultValue: "default",
          options: [
            { value: "default", label: "Default (off in demo, on when SMTP live)" },
            { value: "true", label: "Always on" },
            { value: "false", label: "Always off — use scheduler" },
          ],
        },
        {
          id: "crmBackend",
          label: "CRM backend",
          type: "select",
          defaultValue: "local",
          options: [
            { value: "local", label: "Local work-queue.json" },
            { value: "twenty", label: "Twenty CRM sync" },
          ],
        },
        {
          id: "hubspotPortalId",
          label: "HubSpot portal ID",
          type: "text",
          defaultValue: "",
          placeholder: "12345678",
          help: "Optional — shown in connector vault when HubSpot OAuth is linked (W34).",
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
        {
          id: "outboundKillSwitch",
          label: "Outbound kill switch",
          type: "toggle",
          defaultValue: false,
          help: "When on, blocks all sequence sends until cleared on desk",
        },
        {
          id: "deskRole",
          label: "Desk role",
          type: "select",
          defaultValue: "operator",
          options: [
            { value: "viewer", label: "Viewer — read-only triage" },
            { value: "operator", label: "Operator — send + approve" },
            { value: "admin", label: "Admin — configure desk + roles" },
          ],
          help: "Team lite permissions — enforced on send/approve/assign (W33).",
        },
        {
          id: "deskOperatorId",
          label: "Operator handle",
          type: "text",
          defaultValue: "operator",
          placeholder: "alex",
          help: "Shown on assignee collision + Needs-you filter for shared inbox.",
        },
        {
          id: "warmupMode",
          label: "Warmup mode",
          type: "toggle",
          defaultValue: false,
          help: "Caps daily sends during domain warmup ramp",
        },
        {
          id: "warmupDailyCap",
          label: "Warmup daily cap",
          type: "text",
          defaultValue: "15",
          placeholder: "15",
        },
        {
          id: "physicalAddress",
          label: "CAN-SPAM physical address",
          type: "text",
          defaultValue: "",
          placeholder: "123 Main St, City, ST 00000",
        },
        {
          id: "optOutLine",
          label: "Opt-out footer line",
          type: "text",
          defaultValue: "Reply STOP to unsubscribe.",
        },
        {
          id: "stallThresholdDays",
          label: "Stall detection (days without touch)",
          type: "text",
          defaultValue: "7",
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
    tagline: "Sovereign multi-channel margin desk (preview showcase)",
    ootbLabel: "Arbitrage Claw",
    purpose: [
      "Merge Shopify COGS, eBay fulfillment, and Printify production cost into one spread matrix — receipt-gated via eno2.",
      "Demo ingest → sort → ship pipeline; live eBay rows when fulfillment bridge syncs.",
      "Preview showcase — Activate desk preview for GTM; production credentials on appliance.",
    ],
    howToUse: [
      "Overview: Activate live desk preview to sync all three channels (mock in dev).",
      "Margins: Shopify catalog sync · merged spread matrix across channels.",
      "Pipeline: eBay fulfillment ingest · Fulfillment: Printify POD costs.",
      "Chat: “Alert me when margin on SKU X exceeds 12%” — local brief until rules ship.",
    ],
    skills: [
      { id: "ingest_order", label: "Ingest Order", description: "Demo order + margin brief (L1+)", kind: "plan" },
      { id: "sort_sku", label: "Sort SKU", description: "Advance demo pipeline stage (L2+)", kind: "physical" },
      { id: "ship_bin", label: "Ship Bin", description: "Mark demo order ready (L3+)", kind: "plan" },
      { id: "retry_pick", label: "Retry Pick", description: "Re-run demo pick with vision (L3+)", kind: "physical" },
    ],
    fre: {
      welcomeTitle: "Welcome to Arbitrage Claw (Preview)",
      welcomeLead:
        "Preview showcase — multi-channel margin desk when Shopify, eBay, and Printify sync via eno2. Activate desk preview to see the live journey; real credentials link on your appliance.",
      configureTitle: "Desk setup",
      configureLead: "Name your desk and pick a persona. Spread watchlist seeds from FRE.",
      fields: [
        { id: "storeName", label: "Desk name", type: "text", defaultValue: "Arbitrage Desk", required: true },
        {
          id: "growthIntent",
          label: "What best describes your arbitrage journey?",
          type: "select",
          defaultValue: "learning_arbitrage",
          options: [
            { value: "learning_arbitrage", label: "Learning — watch spreads and try demo ingest" },
            { value: "side_hustle_flips", label: "Side hustle — Etsy, eBay, or retail arbitrage" },
            { value: "daily_fulfillment", label: "Operating — daily pick/pack/ship on the desk" },
            { value: "multi_channel_ops", label: "Wholesale — multi-channel margin and lanes" },
            { value: "desk_governance", label: "Desk lead — policy, audit, and delegation" },
          ],
        },
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
      activateTitle: "Activate Arbitrage Claw (preview)",
      activateTips: [
        "Preview mode — demo pipeline and spreads stay local until bridges ship.",
        "No Go Live checklist — this is not a flagship vertical yet.",
        "L1 unlocks Ingest Order only; pipeline skills unlock at L2+.",
        "Connect vision_in later for SKU verification during Sort SKU.",
      ],
    },
    bootMessage:
      "Arbitrage Claw preview. Activate live desk preview to merge Shopify, eBay, and Printify spreads — receipt-gated via eno2. Ask about a SKU margin or tap Ingest Order.",
  },
  "tesla-optimus-engine": {
    appId: "tesla-optimus-engine",
    agentName: "Signal Claw",
    tagline: "Humanoid home hub — teach, instruct, and relate before your robot arrives",
    ootbLabel: "Signal Claw",
    purpose: [
      "Home tab: name your humanoid, build relationship, track neural link readiness.",
      "Knowledge tab: house rules + CCP context packaged for robot memory on pair day.",
      "Routines tab: instruction templates — morning welcome, guest mode, quiet hours.",
      "Control tab: motor mesh preview for humanoid-class hardware when connected.",
    ],
    howToUse: [
      "Start on Home — name your unit and link Kin profiles for household context.",
      "Add house rules in Knowledge, then Push to mesh.",
      "Arm routines you want on pair day; chat: “What should my humanoid know about guests?”",
    ],
    skills: [
      { id: "push_knowledge", label: "Push Knowledge", description: "Publish rules + relationship to robot memory", kind: "plan" },
      { id: "sync_context", label: "Sync Context", description: "Refresh CCP + humanoid knowledge package", kind: "plan" },
      { id: "home_position", label: "Home Position", description: "Safe homing sequence (Control tab)", kind: "physical" },
      { id: "test_grip", label: "Test Grip", description: "Calibrated grip test", kind: "physical" },
      { id: "tune_joint", label: "Tune Joint", description: "Apply slider values to mesh", kind: "physical" },
      { id: "rl_step", label: "RL Step", description: "Single policy improvement step", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to your Humanoid Home Hub",
      welcomeLead:
        "Preview mode — set up the knowledge and relationship your home humanoid will inherit. Hardware pairing ships after appliance validation.",
      configureTitle: "Your first unit",
      configureLead: "Name and safety profile for humanoid-class robots. More robot types join later.",
      fields: [
        { id: "unitId", label: "Robot name", type: "text", defaultValue: "Home Humanoid", required: true },
        {
          id: "safetyProfile",
          label: "Safety profile",
          type: "select",
          defaultValue: "standard",
          options: [
            { value: "lab", label: "Lab — relaxed limits" },
            { value: "standard", label: "Standard — home balanced" },
            { value: "strict", label: "Strict — guests & children" },
          ],
        },
        { id: "enableRl", label: "Enable local RL loop (preview)", type: "toggle", defaultValue: true },
      ],
      activateTitle: "Enter preview mode",
      activateTips: [
        "Kin Claw teaches who lives here — Vital adds wellness context for morning routines.",
        "Push knowledge packages rules to mesh; your robot reads them on pair day.",
        "Control tab is mesh demo only — not live humanoid motion in this release.",
      ],
    },
    bootMessage:
      "Humanoid Home Hub preview online. Teach house rules, arm routines, push knowledge — ask what your robot will know about your home.",
  },
  "robotaxi-fleet-manager": {
    appId: "robotaxi-fleet-manager",
    agentName: "Swarm Claw",
    tagline: "Autonomous Robotaxi fleet operator (preview)",
    ootbLabel: "Swarm Claw",
    purpose: [
      "Preview: train dispatch on a geospatial grid with digital Claws and mesh simulators.",
      "Horizon: acquire many Tesla Robotaxis and run utilization, zones, and rebalance from your appliance.",
      "Cross-Claw workloads from Work and Capital — sovereign audit log, no cloud orchestration rent.",
    ],
    howToUse: [
      "Use the grid and fleet table to practice dispatch — live Tesla VIN pairing is coming soon.",
      "Chat: “Which unit has lowest latency?” or “Rebalance the swarm.”",
      "Read Robotaxi fleet horizon for the acquisition + autonomous ops roadmap.",
    ],
    skills: [
      { id: "assign_route", label: "Assign Route", description: "Dispatch selected unit", kind: "physical" },
      { id: "recall_vehicle", label: "Recall Vehicle", description: "Return unit to depot", kind: "physical" },
      { id: "ping_unit", label: "Ping Unit", description: "Latency check via mesh", kind: "plan" },
      { id: "rebalance", label: "Rebalance", description: "Spread load across grid", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Swarm Claw (preview)",
      welcomeLead:
        "Swarm Claw is your fleet command desk — today you train on digital Claws; tomorrow you orchestrate many Tesla Robotaxis as an autonomous fleet, all on-box.",
      configureTitle: "Fleet parameters",
      configureLead: "Define depot, fleet size, and dispatch policy (simulators until Tesla bridge ships).",
      fields: [
        {
          id: "growthIntent",
          label: "What best describes you right now?",
          type: "select",
          defaultValue: "learning_grid",
          required: true,
          options: [
            { value: "learning_grid", label: "Learning — explore the dispatch grid (preview)" },
            { value: "first_dispatch", label: "Dispatching — route simulators & digital Claws" },
            { value: "daily_coordination", label: "Planning — Robotaxi fleet acquisition path" },
            { value: "multi_depot_ops", label: "Fleet lead — multi-depot ops (coming soon)" },
            { value: "fleet_governance", label: "Commander — autonomous fleet governance (coming soon)" },
          ],
        },
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
        {
          id: "secondaryDepot",
          label: "Secondary depot (optional)",
          type: "select",
          defaultValue: "none",
          options: [
            { value: "none", label: "None — single depot" },
            ...["B1", "C1", "D1", "D4"].map((v) => ({ value: v, label: v })),
          ],
        },
      ],
      activateTitle: "Enter Swarm preview",
      activateTips: [
        "Preview mode — grid and simulators only; no live Tesla Robotaxi pairing yet.",
        "Select a vehicle in the grid before Assign Route.",
        "Robotaxi fleet horizon tab shows the acquisition roadmap honestly.",
      ],
    },
    bootMessage:
      "Swarm Claw online (preview). Grid dispatch works on simulators — Tesla Robotaxi fleet ops coming soon. Ask about latency or read the fleet horizon.",
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
      {
        id: "run_cafe_demo_tour",
        label: "Run Demo Tour",
        description: "Ingest Work + Forge stubs and celebrate ascension",
        kind: "plan",
      },
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
      configureLead: "Choose channels, content tone, and your creator stage.",
      fields: [
        {
          id: "growthIntent",
          label: "What best describes you right now?",
          type: "select",
          defaultValue: "hobby_learning",
          required: true,
          options: [
            { value: "hobby_learning", label: "Hobbyist or learning to post online" },
            { value: "side_income", label: "Side income — Etsy, freelance, aspiring creator" },
            { value: "recurring_publisher", label: "Publishing on a schedule for a brand or community" },
            { value: "brand_marketing", label: "Brand marketing — multi-channel content ops" },
            { value: "creator_studio", label: "Studio or team — delegate publish and review" },
          ],
        },
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
      configureTitle: "Wealth persona & risk",
      configureLead: "Pick your investing stage — watchlist and paper defaults follow your persona.",
      fields: [
        {
          id: "growthIntent",
          label: "What best describes you right now?",
          type: "select",
          defaultValue: "learning_investing",
          required: true,
          options: [
            { value: "learning_investing", label: "Learning — first watchlist and practice trades" },
            { value: "building_wealth", label: "Building — simple rules and pilots on paper" },
            { value: "operating_rules", label: "Operating — daily desk, auto-approval, PFM" },
            { value: "allocating_portfolio", label: "Allocating — multi-broker, agents, analytics" },
            { value: "principal_governance", label: "Principal — live capital policy and delegation" },
          ],
        },
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
    tagline: "Longevity desk — vitals, labs, longevity Q&A, and health protocol",
    ootbLabel: "Vital Claw",
    purpose: [
      "Ingest wearable vitals (Oura, Apple Health, Samsung Health, Garmin, Whoop) via local bridges.",
      "Answer health and longevity questions — Sinclair, Blueprint / Don't Die, Attia, and related science (preview Lab).",
      "Store medical reports, maintain a longevity protocol, and publish health context to Claw Context mesh.",
    ],
    howToUse: [
      "Open Longevity Lab — personalized Q&A, protocol diff, and clinician export are live on-box.",
      "Run demo tour on Go Live — syncs vitals, asks Lab, publishes mesh for Kin/Optimus.",
      "Wearable bridges are preview until eno2 — Connect marks local state only.",
    ],
    skills: [
      { id: "ask_longevity", label: "Ask Longevity", description: "Personalized Q&A — vitals, labs, local RAG + LLM", kind: "plan" },
      { id: "sync_wearables", label: "Sync Wearables", description: "Demo vitals refresh on-box (live eno2 pull pending)", kind: "plan" },
      { id: "ingest_report", label: "Ingest Report", description: "Add summary to vault — PDF OCR preview until eno2", kind: "plan" },
      { id: "update_protocol", label: "Update Protocol", description: "Refresh longevity steps locally by focus", kind: "plan" },
      { id: "publish_context", label: "Publish Context", description: "Push vitals + protocol to CCP mesh", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Welcome to Vital Claw",
      welcomeLead: "Your longevity employee runs on sovereign hardware — vitals and protocols stay on-box until you choose to share.",
      configureTitle: "Health sources",
      configureLead: "Select wearables and apps to sync.",
      fields: [
        {
          id: "growthIntent",
          label: "What best describes you right now?",
          type: "select",
          defaultValue: "wellness_basics",
          required: true,
          options: [
            { value: "wellness_basics", label: "Starter — learn vitals and a simple protocol" },
            { value: "daily_tracking", label: "Tracker — wearables and health app bridges" },
            { value: "optimize_protocol", label: "Optimizer — reports, diet sync, mesh publish" },
            { value: "athletic_performance", label: "Athlete — trends, recovery, performance analytics" },
            { value: "longevity_mastery", label: "Longevity — full desk, labs vault, CCP governance" },
          ],
        },
        {
          id: "wearableSources",
          label: "Wearable sources",
          type: "multiselect",
          defaultValue: ["oura", "apple_health"],
          options: [
            { value: "oura", label: "Oura Ring" },
            { value: "apple_health", label: "Apple Health" },
            { value: "samsung_health", label: "Samsung Health" },
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
    bootMessage:
      "Vital Claw online (preview). Open Ask / Lab for Sinclair, Blueprint, and Attia preview Q&A — or ask about sleep, vitals, and protocol.",
  },
  "my-family": {
    appId: "my-family",
    agentName: "Kin Claw",
    tagline: "Who lives in your home — so Optimus, Vital, and every Claw personalize per person (preview)",
    ootbLabel: "Kin Claw",
    purpose: [
      "Give each household member their own identity on the appliance — partner, kids, elders, guests.",
      "Optimus (Signal Claw) will use profiles for guest-aware tone and physical interactions — preview until family mode ships.",
      "Vital Claw will route wearables, labs, and longevity advice per member — not one blended health profile.",
      "Kin publishes family scope to the Claw Context mesh today; profile storage and resync work locally.",
    ],
    howToUse: [
      "Add your partner and kids — each gets role, communication style, and shared scopes.",
      "Show the showcase cards to buyers: this is why CurXor beats a single-user AI box.",
      "Resync mesh after changes so subscribed Claws pick up family.members.* keys.",
    ],
    skills: [
      { id: "add_member", label: "Add Member", description: "Create a new household profile", kind: "plan" },
      { id: "bind_device", label: "Bind Device", description: "Link watch, phone, or robot to profile", kind: "plan" },
      { id: "resync_mesh", label: "Resync Mesh", description: "Publish family context to CCP", kind: "plan" },
    ],
    fre: {
      welcomeTitle: "Kin Claw — preview mode",
      welcomeLead:
        "CurXor should know your household — not treat your kids like you. Kin is the identity layer: Optimus gets guest-aware tone, Vital gets per-member health, every Claw gets the right person. Preview mode: profiles and mesh sync work today; full routing ships later.",
      configureTitle: "Household setup",
      configureLead: "Name your household and tell us who you are coordinating for.",
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
        {
          id: "growthIntent",
          label: "What best describes your household role?",
          type: "select",
          defaultValue: "solo_member",
          options: [
            { value: "solo_member", label: "Just me — personal context on the box" },
            { value: "helper_roommate", label: "Partner or roommate — shared basics" },
            { value: "household_coordinator", label: "Parent or coordinator — schedules and devices" },
            { value: "family_steward", label: "Household admin — scopes and guests" },
            { value: "multigen_elder", label: "Multigenerational — elder care and delegation" },
          ],
        },
      ],
      activateTitle: "Activate Kin Claw (preview)",
      activateTips: [
        "Add partner and kids now — demo the Optimus + Vital story even in preview.",
        "Optimus guest mode reads family context when Signal Claw exits preview.",
        "Vital household routing ties vitals to the right profile — not one shared blob.",
        "Profiles persist to /etc/curxor/family-profiles.json on your appliance.",
      ],
    },
    bootMessage:
      "Kin Claw ready (preview). Add your partner or kids — each profile is who Optimus and Vital will recognize. Ask how household context flows to the mesh.",
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
      { id: "run_forge_demo_tour", label: "Run Demo Tour", description: "Mint demo framework desk", kind: "plan" },
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
        {
          id: "forgeGrowthIntent",
          label: "What best describes your forge maturity?",
          type: "select",
          defaultValue: "first_claw",
          options: [
            { value: "first_claw", label: "First claw — learning the factory" },
            { value: "side_projects", label: "Side projects — a few bots" },
            { value: "custom_stacks", label: "Custom stacks — tuning models" },
            { value: "templates_import", label: "Templates & import power-user" },
            { value: "fleet_operator", label: "Fleet operator — governance" },
          ],
        },
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
