import type { CalendarEvent } from "@/types/calendarEvent";
import {
  buildMonthGrid,
  datesWithEventCategories,
  eventsInMonth,
  eventsOnDate,
  groupEventsByDay,
} from "@/utils/petCalendarGrid";

const sampleEvent = (startUtc: string, category: CalendarEvent["category"] = "vet"): CalendarEvent => ({
  id: `vet:${startUtc}`,
  source: "vet_booking",
  category,
  title: "Test",
  startUtc,
  endUtc: startUtc,
  petId: null,
  status: "confirmed",
  raw: {} as CalendarEvent["raw"],
});

describe("buildMonthGrid", () => {
  it("returns 42 cells for a month grid", () => {
    expect(buildMonthGrid(2026, 4, "2026-05-17")).toHaveLength(42);
  });

  it("marks inMonth cells for May 2026", () => {
    const cells = buildMonthGrid(2026, 4, "2026-05-17");
    const inMay = cells.filter((c) => c.inMonth);
    expect(inMay.length).toBe(31);
  });
});

describe("datesWithEventCategories", () => {
  it("groups categories by local date", () => {
    const map = datesWithEventCategories([
      sampleEvent("2026-05-20T10:00:00Z", "vet"),
      sampleEvent("2026-05-20T18:00:00Z", "grooming"),
      sampleEvent("2026-05-21T10:00:00Z", "walk"),
    ]);
    expect(map.get("2026-05-20")?.has("vet")).toBe(true);
    expect(map.get("2026-05-20")?.has("grooming")).toBe(true);
    expect(map.get("2026-05-21")?.has("walk")).toBe(true);
  });
});

describe("eventsOnDate", () => {
  it("filters to a single day", () => {
    const events = [
      sampleEvent("2026-05-20T10:00:00Z"),
      sampleEvent("2026-05-21T10:00:00Z"),
    ];
    expect(eventsOnDate(events, "2026-05-20")).toHaveLength(1);
  });
});

describe("eventsInMonth", () => {
  it("includes events in the given month", () => {
    const events = [
      sampleEvent("2026-04-30T23:00:00Z"),
      sampleEvent("2026-05-15T12:00:00Z"),
    ];
    const may = eventsInMonth(events, 2026, 4);
    expect(may.some((e) => e.startUtc.includes("2026-05-15"))).toBe(true);
  });
});

describe("groupEventsByDay", () => {
  it("groups and sorts days", () => {
    const grouped = groupEventsByDay([
      sampleEvent("2026-05-21T10:00:00Z"),
      sampleEvent("2026-05-20T10:00:00Z"),
    ]);
    expect(grouped[0][0]).toBe("2026-05-20");
    expect(grouped[1][0]).toBe("2026-05-21");
  });
});
