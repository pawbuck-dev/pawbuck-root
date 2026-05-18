using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ICountryEmailDocumentVerificationService
{
    Task<IReadOnlyList<CountryEmailDocumentVerificationDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<CountryEmailDocumentVerificationDto?> TryUpdateAsync(
        string country,
        PatchCountryEmailDocumentVerificationRequest request,
        CancellationToken cancellationToken = default);
}
