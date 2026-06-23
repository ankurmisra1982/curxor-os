"use client";

interface CafeHostConfigPanelProps {
  kioskName: string;
  prizeMode: string;
  activeLanes: string[];
}

const PRIZE_LABELS: Record<string, string> = {
  demo: "Demo — free plays",
  token: "Token — paid plays",
  event: "Event — staff operated",
};

export function CafeHostConfigPanel({ kioskName, prizeMode, activeLanes }: CafeHostConfigPanelProps) {
  const prizeLabel = PRIZE_LABELS[prizeMode] ?? prizeMode;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <p className="text-muted">
        Desk configuration from Engage Claw FRE — edit via setup wizard or agent console help.
      </p>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="border border-line bg-panel px-3 py-2">
          <dt className="uppercase tracking-widest text-muted">Engage desk</dt>
          <dd className="mt-1 text-stark">{kioskName}</dd>
        </div>
        <div className="border border-line bg-panel px-3 py-2">
          <dt className="uppercase tracking-widest text-muted">Prize mode</dt>
          <dd className="mt-1 text-stark">{prizeLabel}</dd>
        </div>
        <div className="border border-line bg-panel px-3 py-2 sm:col-span-2">
          <dt className="uppercase tracking-widest text-muted">Active lanes</dt>
          <dd className="mt-1 flex flex-wrap gap-2 text-stark">
            {activeLanes.length > 0 ? (
              activeLanes.map((lane) => (
                <span key={lane} className="border border-line px-2 py-0.5 uppercase">
                  Lane {lane}
                </span>
              ))
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
