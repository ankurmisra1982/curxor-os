export type LeadStage = "new" | "contacted" | "replied" | "qualified" | "won" | "lost";

export type TaskPriority = "P1" | "P2" | "P3";

export type SequenceStatus = "draft" | "active" | "paused" | "completed" | "replied" | "bounced";

export type SequenceStepKind = "email" | "wait" | "task";

export type SendStatus = "queued" | "pending_approval" | "sent" | "failed" | "skipped";

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
  sentAt: string | null;
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
}

export interface WorkQueueFile {
  version: 1;
  updatedAt: string;
  leads: WorkLead[];
  tasks: WorkTask[];
  sequences: WorkSequence[];
  sends: OutboundSend[];
  mailIndex: MailIndexEntry[];
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
  };
}
