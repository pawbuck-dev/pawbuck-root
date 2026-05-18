import type {
  CalendarEvent,
  CalendarEventCategory,
  MarketplaceBookingWithOffering,
} from "@/types/calendarEvent";
import type { VetBookingRow } from "@/services/vetBookings";
import { fetchVetBookings, type FetchVetBookingsParams } from "@/services/vetBookings";
import { supabase } from "@/utils/supabase";
import moment from "moment";

export type FetchCalendarEventsParams = FetchVetBookingsParams;

/** Infer event category from service labels / marketplace service_type. */
export function inferCalendarEventCategory(
  ...labels: (string | null | undefined)[]
): CalendarEventCategory {
  const text = labels
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (/\b(groom|grooming|bath|nail|salon|spa|deshed)\b/.test(text)) return "grooming";
  if (/\b(walk|walker|dog\s*walk|pawthon)\b/.test(text)) return "walk";
  if (/\b(board|boarding|kennel|daycare)\b/.test(text)) return "other";
  if (/\b(train|training|obedience|trainer)\b/.test(text)) return "other";
  if (/\b(vet|vaccine|wellness|clinic|hospital|exam|checkup|surgery)\b/.test(text)) {
    return "vet";
  }
  return "other";
}

export function categoryDisplayLabel(category: CalendarEventCategory): string {
  switch (category) {
    case "vet":
      return "Vet";
    case "grooming":
      return "Grooming";
    case "walk":
      return "Walk";
    default:
      return "Event";
  }
}

export function vetBookingToCalendarEvent(row: VetBookingRow): CalendarEvent {
  const label = row.service_label ?? "Appointment";
  const category = inferCalendarEventCategory(label, row.service_id, row.clinic_name);

  return {
    id: `vet:${row.id}`,
    source: "vet_booking",
    category,
    title: label,
    startUtc: row.start_utc,
    endUtc: row.end_utc,
    petId: row.pet_id,
    status: row.status,
    subtitle: row.clinic_name ?? undefined,
    raw: row,
  };
}

export function marketplaceBookingToCalendarEvent(row: MarketplaceBookingWithOffering): CalendarEvent | null {
  if (!row.start_at) return null;
  if (row.status === "cancelled") return null;

  const offering = row.service_offerings;
  const provider = row.provider_profiles;
  const serviceType = offering?.service_type ?? "";
  const offeringTitle = offering?.title ?? "";
  const category = inferCalendarEventCategory(serviceType, offeringTitle);
  const providerName = provider?.business_name?.trim() || provider?.display_name?.trim() || undefined;
  const title = offeringTitle || categoryDisplayLabel(category);
  const start = moment(row.start_at);
  const end = start.clone().add(1, "hour");

  return {
    id: `marketplace:${row.id}`,
    source: "marketplace_booking",
    category,
    title,
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    petId: row.pet_id,
    status: row.status,
    subtitle: providerName,
    raw: row,
  };
}

export function mergeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

async function fetchMarketplaceCalendarBookings(
  params?: FetchCalendarEventsParams
): Promise<CalendarEvent[]> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return [];

  let q = supabase
    .from("marketplace_service_bookings")
    .select(
      `
      id,
      pet_id,
      status,
      start_at,
      notes,
      service_offering_id,
      provider_profile_id,
      pet_owner_user_id,
      created_at,
      service_offerings ( service_type, title ),
      provider_profiles ( display_name, business_name )
    `
    )
    .eq("pet_owner_user_id", userData.user.id)
    .neq("status", "cancelled")
    .not("start_at", "is", null);

  if (params?.petId) {
    q = q.eq("pet_id", params.petId);
  }
  if (params?.startAfterIso) {
    q = q.gte("start_at", params.startAfterIso);
  }

  const { data, error } = await q.order("start_at", { ascending: true });

  if (error) {
    console.warn("[calendarEvents] marketplace fetch failed", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => marketplaceBookingToCalendarEvent(row as MarketplaceBookingWithOffering))
    .filter((e): e is CalendarEvent => e != null);
}

/**
 * Unified pet calendar events: vet bookings + marketplace (grooming, walks, etc.).
 */
export async function fetchCalendarEvents(
  params?: FetchCalendarEventsParams
): Promise<CalendarEvent[]> {
  const [vetRows, marketplaceEvents] = await Promise.all([
    fetchVetBookings(params),
    fetchMarketplaceCalendarBookings(params),
  ]);

  const vetEvents = vetRows.map(vetBookingToCalendarEvent);
  return mergeCalendarEvents([...vetEvents, ...marketplaceEvents]);
}

export function isVetBookingEvent(event: CalendarEvent): event is CalendarEvent & { raw: VetBookingRow } {
  return event.source === "vet_booking";
}
