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

/** Maps external messaging identity → household member for Kin routing. */
export interface FamilyChannelHandle {
  channel: "telegram" | "slack" | "whatsapp" | "imessage" | "webchat" | "email";
  /** Normalized handle: phone digits, slack user id, telegram id, email lowercased. */
  address: string;
}

export interface FamilyProfile {
  id: string;
  displayName: string;
  role: FamilyRole;
  avatarColor: string;
  devices: FamilyDevice[];
  personality: FamilyPersonality;
  sharedScopes: ("personal" | "health" | "work" | "finance")[];
  channelHandles: FamilyChannelHandle[];
  createdAt: string;
  updatedAt: string;
}
