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
          body: "Pick a channel, write a draft, generate a thumbnail, then schedule. Use the wizard button for a step-by-step flow.",
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
      sectionId: "portfolio",
      tips: [
        {
          id: "cap-beginner",
          minLevel: "beginner",
          title: "Paper trading first",
          body: "Capital Claw defaults to paper mode until you configure Alpaca in digital.env and switch trading mode in setup.",
        },
        {
          id: "cap-standard",
          minLevel: "standard",
          title: "Rule engine",
          body: "Arm a rule, then Execute Trade sends intents through the digital bridge — never direct API from the LLM.",
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
