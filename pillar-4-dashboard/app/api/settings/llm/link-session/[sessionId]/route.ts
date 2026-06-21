export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getFrontierProvider } from "@/lib/frontier-providers";
import { getProviderLinkSession } from "@/lib/provider-link-sessions";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await context.params;
  const session = await getProviderLinkSession(sessionId);
  if (!session) {
    return Response.json({ error: "Link session not found" }, { status: 404 });
  }

  const provider = getFrontierProvider(session.providerId);
  return Response.json({
    session,
    provider: provider
      ? {
          id: provider.id,
          name: provider.name,
          connectUrl: provider.connectUrl,
          docsUrl: provider.docsUrl,
          purchaseUrl: provider.purchaseUrl,
        }
      : null,
  });
}
