export type LeadStage = "new" | "contacted" | "replied" | "qualified" | "won" | "lost";

export type TaskPriority = "P1" | "P2" | "P3";

export type SequenceStatus = "draft" | "active" | "paused" | "completed" | "replied" | "bounced";

export type SequenceStepKind = "email" | "wait" | "task";

export type SendStatus = "queued" | "pending_approval" | "sent" | "simulated" | "failed" | "skipped";

export type ReplyIntent = "interested" | "objection" | "ooo" | "neutral" | "unknown";

export type SubjectVariant = "a" | "b";

export interface WorkLead {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  stage: LeadStage;
  tags: string[];
  notes: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  lastTouchAt: string | null;
}

export interface WorkTask {
  id: string;
  title: string;
  priority: TaskPriority;
  done: boolean;
  leadId: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStep {
  id: string;
  kind: SequenceStepKind;
  delayDays: number;
  subject: string;
  /** A/B variant B subject — picked per lead at send time */
  subjectAlt?: string;
  subjectVariant?: SubjectVariant;
  body: string;
  sentAt: string | null;
  scheduledAt: string | null;
}

export interface WorkSequence {
  id: string;
  name: string;
  leadId: string;
  status: SequenceStatus;
  steps: SequenceStep[];
  currentStepIndex: number;
  pauseOnReply: boolean;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
}

export interface OutboundSend {
  id: string;
  sequenceId: string;
  stepId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  status: SendStatus;
  subjectVariant?: SubjectVariant;
  sentAt: string | null;
  openedAt?: string | null;
  repliedAt?: string | null;
  error: string | null;
  createdAt: string;
}

export interface MailIndexEntry {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  leadId: string | null;
  matchedReply: boolean;
  replyIntent?: ReplyIntent;
}

export interface WorkSyncLogEntry {
  id: string;
  connector: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface WorkQueueFile {
  version: 1;
  updatedAt: string;
  leads: WorkLead[];
  tasks: WorkTask[];
  sequences: WorkSequence[];
  sends: OutboundSend[];
  mailIndex: MailIndexEntry[];
  syncLog?: WorkSyncLogEntry[];
}

export interface WorkConnectorVaultSummary {
  total: number;
  live: number;
  configured: number;
  ready: number;
  degraded: number;
  authExpired: number;
  unconfigured: number;
  planned: number;
}

export interface WorkConnectorHealthRow {
  id: string;
  label: string;
  tier: string;
  tool: string | null;
  configured: boolean;
  health: "live" | "degraded" | "auth_expired" | "unconfigured" | "planned";
  healthLabel: string;
  missingEnvKeys: string[];
  fixHints: string[];
}

export interface WorkConnectorVaultReport {
  digitalEnvPath: string;
  updatedAt: string;
  summary: WorkConnectorVaultSummary;
  connectors: WorkConnectorHealthRow[];
  commsPathReady: boolean;
}

export interface WorkQueueStatus {
  source: "live" | "demo";
  bridgeConfigured: boolean;
  workspaceName: string;
  focusAreas: string[];
  clawLane: string;
  leads: WorkLead[];
  tasks: WorkTask[];
  sequences: WorkSequence[];
  sends: OutboundSend[];
  mailIndex: MailIndexEntry[];
  updatedAt: string;
  stats: {
    openTasks: number;
    activeSequences: number;
    leadsInPipeline: number;
    repliesThisWeek: number;
    pendingSends: number;
    sendsToday: number;
  };
  sendPolicy: {
    dailySendLimit: number;
    sendStaggerMinutes: number;
    sendsToday: number;
    remainingToday: number;
  };
  analytics: {
    sentCount: number;
    openedCount: number;
    repliedCount: number;
    openRate: number | null;
    replyRate: number | null;
    replyIntentBreakdown: Record<ReplyIntent, number>;
  };
  connectorVault?: WorkConnectorVaultReport;
  syncLog?: WorkSyncLogEntry[];
  autoSendOnActivate?: boolean;
  autoSendDefault?: boolean;
}
