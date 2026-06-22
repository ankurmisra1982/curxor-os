import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { isWorkGoogleLinked } from "./work-google-oauth";
import { isWorkMicrosoftLinked } from "./work-microsoft-oauth";
import { ensureWorkQueue, isWorkEmailBridgeConfigured } from "./work-store";

export type WorkMailSourceKind = "demo" | "gmail_live" | "m365_live" | "imap_live";

export interface WorkLiveProofReport {
  smtpConfigured: boolean;
  imapConfigured: boolean;
  googleLinked: boolean;
  microsoftLinked: boolean;
  inboundPath: "google" | "microsoft" | "imap" | "demo";
  mailSource: WorkMailSourceKind;
  mailSourceLabel: string;
  mailSourceLive: boolean;
  liveReady: boolean;
  /** Buyer-facing badge when liveReady + Google or M365 OAuth linked */
  liveProofBadge: boolean;
  liveProofDetail: string;
  scaffoldMode: boolean;
  livePathDocumented: boolean;
}

export interface WorkLiveProofVaultSummary {
  badge: boolean;
  detail: string;
  mailSource: string;
  mailSourceLive: boolean;
}

function smtpConfigured(env: Record<string, string>, bridge: boolean): boolean {
  return bridge || Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim());
}

function imapConfigured(env: Record<string, string>): boolean {
  return Boolean(env.IMAP_HOST?.trim() && env.IMAP_USER?.trim());
}

export async function buildWorkLiveProofReport(): Promise<WorkLiveProofReport> {
  const env = await loadDigitalEnv();
  const [googleLinked, microsoftLinked, bridgeConfigured, file] = await Promise.all([
    isWorkGoogleLinked(),
    isWorkMicrosoftLinked(),
    isWorkEmailBridgeConfigured(),
    ensureWorkQueue(),
  ]);

  const smtp = smtpConfigured(env, bridgeConfigured);
  const imap = imapConfigured(env);
  const hasRealSend = file.sends.some((s) => s.status === "sent");
  const liveReady = Boolean(bridgeConfigured && hasRealSend);

  let inboundPath: WorkLiveProofReport["inboundPath"] = "demo";
  let mailSource: WorkMailSourceKind = "demo";
  let mailSourceLabel = "demo index";
  let mailSourceLive = false;

  if (microsoftLinked) {
    inboundPath = "microsoft";
    mailSource = "m365_live";
    mailSourceLabel = "Microsoft 365 (live)";
    mailSourceLive = true;
  } else if (googleLinked) {
    inboundPath = "google";
    mailSource = "gmail_live";
    mailSourceLabel = "Gmail (live)";
    mailSourceLive = true;
  } else if (imap) {
    inboundPath = "imap";
    mailSource = "imap_live";
    mailSourceLabel = "IMAP (live)";
    mailSourceLive = true;
  }

  const oauthLinked = googleLinked || microsoftLinked;
  const liveProofBadge = Boolean(liveReady && oauthLinked);
  const scaffoldMode = !smtp && !oauthLinked && !imap;

  let liveProofDetail: string;
  if (liveProofBadge) {
    liveProofDetail = `Live proof verified — ${mailSourceLabel} + SMTP sent`;
  } else if (liveReady && !oauthLinked) {
    liveProofDetail = "liveReady — link Google or M365 for buyer live-proof badge";
  } else if (oauthLinked && !liveReady) {
    liveProofDetail = "Mailbox linked — complete first live send for liveReady";
  } else if (smtp && !oauthLinked) {
    liveProofDetail = "SMTP ready — link Google or M365 for inbox live proof";
  } else if (scaffoldMode) {
    liveProofDetail = "Scaffold — add SMTP + link mailbox per EXIT-DEMO.md#live-ready";
  } else {
    liveProofDetail = "Configure comms path per EXIT-DEMO.md";
  }

  return {
    smtpConfigured: smtp,
    imapConfigured: imap,
    googleLinked,
    microsoftLinked,
    inboundPath,
    mailSource,
    mailSourceLabel,
    mailSourceLive,
    liveReady,
    liveProofBadge,
    liveProofDetail,
    scaffoldMode,
    livePathDocumented: true,
  };
}

export function toLiveProofVaultSummary(report: WorkLiveProofReport): WorkLiveProofVaultSummary {
  return {
    badge: report.liveProofBadge,
    detail: report.liveProofDetail,
    mailSource: report.mailSourceLabel,
    mailSourceLive: report.mailSourceLive,
  };
}

export async function resolveWorkMorningMailSource(): Promise<{
  useMicrosoft: boolean;
  label: string;
  live: boolean;
}> {
  const [googleLinked, microsoftLinked] = await Promise.all([
    isWorkGoogleLinked(),
    isWorkMicrosoftLinked(),
  ]);
  if (microsoftLinked) {
    return { useMicrosoft: true, label: "Microsoft 365 (live)", live: true };
  }
  if (googleLinked) {
    return { useMicrosoft: false, label: "Gmail (live)", live: true };
  }
  return { useMicrosoft: false, label: "demo", live: false };
}
