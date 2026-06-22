export type SlaChipLevel = "ok" | "amber" | "red";

export function slaHoursSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return (Date.now() - Date.parse(iso)) / 3_600_000;
}

export function slaChipForAge(hours: number): SlaChipLevel {
  if (hours >= 72) return "red";
  if (hours >= 24) return "amber";
  return "ok";
}

export function slaChipForIso(iso: string | null | undefined): SlaChipLevel {
  return slaChipForAge(slaHoursSince(iso));
}

export function slaChipLabel(level: SlaChipLevel): string {
  if (level === "red") return ">72h";
  if (level === "amber") return ">24h";
  return "fresh";
}
