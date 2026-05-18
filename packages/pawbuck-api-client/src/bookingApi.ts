/**
 * PawBuck.API booking HTTP client (shared by consumer and provider apps).
 * Pass base URL from env per app; no trailing slash. Requires Supabase access token.
 */

export type BookingServiceType = "Veterinary" | "Grooming" | "Boarding" | "Other";

export type NormalizedSlotDto = {
  startUtc: string;
  endUtc: string;
  externalResourceId?: string | null;
  resourceLabel?: string | null;
  selectionToken?: string | null;
};

export type AvailabilityResponse = {
  slots: NormalizedSlotDto[];
};

export type BookAppointmentResponse = {
  id?: string | null;
  externalAppointmentId: string;
  startUtc: string;
  endUtc: string;
  serviceType: BookingServiceType;
};

export class BookingApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "BookingApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

function throwBookingError(res: Response, body: Record<string, unknown>): never {
  const message =
    typeof body.message === "string"
      ? body.message
      : typeof body.error === "string"
        ? body.error
        : `HTTP ${res.status}`;
  const code =
    res.status === 401
      ? "unauthorized"
      : res.status === 403
        ? "forbidden"
        : typeof body.error === "string"
          ? body.error
          : undefined;
  throw new BookingApiError(message, res.status, code);
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchAvailability(
  baseUrl: string,
  accessToken: string,
  params: {
    clinicId: string;
    rangeStartUtc: string;
    rangeEndUtc: string;
    serviceType?: BookingServiceType;
  }
): Promise<AvailabilityResponse> {
  const base = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/bookings/availability`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      clinicId: params.clinicId,
      serviceType: params.serviceType ?? "Veterinary",
      rangeStartUtc: params.rangeStartUtc,
      rangeEndUtc: params.rangeEndUtc,
    }),
  });

  const body = (await parseJsonOrThrow(res)) as Record<string, unknown>;
  if (!res.ok) throwBookingError(res, body);
  return body as unknown as AvailabilityResponse;
}

export async function bookAppointment(
  baseUrl: string,
  accessToken: string,
  params: {
    clinicId: string;
    startUtc: string;
    endUtc: string;
    selectionToken: string;
    petId?: string;
    serviceType?: BookingServiceType;
    notes?: string;
    idempotencyKey?: string;
  }
): Promise<BookAppointmentResponse> {
  const base = baseUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {
    ...authHeaders(accessToken),
  };
  if (params.idempotencyKey) headers["Idempotency-Key"] = params.idempotencyKey;

  const res = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clinicId: params.clinicId,
      serviceType: params.serviceType ?? "Veterinary",
      startUtc: params.startUtc,
      endUtc: params.endUtc,
      selectionToken: params.selectionToken,
      petId: params.petId ?? null,
      notes: params.notes ?? null,
      idempotencyKey: params.idempotencyKey ?? null,
    }),
  });

  const body = (await parseJsonOrThrow(res)) as Record<string, unknown>;
  if (!res.ok) throwBookingError(res, body);
  return body as unknown as BookAppointmentResponse;
}
