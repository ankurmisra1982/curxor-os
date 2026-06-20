"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { defaultAppHref, isPathEnabled, normalizeSelectedApps, selectedAppsKey } from "@/lib/fre-routing";
import type { OotbAppId } from "@/lib/ootb-apps";

interface DesktopRouteGuardProps {
  selectedApps: OotbAppId[];
}

export function DesktopRouteGuard({ selectedApps }: DesktopRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const appsKey = selectedAppsKey(selectedApps);
  const apps = useMemo(() => normalizeSelectedApps(selectedApps), [appsKey, selectedApps]);

  useEffect(() => {
    if (!pathname || isPathEnabled(pathname, apps)) return;
    router.replace(defaultAppHref(apps));
  }, [pathname, apps, router]);

  return null;
}
