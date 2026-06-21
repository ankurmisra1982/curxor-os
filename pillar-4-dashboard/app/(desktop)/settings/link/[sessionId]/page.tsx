import { notFound } from "next/navigation";

import { ProviderLinkWorkspace } from "@/components/settings/ProviderLinkWorkspace";
import { getFrontierProvider } from "@/lib/frontier-providers";
import { getProviderLinkSession } from "@/lib/provider-link-sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProviderLinkPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getProviderLinkSession(sessionId);
  if (!session) notFound();

  const provider = getFrontierProvider(session.providerId);
  if (!provider) notFound();

  return (
    <ProviderLinkWorkspace
      sessionId={session.id}
      linkMode={session.linkMode}
      authorizeUrl={session.authorizeUrl}
      status={session.status}
      provider={{
        id: provider.id,
        name: provider.name,
        connectUrl: provider.connectUrl,
        docsUrl: provider.docsUrl,
        purchaseUrl: provider.purchaseUrl,
      }}
    />
  );
}
