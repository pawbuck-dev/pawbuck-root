# Scheduling / booking (PawBuck.API)

Plug-and-play vendor integrations for appointments. **Veterinary** is the first service line; **`BookingServiceType`** already includes Grooming and Boarding for extension.

## Layout

| Path | Purpose |
|------|---------|
| `Contracts/` | Normalized DTOs (`NormalizedSlot`, `NormalizedAppointment`, commands, `BookingServiceType`, `BookingProviderKind`) |
| `Abstractions/` | `ISchedulingVendorAdapter`, `SchedulingAdapterContext`, `IClinicSchedulingConfigProvider` |
| `Vendors/Vetstoria/` | Vetstoria adapter (HTTP/OAuth TODO) |
| `Vendors/EazyVet/` | EazyVet adapter (HTTP/OAuth TODO) |
| `SchedulingAdapterRegistry.cs` | Resolve adapter by `BookingProviderKind` |
| `SchedulingBookingService.cs` | Orchestration (clinic config → adapter) |
| `ConfigurationClinicSchedulingConfigProvider.cs` | Clinic routing from `appsettings` (swap for Supabase) |

## API (HTTP)

- `POST /api/bookings/availability` — slots for `ClinicId` + `ServiceType` + UTC range.
- `POST /api/bookings` — book (optional `Idempotency-Key` header).
- `POST /api/bookings/cancel` — cancel by `AppointmentId` and/or `ExternalAppointmentId`.

## Configuration

`appsettings.json` → `Scheduling`:

- **`Clinics`**: maps `ClinicId` → `Provider` (`Vetstoria` / `EazyVet`) and `ExternalClinicId`.
- **`Vetstoria`**, **`EazyVet`**: `Enabled`, `BaseUrl` (secrets via env/user-secrets later).

## Next steps

1. Persist appointments + `external_*` ids in Supabase; replace config provider with DB-backed lookup.
2. Implement vendor HTTP clients inside each adapter; map to normalized contracts only there.
3. Add idempotency store keyed by `IdempotencyKey` before vendor `Book`.

See `.cursor/rules/scheduling-booking-architecture.mdc` for non-negotiables (no vendor calls from mobile apps).
