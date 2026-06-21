import type { ContentPost } from "./content-queue-types";
import type { SocialPlatformId } from "./social-channels";
import { FALLBACK_OPTIMAL_HOUR } from "./content-schedule-insights";

export interface CalendarDay {
  date: string;
  label: string;
  posts: ContentPost[];
}

export interface CalendarWeek {
  weekStart: string;
  weekEnd: string;
  days: CalendarDay[];
}

/** @deprecated use FALLBACK_OPTIMAL_HOUR from content-schedule-insights */
const OPTIMAL_HOUR = FALLBACK_OPTIMAL_HOUR;

export function startOfWeek(date = new Date(), timeZone?: string): Date {
  const d = timeZone ? zonedDate(date, timeZone) : new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function zonedDate(date: Date, timeZone: string): Date {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    return new Date(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
    );
  } catch {
    return new Date(date);
  }
}

export function buildCalendarWeek(
  posts: ContentPost[],
  anchor = new Date(),
  timeZone?: string,
): CalendarWeek {
  const start = startOfWeek(anchor, timeZone);
  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const dayPosts = posts.filter((p) => {
      const when = p.scheduledAt ?? p.publishedAt ?? p.createdAt;
      return when.slice(0, 10) === key;
    });
    days.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      posts: dayPosts,
    });
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    days,
  };
}

export function suggestScheduleTime(platform: SocialPlatformId, dayOffset = 1, timeZone?: string): string {
  const base = timeZone ? zonedDate(new Date(), timeZone) : new Date();
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(OPTIMAL_HOUR[platform] ?? 18, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export function optimalHourLabel(platform: SocialPlatformId): string {
  const h = OPTIMAL_HOUR[platform] ?? 18;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `~${hr}${ampm} local`;
}
