import "server-only";

/**
 * Optional LAN token gate for mutating dashboard APIs.
 * When CURXOR_LAN_AUTH_TOKEN is unset, all requests pass (dev / captive portal default).
 * Localhost (127.0.0.1 / ::1) always bypasses so systemd health checks and qa:smoke work.
 */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "127.0.0.1";
}

function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const header = request.headers.get("x-curxor-token");
  return header?.trim() ?? null;
}

export function requireLanAuth(request: Request): Response | null {
  const expected = process.env.CURXOR_LAN_AUTH_TOKEN?.trim();
  if (!expected) return null;

  const ip = clientIp(request);
  if (ip === "127.0.0.1" || ip === "::1") return null;

  const provided = extractToken(request);
  if (provided === expected) return null;

  return Response.json({ error: "Unauthorized — valid LAN token required" }, { status: 401 });
}
