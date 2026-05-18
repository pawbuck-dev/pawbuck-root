using FluentAssertions;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Security;

public class BookingRequestAuthorizationTests
{
    private readonly Mock<IMiloPetFactsService> _petFacts = new();
    private readonly Mock<IVetBookingOwnershipService> _bookingOwnership = new();
    private readonly BookingRequestAuthorization _sut;

    public BookingRequestAuthorizationTests()
    {
        _sut = new BookingRequestAuthorization(_petFacts.Object, _bookingOwnership.Object);
    }

    [Fact]
    public async Task AuthorizeBook_WhenBodyUserIdDiffersFromSub_ReturnsForbidden()
    {
        var sub = Guid.NewGuid();
        var body = new BookAppointmentRequestDto
        {
            UserId = Guid.NewGuid(),
            ClinicId = Guid.NewGuid(),
        };

        var result = await _sut.AuthorizeBookAsync(sub, body, CancellationToken.None);

        result.Status.Should().Be(BookingAuthStatus.Forbidden);
        _petFacts.Verify(
            p => p.VerifyPetAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AuthorizeBook_WhenPetIdNotAccessible_ReturnsForbidden()
    {
        var sub = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var body = new BookAppointmentRequestDto { PetId = petId, ClinicId = Guid.NewGuid() };

        _petFacts
            .Setup(p => p.VerifyPetAccessAsync(sub, petId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.AuthorizeBookAsync(sub, body, CancellationToken.None);

        result.Status.Should().Be(BookingAuthStatus.Forbidden);
    }

    [Fact]
    public async Task AuthorizeBook_WhenPetAccessible_ReturnsAllowed()
    {
        var sub = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var body = new BookAppointmentRequestDto { PetId = petId, UserId = sub, ClinicId = Guid.NewGuid() };

        _petFacts
            .Setup(p => p.VerifyPetAccessAsync(sub, petId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.AuthorizeBookAsync(sub, body, CancellationToken.None);

        result.Status.Should().Be(BookingAuthStatus.Allowed);
    }

    [Fact]
    public async Task AuthorizeCancel_WhenNotOwner_ReturnsForbidden()
    {
        var sub = Guid.NewGuid();
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            AppointmentId = Guid.NewGuid(),
        };

        _bookingOwnership
            .Setup(b =>
                b.CanActOnBookingAsync(
                    sub,
                    body.ClinicId,
                    body.AppointmentId,
                    body.ExternalAppointmentId,
                    It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.AuthorizeCancelAsync(sub, body, CancellationToken.None);

        result.Status.Should().Be(BookingAuthStatus.Forbidden);
    }

    [Fact]
    public async Task AuthorizeCancel_WhenOwner_ReturnsAllowed()
    {
        var sub = Guid.NewGuid();
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            ExternalAppointmentId = "ext-1",
        };

        _bookingOwnership
            .Setup(b =>
                b.CanActOnBookingAsync(
                    sub,
                    body.ClinicId,
                    body.AppointmentId,
                    body.ExternalAppointmentId,
                    It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.AuthorizeCancelAsync(sub, body, CancellationToken.None);

        result.Status.Should().Be(BookingAuthStatus.Allowed);
    }
}
