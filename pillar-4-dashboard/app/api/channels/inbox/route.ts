export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { queryClawContext } from "@/lib/claw-context-store";
import { listEngageSuggestions } from "@/lib/content-engage-bridge";
import { getChannelConfig, listChannelSessions } from "@/lib/agent-runtime/channel-store";
import { getProfileNameMap } from "@/lib/agent-runtime/channel-sender-resolver";
import { getOotbApp } from "@/lib/ootb-apps";

const CHANNEL_LABEL: Record<string, string> = {
  telegram: "Telegram",
  slack: "Slack",
  whatsapp: "WhatsApp",
  imessage: "iMessage",
  webchat: "Dashboard",
};

export async function GET(): Promise<Response> {
  const config = await getChannelConfig();
  const sessions = await listChannelSessions();
  const sorted = [...sessions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const profileNames = await getProfileNameMap();

  const enriched = sorted.slice(0, 40).map((s) => ({
    ...s,
    channelLabel: CHANNEL_LABEL[s.channel] ?? s.channel,
    clawName: getOotbApp(s.appId).name,
    profileName: s.profileId ? (profileNames.get(s.profileId) ?? null) : null,
    href: routeForApp(s.appId),
  }));

  const rollupRecords = await queryClawContext({
    appId: "my-work",
    keyPrefix: "inbox.",
    limit: 30,
  });

  const externalCount = sessions.filter((s) => s.channel !== "webchat").length;
  const webchatCount = sessions.filter((s) => s.channel === "webchat").length;
  const engagePending = (await listEngageSuggestions(true)).length;

  return Response.json({
    ok: true,
    enabled: config.enabled,
    stats: {
      total: sessions.length,
      external: externalCount,
      webchat: webchatCount,
      engagePending,
    },
    sessions: enriched,
    meshPreview: rollupRecords.slice(0, 12).map((r) => ({
      scope: r.envelope.scope,
      key: r.envelope.key,
      preview: JSON.stringify(r.envelope.payload).slice(0, 120),
      updatedAt: r.envelope.timestamp,
    })),
  });
}

function routeForApp(appId: string): string {
  const routes: Record<string, string> = {
    "my-capital": "/my-capital",
    "my-vital": "/my-vital",
    "my-family": "/my-family",
    "my-work": "/my-work",
    "my-content-creator": "/my-content",
    "my-shop": "/my-shop",
    "tesla-optimus-engine": "/optimus",
    "robotaxi-fleet-manager": "/robotaxi",
    "claw-cafe": "/claw-cafe",
    "claw-forge": "/claw-forge",
  };
  return routes[appId] ?? "/home";
}
