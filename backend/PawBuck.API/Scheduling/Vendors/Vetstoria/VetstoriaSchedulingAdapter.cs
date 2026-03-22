using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling.Vendors.Vetstoria;

/// <summary>
/// Vetstoria integration adapter. Wire HTTP/OAuth when credentials and API surface are finalized.
/// </summary>
public sealed class VetstoriaSchedulingAdapter : ISchedulingVendorAdapter
{
    private readonly IOptionsMonitor<VetstoriaOptions> _options;
    private readonly ILogger<VetstoriaSchedulingAdapter> _logger;

    public VetstoriaSchedulingAdapter(IOptionsMonitor<VetstoriaOptions> options, ILogger<VetstoriaSchedulingAdapter> logger)
    {
        _options = options;
        _logger = logger;
    }

    public BookingProviderKind ProviderKind => BookingProviderKind.Vetstoria;

    public Task<SchedulingResult<IReadOnlyList<NormalizedSlot>>> GetAvailabilityAsync(
        AvailabilityQuery query,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.CurrentValue.Enabled)
        {
            return Task.FromResult(SchedulingResult<IReadOnlyList<NormalizedSlot>>.Fail(
                "vetstoria_not_configured",
                "Vetstoria adapter is not enabled. Configure Scheduling:Vetstoria in appsettings or Supabase integration."));
        }

        // TODO: Map AvailabilityQuery → Vetstoria API; normalize slots.
        _logger.LogInformation("Vetstoria availability stub for clinic {ClinicId}", query.ClinicId);
        return Task.FromResult(SchedulingResult<IReadOnlyList<NormalizedSlot>>.Ok(Array.Empty<NormalizedSlot>()));
    }

    public Task<SchedulingResult<NormalizedAppointment>> BookAsync(
        BookAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.CurrentValue.Enabled)
        {
            return Task.FromResult(SchedulingResult<NormalizedAppointment>.Fail(
                "vetstoria_not_configured",
                "Vetstoria adapter is not enabled."));
        }

        // TODO: Idempotent book against Vetstoria; persist external_appointment_id via orchestrator/DB.
        return Task.FromResult(SchedulingResult<NormalizedAppointment>.Fail(
            "not_implemented",
            "Vetstoria booking is not implemented yet."));
    }

    public Task<SchedulingResult<object?>> CancelAsync(
        CancelAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.CurrentValue.Enabled)
        {
            return Task.FromResult(SchedulingResult<object?>.Fail(
                "vetstoria_not_configured",
                "Vetstoria adapter is not enabled."));
        }

        return Task.FromResult(SchedulingResult<object?>.Fail(
            "not_implemented",
            "Vetstoria cancel is not implemented yet."));
    }
}

public sealed class VetstoriaOptions
{
    public const string SectionName = "Scheduling:Vetstoria";
    public bool Enabled { get; set; }
    public string? BaseUrl { get; set; }
}
