using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Security;

public enum BookingAuthStatus
{
    Allowed,
    Forbidden,
    BadRequest,
}

public sealed class BookingAuthResult
{
    public BookingAuthStatus Status { get; init; }
    public string? Message { get; init; }

    public static BookingAuthResult Allowed() => new() { Status = BookingAuthStatus.Allowed };

    public static BookingAuthResult Forbidden() => new() { Status = BookingAuthStatus.Forbidden };

    public static BookingAuthResult BadRequest(string message) =>
        new() { Status = BookingAuthStatus.BadRequest, Message = message };
}

public interface IBookingRequestAuthorization
{
    Task<BookingAuthResult> AuthorizeBookAsync(
        Guid authenticatedUserId,
        BookAppointmentRequestDto body,
        CancellationToken cancellationToken = default);

    Task<BookingAuthResult> AuthorizeCancelAsync(
        Guid authenticatedUserId,
        CancelAppointmentRequestDto body,
        CancellationToken cancellationToken = default);
}

public sealed class BookingRequestAuthorization : IBookingRequestAuthorization
{
    private readonly IMiloPetFactsService _petFacts;
    private readonly IVetBookingOwnershipService _bookingOwnership;

    public BookingRequestAuthorization(
        IMiloPetFactsService petFacts,
        IVetBookingOwnershipService bookingOwnership)
    {
        _petFacts = petFacts;
        _bookingOwnership = bookingOwnership;
    }

    public async Task<BookingAuthResult> AuthorizeBookAsync(
        Guid authenticatedUserId,
        BookAppointmentRequestDto body,
        CancellationToken cancellationToken = default)
    {
        if (body.UserId.HasValue && body.UserId.Value != authenticatedUserId)
            return BookingAuthResult.Forbidden();

        if (body.PetId.HasValue)
        {
            var ok = await _petFacts.VerifyPetAccessAsync(
                authenticatedUserId,
                body.PetId.Value,
                cancellationToken);
            if (!ok)
                return BookingAuthResult.Forbidden();
        }

        return BookingAuthResult.Allowed();
    }

    public async Task<BookingAuthResult> AuthorizeCancelAsync(
        Guid authenticatedUserId,
        CancelAppointmentRequestDto body,
        CancellationToken cancellationToken = default)
    {
        var canAct = await _bookingOwnership.CanActOnBookingAsync(
            authenticatedUserId,
            body.ClinicId,
            body.AppointmentId,
            body.ExternalAppointmentId,
            cancellationToken);

        return canAct ? BookingAuthResult.Allowed() : BookingAuthResult.Forbidden();
    }
}
