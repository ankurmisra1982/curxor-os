import "server-only";

import { loadDigitalEnv } from "./digital-env";
import type { OutboundSend, WorkSequence } from "./work-queue-types";

const BOUNCE_RE = /\b(bounce|550|551|552|553|mailbox unavailable|user unknown|does not exist|rejected)\b/i;

export interface WorkDeliverabilitySummary {
  fromAddress: string | null;
  domain: string | null;
  domainHealth: "healthy" | "warning" | "unknown";
  domainHealthDetail: string;
  spfStatus: "ok" | "advisory" | "unknown";
  dkimStatus: "ok" | "advisory" | "unknown";
  failedSendCount: number;
  bounceLikeCount: number;
  recentFailures: Array<{ sendId: string; to: string; subject: string; error: string }>;
  reputationScore: number;
  reputationLabel: "excellent" | "good" | "fair" | "at_risk";
  unsubscribeTokensActive: number;
  sequencesWithUnsubscribe: number;
}

function parseDomain(from: string | undefined): string | null {
  if (!from?.includes("@")) return null;
  const match = from.match(/@([\w.-]+\.\w+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function isBounceLike(error: string | null | undefined): boolean {
  return Boolean(error && BOUNCE_RE.test(error));
}

export async function buildWorkDeliverabilitySummary(
  sends: OutboundSend[],
  sequences: WorkSequence[],
  unsubscribeTokenCount: number,
): Promise<WorkDeliverabilitySummary> {
  const env = await loadDigitalEnv();
  const fromAddress = env.SMTP_FROM?.trim() || null;
  const domain = parseDomain(fromAddress ?? undefined);
  const bridgeConfigured = Boolean(env.SMTP_HOST?.trim() && fromAddress);

  const failed = sends.filter((s) => s.status === "failed");
  const bounceLike = failed.filter((s) => isBounceLike(s.error));
  const sent = sends.filter((s) => s.status === "sent" || s.status === "simulated");
  const opened = sent.filter((s) => s.openedAt).length;
  const replied = sent.filter((s) => s.repliedAt).length;

  let reputationScore = 72;
  if (sent.length > 0) {
    const openRate = opened / sent.length;
    const replyRate = replied / sent.length;
    const failRate = failed.length / Math.max(sent.length + failed.length, 1);
    reputationScore = Math.round(
      Math.min(98, Math.max(20, 50 + openRate * 25 + replyRate * 35 - failRate * 40 - bounceLike.length * 8)),
    );
  }
  if (!bridgeConfigured) reputationScore = Math.min(reputationScore, 65);

  const reputationLabel: WorkDeliverabilitySummary["reputationLabel"] =
    reputationScore >= 85 ? "excellent" : reputationScore >= 70 ? "good" : reputationScore >= 50 ? "fair" : "at_risk";

  let domainHealth: WorkDeliverabilitySummary["domainHealth"] = "unknown";
  let domainHealthDetail = "Configure SMTP_FROM to assess sending domain";
  let spfStatus: WorkDeliverabilitySummary["spfStatus"] = "unknown";
  let dkimStatus: WorkDeliverabilitySummary["dkimStatus"] = "unknown";

  if (domain) {
    const isPublicMailbox = /@(gmail|yahoo|hotmail|outlook|icloud)\./i.test(fromAddress ?? "");
    if (isPublicMailbox) {
      domainHealth = "warning";
      domainHealthDetail = `${domain} — public mailbox; use a owned domain for cold outbound`;
      spfStatus = "advisory";
      dkimStatus = "advisory";
    } else if (bridgeConfigured) {
      domainHealth = bounceLike.length > 2 ? "warning" : "healthy";
      domainHealthDetail =
        bounceLike.length > 0
          ? `${domain} · ${bounceLike.length} bounce-like failure(s) — review list hygiene`
          : `${domain} · bridge configured · demo SPF/DKIM advisory only`;
      spfStatus = "advisory";
      dkimStatus = "advisory";
    } else {
      domainHealth = "warning";
      domainHealthDetail = `${domain} parsed from SMTP_FROM — bridge not live yet`;
      spfStatus = "advisory";
      dkimStatus = "advisory";
    }
  }

  const sequencesWithUnsubscribe = sequences.filter((seq) =>
    seq.steps.some((step) => step.body.includes("{{unsubscribe_url}}")),
  ).length;

  return {
    fromAddress,
    domain,
    domainHealth,
    domainHealthDetail,
    spfStatus,
    dkimStatus,
    failedSendCount: failed.length,
    bounceLikeCount: bounceLike.length,
    recentFailures: failed.slice(0, 8).map((s) => ({
      sendId: s.id,
      to: s.to,
      subject: s.subject,
      error: s.error ?? "send failed",
    })),
    reputationScore,
    reputationLabel,
    unsubscribeTokensActive: unsubscribeTokenCount,
    sequencesWithUnsubscribe,
  };
}
