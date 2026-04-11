using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportVaccinationAdminService
{
    Task<IReadOnlyList<SupportVaccinationRow>> ListForPetAsync(Guid petId, CancellationToken cancellationToken = default);
    Task<SupportVaccinationRow> CreateAsync(Guid petId, CreateSupportVaccinationRequest request, CancellationToken cancellationToken = default);
    Task<SupportVaccinationRow?> UpdateAsync(Guid vaccinationId, UpdateSupportVaccinationRequest request, CancellationToken cancellationToken = default);
}
