"use client";

interface ComingSoonBadgeProps {
  className?: string;
}

export function ComingSoonBadge({ className = "" }: ComingSoonBadgeProps) {
  return (
    <span
      className={`inline-flex items-center border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-300 ${className}`}
    >
      Coming Soon
    </span>
  );
}
