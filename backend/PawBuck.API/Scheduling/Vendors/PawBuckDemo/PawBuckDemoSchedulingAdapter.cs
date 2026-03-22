using System.Globalization;
using System.Text;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling.Vendors.PawBuckDemo;

/// <summary>
/// Returns bookable slots and confirms bookings without an external vendor.
/// Replace per-clinic routing with Vetstoria/EazyVet when credentials are configured.
/// </summary>
public sealed class PawBuckDemoSchedulingAdapter : ISchedulingVendorAdapter
{
    private static readonly string[] TimeZoneIds =
    [
        "America/Vancouver",
        "Pacific Standard Time",
    ];

    public BookingProviderKind ProviderKind => BookingProviderKind.PawBuckDemo;

    public Task<SchedulingResult<IReadOnlyList<NormalizedSlot>>> GetAvailabilityAsync(
        AvailabilityQuery query,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        var slots = new List<NormalizedSlot>();
        var tz = TryResolveVancouverTimeZone();
        var startDate = query.RangeStartUtc.UtcDateTime.Date;
        var endDate = query.RangeEndUtc.UtcDateTime.Date;

        for (var day = startDate; day <= endDate; day = day.AddDays(1))
        {
            if (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                continue;

            for (var h = 9; h <= 16; h++)
            {
                foreach (var minute in new[] { 0, 30 })
                {
                    if (h == 16 && minute == 30)
                        break;

                    DateTimeOffset slotStart;
                    DateTimeOffset slotEnd;

                    if (tz != null)
                    {
                        var localUnspecified = new DateTime(day.Year, day.Month, day.Day, h, minute, 0, DateTimeKind.Unspecified);
                        var utc = TimeZoneInfo.ConvertTimeToUtc(localUnspecified, tz);
                        slotStart = new DateTimeOffset(utc, TimeSpan.Zero);
                    }
                    else
                    {
                        // Fallback: treat wall time as UTC-8 (demo only).
                        var local = new DateTimeOffset(day.Year, day.Month, day.Day, h, minute, 0, TimeSpan.FromHours(-8));
                        slotStart = local.ToUniversalTime();
                    }

                    slotEnd = slotStart.AddMinutes(30);
                    if (slotEnd <= query.RangeStartUtc || slotStart >= query.RangeEndUtc)
                        continue;

                    // Skip some slots for a realistic sparse grid (matches app mock).
                    var skip = (day.Day + h + minute) % 11;
                    if (skip is 0 or 3 or 7)
                        continue;

                    slots.Add(new NormalizedSlot
                    {
                        StartUtc = slotStart,
                        EndUtc = slotEnd,
                        ExternalResourceId = "demo-provider",
                        ResourceLabel = "Available",
                        SelectionToken = EncodeSelectionToken(slotStart, slotEnd),
                    });
                }
            }
        }

        return Task.FromResult(SchedulingResult<IReadOnlyList<NormalizedSlot>>.Ok(slots));
    }

    public Task<SchedulingResult<NormalizedAppointment>> BookAsync(
        BookAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        if (!TryDecodeSelectionToken(command.SelectionToken, out var tokStart, out var tokEnd))
        {
            return Task.FromResult(SchedulingResult<NormalizedAppointment>.Fail(
                "invalid_selection",
                "Invalid or missing selection token for this slot."));
        }

        if (tokStart != command.StartUtc || tokEnd != command.EndUtc)
        {
            return Task.FromResult(SchedulingResult<NormalizedAppointment>.Fail(
                "slot_mismatch",
                "Selected times do not match the booking token."));
        }

        var id = Guid.NewGuid();
        var ext = $"pawbuck-demo-{id:N}";

        return Task.FromResult(SchedulingResult<NormalizedAppointment>.Ok(new NormalizedAppointment
        {
            Id = id,
            ExternalAppointmentId = ext,
            StartUtc = command.StartUtc,
            EndUtc = command.EndUtc,
            ServiceType = command.ServiceType,
            ExternalResourceId = command.ExternalResourceId,
            Notes = command.Notes,
        }));
    }

    public Task<SchedulingResult<object?>> CancelAsync(
        CancelAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default)
    {
        _ = command;
        _ = context;
        return Task.FromResult(SchedulingResult<object?>.Ok(null));
    }

    private static TimeZoneInfo? TryResolveVancouverTimeZone()
    {
        foreach (var id in TimeZoneIds)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return null;
    }

    private static string EncodeSelectionToken(DateTimeOffset start, DateTimeOffset end)
    {
        var payload = $"{start.ToString("o", CultureInfo.InvariantCulture)}|{end.ToString("o", CultureInfo.InvariantCulture)}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(payload));
    }

    private static bool TryDecodeSelectionToken(string? token, out DateTimeOffset start, out DateTimeOffset end)
    {
        start = default;
        end = default;
        if (string.IsNullOrWhiteSpace(token))
            return false;

        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var parts = raw.Split('|', 2);
            if (parts.Length != 2)
                return false;
            start = DateTimeOffset.Parse(parts[0], CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
            end = DateTimeOffset.Parse(parts[1], CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
