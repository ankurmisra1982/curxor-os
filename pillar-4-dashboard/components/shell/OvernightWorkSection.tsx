"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ActivityFeedRow, ActivityFeedSummary } from "@/lib/activity-feed-types";
import {
  buildActivityDisplayItems,
  formatClawChipLine,
  groupActivityByClaw,
  type ActivityDisplayItem,
} from "@/lib/activity-feed-summary";

import { FeedRow } from "./FeedRow";

const SECTION_STORAGE_KEY = "curxor-overnight-work-expanded";

interface OvernightWorkSectionProps {
  items: ActivityFeedRow[];
  summary: ActivityFeedSummary;
  compact?: boolean;
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
}

function ToggleGlyph({ open }: { open: boolean }) {
  return <span className="font-mono text-sm text-muted">{open ? "−" : "+"}</span>;
}

function SummaryStats({ summary, compact }: { summary: ActivityFeedSummary; compact: boolean }) {
  const chipLine = formatClawChipLine(summary.byClaw);

  return (
    <div className={compact ? "mt-1 space-y-0.5" : "mt-1 space-y-1"}>
      {summary.headline ? (
        <p className={`font-sans text-stark ${compact ? "text-xs" : "text-sm"}`}>{summary.headline}</p>
      ) : null}
      <p className={`font-sans text-muted ${compact ? "text-[11px]" : "text-xs"}`}>
        {summary.clawsActive} claw{summary.clawsActive === 1 ? "" : "s"} · {summary.totalActions} action
        {summary.totalActions === 1 ? "" : "s"}
        {summary.sinceLastVisit > 0 ? (
          <span className="text-cursor-glow">
            {" "}
            · {summary.sinceLastVisit} new since last visit
          </span>
        ) : null}
      </p>
      {chipLine && !compact ? (
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{chipLine}</p>
      ) : null}
    </div>
  );
}

function DisplayItemRow({ item, compact }: { item: ActivityDisplayItem; compact: boolean }) {
  const [rollupOpen, setRollupOpen] = useState(false);

  if (item.kind === "row") {
    return <FeedRow row={item.row} compact={compact} />;
  }

  return (
    <div className="border border-line bg-panel/40">
      <button
        type="button"
        onClick={() => setRollupOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 text-left transition hover:bg-panel ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
        aria-expanded={rollupOpen}
      >
        <span className={`font-sans text-muted ${compact ? "text-xs" : "text-sm"}`}>{item.label}</span>
        <ToggleGlyph open={rollupOpen} />
      </button>
      {rollupOpen ? (
        <ul className="divide-y divide-line border-t border-line">
          {item.rows.map((row) => (
            <li key={row.id}>
              <FeedRow row={row} compact />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ClawGroupSection({
  claw,
  items,
  compact,
  defaultOpen,
}: {
  claw: string;
  items: ActivityFeedRow[];
  compact: boolean;
  defaultOpen: boolean;
}) {
  const hasNew = items.some((row) => row.sinceLastVisit);
  const [open, setOpen] = useState(defaultOpen || hasNew);

  const displayItems = useMemo(() => buildActivityDisplayItems(items), [items]);
  const previewItems = displayItems.slice(0, 1);

  return (
    <div className="border border-line bg-void">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 text-left transition hover:bg-panel ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-cursor-glow">{claw}</span>
          <span className="font-mono text-[9px] text-muted">({items.length})</span>
          {hasNew ? (
            <span className="rounded bg-cursor-glow/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-cursor-glow">
              New
            </span>
          ) : null}
        </div>
        <ToggleGlyph open={open} />
      </button>
      <div className={open ? "border-t border-line" : ""}>
        {open ? (
          <ul className="divide-y divide-line">
            {displayItems.map((item, idx) => (
              <li key={item.kind === "row" ? item.row.id : `rollup-${idx}`}>
                <DisplayItemRow item={item} compact={compact} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-line">
            {previewItems.map((item, idx) => (
              <li key={item.kind === "row" ? item.row.id : `preview-${idx}`}>
                {item.kind === "row" ? (
                  <FeedRow row={item.row} compact />
                ) : (
                  <p className={`font-sans text-muted ${compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"}`}>
                    {item.label}
                  </p>
                )}
              </li>
            ))}
            {items.length > 1 ? (
              <li className={`font-sans text-muted ${compact ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs"}`}>
                + {items.length - 1} more
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}

export function OvernightWorkSection({
  items,
  summary,
  compact = false,
  className = "",
  onExpandedChange,
}: OvernightWorkSectionProps) {
  const sinceCount = summary.sinceLastVisit;
  const [sectionOpen, setSectionOpen] = useState(sinceCount > 0);
  const groups = useMemo(() => groupActivityByClaw(items), [items]);

  useEffect(() => {
    onExpandedChange?.(sectionOpen);
  }, [onExpandedChange, sectionOpen]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SECTION_STORAGE_KEY);
      if (stored === "1") {
        setSectionOpen(true);
        return;
      }
      if (stored === "0") {
        setSectionOpen(false);
        return;
      }
      setSectionOpen(sinceCount > 0);
    } catch {
      setSectionOpen(sinceCount > 0);
    }
  }, [sinceCount]);

  const toggleSection = useCallback(() => {
    setSectionOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(SECTION_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  if (items.length === 0) {
    return (
      <div className={`border border-line bg-panel ${compact ? "px-3 py-2.5" : "px-4 py-3"} ${className}`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Overnight work</p>
        <p className={`mt-1 font-sans text-muted ${compact ? "text-[11px]" : "text-xs"}`}>
          Your team is ready — run a demo tour or complete a desk action to populate activity.
        </p>
      </div>
    );
  }

  return (
    <div className={`border border-line bg-panel ${className}`}>
      <button
        type="button"
        onClick={toggleSection}
        className={`flex w-full items-start justify-between gap-3 text-left transition hover:bg-void/40 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
        aria-expanded={sectionOpen}
      >
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Overnight work</p>
          {!sectionOpen ? (
            <SummaryStats summary={summary} compact={compact} />
          ) : (
            <p className={`mt-1 font-sans text-muted ${compact ? "text-xs" : "text-sm"}`}>
              What your team did on your metal
            </p>
          )}
        </div>
        <ToggleGlyph open={sectionOpen} />
      </button>

      {sectionOpen ? (
        <div
          className={`space-y-2 overflow-y-auto border-t border-line ${compact ? "max-h-64 p-2" : "max-h-80 p-3"}`}
        >
          <SummaryStats summary={summary} compact={compact} />
          {groups.map((group, index) => (
            <ClawGroupSection
              key={group.claw}
              claw={group.claw}
              items={group.items}
              compact={compact}
              defaultOpen={index === 0 && sinceCount > 0}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
