import { fetchAvailability, type BookingServiceType } from "@pawbuck/api-client";
import { getPawbuckApiBaseUrl } from "./pawbuckEnv";

/** Provider-side availability check (same PawBuck.API as consumer; auth may differ later). */
export async function fetchClinicAvailability(params: {
  clinicId: string;
  rangeStartUtc: string;
  rangeEndUtc: string;
  serviceType?: BookingServiceType;
}) {
  const base = getPawbuckApiBaseUrl();
  if (!base) throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  return fetchAvailability(base, params);
}
