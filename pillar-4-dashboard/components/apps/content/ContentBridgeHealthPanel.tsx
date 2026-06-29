"use client";

import { bridgeTierBadgeClass } from "@/lib/social-channels";
import type { SocialPlatformId } from "@/lib/social-channels";

export type BridgeHealthStatus =
  | "ready"
  | "degraded"
  | "auth_expired"
  | "unconfigured"
  | "planned";

export interface BridgeHealthEntryRow {
  platform: string;
  name: string;
  bridgeTier: string;
  bridgeTool: string | null;
  configured: boolean;
  enabledInFre: boolean;
  health: BridgeHealthStatus;
  healthLabel: string;
  missingEnvKeys: string[];
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastErrorKind: string | null;
  consecutiveFailures: number;
  successCount: number;
  failureCount: number;
  tokenExpiresAt: string | null;
  fixHints: string[];
}

export interface BridgeHealthSummary {
  total: number;
  live: number;
  configured: number;
  ready: number;
  degraded: number;
  authExpired: number;
  unconfigured: number;
  planned: number;
}

interface ContentBridgeHealthPanelProps {
  report: {
    digitalEnvPath: string;
    summary: BridgeHealthSummary;
    platforms: BridgeHealthEntryRow[];
  } | null;
  onRefresh: () => void;
  busy?: boolean;
  onConnectPlatform?: (platform: SocialPlatformId) => void;
}

function healthClass(health: BridgeHealthStatus): string {
  if (health === "ready") return "text-cursor-glow border-cursor-glow/50";
  if (health === "degraded") return "text-amber-400 border-amber-400/50";
  if (health === "auth_expired") return "text-red-400 border-red-400/50";
  if (health === "unconfigured") return "text-muted border-line";
  return "text-muted border-line/60";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ContentBridgeHealthPanel({
  report,
  onRefresh,
  busy,
  onConnectPlatform,
}: ContentBridgeHealthPanelProps) {
  if (!report) {
    return <p className="font-mono text-[10px] text-muted">Loading connection status…</p>;
  }

  const { summary, platforms } = report;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          {summary.ready}/{summary.live} accounts ready · {summary.degraded} need attention · {summary.authExpired}{" "}
          sign-in expired
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => {
          const needsConnect =
            p.enabledInFre &&
            (p.health === "unconfigured" || p.health === "auth_expired" || p.health === "degraded");
          return (
            <div
              key={p.platform}
              className={`border bg-panel p-3 ${p.enabledInFre ? "border-cursor-glow/30" : "border-line"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-stark">{p.name}</p>
                  <p className="text-[9px] text-muted">
                    {p.configured ? "Credentials on this box" : "Not connected"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`border px-1.5 py-0.5 text-[9px] uppercase ${bridgeTierBadgeClass(p.bridgeTier as import("@/lib/social-channels").BridgeTier)}`}
                  >
                    {p.bridgeTier === "live" ? "LIVE" : p.bridgeTier}
                  </span>
                  <span className={`border px-1.5 py-0.5 text-[9px] uppercase ${healthClass(p.health)}`}>
                    {p.health.replace("_", " ")}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-muted">{p.healthLabel}</p>

              <div className="mt-2 space-y-0.5 text-[9px] text-muted">
                <p>Last OK: {formatWhen(p.lastSuccessAt)}</p>
                <p>Last fail: {formatWhen(p.lastFailureAt)}</p>
                {p.lastError ? (
                  <p className="line-clamp-2 text-red-400/90">{p.lastError}</p>
                ) : null}
                {p.tokenExpiresAt ? (
                  <p className={Date.parse(p.tokenExpiresAt) <= Date.now() ? "text-red-400" : "text-muted"}>
                    Sign-in expires: {formatWhen(p.tokenExpiresAt)}
                  </p>
                ) : null}
                <p>
                  Publishes: {p.successCount} ok · {p.failureCount} fail
                  {p.consecutiveFailures > 0 ? ` · ${p.consecutiveFailures} streak` : ""}
                </p>
              </div>

              <ul className="mt-2 space-y-0.5 text-[9px] text-muted">
                {p.fixHints.slice(0, 2).map((hint) => (
                  <li key={hint}>→ {hint}</li>
                ))}
              </ul>

              {needsConnect && onConnectPlatform ? (
                <button
                  type="button"
                  onClick={() => onConnectPlatform(p.platform as SocialPlatformId)}
                  className="mt-2 border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
                >
                  Connect {p.name}
                </button>
              ) : null}

              {p.enabledInFre ? (
                <p className="mt-2 text-[9px] uppercase tracking-widest text-muted">Enabled in setup</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
