"use client";

import {
  PatronAskChatProvider,
  usePatronAskChat,
} from "@/components/patron/PatronAskChatProvider";
import { PatronAskHeaderBadges } from "@/components/patron/PatronAskHeaderBadges";
import { PatronAskThread } from "@/components/patron/PatronAskThread";

function MobileAskBadges() {
  const { inferenceStatus } = usePatronAskChat();
  return <PatronAskHeaderBadges clawLabel={null} inferenceStatus={inferenceStatus} />;
}

export function MobilePatronAskPage() {
  return (
    <PatronAskChatProvider autoLoadHistory>
      <div className="flex h-[calc(100dvh-7rem)] flex-col">
        <div className="border-b border-line bg-panel px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-sans text-sm font-semibold text-stark">Ask</h2>
            <MobileAskBadges />
          </div>
          <p className="mt-1 font-sans text-xs text-muted">Same patron thread as desktop · local-first.</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <PatronAskThread compactApprovals />
        </div>
      </div>
    </PatronAskChatProvider>
  );
}
