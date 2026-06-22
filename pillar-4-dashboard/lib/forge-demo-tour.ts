import "server-only";

import { readAppFreState } from "./app-fre-state";
import { readClawProfiles } from "./claw-profiles";
import { provisionFrameworkApp } from "./forge-provision-service";
import { readForgedApps } from "./forged-apps-store";
import { seedForgedWorkDemoIfEmpty } from "./forged-work-store";

const DEMO_INTENT = "Forge demo tour — sovereign agent factory on bare metal";
const DEMO_NAME = "Demo Tour Desk";
const L4_DEMO_NAME = "Fabricator Work Desk";
const L4_DEMO_INTENT = "L4 Fabricator tour — forged outreach desk with local pipeline";

export type ForgeTourPersona = "default" | "L1" | "L4" | "L5";

export interface ForgeDemoTourResult {
  ok: boolean;
  persona: ForgeTourPersona;
  steps: string[];
  forgedAppId?: string;
  forgedHref?: string;
  profileId?: string;
  error?: string;
}

export async function runForgeDemoTour(persona: ForgeTourPersona = "default"): Promise<ForgeDemoTourResult> {
  const steps: string[] = [];
  const fre = await readAppFreState("claw-forge");

  steps.push(
    fre.initialized
      ? `Forge FRE ready · ${String(fre.config.defaultBudget ?? "balanced")} budget`
      : "Forge FRE not initialized",
  );
  if (!fre.initialized) {
    return { ok: false, persona, steps, error: "Complete Forge FRE first" };
  }

  const [profiles, forged] = await Promise.all([readClawProfiles(), readForgedApps()]);
  steps.push(`Fleet · ${profiles.claws.length} profile(s) · ${forged.apps.length} forged desk(s)`);

  if (persona === "L1") {
    steps.push("L1 Sketcher · Mint tab · connection mode picker · embedded wizard");
    steps.push("Island = engine only · Framework = nav desk · Import = bundle adopt");
    return { ok: true, persona, steps };
  }

  if (persona === "L4") {
    const existing = forged.apps.find(
      (a) => a.templateId === "work-desk" && (a.name === L4_DEMO_NAME || a.intent.includes("Fabricator")),
    );
    if (existing) {
      await seedForgedWorkDemoIfEmpty(existing.id);
      steps.push(`Reused work-desk · ${existing.id} · ${existing.href}`);
      return {
        ok: true,
        persona,
        steps,
        forgedAppId: existing.id,
        forgedHref: existing.href,
        profileId: existing.clawProfileId ?? undefined,
      };
    }
    try {
      const out = await provisionFrameworkApp({
        intent: L4_DEMO_INTENT,
        name: L4_DEMO_NAME,
        templateId: "work-desk",
        budgetTier: "balanced",
        autoSelected: true,
      });
      await seedForgedWorkDemoIfEmpty(out.forgedApp.id);
      steps.push(`Minted work-desk · ${out.forgedApp.slug} · pipeline seeded`);
      steps.push(`Open desk · ${out.forgedApp.href}`);
      return {
        ok: true,
        persona,
        steps,
        forgedAppId: out.forgedApp.id,
        forgedHref: out.forgedApp.href,
        profileId: out.profile.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Provision failed";
      steps.push(`L4 mint failed · ${message}`);
      return { ok: false, persona, steps, error: message };
    }
  }

  if (persona === "L5") {
    const defaultTour = await runForgeDemoTour("default");
    steps.push(...defaultTour.steps);
    steps.push(`Foundry ops · fleet ${profiles.claws.length + forged.apps.length} entries`);
    steps.push("Ops tab · inference status · export bundle · cafe mint ledger");
    return {
      ok: defaultTour.ok,
      persona,
      steps,
      forgedAppId: defaultTour.forgedAppId,
      forgedHref: defaultTour.forgedHref,
      profileId: defaultTour.profileId,
      error: defaultTour.error,
    };
  }

  const existing = forged.apps.find((a) => a.name === DEMO_NAME || a.intent.includes("demo tour"));
  if (existing) {
    steps.push(`Reused demo desk · ${existing.id}`);
    return {
      ok: true,
      persona,
      steps,
      forgedAppId: existing.id,
      forgedHref: existing.href,
      profileId: existing.clawProfileId ?? undefined,
    };
  }

  try {
    const out = await provisionFrameworkApp({
      intent: DEMO_INTENT,
      name: DEMO_NAME,
      templateId: "blank-desk",
      budgetTier: "balanced",
      autoSelected: true,
    });
    steps.push(`Minted blank framework desk · ${out.forgedApp.slug}`);
    steps.push(`Active profile · ${out.profile.id}`);
    return {
      ok: true,
      persona,
      steps,
      forgedAppId: out.forgedApp.id,
      forgedHref: out.forgedApp.href,
      profileId: out.profile.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provision failed";
    steps.push(`Mint failed · ${message}`);
    return { ok: false, persona, steps, error: message };
  }
}
