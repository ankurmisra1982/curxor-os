"use client";

import type { PublishTrustTierRow } from "@/lib/content-trust-tiers";

interface ContentTrustTiersPanelProps {
  tiers: PublishTrustTierRow[];
  minApprovals: number;
  enabledPlatforms: string[];
  onUpdate: (patch: { publishTrustMinApprovals?: number; publishTrustPlatforms?: string[] }) => void;
  busy?: boolean;
}

export function ContentTrustTiersPanel({
  tiers,
  minApprovals,
  enabledPlatforms,
  onUpdate,
  busy,
}: ContentTrustTiersPanelProps) {
  return (
    <div className="space-y-3 border border-line bg-panel/40 p-3 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-cursor-glow">Publish trust tiers</p>
      <p className="text-muted">
        After N human approvals per platform, posts auto-publish even when the approval gate is on
      </p>
      <label className="block">
        <span className="text-muted">Min approvals per platform (0 = off)</span>
        <input
          type="number"
          min={0}
          max={99}
          className="mt-1 w-24 border border-line bg-transparent px-2 py-1 text-stark"
          value={minApprovals}
          disabled={busy}
          onChange={(e) => onUpdate({ publishTrustMinApprovals: Number(e.target.value) || 0 })}
        />
      </label>
      {tiers.length > 0 ? (
        <ul className="space-y-1">
          {tiers.map((t) => (
            <li key={t.platform} className="flex flex-wrap items-center gap-2 border border-line/50 px-2 py-1">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={enabledPlatforms.includes(t.platform)}
                  disabled={busy || minApprovals <= 0}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...enabledPlatforms, t.platform]
                      : enabledPlatforms.filter((p) => p !== t.platform);
                    onUpdate({ publishTrustPlatforms: next });
                  }}
                />
                <span className="text-stark">{t.label}</span>
              </label>
              <span className={t.autoEligible ? "text-cursor-glow" : "text-muted"}>
                {t.approvedCount}/{t.minApprovals} approvals
                {t.autoEligible ? " · auto OK" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
