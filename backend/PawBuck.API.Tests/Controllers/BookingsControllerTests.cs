using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Scheduling;
using PawBuck.API.Scheduling.Contracts;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class BookingsControllerTests
{
    private readonly Mock<ISchedulingBookingService> _scheduling = new();
    private readonly Mock<ILogger<BookingsController>> _logger = new();
    private readonly BookingsController _controller;

    public BookingsControllerTests()
    {
        _controller = new BookingsController(_scheduling.Object, _logger.Object);
    }

    [Fact]
    public async Task Availability_WhenRangeEndBeforeStart_ReturnsBadRequest()
    {
        var body = new AvailabilityRequestDto
        {
            ClinicId = Guid.NewGuid(),
            RangeStartUtc = DateTimeOffset.UtcNow.AddHours(2),
            RangeEndUtc = DateTimeOffset.UtcNow,
        };

        var result = await _controller.Availability(body, CancellationToken.None);

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

        var result = await _controller.Availability(body, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<AvailabilityResponseDto>().Subject;
        dto.Slots.Should().HaveCount(1);
        dto.Slots[0].SelectionToken.Should().Be("tok");
    }

    [Fact]
    public async Task Book_WhenEndBeforeStart_ReturnsBadRequest()
    {
        var body = new BookAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            StartUtc = DateTimeOffset.UtcNow.AddHours(1),
            EndUtc = DateTimeOffset.UtcNow,
        };

        var result = await _controller.Book(body, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        _scheduling.Verify(
            s => s.BookAsync(It.IsAny<BookAppointmentCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Cancel_WhenNoAppointmentIdentifiers_ReturnsBadRequest()
    {
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            AppointmentId = null,
            ExternalAppointmentId = null,
        };

        var result = await _controller.Cancel(body, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        _scheduling.Verify(
            s => s.CancelAsync(It.IsAny<CancelAppointmentCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Cancel_WhenExternalIdProvided_CallsScheduling()
    {
        var body = new CancelAppointmentRequestDto
        {
            ClinicId = Guid.NewGuid(),
            ExternalAppointmentId = "ext-99",
        };

        _scheduling
            .Setup(s => s.CancelAsync(It.IsAny<CancelAppointmentCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SchedulingResult<object?>.Ok(null));

        var result = await _controller.Cancel(body, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        _scheduling.Verify(
            s => s.CancelAsync(
                It.Is<CancelAppointmentCommand>(c => c.ExternalAppointmentId == "ext-99"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
