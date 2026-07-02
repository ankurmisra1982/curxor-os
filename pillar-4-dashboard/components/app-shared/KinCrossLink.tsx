"use client";

import Link from "next/link";

export type KinCrossLinkVariant = "vital" | "optimus";

const COPY: Record<
  KinCrossLinkVariant,
  { title: string; body: string; cta: string }
> = {
  vital: {
    title: "Household profiles from Kin",
    body:
      "Vital routes wearables, labs, and longevity advice per person — not one blended health profile. Add your partner and kids in Kin so the mesh knows who is who.",
    cta: "Open Kin →",
  },
  optimus: {
    title: "Guest-aware tone from Kin",
    body:
      "Optimus will read each member's personality and role from Kin — playful with kids, warm with your partner, direct with you. Preview until Signal family mode ships.",
    cta: "Open Kin →",
  },
};

interface KinCrossLinkProps {
  variant: KinCrossLinkVariant;
}

export function KinCrossLink({ variant }: KinCrossLinkProps) {
  const copy = COPY[variant];
  return (
    <div className="border border-line bg-void px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">{copy.title}</p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-muted">{copy.body}</p>
      <Link
        href="/my-family"
        className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-cursor-glow hover:underline"
      >
        {copy.cta}
      </Link>
    </div>
  );
}
