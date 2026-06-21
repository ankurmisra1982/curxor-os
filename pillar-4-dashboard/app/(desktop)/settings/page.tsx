import { Suspense } from "react";

import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl p-6 font-sans text-sm text-muted">Loading settings…</div>}>
      <SettingsWorkspace />
    </Suspense>
  );
}
