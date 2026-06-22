"use client";

import type {
  WorkConnectorHealthRow,
  WorkConnectorVaultReport,
  WorkConnectorVaultSummary,
} from "@/lib/work-queue-types";

export type WorkConnectorHealth =
  | "live"
  | "degraded"
  | "auth_expired"
  | "unconfigured"
  | "planned";

export type { WorkConnectorHealthRow, WorkConnectorVaultSummary };

interface WorkConnectorVaultPanelProps {
  report: WorkConnectorVaultReport | null;
  onRefresh: () => void;
  busy?: boolean;
  onLinkGoogle?: () => void;
  onLinkNotion?: () => void;
}

function healthClass(health: string): string {
  if (health === "live") return "text-cursor-glow border-cursor-glow/50";
  if (health === "degraded") return "text-amber-400 border-amber-400/50";
  if (health === "auth_expired") return "text-red-400 border-red-400/50";
  if (health === "unconfigured") return "text-muted border-line";
  return "text-muted border-line/60";
}

export function WorkConnectorVaultPanel({ report, onRefresh, busy, onLinkGoogle, onLinkNotion }: WorkConnectorVaultPanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading connector vault…</p>;
  }

  const { summary, connectors, digitalEnvPath } = report;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          {summary.ready}/{summary.total} ready · {summary.configured} configured · env: {digitalEnvPath}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow"
        >
          Refresh
        </button>
      </div>

      {report.commsPathReady === false ? (
        <p className="border border-amber-400/40 px-2 py-1 text-amber-400">
          No comms path — configure SMTP, Google Workspace, or IMAP for live outbound.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {onLinkGoogle ? (
          <button
            type="button"
            onClick={onLinkGoogle}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow"
          >
            Link Google
          </button>
        ) : null}
        {onLinkNotion ? (
          <button
            type="button"
            onClick={onLinkNotion}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow"
          >
            Link Notion
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {connectors.map((c) => (
          <div key={c.id} className={`border px-3 py-2 ${healthClass(c.health)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-stark">{c.label}</span>
              <span className="uppercase">{c.healthLabel}</span>
            </div>
            <p className="mt-1 text-muted">
              {c.tier}
              {c.tool ? ` · ${c.tool}` : ""}
              {c.missingEnvKeys.length > 0 ? ` · missing ${c.missingEnvKeys.join(", ")}` : ""}
            </p>
            {c.fixHints[0] ? <p className="mt-1 text-muted">{c.fixHints[0]}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
