import {
  bookAppointment as bookAppointmentCore,
  fetchAvailability as fetchAvailabilityCore,
  type AvailabilityResponse,
  type BookAppointmentResponse,
  type BookingServiceType,
  type NormalizedSlotDto,
} from "@pawbuck/api-client";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

export type { BookingServiceType, NormalizedSlotDto, AvailabilityResponse, BookAppointmentResponse };

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Not signed in");
  }
  return data.session.access_token;
}

export async function fetchAvailability(params: {
  clinicId: string;
  rangeStartUtc: string;
  rangeEndUtc: string;
  serviceType?: BookingServiceType;
}): Promise<AvailabilityResponse> {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  const token = await getAccessToken();
  return fetchAvailabilityCore(base, token, params);
}

export async function bookAppointment(params: {
  clinicId: string;
  startUtc: string;
  endUtc: string;
  selectionToken: string;
  petId?: string;
  serviceType?: BookingServiceType;
  notes?: string;
  idempotencyKey?: string;
}): Promise<BookAppointmentResponse> {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  const token = await getAccessToken();
  return bookAppointmentCore(base, token, params);
}
