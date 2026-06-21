export type FamilyRole = "owner" | "partner" | "child" | "elder" | "guest";

export interface FamilyDevice {
  id: string;
  label: string;
  kind: "phone" | "watch" | "tablet" | "appliance" | "robot" | "other";
  hardwareRef: string | null;
  lastSeenAt: string | null;
}

export interface FamilyPersonality {
  traits: string[];
  communicationStyle: "direct" | "warm" | "formal" | "playful";
  notes: string;
}

export interface FamilyProfile {
  id: string;
  displayName: string;
  role: FamilyRole;
  avatarColor: string;
  devices: FamilyDevice[];
  personality: FamilyPersonality;
  sharedScopes: ("personal" | "health" | "work" | "finance")[];
  createdAt: string;
  updatedAt: string;
}
