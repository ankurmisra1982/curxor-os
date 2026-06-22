import type { OutboundSend } from "./work-queue-types";

export interface WarmupChartDay {
  dayIndex: number;
  label: string;
  cap: number;
  sent: number;
  isToday: boolean;
}

export function buildWarmupChartSeries(
  sends: OutboundSend[],
  warmupDailyCap: number | null,
  warmupMode: boolean,
): WarmupChartDay[] {
  const baseCap = warmupDailyCap && warmupDailyCap > 0 ? warmupDailyCap : 15;
  const days: WarmupChartDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayNumber = 14 - i;
    const rampCap = warmupMode
      ? Math.min(baseCap, Math.max(5, Math.round((baseCap * dayNumber) / 14)))
      : baseCap;
    const sent = sends.filter((s) => {
      if (s.status !== "sent" && s.status !== "simulated") return false;
      const t = Date.parse(s.sentAt ?? s.createdAt);
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;

    days.push({
      dayIndex: dayNumber,
      label: dayStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      cap: rampCap,
      sent,
      isToday: i === 0,
    });
  }

  return days;
}
