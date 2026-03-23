/**
 * PawBuck.API booking HTTP client (shared by consumer and provider apps).
 * Pass base URL from env per app; no trailing slash.
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

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function fetchAvailability(
  baseUrl: string,
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
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      clinicId: params.clinicId,
      serviceType: params.serviceType ?? "Veterinary",
      rangeStartUtc: params.rangeStartUtc,
      rangeEndUtc: params.rangeEndUtc,
    }),
  });

  const body = (await parseJsonOrThrow(res)) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof body.message === "string" ? body.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as unknown as AvailabilityResponse;
}

export async function bookAppointment(
  baseUrl: string,
  params: {
    clinicId: string;
    startUtc: string;
    endUtc: string;
    selectionToken: string;
    userId?: string;
    petId?: string;
    serviceType?: BookingServiceType;
    notes?: string;
    idempotencyKey?: string;
  }
): Promise<BookAppointmentResponse> {
  const base = baseUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
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
      userId: params.userId ?? null,
      petId: params.petId ?? null,
      notes: params.notes ?? null,
      idempotencyKey: params.idempotencyKey ?? null,
    }),
  });

  const body = (await parseJsonOrThrow(res)) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof body.message === "string" ? body.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as unknown as BookAppointmentResponse;
}
