using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling.Vendors.EazyVet;

/// <summary>
/// EazyVet integration adapter. Wire HTTP/OAuth when credentials and API surface are finalized.
/// </summary>
public sealed class EazyVetSchedulingAdapter : ISchedulingVendorAdapter
{
    private readonly IOptionsMonitor<EazyVetOptions> _options;
    private readonly ILogger<EazyVetSchedulingAdapter> _logger;

    public EazyVetSchedulingAdapter(IOptionsMonitor<EazyVetOptions> options, ILogger<EazyVetSchedulingAdapter> logger)
    {
        _options = options;
        _logger = logger;
    }

    public BookingProviderKind ProviderKind => BookingProviderKind.EazyVet;

    public Task<SchedulingResult<IReadOnlyList<NormalizedSlot>>> GetAvailabilityAsync(
        AvailabilityQuery query,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.CurrentValue.Enabled)
        {
            return Task.FromResult(SchedulingResult<IReadOnlyList<NormalizedSlot>>.Fail(
                "eazyvet_not_configured",
                "EazyVet adapter is not enabled. Configure Scheduling:EazyVet in appsettings or Supabase integration."));
        }

        _logger.LogInformation("EazyVet availability stub for clinic {ClinicId}", query.ClinicId);
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
                "eazyvet_not_configured",
                "EazyVet adapter is not enabled."));
        }

        return Task.FromResult(SchedulingResult<NormalizedAppointment>.Fail(
            "not_implemented",
            "EazyVet booking is not implemented yet."));
    }

    public Task<SchedulingResult<object?>> CancelAsync(
        CancelAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.CurrentValue.Enabled)
        {
            return Task.FromResult(SchedulingResult<object?>.Fail(
                "eazyvet_not_configured",
                "EazyVet adapter is not enabled."));
        }

        return Task.FromResult(SchedulingResult<object?>.Fail(
            "not_implemented",
            "EazyVet cancel is not implemented yet."));
    }
}

public sealed class EazyVetOptions
{
    public const string SectionName = "Scheduling:EazyVet";
    public bool Enabled { get; set; }
    public string? BaseUrl { get; set; }
}
