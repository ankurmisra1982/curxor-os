"use client";

import { HomeOverview } from "@/components/desktop/HomeOverview";
import type { OotbAppId } from "@/lib/ootb-apps";

interface HomePageClientProps {
  selectedApps: OotbAppId[];
}

export function HomePageClient({ selectedApps }: HomePageClientProps) {
  return (
    <HomeOverview
      selectedApps={selectedApps}
      onOpenHealth={() => {
        window.dispatchEvent(new CustomEvent("curxor:open-health"));
      }}
    />
  );
}
