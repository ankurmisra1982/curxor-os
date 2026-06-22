"use client";

import { useRef } from "react";

import { ForgeConnectionModePicker } from "@/components/apps/forge/ForgeConnectionModePicker";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { useForgeAssist } from "@/components/claw/ForgeAssistProvider";
import { useVisionStream } from "@/hooks/useVisionStream";

export function ForgeIntentPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { frame } = useVisionStream();
  const forge = useForgeAssist();

  return (
    <ExperienceAppSection
      appId="claw-forge"
      sectionId="intent"
      minLevel="beginner"
      title="Intent Brief"
      subtitle="Pick connection mode · type mission · attach photo or live vision"
    >
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Connection mode</p>
        <div className="mt-2">
          <ForgeConnectionModePicker
            value={forge.provisioningMode}
            onChange={forge.setProvisioningMode}
            compact
          />
        </div>
      </div>

      <textarea
        value={forge.intent}
        onChange={(e) => forge.setIntent(e.target.value)}
        rows={4}
        placeholder="> e.g. Sort retail packages on lane B with fast vision…"
        className="w-full border border-line bg-void px-3 py-2 font-mono text-xs text-stark outline-none focus:border-cursor-glow"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase text-muted hover:text-cursor-glow"
        >
          Photo
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !forge.liveVision;
            forge.setLiveVision(next);
            if (next && frame?.previewBase64) {
              forge.setImagePreview(`data:image/jpeg;base64,${frame.previewBase64}`);
            }
          }}
          className={`border px-3 py-1.5 font-mono text-[10px] uppercase ${
            forge.liveVision ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
          }`}
        >
          Live vision
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => forge.setImagePreview(r.result as string);
            r.readAsDataURL(f);
          }}
        />
      </div>

      {forge.imagePreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={forge.imagePreview} alt="" className="mt-3 aspect-video w-full max-w-sm border border-line object-cover" />
      ) : null}
    </ExperienceAppSection>
  );
}
