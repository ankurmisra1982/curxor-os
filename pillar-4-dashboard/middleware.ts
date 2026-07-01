import { NextResponse, type NextRequest } from "next/server";

import { defaultAppHref, isPathEnabled, normalizeSelectedApps } from "@/lib/fre-routing";

import type { OotbAppId } from "@/lib/ootb-apps";

const SETUP_PATH = "/setup";
const WELCOME_PATH = "/welcome";
const STATUS_PATH = "/api/setup/status";
const CACHE_TTL_MS = 2_000;

interface FreCache {
  at: number;
  initialized: boolean;
  welcomeCompleted: boolean;
  defaultHref: string;
  selectedApps: OotbAppId[];
}

let freCache: FreCache | null = null;

async function readFreRouting(request: NextRequest): Promise<FreCache> {
  const now = Date.now();
  if (freCache && now - freCache.at < CACHE_TTL_MS) {
    return freCache;
  }

  const fallback: FreCache = {
    at: now,
    initialized: false,
    welcomeCompleted: false,
    defaultHref: "/home",
    selectedApps: [],
  };

  try {
    const url = new URL(STATUS_PATH, request.url);
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3_000) });
    if (!res.ok) {
      freCache = fallback;
      return fallback;
    }

    const data = (await res.json()) as {
      initialized?: boolean;
      selectedApps?: string[];
      welcomeCompleted?: boolean;
    };
    const initialized = data.initialized === true;
    const welcomeCompleted = data.welcomeCompleted === true;
    const selected = normalizeSelectedApps(Array.isArray(data.selectedApps) ? data.selectedApps : []);

    const entry: FreCache = {
      at: now,
      initialized,
      welcomeCompleted,
      defaultHref: defaultAppHref(selected),
      selectedApps: selected,
    };
    freCache = entry;
    return entry;
  } catch {
    freCache = fallback;
    return fallback;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const fre = await readFreRouting(request);

  if (pathname === "/my-content-creator") {
    return NextResponse.redirect(new URL("/my-content", request.url));
  }

  if (pathname.startsWith(SETUP_PATH)) {
    if (fre.initialized) {
      const target = fre.welcomeCompleted ? fre.defaultHref : WELCOME_PATH;
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith(WELCOME_PATH)) {
    if (!fre.initialized) {
      return NextResponse.redirect(new URL(SETUP_PATH, request.url));
    }
    if (fre.welcomeCompleted) {
      return NextResponse.redirect(new URL(fre.defaultHref, request.url));
    }
    return NextResponse.next();
  }

  if (!fre.initialized) {
    return NextResponse.redirect(new URL(SETUP_PATH, request.url));
  }

  if (!fre.welcomeCompleted) {
    return NextResponse.redirect(new URL(WELCOME_PATH, request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(fre.defaultHref, request.url));
  }

  if (!isPathEnabled(pathname, fre.selectedApps)) {
    return NextResponse.redirect(new URL(fre.defaultHref, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
