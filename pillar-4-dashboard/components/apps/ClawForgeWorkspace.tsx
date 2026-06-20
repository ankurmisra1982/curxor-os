"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";



import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";

import type { AgentAppContext } from "@/components/claw/ClawAgentApp";

import { useForgeAssist } from "@/components/claw/ForgeAssistProvider";

import { NewClawWizard } from "@/components/claw/NewClawWizard";

import { useVisionStream } from "@/hooks/useVisionStream";

import type { ClawProfilesState } from "@/lib/claw-recommend";

import type { BudgetTier } from "@/lib/local-llm-catalog";

import { getOotbApp } from "@/lib/ootb-apps";



export function ClawForgeWorkspace({ config, skillTick, lastSkillId }: AgentAppContext) {

  const searchParams = useSearchParams();

  const router = useRouter();

  const openedFromQuery = useRef(false);

  const lastHandledSkill = useRef(0);

  const { frame, connected } = useVisionStream();

  const fileRef = useRef<HTMLInputElement>(null);

  const forge = useForgeAssist();

  const [profiles, setProfiles] = useState<ClawProfilesState>({ claws: [], activeClawId: null });

  const [budgetTier, setBudgetTier] = useState<BudgetTier>(

    (config.defaultBudget as BudgetTier) ?? "balanced",

  );



  const loadProfiles = useCallback(async () => {

    const res = await fetch("/api/claw/profiles", { cache: "no-store" });

    if (res.ok) setProfiles((await res.json()) as ClawProfilesState);

  }, []);



  useEffect(() => {

    void loadProfiles();

  }, [loadProfiles]);



  useEffect(() => {

    if (searchParams.get("new") !== "1" || openedFromQuery.current) return;

    openedFromQuery.current = true;

    forge.openWizard();

    router.replace("/claw-forge", { scroll: false });

  }, [searchParams, forge.openWizard, router]);



  useEffect(() => {

    if (skillTick === 0 || !lastSkillId || lastHandledSkill.current === skillTick) return;

    lastHandledSkill.current = skillTick;



    if (lastSkillId === "list_fleet") {

      void loadProfiles();

      return;

    }

    if (lastSkillId === "attach_vision") {

      forge.setLiveVision(true);

      if (frame?.previewBase64) {

        forge.setImagePreview(`data:image/jpeg;base64,${frame.previewBase64}`);

      }

    }

  }, [skillTick, lastSkillId, loadProfiles, forge, frame?.previewBase64]);



  useEffect(() => {

    if (!forge.liveVision || !frame?.previewBase64) return;

    forge.setImagePreview(`data:image/jpeg;base64,${frame.previewBase64}`);

  }, [forge.liveVision, forge.setImagePreview, frame?.previewBase64]);



  useEffect(() => {

    if (forge.wizardPrefill.budgetTier) {

      setBudgetTier(forge.wizardPrefill.budgetTier);

    }

  }, [forge.wizardPrefill.budgetTier]);



  return (

    <div className="space-y-4 p-4">

      <header className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel px-4 py-3">

        <div>

          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
            OOTB · {getOotbApp("claw-forge").name}
          </p>

          <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Agent Factory</h1>

          <p className="mt-1 font-mono text-[10px] text-muted">

            Forge Master · chat in agent panel · {profiles.claws.length} claws provisioned

          </p>

        </div>

        <button

          type="button"

          onClick={() => forge.openWizard({ intent: forge.intent, budgetTier })}

          className="flex items-center gap-2 border border-cursor-glow bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor"

        >

          <span className="flex h-6 w-6 items-center justify-center border border-current text-base">+</span>

          Forge Claw

        </button>

      </header>



      <div className="grid gap-4 md:grid-cols-3">

        <AppMetric label="Fleet Size" value={String(profiles.claws.length)} unit="profiles" highlight />

        <AppMetric label="Active" value={profiles.activeClawId ?? "—"} unit="engine profile" />

        <AppMetric label="Vision" value={connected ? "LIVE" : "OFF"} unit="multimodal" />

      </div>



      <div className="grid gap-4 lg:grid-cols-2">

        <AppSection title="Intent Brief" subtitle="Type mission · attach photo · or enable live vision before forging">

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

        </AppSection>



        <AppSection title="Claw Fleet Registry" subtitle="Provisioned bots · tap + to add another">

          {profiles.claws.length === 0 ? (

            <p className="font-mono text-[11px] text-muted">No claws yet. Chat your intent or tap Forge Claw.</p>

          ) : (

            <ul className="space-y-2 font-mono text-xs">

              {profiles.claws.map((c) => (

                <li

                  key={c.id}

                  className={`border px-3 py-2 ${profiles.activeClawId === c.id ? "border-cursor-glow bg-surface" : "border-line"}`}

                >

                  <div className="text-stark">{c.name}</div>

                  <div className="text-[10px] text-muted">

                    {c.models.vision} · {c.budgetTier}

                  </div>

                </li>

              ))}

            </ul>

          )}

        </AppSection>

      </div>



      {forge.wizardOpen ? (

        <NewClawWizard

          variant="overlay"

          initialIntent={forge.wizardPrefill.intent ?? forge.intent}

          initialBudgetTier={forge.wizardPrefill.budgetTier ?? budgetTier}

          initialImagePreview={forge.imagePreview}

          initialLiveVision={forge.liveVision}

          initialImageHint={forge.wizardPrefill.imageHint ?? null}

          onClose={() => forge.closeWizard()}

          onCreated={() => {

            forge.closeWizard();

            forge.setIntent("");

            void loadProfiles();

          }}

        />

      ) : null}

    </div>

  );

}


