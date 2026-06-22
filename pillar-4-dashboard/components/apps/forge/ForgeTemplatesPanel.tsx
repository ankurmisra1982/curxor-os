"use client";

import { FORGE_TEMPLATE_LIST } from "@/lib/forge-templates";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { useForgeAssist } from "@/components/claw/ForgeAssistProvider";
import type { ForgeTemplateId } from "@/lib/forge-templates";

interface ForgeTemplatesPanelProps {
  onSelectTemplate?: (templateId: ForgeTemplateId) => void;
}

export function ForgeTemplatesPanel({ onSelectTemplate }: ForgeTemplatesPanelProps) {
  const forge = useForgeAssist();

  return (
    <ExperienceAppSection
      appId="claw-forge"
      sectionId="templates"
      minLevel="expert"
      title="Framework Templates"
      subtitle="Pick a pack — opens embedded Mint wizard on the Mint tab (no overlay)"
    >
      <div className="grid gap-2 md:grid-cols-2">
        {FORGE_TEMPLATE_LIST.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => {
              forge.setProvisioningMode("framework");
              forge.setTemplateId(pack.id);
              onSelectTemplate?.(pack.id);
            }}
            className={`border px-3 py-2 text-left ${
              forge.templateId === pack.id ? "border-cursor-glow bg-surface" : "border-line hover:border-line/80"
            }`}
          >
            <div className="font-mono text-xs uppercase text-stark">{pack.label}</div>
            <div className="mt-1 font-mono text-[10px] text-muted">{pack.description}</div>
            <div className="mt-1 font-mono text-[10px] text-cursor-glow/80">{pack.cloneHint}</div>
          </button>
        ))}
      </div>
    </ExperienceAppSection>
  );
}
