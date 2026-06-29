using System.Globalization;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Port of consumer vaccineRequirements missing-core logic for care nudge push (Phase D).</summary>
public static class CareNudgeRequiredVaccineResolver
{
    public sealed class RequirementRow
    {
        public required string VaccineName { get; init; }
        public required string CanonicalKey { get; init; }
        public required bool IsRequired { get; init; }
    }

    public sealed class EquivalencyRow
    {
        public required string CanonicalName { get; init; }
        public required string VariantName { get; init; }
    }

    public static IReadOnlyList<CareNudgeMissingRequiredInput> ComputeMissing(
        IReadOnlyList<CareNudgeVaccinationInput> vaccinations,
        IReadOnlyList<RequirementRow> requirements,
        IReadOnlyList<EquivalencyRow> equivalencies,
        DateTime utcNow)
    {
        var required = requirements.Where(r => r.IsRequired).ToList();
        if (required.Count == 0)
            return [];

        var today = DateOnly.FromDateTime(utcNow.Date);
        var covered = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var vac in vaccinations)
        {
            if (!string.IsNullOrWhiteSpace(vac.NextDueDate)
                && DateOnly.TryParse(vac.NextDueDate, out var due)
                && due < today)
            {
                continue;
            }

            var key = ResolveCanonicalKey(vac.Name, equivalencies, requirements);
            if (!string.IsNullOrEmpty(key))
                covered.Add(key);
        }

        return required
            .Where(r => !covered.Contains(r.CanonicalKey))
            .Select(r => new CareNudgeMissingRequiredInput
            {
                CanonicalKey = r.CanonicalKey,
                VaccineName = r.VaccineName,
            })
            .ToList();
    }

    internal static string? ResolveCanonicalKey(
        string vaccineName,
        IReadOnlyList<EquivalencyRow> equivalencies,
        IReadOnlyList<RequirementRow> requirements)
    {
        var normalized = vaccineName.Trim().ToLowerInvariant();

        foreach (var eq in equivalencies)
        {
            if (normalized.Contains(eq.VariantName.Trim().ToLowerInvariant())
                || eq.VariantName.Trim().ToLowerInvariant().Contains(normalized))
            {
                return eq.CanonicalName.Trim().ToLowerInvariant();
            }
        }

        foreach (var req in requirements)
        {
            var reqName = req.VaccineName.ToLowerInvariant();
            var key = req.CanonicalKey.ToLowerInvariant();
            if (reqName.Contains(normalized) || normalized.Contains(reqName) || normalized.Contains(key))
                return req.CanonicalKey;
        }

        return null;
    }
}
