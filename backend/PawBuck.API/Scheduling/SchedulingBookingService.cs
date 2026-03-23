using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling;

/// <summary>
/// Orchestrates scheduling: resolve clinic integration → delegate to vendor adapter.
/// Idempotency persistence belongs here or a dedicated service once Supabase is connected.
/// </summary>
public sealed class SchedulingBookingService : ISchedulingBookingService
{
    private readonly IClinicSchedulingConfigProvider _clinicConfig;
    private readonly SchedulingAdapterRegistry _registry;

    public SchedulingBookingService(
        IClinicSchedulingConfigProvider clinicConfig,
        SchedulingAdapterRegistry registry)
    {
        _clinicConfig = clinicConfig;
        _registry = registry;
    }

    public async Task<SchedulingResult<IReadOnlyList<NormalizedSlot>>> GetAvailabilityAsync(
        AvailabilityQuery query,
        CancellationToken cancellationToken = default)
    {
        var resolved = await TryResolveAsync(query.ClinicId, cancellationToken);
        if (!resolved.Ok)
            return resolved.AvailabilityError!;

        // TODO: Check idempotency store for book/cancel when wired.
        return await resolved.Adapter!.GetAvailabilityAsync(query, resolved.Context!, cancellationToken);
    }

    public async Task<SchedulingResult<NormalizedAppointment>> BookAsync(
        BookAppointmentCommand command,
        CancellationToken cancellationToken = default)
    {
        var resolved = await TryResolveAsync(command.ClinicId, cancellationToken);
        if (!resolved.Ok)
            return resolved.BookError!;

        // TODO: Check idempotency store by command.IdempotencyKey before calling vendor.
        return await resolved.Adapter!.BookAsync(command, resolved.Context!, cancellationToken);
    }

    public async Task<SchedulingResult<object?>> CancelAsync(
        CancelAppointmentCommand command,
        CancellationToken cancellationToken = default)
    {
        var resolved = await TryResolveAsync(command.ClinicId, cancellationToken);
        if (!resolved.Ok)
            return resolved.CancelError!;

        return await resolved.Adapter!.CancelAsync(command, resolved.Context!, cancellationToken);
    }

    private async Task<ResolveOutcome> TryResolveAsync(Guid clinicId, CancellationToken cancellationToken)
    {
        var config = await _clinicConfig.GetAsync(clinicId, cancellationToken);
        if (config == null)
        {
            return new ResolveOutcome
            {
                Ok = false,
                AvailabilityError = SchedulingResult<IReadOnlyList<NormalizedSlot>>.Fail(
                    "clinic_integration_missing",
                    "No scheduling integration is configured for this clinic."),
                BookError = SchedulingResult<NormalizedAppointment>.Fail(
                    "clinic_integration_missing",
                    "No scheduling integration is configured for this clinic."),
                CancelError = SchedulingResult<object?>.Fail(
                    "clinic_integration_missing",
                    "No scheduling integration is configured for this clinic.")
            };
        }

        if (!_registry.TryGet(config.ProviderKind, out var adapter) || adapter == null)
        {
            var msg = $"No adapter registered for provider {config.ProviderKind}.";
            return new ResolveOutcome
            {
                Ok = false,
                AvailabilityError = SchedulingResult<IReadOnlyList<NormalizedSlot>>.Fail("adapter_not_registered", msg),
                BookError = SchedulingResult<NormalizedAppointment>.Fail("adapter_not_registered", msg),
                CancelError = SchedulingResult<object?>.Fail("adapter_not_registered", msg)
            };
        }

        var context = new SchedulingAdapterContext
        {
            ClinicId = config.ClinicId,
            ProviderKind = config.ProviderKind,
            ExternalClinicId = config.ExternalClinicId,
            IntegrationSettings = config.IntegrationSettings
        };

        return new ResolveOutcome { Ok = true, Adapter = adapter, Context = context };
    }

    private sealed class ResolveOutcome
    {
        public bool Ok { get; init; }
        public ISchedulingVendorAdapter? Adapter { get; init; }
        public SchedulingAdapterContext? Context { get; init; }
        public SchedulingResult<IReadOnlyList<NormalizedSlot>>? AvailabilityError { get; init; }
        public SchedulingResult<NormalizedAppointment>? BookError { get; init; }
        public SchedulingResult<object?>? CancelError { get; init; }
    }
}
