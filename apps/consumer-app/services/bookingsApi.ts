import {
  bookAppointment as bookAppointmentCore,
  fetchAvailability as fetchAvailabilityCore,
  type AvailabilityResponse,
  type BookAppointmentResponse,
  type BookingServiceType,
  type NormalizedSlotDto,
} from "@pawbuck/api-client";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";

export type { BookingServiceType, NormalizedSlotDto, AvailabilityResponse, BookAppointmentResponse };

export async function fetchAvailability(params: {
  clinicId: string;
  rangeStartUtc: string;
  rangeEndUtc: string;
  serviceType?: BookingServiceType;
}): Promise<AvailabilityResponse> {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  return fetchAvailabilityCore(base, params);
}

export async function bookAppointment(params: {
  clinicId: string;
  startUtc: string;
  endUtc: string;
  selectionToken: string;
  userId?: string;
  petId?: string;
  serviceType?: BookingServiceType;
  notes?: string;
  idempotencyKey?: string;
}): Promise<BookAppointmentResponse> {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  return bookAppointmentCore(base, params);
}
