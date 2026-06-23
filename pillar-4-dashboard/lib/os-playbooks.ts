import "server-only";

import { fetchCapitalStatus } from "./capital-store";
import { appendAgentAudit } from "./work-agent-audit";
import { upsertLead } from "./work-store";
import { emitWorkXpEvent } from "./work-xp-events";
import type { WorkLead } from "./work-queue-types";

export type OsPlaybookId = "capital-alert" | "creator-signal" | "swarm-fleet";

export interface OsPlaybookResult {
  ok: boolean;
  playbookId: OsPlaybookId;
  lead?: WorkLead;
  tags?: string[];
  error?: string;
}

export async function runOsPlaybook(playbookId: string): Promise<OsPlaybookResult> {
  const id = playbookId.replace(/_/g, "-") as OsPlaybookId;

  if (id === "capital-alert") {
    const capital = await fetchCapitalStatus({ sync: false });
    const ticker = capital.watchlist[0] ?? "SPY";
    const armed = capital.stats.armedRules;
    const email = `playbook-capital-${Date.now()}@example.com`;
    const lead = await upsertLead({
      name: `${ticker} alert follow-up`,
      email,
      company: "Capital desk",
      notes: `OS playbook capital-alert · ${armed} armed rule(s) · ${capital.stats.openTrades} open trade(s)`,
      tags: ["playbook:capital-alert", `ticker:${ticker}`],
      source: "playbook:capital-alert",
    });

    await appendAgentAudit({
      kind: "handoff",
      source: "playbook",
      leadId: lead.id,
      note: `OS playbook capital-alert · ${ticker}`,
    });
    await emitWorkXpEvent("handoff_received", { source: "playbook:capital-alert", leadId: lead.id });

    return { ok: true, playbookId: id, lead, tags: lead.tags };
  }

  if (id === "creator-signal") {
    const email = `playbook-creator-${Date.now()}@example.com`;
    const lead = await upsertLead({
      name: "Creator signal follow-up",
      email,
      company: "Creator desk",
      notes: "OS playbook creator-signal — engage DM → Work opp",
      tags: ["playbook:creator-signal", "handoff:my-content"],
      source: "playbook:creator-signal",
    });

    await appendAgentAudit({
      kind: "handoff",
      source: "playbook",
      leadId: lead.id,
      note: "OS playbook creator-signal",
    });
    await emitWorkXpEvent("handoff_received", { source: "playbook:creator-signal", leadId: lead.id });

    return { ok: true, playbookId: id, lead, tags: lead.tags };
  }

  if (id === "swarm-fleet") {
    const { handoffToSwarm } = await import("./swarm-handoff");
    const { seedSwarmDemoWorkloads } = await import("./swarm-workload-queue");
    await seedSwarmDemoWorkloads();
    const handoff = await handoffToSwarm({
      source: "my-capital",
      title: "OS playbook fleet sweep",
      detail: "Capital + Creator workloads routed to Swarm queue",
      targetCell: "C2",
      priority: "high",
    });
    await handoffToSwarm({
      source: "my-content-creator",
      title: "OS playbook publish stagger",
      detail: "Creator fan-out staged for fleet dispatch",
      targetCell: "D3",
    });
    return { ok: handoff.ok, playbookId: id, tags: ["playbook:swarm-fleet"] };
  }

  return { ok: false, playbookId: "capital-alert", error: `Unknown playbook: ${playbookId}` };
}
