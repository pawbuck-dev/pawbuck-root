using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class VetBookingOwnershipService : IVetBookingOwnershipService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMiloPetFactsService _petFacts;

    public VetBookingOwnershipService(IOptions<SupabaseOptions> options, IMiloPetFactsService petFacts)
    {
        _options = options;
        _petFacts = petFacts;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    public async Task<bool> CanActOnBookingAsync(
        Guid userId,
        Guid clinicId,
        Guid? appointmentId,
        string? externalAppointmentId,
        CancellationToken cancellationToken = default)
    {
        if (!appointmentId.HasValue && string.IsNullOrWhiteSpace(externalAppointmentId))
            return false;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        const string sqlById = """
            SELECT user_id, pet_id
            FROM public.vet_bookings
            WHERE id = @appointmentId
              AND clinic_id = @clinicId::text
            LIMIT 1
            """;

        const string sqlByExternal = """
            SELECT user_id, pet_id
            FROM public.vet_bookings
            WHERE external_appointment_id = @externalId
              AND clinic_id = @clinicId::text
            LIMIT 1
            """;

        Guid? rowUserId = null;
        Guid? rowPetId = null;

        if (appointmentId.HasValue)
        {
            await using var cmd = new NpgsqlCommand(sqlById, conn);
            cmd.Parameters.AddWithValue("appointmentId", appointmentId.Value);
            cmd.Parameters.AddWithValue("clinicId", clinicId.ToString());
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                rowUserId = reader.GetGuid(0);
                rowPetId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            }
        }
        else if (!string.IsNullOrWhiteSpace(externalAppointmentId))
        {
            await using var cmd = new NpgsqlCommand(sqlByExternal, conn);
            cmd.Parameters.AddWithValue("externalId", externalAppointmentId.Trim());
            cmd.Parameters.AddWithValue("clinicId", clinicId.ToString());
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                rowUserId = reader.GetGuid(0);
                rowPetId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            }
        }

        if (!rowUserId.HasValue)
            return false;

        if (rowUserId.Value == userId)
            return true;

        if (rowPetId.HasValue)
            return await _petFacts.VerifyPetAccessAsync(userId, rowPetId.Value, cancellationToken);

        return false;
    }
}
