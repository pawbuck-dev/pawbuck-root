import type { VaccinationGroupingRow } from "./vaccinationGrouping";

export function parseDateOnlyYmd(ymd: string): Date {
  const dayPart = ymd.split("T")[0] ?? ymd;
  const [y, m, d] = dayPart.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetweenLocal(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDaysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "Due today";
  if (daysLeft === 1) return "Due in 1 day";
  return `Due in ${daysLeft} days`;
}

export function vaccinationsRoute(petId: string): string {
  return `/(home)/health-record/${petId}/(tabs)/vaccinations`;
}

export function medicationsRoute(petId: string): string {
  return `/(home)/health-record/${petId}/(tabs)/medications`;
}

export type { VaccinationGroupingRow };
