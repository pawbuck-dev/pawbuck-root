using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Scheduling;
using PawBuck.API.Scheduling.Contracts;
using PawBuck.API.Security;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class BookingsControllerTests
{
    private readonly Mock<ISchedulingBookingService> _scheduling = new();
    private readonly Mock<IBookingRequestAuthorization> _bookingAuth = new();
    private readonly Mock<ILogger<BookingsController>> _logger = new();

    private BookingsController CreateController(ClaimsPrincipal? user = null)
    {
        var controller = new BookingsController(_scheduling.Object, _bookingAuth.Object, _logger.Object);
        var principal = user ?? new ClaimsPrincipal(new ClaimsIdentity());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal },
        };
        return controller;
    }

    private static ClaimsPrincipal UserWithSub(Guid userId) =>
        new(
            new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, userId.ToString())],
                "Test"));

    [Fact]
    public async Task Availability_WhenNoUserPrincipal_ReturnsUnauthorized()
    {
        var controller = CreateController();
        var body = new AvailabilityRequestDto
        {
            ClinicId = Guid.NewGuid(),
            RangeStartUtc = DateTimeOffset.UtcNow,
            RangeEndUtc = DateTimeOffset.UtcNow.AddHours(4),
        };

        var result = await controller.Availability(body, CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
        _scheduling.Verify(
            s => s.GetAvailabilityAsync(It.IsAny<AvailabilityQuery>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Availability_WhenRangeEndBeforeStart_ReturnsBadRequest()
    {
        var controller = CreateController(UserWithSub(Guid.NewGuid()));
        var body = new AvailabilityRequestDto
        {
            ClinicId = Guid.NewGuid(),
            RangeStartUtc = DateTimeOffset.UtcNow.AddHours(2),
            RangeEndUtc = DateTimeOffset.UtcNow,
        };

        var result = await controller.Availability(body, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        _scheduling.Verify(
            s => s.GetAvailabilityAsync(It.IsAny<AvailabilityQuery>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Availability_WhenValid_CallsSchedulingAndReturnsOk()
    {
        var start = DateTimeOffset.UtcNow;
        var end = start.AddHours(4);
        var controller = CreateController(UserWithSub(Guid.NewGuid()));
        var body = new AvailabilityRequestDto
        {
            ClinicId = Guid.NewGuid(),
            RangeStartUtc = start,
            RangeEndUtc = end,
        };

        var slot = new NormalizedSlot
        {
            StartUtc = start.AddHours(1),
            EndUtc = start.AddHours(2),
            ExternalResourceId = "res-1",
            ResourceLabel = "Dr. A",
            SelectionToken = "tok",
        };

        _scheduling
            .Setup(s => s.GetAvailabilityAsync(It.IsAny<AvailabilityQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SchedulingResult<IReadOnlyList<NormalizedSlot>>.Ok(new List<NormalizedSlot> { slot }));

        var result = await controller.Availability(body, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<AvailabilityResponseDto>().Subject;
        dto.Slots.Should().HaveCount(1);
        dto.Slots[0].SelectionToken.Should().Be("tok");
    }

    [Fact]
    public async Task Book_WhenNoUserPrincipal_ReturnsUnauthorized()
    {
        var controller = CreateController();
        var body = new BookAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            StartUtc = DateTimeOffset.UtcNow,
            EndUtc = DateTimeOffset.UtcNow.AddHours(1),
        };

        var result = await controller.Book(body, CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task Book_WhenBodyUserIdDiffersFromSub_ReturnsForbidden()
    {
        var sub = Guid.NewGuid();
        var controller = CreateController(UserWithSub(sub));
        var body = new BookAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            StartUtc = DateTimeOffset.UtcNow,
            EndUtc = DateTimeOffset.UtcNow.AddHours(1),
            UserId = Guid.NewGuid(),
        };

        _bookingAuth
            .Setup(a => a.AuthorizeBookAsync(sub, body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BookingAuthResult.Forbidden());

        var result = await controller.Book(body, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
        _scheduling.Verify(
            s => s.BookAsync(It.IsAny<BookAppointmentCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Book_WhenPetNotAccessible_ReturnsForbidden()
    {
        var sub = Guid.NewGuid();
        var controller = CreateController(UserWithSub(sub));
        var body = new BookAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            StartUtc = DateTimeOffset.UtcNow,
            EndUtc = DateTimeOffset.UtcNow.AddHours(1),
            PetId = Guid.NewGuid(),
        };

        _bookingAuth
            .Setup(a => a.AuthorizeBookAsync(sub, body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BookingAuthResult.Forbidden());

        var result = await controller.Book(body, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task Book_WhenAuthorized_CallsSchedulingWithSubAsUserId()
    {
        var sub = Guid.NewGuid();
        var controller = CreateController(UserWithSub(sub));
        var body = new BookAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            StartUtc = DateTimeOffset.UtcNow,
            EndUtc = DateTimeOffset.UtcNow.AddHours(1),
            PetId = Guid.NewGuid(),
            UserId = sub,
        };

        _bookingAuth
            .Setup(a => a.AuthorizeBookAsync(sub, body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BookingAuthResult.Allowed());

        _scheduling
            .Setup(s => s.BookAsync(It.IsAny<BookAppointmentCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                SchedulingResult<NormalizedAppointment>.Ok(
                    new NormalizedAppointment
                    {
                        ExternalAppointmentId = "ext-1",
                        StartUtc = body.StartUtc,
                        EndUtc = body.EndUtc,
                        ServiceType = BookingServiceType.Veterinary,
                    }));

        var result = await controller.Book(body, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        _scheduling.Verify(
            s =>
                s.BookAsync(
                    It.Is<BookAppointmentCommand>(c => c.UserId == sub),
                    It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Book_WhenEndBeforeStart_ReturnsBadRequest()
    {
        var controller = CreateController(UserWithSub(Guid.NewGuid()));
        var body = new BookAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            StartUtc = DateTimeOffset.UtcNow.AddHours(1),
            EndUtc = DateTimeOffset.UtcNow,
        };

        var result = await controller.Book(body, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        _scheduling.Verify(
            s => s.BookAsync(It.IsAny<BookAppointmentCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Cancel_WhenNoUserPrincipal_ReturnsUnauthorized()
    {
        var controller = CreateController();
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            ExternalAppointmentId = "ext-99",
        };

        var result = await controller.Cancel(body, CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task Cancel_WhenAppointmentNotOwned_ReturnsForbidden()
    {
        var sub = Guid.NewGuid();
        var controller = CreateController(UserWithSub(sub));
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            ExternalAppointmentId = "ext-99",
        };

        _bookingAuth
            .Setup(a => a.AuthorizeCancelAsync(sub, body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BookingAuthResult.Forbidden());

        var result = await controller.Cancel(body, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task Cancel_WhenNoAppointmentIdentifiers_ReturnsBadRequest()
    {
        var controller = CreateController(UserWithSub(Guid.NewGuid()));
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            AppointmentId = null,
            ExternalAppointmentId = null,
        };

        var result = await controller.Cancel(body, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        _scheduling.Verify(
            s => s.CancelAsync(It.IsAny<CancelAppointmentCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Cancel_WhenExternalIdProvided_CallsScheduling()
    {
        var sub = Guid.NewGuid();
        var controller = CreateController(UserWithSub(sub));
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            ExternalAppointmentId = "ext-99",
        };

        _bookingAuth
            .Setup(a => a.AuthorizeCancelAsync(sub, body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BookingAuthResult.Allowed());

        _scheduling
            .Setup(s => s.CancelAsync(It.IsAny<CancelAppointmentCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SchedulingResult<object?>.Ok(null));

        var result = await controller.Cancel(body, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        _scheduling.Verify(
            s => s.CancelAsync(
                It.Is<CancelAppointmentCommand>(c => c.ExternalAppointmentId == "ext-99"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
