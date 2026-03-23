# Scheduling / booking (PawBuck.API)

Plug-and-play vendor integrations for appointments. **Veterinary** is the first service line; **`BookingServiceType`** already includes Grooming and Boarding for extension.

## Layout

| Path | Purpose |
|------|---------|
| `Contracts/` | Normalized DTOs (`NormalizedSlot`, `NormalizedAppointment`, commands, `BookingServiceType`, `BookingProviderKind`) |
| `Abstractions/` | `ISchedulingVendorAdapter`, `SchedulingAdapterContext`, `IClinicSchedulingConfigProvider` |
| `Vendors/PawBuckDemo/` | **Demo** adapter: Vancouver-hours slots + token-backed book (no external vendor) |
| `Vendors/Vetstoria/` | Vetstoria adapter (HTTP/OAuth TODO) |
| `Vendors/EazyVet/` | EazyVet adapter (HTTP/OAuth TODO) |
| `SchedulingAdapterRegistry.cs` | Resolve adapter by `BookingProviderKind` |
| `SchedulingBookingService.cs` | Orchestration (clinic config → adapter) |
| `ConfigurationClinicSchedulingConfigProvider.cs` | Clinic routing from `appsettings` (fallback) |
| `SupabaseClinicSchedulingConfigProvider.cs` | Reads `public.clinic_scheduling_config` via Postgres |
| `CompositeClinicSchedulingConfigProvider.cs` | Supabase first when enabled + connection string; else appsettings |

## API (HTTP)

- `POST /api/bookings/availability` — slots for `ClinicId` + `ServiceType` + UTC range.
- `POST /api/bookings` — book (optional `Idempotency-Key` header).
- `POST /api/bookings/cancel` — cancel by `AppointmentId` and/or `ExternalAppointmentId`.

## Configuration

`appsettings.json` → `Scheduling`:

- **`UseSupabaseClinicConfig`**: when `true` and `Supabase:ConnectionString` is set, load rows from `public.clinic_scheduling_config` first; missing clinics fall back to **`Clinics`**.
- **`Clinics`**: maps `ClinicId` → `Provider` (`PawBuckDemo` / `Vetstoria` / `EazyVet`) and `ExternalClinicId` (fallback / dev without DB seed).
- **`Vetstoria`**, **`EazyVet`**: `Enabled`, `BaseUrl` (secrets via env/user-secrets later).

## Consumer app

- Set `EXPO_PUBLIC_PAWBUCK_API_URL` to the API base URL (no trailing slash), e.g. `http://127.0.0.1:5xxx` from `dotnet run`.
- Mock clinics in the app include `schedulingClinicId` matching `Scheduling:Clinics` GUIDs.
- After a successful `POST /api/bookings`, the app inserts into Supabase `vet_bookings` (apply migration `20260221120000_vet_bookings.sql`).

## Next steps

1. ~~Supabase-backed clinic routing~~ — implemented (`clinic_scheduling_config` migration + composite provider). Keep `Clinics` in appsettings for fallback.
2. Implement vendor HTTP clients inside each adapter; map to normalized contracts only there.
3. Add idempotency store keyed by `IdempotencyKey` before vendor `Book`.

See `.cursor/rules/scheduling-booking-architecture.mdc` for non-negotiables (no vendor calls from mobile apps).
