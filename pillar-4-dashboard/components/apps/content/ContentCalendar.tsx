"use client";

import type { ContentPost } from "@/lib/content-queue-types";
import type { CalendarWeek } from "@/lib/content-calendar";
import { postEta } from "@/lib/content-queue-types";
import type { PlatformScheduleInsightRow } from "@/components/apps/content/ContentBestTimePanel";

interface ContentCalendarProps {
  calendar: CalendarWeek | null;
  selectedId: string;
  insights: PlatformScheduleInsightRow[];
  onSelect: (postId: string) => void;
  onReschedule: (postId: string, scheduledAt: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

function insightForPlatform(
  platform: string,
  insights: PlatformScheduleInsightRow[],
): { hour: number; label: string; source: string } {
  const hit = insights.find((i) => i.platform === platform);
  if (hit) return { hour: hit.bestHour, label: hit.label, source: hit.source };
  const hourMap: Record<string, number> = { x: 9, linkedin: 8, tiktok: 19, instagram: 18, youtube: 17 };
  const hour = hourMap[platform] ?? 18;
  return { hour, label: `${hour}:00`, source: "fallback" };
}

export function ContentCalendar({
  calendar,
  selectedId,
  insights,
  onSelect,
  onReschedule,
  onPrevWeek,
  onNextWeek,
}: ContentCalendarProps) {
  if (!calendar) {
    return <p className="font-mono text-[10px] text-muted">Loading calendar…</p>;
  }

  const handleDropOnDay = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/post-id");
    if (!id) return;
    const post = calendar.days.flatMap((d) => d.posts).find((p) => p.id === id);
    const platform = post?.platform ?? "x";
    const { hour } = insightForPlatform(platform, insights);
    const d = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    onReschedule(id, d.toISOString());
  };

  const learned = insights.filter((i) => i.source === "data");
  const sampleInsight = learned[0] ?? insights[0];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between font-mono text-[10px]">
        <button type="button" onClick={onPrevWeek} className="border border-line px-2 py-1 text-muted hover:text-stark">
          ← Prev
        </button>
        <span className="text-stark uppercase tracking-widest">Week view · drag scheduled posts</span>
        <button type="button" onClick={onNextWeek} className="border border-line px-2 py-1 text-muted hover:text-stark">
          Next →
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-7">
        {calendar.days.map((day) => (
          <div
            key={day.date}
            className="min-h-[120px] border border-line bg-panel p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropOnDay(e, day.date)}
          >
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{day.label}</p>
            <div className="mt-2 space-y-1">
              {day.posts.length === 0 ? (
                <p className="font-mono text-[9px] text-muted/60">drop here</p>
              ) : (
                day.posts.map((post) => (
                  <CalendarPostChip
                    key={post.id}
                    post={post}
                    selected={post.id === selectedId}
                    onSelect={() => onSelect(post.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[9px] text-muted">
        {sampleInsight
          ? `Drop uses ${sampleInsight.source === "data" ? "learned" : "default"} slots — e.g. ${sampleInsight.platform} ${sampleInsight.label}`
          : "Drop reschedules at platform-optimal local hour"}
      </p>
    </div>
  );
}

function CalendarPostChip({
  post,
  selected,
  onSelect,
}: {
  post: ContentPost;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      draggable={post.stage === "SCHEDULED"}
      onDragStart={(e) => e.dataTransfer.setData("text/post-id", post.id)}
      onClick={onSelect}
      className={`cursor-pointer border px-1 py-0.5 font-mono text-[9px] ${
        selected ? "border-cursor-glow bg-surface text-cursor-glow" : "border-line/50 text-stark"
      }`}
    >
      <span>{post.id}</span>
      <span className="ml-1 text-muted">{post.platform}</span>
      <div className="text-[8px] text-muted">{postEta(post)}</div>
    </div>
  );
}
