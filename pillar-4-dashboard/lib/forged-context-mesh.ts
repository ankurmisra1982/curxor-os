import "server-only";

import { publishClawContext } from "./claw-context-store";
import type { ClawContextScope } from "./claw-mesh-protocol";
import { readForgedAppFre } from "./forged-app-fre";
import type { ForgedAppRecord } from "./forged-apps-types";
import { publishClawContextMesh } from "./mesh-publish";

function scopeForTemplate(templateId: string): ClawContextScope {
  switch (templateId) {
    case "work-desk":
      return "work";
    case "creator-desk":
      return "signals";
    case "capital-desk":
      return "finance";
    case "kiosk-desk":
      return "hardware";
    default:
      return "personal";
  }
}

export async function publishForgedDeskContext(record: ForgedAppRecord): Promise<string> {
  const fre = await readForgedAppFre(record.id);
  const meshOn = record.meshConnected || Boolean(fre.config.meshPublish);
  if (!meshOn) {
    throw new Error("Mesh publish disabled — enable in FRE");
  }

  const scope = scopeForTemplate(record.templateId);
  const key = `forged.${record.id}.desk`;
  const payload = {
    name: record.name,
    intent: record.intent.slice(0, 240),
    templateId: record.templateId,
    forgedSlug: record.slug,
    mode: record.provisioningMode,
    forgedAppId: record.id,
  };

  const stored = await publishClawContext("system", {
    scope,
    key,
    payload,
    profileId: record.clawProfileId,
    ttlSeconds: 3600,
  });

  await publishClawContextMesh({
    envelope: stored.envelope as unknown as Record<string, unknown>,
  }).catch(() => undefined);

  return `${scope}/${key}`;
}
