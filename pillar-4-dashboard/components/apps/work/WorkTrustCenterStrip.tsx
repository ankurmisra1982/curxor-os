"use client";

interface WorkTrustCenterStripProps {
  outboundKillSwitch?: boolean;
  suppressionCount: number;
  bridgeConfigured: boolean;
  onToggleKillSwitch?: () => void;
}

export function WorkTrustCenterStrip({
  outboundKillSwitch,
  suppressionCount,
  bridgeConfigured,
  onToggleKillSwitch,
}: WorkTrustCenterStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-line/60 bg-panel/40 px-2 py-2 font-mono text-[10px]">
      <span className="uppercase tracking-widest text-muted">Trust center</span>
      <span className={`border px-1.5 py-0.5 ${outboundKillSwitch ? "border-red-400 text-red-400" : "border-line text-muted"}`}>
        Kill switch {outboundKillSwitch ? "ON" : "off"}
      </span>
      <span className="border border-line px-1.5 py-0.5 text-muted">
        Suppressions · {suppressionCount}
      </span>
      <span className="border border-line px-1.5 py-0.5 text-muted">
        Egress · {bridgeConfigured ? "SMTP bridge (pillar-3)" : "demo — no egress"}
      </span>
      {onToggleKillSwitch ? (
        <button
          type="button"
          onClick={onToggleKillSwitch}
          className="border border-line px-1.5 py-0.5 uppercase text-muted hover:text-stark"
        >
          {outboundKillSwitch ? "Clear kill switch" : "Enable kill switch"}
        </button>
      ) : null}
    </div>
  );
}
