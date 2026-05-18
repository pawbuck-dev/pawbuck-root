import {
  inferCalendarEventCategory,
  marketplaceBookingToCalendarEvent,
  mergeCalendarEvents,
  vetBookingToCalendarEvent,
} from "@/services/calendarEvents";
import type { VetBookingRow } from "@/services/vetBookings";
import type { MarketplaceBookingWithOffering } from "@/types/calendarEvent";

describe("inferCalendarEventCategory", () => {
  it("detects grooming", () => {
    expect(inferCalendarEventCategory("Pet Grooming Co")).toBe("grooming");
  });

  it("detects walk", () => {
    expect(inferCalendarEventCategory("Dog walk - 30 min")).toBe("walk");
  });

  it("detects vet", () => {
    expect(inferCalendarEventCategory("Annual wellness exam")).toBe("vet");
  });

  it("defaults to other", () => {
    expect(inferCalendarEventCategory("Playdate")).toBe("other");
  });

  it("detects boarding and training keywords as other", () => {
    expect(inferCalendarEventCategory("[Boarding] Kennel stay")).toBe("other");
    expect(inferCalendarEventCategory("[Training] Obedience class")).toBe("other");
  });
});

describe("vetBookingToCalendarEvent", () => {
  it("maps vet row with clinic subtitle", () => {
    const row = {
      id: "vb-1",
      start_utc: "2026-05-20T14:00:00Z",
      end_utc: "2026-05-20T15:00:00Z",
      service_label: "Wellness visit",
      clinic_name: "Main St Vet",
      pet_id: "pet-1",
      status: "confirmed",
      service_id: "wellness",
    } as VetBookingRow;

    const event = vetBookingToCalendarEvent(row);
    expect(event.id).toBe("vet:vb-1");
    expect(event.category).toBe("vet");
    expect(event.subtitle).toBe("Main St Vet");
  });

  it("categorizes grooming from service_label on vet_bookings row", () => {
    const row = {
      id: "vb-2",
      start_utc: "2026-05-21T10:00:00Z",
      end_utc: "2026-05-21T11:00:00Z",
      service_label: "Grooming appointment",
      clinic_name: "Pampered Paws",
      pet_id: null,
      status: "pending_confirmation",
      service_id: "other",
    } as VetBookingRow;

    expect(vetBookingToCalendarEvent(row).category).toBe("grooming");
  });
});

describe("marketplaceBookingToCalendarEvent", () => {
  it("returns null without start_at", () => {
    const row = {
      id: "mb-1",
      status: "confirmed",
      start_at: null,
    } as MarketplaceBookingWithOffering;
    expect(marketplaceBookingToCalendarEvent(row)).toBeNull();
  });

  it("maps walk marketplace booking", () => {
    const row = {
      id: "mb-2",
      status: "confirmed",
      start_at: "2026-05-22T16:00:00Z",
      pet_id: "pet-1",
      service_offerings: { service_type: "dog_walk", title: "Afternoon walk" },
      provider_profiles: { display_name: "Alex", business_name: null },
    } as MarketplaceBookingWithOffering;

    const event = marketplaceBookingToCalendarEvent(row)!;
    expect(event.category).toBe("walk");
    expect(event.title).toBe("Afternoon walk");
    expect(event.subtitle).toBe("Alex");
  });
});

describe("mergeCalendarEvents", () => {
  it("sorts by startUtc ascending", () => {
    const a = vetBookingToCalendarEvent({
      id: "2",
      start_utc: "2026-05-22T10:00:00Z",
      end_utc: "2026-05-22T11:00:00Z",
      service_label: "B",
      status: "confirmed",
    } as VetBookingRow);
    const b = vetBookingToCalendarEvent({
      id: "1",
      start_utc: "2026-05-20T10:00:00Z",
      end_utc: "2026-05-20T11:00:00Z",
      service_label: "A",
      status: "confirmed",
    } as VetBookingRow);

    const merged = mergeCalendarEvents([a, b]);
    expect(merged[0].title).toBe("A");
    expect(merged[1].title).toBe("B");
  });
});
