"use client";

export type HumanoidWorkspaceTab = "home" | "fleet" | "knowledge" | "routines" | "control";

const TABS: { id: HumanoidWorkspaceTab; label: string; subtitle: string }[] = [
  { id: "home", label: "Home", subtitle: "Setup & relationship" },
  { id: "fleet", label: "Fleet", subtitle: "Robots & pair wizard" },
  { id: "knowledge", label: "Knowledge", subtitle: "Rules & mesh" },
  { id: "routines", label: "Routines", subtitle: "Daily instructions" },
  { id: "control", label: "Control", subtitle: "Mesh preview" },
];

interface HumanoidWorkspaceTabsProps {
  active: HumanoidWorkspaceTab;
  onChange: (tab: HumanoidWorkspaceTab) => void;
}

export function HumanoidWorkspaceTabs({ active, onChange }: HumanoidWorkspaceTabsProps) {
  return (
    <nav className="flex flex-wrap gap-1 border border-line bg-panel px-2 py-2 font-mono text-[10px]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          title={tab.subtitle}
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
