"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HOME_PATH } from "@/lib/ui-categories";

interface WorkspaceBreadcrumbsProps {
  label: string;
  forged?: boolean;
}

export function WorkspaceBreadcrumbs({ label, forged = false }: WorkspaceBreadcrumbsProps) {
  const pathname = usePathname();
  const onForged = forged || pathname.startsWith("/my-claw/");
  if (!onForged) return null;

  return (
    <nav className="font-sans text-xs text-muted" aria-label="Breadcrumb">
      <Link href={HOME_PATH} className="hover:text-cursor-glow">
        Home
      </Link>
      <span className="mx-2 text-line">/</span>
      {onForged ? (
        <>
          <Link href="/claw-forge" className="hover:text-cursor-glow">
            Forge
          </Link>
          <span className="mx-2 text-line">/</span>
        </>
      ) : null}
      <span className="text-stark">{label}</span>
    </nav>
  );
}
