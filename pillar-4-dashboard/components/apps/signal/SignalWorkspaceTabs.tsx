"use client";

export type SignalWorkspaceTab = "signals" | "optimus";

interface SignalWorkspaceTabsProps {
  active: SignalWorkspaceTab;
  onChange: (tab: SignalWorkspaceTab) => void;
}

const TABS: { id: SignalWorkspaceTab; label: string }[] = [
  { id: "signals", label: "Signals" },
  { id: "optimus", label: "Optimus" },
];

export function SignalWorkspaceTabs({ active, onChange }: SignalWorkspaceTabsProps) {
  return (
    <nav className="flex flex-wrap gap-1 border border-line bg-panel px-2 py-2 font-mono text-[10px]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1 uppercase tracking-widest ${
            active === tab.id
              ? "border border-cursor-glow text-cursor-glow"
              : "border border-transparent text-muted hover:border-line hover:text-stark"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
