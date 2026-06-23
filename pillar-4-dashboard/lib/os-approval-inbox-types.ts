export type OsApprovalKind = "trade" | "send" | "post" | "reply";

export interface OsApprovalItem {
  id: string;
  appId: "my-capital" | "my-work" | "my-content-creator";
  kind: OsApprovalKind;
  label: string;
  detail: string;
  href: string;
  at: string;
}

export interface OsApprovalInbox {
  total: number;
  counts: { capital: number; work: number; creator: number };
  items: OsApprovalItem[];
}
