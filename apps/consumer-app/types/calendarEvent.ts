import type { VetBookingRow } from "@/services/vetBookings";
import type { Tables } from "@/database.types";

export type CalendarEventCategory = "vet" | "grooming" | "walk" | "other";

export type CalendarEventSource = "vet_booking" | "marketplace_booking";

export type CalendarEvent = {
  id: string;
  source: CalendarEventSource;
  category: CalendarEventCategory;
  title: string;
  startUtc: string;
  endUtc: string;
  petId: string | null;
  status: string;
  subtitle?: string;
  raw: VetBookingRow | MarketplaceBookingWithOffering;
};

export type MarketplaceBookingWithOffering = Tables<"marketplace_service_bookings"> & {
  service_offerings: Pick<Tables<"service_offerings">, "service_type" | "title"> | null;
  provider_profiles: Pick<Tables<"provider_profiles">, "display_name" | "business_name"> | null;
};
