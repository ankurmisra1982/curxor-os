import "server-only";

import { notifyCapitalTradeApproval } from "./capital-approval-notify";
import { ensureCapitalQueue, fetchCapitalStatus } from "./capital-store";

export interface DeskAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

export async function evaluateDeskHealthAlerts(): Promise<{ alerts: DeskAlert[]; notified: number }> {
  const [status, file] = await Promise.all([fetchCapitalStatus(), ensureCapitalQueue()]);
  const alerts: DeskAlert[] = [];
  let notified = 0;

  if (status.portfolioHealth.score < 60) {
    alerts.push({
      id: "health-low",
      severity: status.portfolioHealth.score < 40 ? "critical" : "warning",
      title: "Portfolio health low",
      detail: `Score ${status.portfolioHealth.score} (${status.portfolioHealth.label}) — review concentration in Risk tab`,
    });
  }

  const pending = status.trades.filter((t) => t.status === "pending_approval");
  const staleMs = 30 * 60 * 1000;
  const stale = pending.filter((t) => Date.now() - Date.parse(t.createdAt) > staleMs);
  if (stale.length > 0) {
    alerts.push({
      id: "pending-stale",
      severity: "warning",
      title: "Pending approval aging",
      detail: `${stale.length} trade(s) waiting >30m — Approve & submit in desk`,
    });
    for (const t of stale.slice(0, 3)) {
      try {
        await notifyCapitalTradeApproval(t);
        notified += 1;
      } catch {
        /* optional channel */
      }
    }
  }

  const armedNeverFired = status.rules.filter(
    (r) => r.state === "ARMED" && !r.lastFiredAt && r.createdAt,
  );
  const weekAgo = Date.now() - 7 * 86_400_000;
  const dormant = armedNeverFired.filter((r) => Date.parse(r.createdAt) < weekAgo);
  if (dormant.length > 0) {
    alerts.push({
      id: "armed-dormant",
      severity: "info",
      title: "Armed rules idle",
      detail: `${dormant.length} armed rule(s) never fired — conditions may not be met or use Execute now / demo tour`,
    });
  }

  if (status.stats.failedTrades > 0) {
    alerts.push({
      id: "failed-trades",
      severity: "warning",
      title: "Failed trades in log",
      detail: `${status.stats.failedTrades} failed — retry in Trade recovery`,
    });
  }

  if (file.tradingPaused) {
    alerts.push({
      id: "crisis-pause",
      severity: "critical",
      title: "Trading paused (crisis mode)",
      detail: "All executions blocked until crisis mode cleared in Risk tab",
    });
  }

  return { alerts, notified };
}
