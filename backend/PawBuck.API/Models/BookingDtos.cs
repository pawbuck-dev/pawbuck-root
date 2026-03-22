using System.Text.Json.Serialization;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Models;

public sealed class AvailabilityRequestDto
{
    public Guid ClinicId { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public BookingServiceType ServiceType { get; set; } = BookingServiceType.Veterinary;

    public DateTimeOffset RangeStartUtc { get; set; }
    public DateTimeOffset RangeEndUtc { get; set; }
    public string? ExternalResourceId { get; set; }
}

public sealed class AvailabilityResponseDto
{
    public IReadOnlyList<NormalizedSlotDto> Slots { get; set; } = Array.Empty<NormalizedSlotDto>();
}

public sealed class NormalizedSlotDto
{
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public string? ExternalResourceId { get; set; }
    public string? ResourceLabel { get; set; }
    public string? SelectionToken { get; set; }
}

public sealed class BookAppointmentRequestDto
{
    public Guid ClinicId { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public BookingServiceType ServiceType { get; set; } = BookingServiceType.Veterinary;

    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public string? ExternalResourceId { get; set; }
    public string? SelectionToken { get; set; }
    public Guid? UserId { get; set; }
    public Guid? PetId { get; set; }
    public string? Notes { get; set; }
    public string? IdempotencyKey { get; set; }
}

public sealed class BookAppointmentResponseDto
{
    public Guid? Id { get; set; }
    public string ExternalAppointmentId { get; set; } = string.Empty;
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public BookingServiceType ServiceType { get; set; }
}

public sealed class CancelAppointmentRequestDto
{
    public Guid ClinicId { get; set; }
    public Guid? AppointmentId { get; set; }
    public string? ExternalAppointmentId { get; set; }
    public string? Reason { get; set; }
}
