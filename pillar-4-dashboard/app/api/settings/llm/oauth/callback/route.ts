export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { completeOAuthProviderLink, findOAuthSessionByState } from "@/lib/provider-link-sessions";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    const description = url.searchParams.get("error_description") ?? error;
    return Response.redirect(
      new URL(`/settings?oauth_error=${encodeURIComponent(description)}`, request.url),
    );
  }

  if (!code || !state) {
    return Response.redirect(
      new URL("/settings?oauth_error=missing_code_or_state", request.url),
    );
  }

  try {
    const session = await findOAuthSessionByState(state);
    if (!session) {
      return Response.redirect(new URL("/settings?oauth_error=invalid_session", request.url));
    }

    await completeOAuthProviderLink(session.id, code, state);
    return Response.redirect(new URL("/settings?oauth=success", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed";
    return Response.redirect(
      new URL(`/settings?oauth_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
