using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Scheduling;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Controllers;

/// <summary>
/// Vet (and future grooming/boarding) booking via plug-in vendor adapters. Clients never call Vetstoria/EazyVet directly.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly ISchedulingBookingService _scheduling;
    private readonly ILogger<BookingsController> _logger;

    public BookingsController(ISchedulingBookingService scheduling, ILogger<BookingsController> logger)
    {
        _scheduling = scheduling;
        _logger = logger;
    }

    /// <summary>Get available slots for a clinic and service type.</summary>
    [HttpPost("availability")]
    [ProducesResponseType(typeof(AvailabilityResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Availability([FromBody] AvailabilityRequestDto body, CancellationToken cancellationToken)
    {
        if (body.RangeEndUtc <= body.RangeStartUtc)
            return BadRequest(new { error = "RangeEndUtc must be after RangeStartUtc" });

        var query = new AvailabilityQuery
        {
            ClinicId = body.ClinicId,
            ServiceType = body.ServiceType,
            RangeStartUtc = body.RangeStartUtc,
            RangeEndUtc = body.RangeEndUtc,
            ExternalResourceId = body.ExternalResourceId
        };

        var result = await _scheduling.GetAvailabilityAsync(query, cancellationToken);
        return MapAvailability(result);
    }

    /// <summary>Book an appointment (idempotency key optional until store is wired).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(BookAppointmentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> Book([FromBody] BookAppointmentRequestDto body, CancellationToken cancellationToken)
    {
        if (body.EndUtc <= body.StartUtc)
            return BadRequest(new { error = "EndUtc must be after StartUtc" });

        var command = new BookAppointmentCommand
        {
            ClinicId = body.ClinicId,
            ServiceType = body.ServiceType,
            StartUtc = body.StartUtc,
            EndUtc = body.EndUtc,
            ExternalResourceId = body.ExternalResourceId,
            SelectionToken = body.SelectionToken,
            UserId = body.UserId,
            PetId = body.PetId,
            Notes = body.Notes,
            IdempotencyKey = body.IdempotencyKey ?? Request.Headers["Idempotency-Key"].FirstOrDefault()
        };

        var result = await _scheduling.BookAsync(command, cancellationToken);
        return MapBook(result);
    }

    /// <summary>Cancel an appointment.</summary>
    [HttpPost("cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> Cancel([FromBody] CancelAppointmentRequestDto body, CancellationToken cancellationToken)
    {
        if (body.AppointmentId == null && string.IsNullOrWhiteSpace(body.ExternalAppointmentId))
            return BadRequest(new { error = "AppointmentId or ExternalAppointmentId is required" });

        var command = new CancelAppointmentCommand
        {
            ClinicId = body.ClinicId,
            AppointmentId = body.AppointmentId,
            ExternalAppointmentId = body.ExternalAppointmentId,
            Reason = body.Reason
        };

        var result = await _scheduling.CancelAsync(command, cancellationToken);
        return MapCancel(result);
    }

    private IActionResult MapAvailability(SchedulingResult<IReadOnlyList<NormalizedSlot>> result)
    {
        if (!result.Success)
        {
            if (result.ErrorCode is "clinic_integration_missing" or "adapter_not_registered")
                return NotFound(new { error = result.ErrorCode, message = result.Message });
            if (result.ErrorCode is "vetstoria_not_configured" or "eazyvet_not_configured" or "not_implemented")
                return StatusCode(StatusCodes.Status502BadGateway, new { error = result.ErrorCode, message = result.Message });
            return BadRequest(new { error = result.ErrorCode, message = result.Message });
        }

        var dto = new AvailabilityResponseDto
        {
            Slots = result.Data!.Select(s => new NormalizedSlotDto
            {
                StartUtc = s.StartUtc,
                EndUtc = s.EndUtc,
                ExternalResourceId = s.ExternalResourceId,
                ResourceLabel = s.ResourceLabel,
                SelectionToken = s.SelectionToken
            }).ToList()
        };
        return Ok(dto);
    }

    private IActionResult MapBook(SchedulingResult<NormalizedAppointment> result)
    {
        if (!result.Success)
        {
            if (result.ErrorCode is "clinic_integration_missing" or "adapter_not_registered")
                return NotFound(new { error = result.ErrorCode, message = result.Message });
            if (result.ErrorCode is "vetstoria_not_configured" or "eazyvet_not_configured" or "not_implemented")
                return StatusCode(StatusCodes.Status502BadGateway, new { error = result.ErrorCode, message = result.Message });
            return BadRequest(new { error = result.ErrorCode, message = result.Message });
        }

        var a = result.Data!;
        return Ok(new BookAppointmentResponseDto
        {
            Id = a.Id,
            ExternalAppointmentId = a.ExternalAppointmentId,
            StartUtc = a.StartUtc,
            EndUtc = a.EndUtc,
            ServiceType = a.ServiceType
        });
    }

    private IActionResult MapCancel(SchedulingResult<object?> result)
    {
        if (!result.Success)
        {
            if (result.ErrorCode is "clinic_integration_missing" or "adapter_not_registered")
                return NotFound(new { error = result.ErrorCode, message = result.Message });
            if (result.ErrorCode is "vetstoria_not_configured" or "eazyvet_not_configured" or "not_implemented")
                return StatusCode(StatusCodes.Status502BadGateway, new { error = result.ErrorCode, message = result.Message });
            return BadRequest(new { error = result.ErrorCode, message = result.Message });
        }

        return Ok(new { success = true });
    }
}
