import {
  EXPERIENCE_LEVEL_ORDER,
  meetsExperienceLevel,
  type ExperienceLevel,
} from "./experience-level";
import type { OotbAppId } from "./ootb-apps";

export interface ExperienceCoachTip {
  id: string;
  /** Show at this level and above (inclusive). */
  minLevel: ExperienceLevel;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface ExperienceCoachSection {
  sectionId: string;
  tips: ExperienceCoachTip[];
}

const GLOBAL_TIPS: ExperienceCoachTip[] = [
  {
    id: "global-level-beginner",
    minLevel: "beginner",
    title: "You're in Beginner mode",
    body: "We show essentials first. Change your level anytime in Settings → Appearance.",
    actionLabel: "Open Settings",
    actionHref: "/settings",
  },
  {
    id: "global-level-standard",
    minLevel: "standard",
    title: "Standard mode",
    body: "Analytics, approval gates, and engage tools are available. Expert mode unlocks ops controls and experiments.",
  },
];

const APP_TIPS: Partial<Record<OotbAppId, ExperienceCoachSection[]>> = {
  "my-content-creator": [
    {
      sectionId: "creation-studio",
      tips: [
        {
          id: "cc-studio-beginner",
          minLevel: "beginner",
          title: "Start with one post",
          body: "Pick a channel, write a draft, generate a thumbnail, then schedule. Growth level: Maker (full leveling UX coming).",
        },
        {
          id: "cc-studio-standard",
          minLevel: "standard",
          title: "Fan out when ready",
          body: "After your seed post looks good, use Fan Out to adapt across channels — auto-schedule uses your learned best times.",
        },
      ],
    },
    {
      sectionId: "calendar",
      tips: [
        {
          id: "cc-calendar-beginner",
          minLevel: "beginner",
          title: "Drag to reschedule",
          body: "Posts on the calendar can be dragged to a new day. Enable auto-schedule in setup to fill optimal slots per platform.",
        },
      ],
    },
    {
      sectionId: "preflight",
      tips: [
        {
          id: "cc-preflight-standard",
          minLevel: "standard",
          title: "Pre-flight checks",
          body: "Fix errors before approval — char limits, media, brand rules, and bridge readiness are validated here.",
        },
      ],
    },
    {
      sectionId: "approval",
      tips: [
        {
          id: "cc-approval-standard",
          minLevel: "standard",
          title: "Approve from Telegram",
          body: "Set CURXOR_APPROVAL_TELEGRAM_CHAT_IDS to /approve or /reject without opening the dashboard.",
        },
      ],
    },
    {
      sectionId: "engage",
      tips: [
        {
          id: "cc-engage-standard",
          minLevel: "standard",
          title: "Engage inbox",
          body: "Comments and mentions land here. Draft a reply, queue it, and publish through the same bridge gate as posts.",
        },
        {
          id: "cc-engage-expert",
          minLevel: "expert",
          title: "Triage rules",
          body: "VIP authors and keyword rules boost priority. Archive spam patterns automatically.",
        },
      ],
    },
    {
      sectionId: "ops",
      tips: [
        {
          id: "cc-ops-expert",
          minLevel: "expert",
          title: "Ops controls",
          body: "Pause all publishing in crisis mode. Weekly digest summarizes performance and bridge health to Telegram.",
        },
      ],
    },
    {
      sectionId: "experiments",
      tips: [
        {
          id: "cc-experiments-expert",
          minLevel: "expert",
          title: "Structured experiments",
          body: "Assign hook or thumb variants at fan-out. Winners auto-apply after your view threshold.",
        },
      ],
    },
    {
      sectionId: "draft-editor",
      tips: [
        {
          id: "cc-draft-beginner",
          minLevel: "beginner",
          title: "Edit before publish",
          body: "Draft text saves locally. Platform hints under the char count show media and env requirements per channel.",
        },
      ],
    },
    {
      sectionId: "reply-queue",
      tips: [
        {
          id: "cc-reply-standard",
          minLevel: "standard",
          title: "Thread replies",
          body: "Queue replies to published threads — they follow the same approval gate as posts before sending.",
        },
      ],
    },
    {
      sectionId: "pinterest-board",
      tips: [
        {
          id: "cc-pinterest-expert",
          minLevel: "expert",
          title: "Board override",
          body: "Set PINTEREST_DEFAULT_BOARD_ID globally in digital.env, or override per post here before publish.",
        },
      ],
    },
    {
      sectionId: "bridge",
      tips: [
        {
          id: "cc-bridge-standard",
          minLevel: "standard",
          title: "Bridge health",
          body: "OAuth expiry, rate limits, and last publish errors — fix hints point to digital.env keys.",
        },
      ],
    },
    {
      sectionId: "bridge-roadmap",
      tips: [
        {
          id: "cc-bridge-roadmap-expert",
          minLevel: "expert",
          title: "Bridge roadmap",
          body: "Planned vs live bridges across platforms — use this to prioritize OAuth setup before fan-out.",
        },
      ],
    },
    {
      sectionId: "analytics",
      tips: [
        {
          id: "cc-analytics-standard",
          minLevel: "standard",
          title: "Performance metrics",
          body: "Local metrics store plus live X/LinkedIn pulls. Hook and thumbnail scores feed experiment winners.",
        },
      ],
    },
    {
      sectionId: "queue",
      tips: [
        {
          id: "cc-queue-beginner",
          minLevel: "beginner",
          title: "Content queue",
          body: "Every draft lives here — click a row to edit, inspect, or publish. Stages show where each post is in the pipeline.",
        },
      ],
    },
    {
      sectionId: "campaigns",
      tips: [
        {
          id: "cc-campaigns-standard",
          minLevel: "standard",
          title: "Campaign fan-out",
          body: "One master story fans out to many channels — track linked posts per platform in each campaign card.",
        },
      ],
    },
    {
      sectionId: "export",
      tips: [
        {
          id: "cc-export-expert",
          minLevel: "expert",
          title: "Export & API tools",
          body: "ZIP manifest export and REST tools at /api/content/tools for automation outside the dashboard.",
        },
      ],
    },
    {
      sectionId: "playbooks",
      tips: [
        {
          id: "cc-playbooks-beginner",
          minLevel: "beginner",
          title: "Playbook studio",
          body: "Pick a playbook to seed a new post or apply its draft template to your selected queue item.",
        },
      ],
    },
    {
      sectionId: "brand-studio",
      tips: [
        {
          id: "cc-brand-standard",
          minLevel: "standard",
          title: "Brand studio",
          body: "Style guide and voice rules feed pre-flight scoring. Enable trackLinks for UTM + click attribution.",
        },
      ],
    },
    {
      sectionId: "library",
      tips: [
        {
          id: "cc-library-standard",
          minLevel: "standard",
          title: "Content library",
          body: "Save winners as evergreen assets — heartbeat auto-recycles on your interval into the schedule queue.",
        },
      ],
    },
    {
      sectionId: "ig-grid",
      tips: [
        {
          id: "cc-ig-grid-standard",
          minLevel: "standard",
          title: "IG grid planner",
          body: "Preview your next nine Instagram slots before publish — fix missing images early.",
        },
      ],
    },
    {
      sectionId: "attribution",
      tips: [
        {
          id: "cc-attribution-standard",
          minLevel: "standard",
          title: "Link attribution",
          body: "Outbound links auto-tag with UTM. Clicks route through /api/content/click for funnel reporting.",
        },
      ],
    },
    {
      sectionId: "team-review",
      tips: [
        {
          id: "cc-team-expert",
          minLevel: "expert",
          title: "Team review",
          body: "Leave request-changes notes on drafts — complements Telegram/Slack approval for multi-reviewer workflows.",
        },
      ],
    },
    {
      sectionId: "go-live",
      tips: [
        {
          id: "cc-golive-beginner",
          minLevel: "beginner",
          title: "Go live checklist",
          body: "Complete channels, bridges, and your first scheduled post here. The Today strip shows what's next without hunting panels.",
        },
      ],
    },
    {
      sectionId: "recovery",
      tips: [
        {
          id: "cc-recovery-standard",
          minLevel: "standard",
          title: "Publish recovery",
          body: "Failed bridge publishes land here with fix hints. Retry after fixing OAuth or media — dismiss once resolved.",
        },
      ],
    },
    {
      sectionId: "content-plan",
      tips: [
        {
          id: "cc-plan-beginner",
          minLevel: "beginner",
          title: "Fill your week",
          body: "Gap detection shows empty channel days. Fill week pulls from evergreen library and playbooks automatically.",
        },
      ],
    },
    {
      sectionId: "signal-feed",
      tips: [
        {
          id: "cc-signal-expert",
          minLevel: "expert",
          title: "Signal → draft",
          body: "Trend items from Signal Claw appear here. Draft reactive posts to queue with one click — expert-only cross-Claw hook.",
        },
      ],
    },
  ],
  "my-work": [
    {
      sectionId: "go-live",
      tips: [
        {
          id: "work-go-live-beginner",
          minLevel: "beginner",
          title: "Get set up",
          body: "Complete the checklist: add an opportunity, try a message template, and run the demo tour. Email setup is optional at Explorer level.",
        },
        {
          id: "work-go-live-l1",
          minLevel: "beginner",
          title: "Explorer desk",
          body: "Focus on people waiting, tasks, and templates. No CRM jargon — simulated sends are safe without SMTP.",
        },
      ],
    },
    {
      sectionId: "start-home",
      tips: [
        {
          id: "work-start-home-l1",
          minLevel: "beginner",
          title: "Start home",
          body: "People waiting shows unassigned mail. Pick a template pack for polished replies — templates also seed reminder tasks.",
        },
      ],
    },
    {
      sectionId: "pipeline",
      tips: [
        {
          id: "work-pipeline-beginner",
          minLevel: "beginner",
          title: "Opportunities",
          body: "Track who you're talking to from new → contacted → replied. All data stays on-appliance in work-queue.json.",
        },
      ],
    },
    {
      sectionId: "tasks",
      tips: [
        {
          id: "work-beginner",
          minLevel: "beginner",
          title: "Task matrix",
          body: "Tap tasks to complete them. Outreach Claw prioritizes P1 items in the outbound queue.",
        },
      ],
    },
    {
      sectionId: "comms",
      tips: [
        {
          id: "work-comms-standard",
          minLevel: "standard",
          title: "Unified inbox",
          body: "All channel conversations in one place — Telegram, Slack, WhatsApp, and dashboard chat route to the right Claw.",
        },
      ],
    },
    {
      sectionId: "sequences",
      tips: [
        {
          id: "work-sequences-standard",
          minLevel: "standard",
          title: "Multi-step sequences",
          body: "Draft with the agent, personalize with {{name}} and {{company}}, activate to send step 1. Follow-ups schedule automatically with delay days.",
        },
      ],
    },
    {
      sectionId: "outbound",
      tips: [
        {
          id: "work-outbound-standard",
          minLevel: "standard",
          title: "Outbound sequences",
          body: "Use the agent panel to draft cold sequences — Sort Tray skill stages leads in the queue.",
        },
      ],
    },
    {
      sectionId: "sync-log",
      tips: [
        {
          id: "work-sync-expert",
          minLevel: "expert",
          title: "Local sync log",
          body: "Calendar and mail events stay on-appliance — zero cloud calls for privacy.",
        },
      ],
    },
  ],
  "my-vital": [
    {
      sectionId: "protocol",
      tips: [
        {
          id: "vital-protocol-beginner",
          minLevel: "beginner",
          title: "Your protocol",
          body: "Vital Claw generates a longevity protocol from your vitals. Chat or use Update Protocol to adjust steps.",
        },
      ],
    },
    {
      sectionId: "bridges",
      tips: [
        {
          id: "vital-bridges-standard",
          minLevel: "standard",
          title: "Health app bridges",
          body: "Connect wearables and health apps via eno2 bridges — vitals sync to the Claw Context mesh.",
        },
      ],
    },
  ],
  "my-family": [
    {
      sectionId: "members",
      tips: [
        {
          id: "kin-members-beginner",
          minLevel: "beginner",
          title: "Household profiles",
          body: "Select a member to see their personality and shared scopes. Profiles feed Optimus, Vital, and Outreach.",
        },
      ],
    },
    {
      sectionId: "profile",
      tips: [
        {
          id: "kin-profile-beginner",
          minLevel: "beginner",
          title: "Channel handles",
          body: "Link WhatsApp, Telegram, or iMessage handles so inbound messages route to the right family member.",
        },
      ],
    },
    {
      sectionId: "add-member",
      tips: [
        {
          id: "kin-add-standard",
          minLevel: "standard",
          title: "Add members",
          body: "New profiles sync across subscribed Claws. Use Resync mesh after linking handles.",
        },
      ],
    },
  ],
  "my-shop": [
    {
      sectionId: "pipeline",
      tips: [
        {
          id: "shop-pipeline-beginner",
          minLevel: "beginner",
          title: "Fulfillment stages",
          body: "Select an order, then use Ingest Order, Sort SKU, Retry Pick, or Ship Bin skills to advance stages.",
        },
        {
          id: "shop-pipeline-standard",
          minLevel: "standard",
          title: "Margin watch",
          body: "Arbitrage Claw tracks sort rate from motor telemetry — connect vision for pick verification.",
        },
      ],
    },
  ],
  "robotaxi-fleet-manager": [
    {
      sectionId: "grid",
      tips: [
        {
          id: "swarm-grid-beginner",
          minLevel: "beginner",
          title: "Dispatch grid",
          body: "Click a cell to set the dispatch target, select a vehicle, then run Assign Route in the agent panel.",
        },
      ],
    },
    {
      sectionId: "fleet",
      tips: [
        {
          id: "swarm-fleet-standard",
          minLevel: "standard",
          title: "Fleet status",
          body: "Monitor latency and charge per unit. Recall Vehicle returns a unit to the depot grid cell.",
        },
      ],
    },
  ],
  "claw-cafe": [
    {
      sectionId: "lanes",
      tips: [
        {
          id: "engage-lanes-beginner",
          minLevel: "beginner",
          title: "Engage lanes",
          body: "Pick a lane, run Start Game or Drop Claw skills. Lane A shows live vision when the mesh is connected.",
        },
      ],
    },
    {
      sectionId: "guest-queue",
      tips: [
        {
          id: "engage-queue-standard",
          minLevel: "standard",
          title: "Guest queue",
          body: "Tracks in-person engagements — mirror this pattern for DM triage in Creator Claw Engage inbox.",
        },
      ],
    },
  ],
  "tesla-optimus-engine": [
    {
      sectionId: "torque",
      tips: [
        {
          id: "signal-torque-beginner",
          minLevel: "beginner",
          title: "Joint limits",
          body: "Adjust torque sliders, then use Tune Joint skill — changes publish to motor_out on the mesh.",
        },
      ],
    },
    {
      sectionId: "rl",
      tips: [
        {
          id: "signal-rl-expert",
          minLevel: "expert",
          title: "RL policy",
          body: "Exploration ε and local epoch training — enable RL in FRE before running RL Step skill.",
        },
      ],
    },
  ],
  "claw-forge": [
    {
      sectionId: "intent",
      tips: [
        {
          id: "forge-intent-beginner",
          minLevel: "beginner",
          title: "Forge a Claw",
          body: "Describe your mission, attach a photo or enable live vision, then follow the wizard to provision.",
        },
      ],
    },
    {
      sectionId: "fleet",
      tips: [
        {
          id: "forge-fleet-standard",
          minLevel: "standard",
          title: "Fleet registry",
          body: "Every provisioned Claw gets a profile here. Active profile writes to engine.env.d on the appliance.",
        },
      ],
    },
  ],
  "my-capital": [
    {
      sectionId: "go-live",
      tips: [
        {
          id: "cap-go-live-beginner",
          minLevel: "beginner",
          title: "Go live checklist",
          body: "Demo mode is fine without Alpaca keys — create a rule, arm it, execute locally. Growth level: Learner (full leveling UX coming).",
        },
        {
          id: "cap-demo-release",
          minLevel: "beginner",
          title: "Demo release",
          body: "Current build ships demo-only: sample portfolio, PFM, pilots, and trade log. Broker linking is on the RELEASE-NEXT todo when you are ready.",
        },
      ],
    },
    {
      sectionId: "portfolio",
      tips: [
        {
          id: "cap-beginner",
          minLevel: "beginner",
          title: "Paper trading first",
          body: "Capital Claw defaults to demo mode without digital.env keys. Paper bridge and live money are optional — see Go Live when ready.",
        },
        {
          id: "cap-standard",
          minLevel: "standard",
          title: "Rule engine",
          body: "Arm a rule, then Execute Trade sends intents through the digital bridge — never direct API from the LLM.",
        },
      ],
    },
    {
      sectionId: "research",
      tips: [
        {
          id: "cap-research-beginner",
          minLevel: "beginner",
          title: "Start with a ticker",
          body: "Enter a symbol or tap a watchlist chip. You get price, a one-line smart take, and top CNBC headlines — no account needed.",
        },
        {
          id: "cap-research-standard",
          minLevel: "standard",
          title: "Chart + social chatter",
          body: "Standard mode adds the 3-month chart, fundamentals grid, and WSB / Reddit / FinTwit posts blended into sentiment.",
        },
        {
          id: "cap-research-expert",
          minLevel: "expert",
          title: "Full intel depth",
          body: "Expert shows engagement counts, sentiment score, avg volume, and extended chatter — link X_BEARER_TOKEN in digital.env for live FinTwit.",
        },
      ],
    },
    {
      sectionId: "digest",
      tips: [
        {
          id: "cap-digest-standard",
          minLevel: "standard",
          title: "Watchlist digest",
          body: "Headlines and social posts from Alpaca, CNBC, SEC 8-K, WSB, and FinTwit merge for your FRE watchlist. Tap any $TICKER to open full research.",
        },
        {
          id: "cap-digest-expert",
          minLevel: "expert",
          title: "Full feed",
          body: "Expert shows timestamps, sentiment labels, and the complete digest list refreshed on heartbeat.",
        },
      ],
    },
    {
      sectionId: "intel-alerts",
      tips: [
        {
          id: "cap-alerts-standard",
          minLevel: "standard",
          title: "Intel alerts",
          body: "Set dip or sentiment alerts — heartbeat evaluates them and nudges Telegram/Slack when conditions hit.",
        },
      ],
    },
    {
      sectionId: "pilots",
      tips: [
        {
          id: "cap-pilots-beginner",
          minLevel: "beginner",
          title: "Copy trading on-box",
          body: "Pick a demo pilot, set an allocation, and Capital Claw mirrors proportional paper trades — sovereign Autopilot-style, no third-party app.",
        },
      ],
    },
    {
      sectionId: "risk",
      tips: [
        {
          id: "cap-risk-beginner",
          minLevel: "beginner",
          title: "Permissions first",
          body: "Autonomous mode stays off until you grant it. Crisis pause halts all rule evaluation and pilot sync immediately.",
        },
      ],
    },
    {
      sectionId: "auto-approval",
      tips: [
        {
          id: "cap-auto-approval-standard",
          minLevel: "standard",
          title: "Auto-approval stack",
          body: "Set a max notional and keep paper-only on at launch. Armed rules and PFM suggestions skip pending_approval when risk guard passes.",
        },
        {
          id: "cap-auto-approval-expert",
          minLevel: "expert",
          title: "Preview before live",
          body: "Use preview_trade on the status API to check autoApproveEligible and risk notes before enabling pilot copy or TradingView auto-submit.",
        },
      ],
    },
    {
      sectionId: "pfm",
      tips: [
        {
          id: "cap-pfm-standard",
          minLevel: "standard",
          title: "Mint-style PFM on-box",
          body: "Linked accounts, category spend, and wealth goals run locally — demo seed until you wire Plaid. Tap a suggestion to create a dip rule or bump a goal.",
        },
      ],
    },
    {
      sectionId: "agent-trading",
      tips: [
        {
          id: "cap-agent-trading-standard",
          minLevel: "standard",
          title: "Claw / MCP trading",
          body: "Connect Claude or Cursor to /api/capital/mcp — review_equity_order before place_equity_order. Keep requireAgentPreview on until you trust auto-approval caps.",
        },
        {
          id: "cap-agent-trading-expert",
          minLevel: "expert",
          title: "Kill switch & audit",
          body: "Agent kill switch blocks all MCP and Claw chat trades instantly. Every preview and execution lands in the agent audit log with source and trade ID.",
        },
      ],
    },
    {
      sectionId: "portfolio-health",
      tips: [
        {
          id: "cap-portfolio-health-standard",
          minLevel: "standard",
          title: "Health score",
          body: "Concentration and sector weights update from Alpaca positions. Scores below 65 or single-name >45% trigger rebalance hints.",
        },
      ],
    },
    {
      sectionId: "trades",
      tips: [
        {
          id: "cap-trades-standard",
          minLevel: "standard",
          title: "Trade log",
          body: "Every paper order is logged locally. Failed Alpaca submissions appear in Trade Recovery — retry without re-arming the rule.",
        },
      ],
    },
    {
      sectionId: "recovery",
      tips: [
        {
          id: "cap-recovery-standard",
          minLevel: "standard",
          title: "Trade recovery",
          body: "Bridge errors (auth, market hours, invalid symbol) land here. Fix digital.env then retry the trade ID.",
        },
      ],
    },
    {
      sectionId: "pfm",
      tips: [
        {
          id: "cap-pfm-standard",
          minLevel: "standard",
          title: "Mint-style PFM on-box",
          body: "Demo accounts show cash flow, spending categories, and wealth goals. Suggestions can arm dip rules or subscribe pilots — never bypass risk guard.",
        },
      ],
    },
    {
      sectionId: "auto-approval",
      tips: [
        {
          id: "cap-auto-approval-standard",
          minLevel: "standard",
          title: "Auto-approval stack",
          body: "Paper-first notional caps skip pending_approval when risk guard passes. Pilot copy and TradingView stay off by default.",
        },
      ],
    },
    {
      sectionId: "portfolio-health",
      tips: [
        {
          id: "cap-health-expert",
          minLevel: "expert",
          title: "Portfolio health",
          body: "Concentration and sector mix scores help spot drift before pilot sync or rebalance rules fire.",
        },
      ],
    },
  ],
};

export function coachTipsForSection(
  appId: OotbAppId,
  sectionId: string,
  level: ExperienceLevel,
): ExperienceCoachTip[] {
  const sections = APP_TIPS[appId] ?? [];
  const section = sections.find((s) => s.sectionId === sectionId);
  return (section?.tips ?? []).filter((t) => meetsExperienceLevel(level, t.minLevel));
}

/** Best matching tip for section at user's level. */
export function primaryCoachTip(
  appId: OotbAppId,
  sectionId: string,
  level: ExperienceLevel,
): ExperienceCoachTip | null {
  const tips = coachTipsForSection(appId, sectionId, level);
  const exact = tips.find((t) => t.minLevel === level);
  if (exact) return exact;
  if (tips.length === 0) {
    return level === "beginner" ? GLOBAL_TIPS[0] ?? null : null;
  }
  return [...tips].sort(
    (a, b) => EXPERIENCE_LEVEL_ORDER[b.minLevel] - EXPERIENCE_LEVEL_ORDER[a.minLevel],
  )[0]!;
}
