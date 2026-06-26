export type PatronOpsColumn = "needs_you" | "in_progress" | "waiting_confirm" | "closed";

export interface PatronOpsItem {
  id: string;
  column: PatronOpsColumn;
  title: string;
  detail: string;
  href: string | null;
  clawShort: string | null;
  at: string;
}

export interface PatronOpsBoard {
  columns: Record<PatronOpsColumn, PatronOpsItem[]>;
  topActions: PatronOpsItem[];
  stats: {
    pendingApprovals: number;
    channelSessions: number;
    engagePending: number;
  };
}

const COLUMN_LABELS: Record<PatronOpsColumn, string> = {
  needs_you: "Needs you",
  in_progress: "In progress (Claw)",
  waiting_confirm: "Waiting confirm",
  closed: "Closed",
};

export function patronOpsColumnLabel(column: PatronOpsColumn): string {
  return COLUMN_LABELS[column];
}

export const PATRON_OPS_COLUMN_ORDER: PatronOpsColumn[] = [
  "needs_you",
  "in_progress",
  "waiting_confirm",
  "closed",
];
