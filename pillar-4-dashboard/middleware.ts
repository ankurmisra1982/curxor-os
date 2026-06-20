import { NextResponse, type NextRequest } from "next/server";

const SETUP_PATH = "/setup";
const STATUS_PATH = "/api/setup/status";
const DEFAULT_APP = "/my-work";
const CACHE_TTL_MS = 2_000;

let freCache: { at: number; initialized: boolean } | null = null;

async function readInitialized(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  if (freCache && now - freCache.at < CACHE_TTL_MS) {
    return freCache.initialized;
  }

  try {
    const url = new URL(STATUS_PATH, request.url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      freCache = { at: now, initialized: false };
      return false;
    }
    const data = (await res.json()) as { initialized?: boolean };
    const initialized = data.initialized === true;
    freCache = { at: now, initialized };
    return initialized;
  } catch {
    freCache = { at: now, initialized: false };
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const initialized = await readInitialized(request);

  if (pathname.startsWith(SETUP_PATH)) {
    if (initialized) return NextResponse.redirect(new URL(DEFAULT_APP, request.url));
    return NextResponse.next();
  }

  if (!initialized) {
    return NextResponse.redirect(new URL(SETUP_PATH, request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(DEFAULT_APP, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
