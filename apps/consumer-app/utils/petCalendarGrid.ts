import type { CalendarEvent, CalendarEventCategory } from "@/types/calendarEvent";
import moment from "moment";

export type MonthGridCell = {
  isoDate: string;
  inMonth: boolean;
  isToday: boolean;
};

/** Build a 6-week Sunday-start grid for the given month (moment month 0–11). */
export function buildMonthGrid(year: number, month: number, todayIso?: string): MonthGridCell[] {
  const today = todayIso ?? moment().format("YYYY-MM-DD");
  const start = moment({ year, month, day: 1 }).startOf("month").startOf("week");
  const cells: MonthGridCell[] = [];

  for (let i = 0; i < 42; i++) {
    const d = start.clone().add(i, "days");
    cells.push({
      isoDate: d.format("YYYY-MM-DD"),
      inMonth: d.month() === month,
      isToday: d.format("YYYY-MM-DD") === today,
    });
  }

  return cells;
}

export function eventLocalDateKey(startUtc: string): string {
  return moment(startUtc).format("YYYY-MM-DD");
}

/** Map each day to the set of event categories occurring that day. */
export function datesWithEventCategories(
  events: CalendarEvent[]
): Map<string, Set<CalendarEventCategory>> {
  const map = new Map<string, Set<CalendarEventCategory>>();
  for (const e of events) {
    const key = eventLocalDateKey(e.startUtc);
    const set = map.get(key) ?? new Set<CalendarEventCategory>();
    set.add(e.category);
    map.set(key, set);
  }
  return map;
}

export function eventsOnDate(events: CalendarEvent[], isoDate: string): CalendarEvent[] {
  return events.filter((e) => eventLocalDateKey(e.startUtc) === isoDate);
}

export function eventsInMonth(
  events: CalendarEvent[],
  year: number,
  month: number
): CalendarEvent[] {
  const monthStart = moment({ year, month, day: 1 }).startOf("month");
  const monthEnd = monthStart.clone().endOf("month");
  return events.filter((e) => {
    const m = moment(e.startUtc);
    return m.isSameOrAfter(monthStart, "day") && m.isSameOrBefore(monthEnd, "day");
  });
}

export function groupEventsByDay(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = eventLocalDateKey(e.startUtc);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
