import type { FamilyProfile } from "./family-types";

export interface KinShowcaseUseCase {
  id: string;
  claw: string;
  clawStatus: "preview" | "live";
  headline: string;
  body: string;
  example: string;
}

/** Demo narrative — why household profiles matter across the mesh. */
export const KIN_SHOWCASE_USE_CASES: KinShowcaseUseCase[] = [
  {
    id: "optimus",
    claw: "Signal Claw · Optimus",
    clawStatus: "preview",
    headline: "Hardware that knows who it is talking to",
    body:
      "Optimus reads each member's personality and role from Kin — not one generic assistant voice for the whole house.",
    example:
      "Playful tone for your kids, warm check-ins with your partner, slower cadence and formal respect for an elder guest.",
  },
  {
    id: "vital",
    claw: "Vital Claw",
    clawStatus: "preview",
    headline: "Health history and advice per person",
    body:
      "Wearables, labs, and longevity protocol stay tied to the right profile — Vital never blends your spouse's vitals with yours.",
    example:
      "Your kid's sleep score, your partner's recovery trend, and your own protocol — each Claw query scoped to family.members.* on the mesh.",
  },
  {
    id: "mesh",
    claw: "Every subscribed Claw",
    clawStatus: "live",
    headline: "One household context bus — many Claws",
    body:
      "Kin publishes family scope to the Claw Context Protocol. Work, Capital, Creator, and Forge subscribe when they need tone or scheduling context.",
    example:
      "Outreach drafts match your voice; family calendar conflicts surface before a robot routine runs in the living room.",
  },
];

export function kinShowcaseMemberLine(members: FamilyProfile[]): string {
  if (members.length <= 1) {
    return "Add your partner, kids, or guests — each profile becomes a first-class identity on the appliance.";
  }
  const names = members.map((m) => m.displayName).join(", ");
  return `${members.length} profiles on-box (${names}) — subscribed Claws personalize per person, not per appliance.`;
}

export const KIN_SHOWCASE_THESIS =
  "Your CurXor box should know your household the way you do — separate people, separate context, one sovereign mesh.";

export const KIN_PREVIEW_FOOTNOTE =
  "Preview module — member profiles and CCP sync work locally today. Full Optimus guest mode and Vital household routing ship in a future release.";
