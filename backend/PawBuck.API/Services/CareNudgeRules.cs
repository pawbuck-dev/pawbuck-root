using System.Globalization;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Deterministic care nudge rules (mirrors @pawbuck/care-nudges).</summary>
public static class CareNudgeRules
{
    private static readonly Dictionary<string, int> AlertPeriodMonths = new(StringComparer.OrdinalIgnoreCase)
    {
        ["leptospirosis"] = 12,
        ["bordetella"] = 12,
        ["dapp"] = 36,
        ["dhpp"] = 36,
        ["default"] = 12,
    };

    public static IReadOnlyList<CareNudgeDto> BuildForPet(CareNudgePetInput input, DateTime utcNow)
    {
        var list = new List<CareNudgeDto>();
        list.AddRange(BuildVaccinationNudges(input, utcNow));
        list.AddRange(BuildMedicationNudges(input, utcNow));
        list.AddRange(BuildMissingRequiredNudges(input));
        return Rank(list);
    }

    public static IReadOnlyList<CareNudgeDto> Rank(IEnumerable<CareNudgeDto> nudges) =>
        nudges.OrderBy(n => n.Priority).ThenBy(n => n.DedupeKey, StringComparer.Ordinal).ToList();

    private static IEnumerable<CareNudgeDto> BuildVaccinationNudges(CareNudgePetInput input, DateTime utcNow)
    {
        var today = utcNow.Date;
        var latestIds = LatestVaccinationIds(input.Vaccinations);

        foreach (var vac in input.Vaccinations)
        {
            if (string.IsNullOrWhiteSpace(vac.NextDueDate) || !latestIds.Contains(vac.Id))
                continue;

            if (!DateOnly.TryParse(vac.NextDueDate, out var due))
                continue;

            var daysLeft = due.DayNumber - DateOnly.FromDateTime(today).DayNumber;

            if (daysLeft < 0)
            {
                var overdueDays = Math.Abs(daysLeft);
                yield return new CareNudgeDto
                {
                    Kind = "vac_overdue",
                    DedupeKey = $"vac-overdue:{input.PetId}:{vac.Id}",
                    PetId = input.PetId,
                    PetName = input.PetName,
                    Priority = 10,
                    Title = $"{vac.Name} overdue",
                    Body = overdueDays == 1
                        ? "Overdue by 1 day — schedule with your veterinarian."
                        : $"Overdue by {overdueDays} days — schedule with your veterinarian.",
                    DeepLink = VaccinationsRoute(input.PetId),
                    EvidenceTable = "vaccinations",
                    EvidenceId = vac.Id,
                    Channels = ["in_app", "push"],
                };
                continue;
            }

            var alertDays = GetAlertPeriodMonths(vac.Name) * 30;
            if (daysLeft > alertDays)
                continue;

            yield return new CareNudgeDto
            {
                Kind = "vac_due_soon",
                DedupeKey = $"vac-due-soon:{input.PetId}:{vac.Id}",
                PetId = input.PetId,
                PetName = input.PetName,
                Priority = 30,
                Title = $"{vac.Name} due",
                Body = daysLeft <= 7
                    ? $"Due in {daysLeft} day{(daysLeft == 1 ? "" : "s")}. Schedule with your vet."
                    : $"Due in {daysLeft} days. Tap to view details.",
                DeepLink = VaccinationsRoute(input.PetId),
                EvidenceTable = "vaccinations",
                EvidenceId = vac.Id,
                Channels = ["in_app", "local"],
            };
        }
    }

    private static IEnumerable<CareNudgeDto> BuildMedicationNudges(CareNudgePetInput input, DateTime utcNow)
    {
        var today = DateOnly.FromDateTime(utcNow.Date);
        foreach (var med in input.Medications)
        {
            if (string.IsNullOrWhiteSpace(med.NextDoseDateYmd))
                continue;
            if (!DateOnly.TryParse(med.NextDoseDateYmd, out var doseDay))
                continue;
            if (doseDay != today)
                continue;

            yield return new CareNudgeDto
            {
                Kind = "med_due_today",
                DedupeKey = $"med-today:{input.PetId}:{med.Id}",
                PetId = input.PetId,
                PetName = input.PetName,
                Priority = 40,
                Title = $"{med.Name} due today",
                Body = "Review medication schedule in health records.",
                DeepLink = MedicationsRoute(input.PetId),
                EvidenceTable = "medicines",
                EvidenceId = med.Id,
                Channels = ["in_app", "local"],
            };
        }
    }

    private static IEnumerable<CareNudgeDto> BuildMissingRequiredNudges(CareNudgePetInput input)
    {
        foreach (var req in input.MissingRequired)
        {
            yield return new CareNudgeDto
            {
                Kind = "vac_missing_required",
                DedupeKey = $"vac-missing:{input.PetId}:{req.CanonicalKey}",
                PetId = input.PetId,
                PetName = input.PetName,
                Priority = 20,
                Title = $"{req.VaccineName} not on file",
                Body = "This core vaccine is missing from your pet's records. Add a certificate or ask your vet.",
                DeepLink = VaccinationsRoute(input.PetId),
                Channels = ["in_app", "push"],
            };
        }
    }

    public static IReadOnlyList<CareNudgeDto> ApplyDismissals(
        IEnumerable<CareNudgeDto> nudges,
        IReadOnlyList<CareNudgeDismissalRow> dismissals,
        DateOnly today)
    {
        var blocked = new HashSet<string>(StringComparer.Ordinal);
        foreach (var d in dismissals)
        {
            if (d.DismissedUntil.HasValue && d.DismissedUntil.Value < today)
                continue;
            blocked.Add($"{d.PetId}:{d.NudgeKind}");
        }

        return nudges.Where(n => !blocked.Contains($"{n.PetId}:{n.Kind}")).ToList();
    }

    public static HashSet<Guid> LatestVaccinationIds(IReadOnlyList<CareNudgeVaccinationInput> vaccinations)
    {
        var best = new Dictionary<string, (Guid Id, DateTime Date)>(StringComparer.OrdinalIgnoreCase);
        foreach (var v in vaccinations)
        {
            var key = NormalizeName(v.Name);
            if (string.IsNullOrEmpty(key))
                key = $"__id:{v.Id}";

            if (!DateTime.TryParse(v.Date, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
                continue;

            if (!best.TryGetValue(key, out var cur) || dt > cur.Date || (dt == cur.Date && v.Id.CompareTo(cur.Id) > 0))
                best[key] = (v.Id, dt);
        }

        return best.Values.Select(x => x.Id).ToHashSet();
    }

    public static CareNudgeDigestDto? BuildDailyDigest(IReadOnlyList<CareNudgeDto> pushNudges, Guid userId, DateTime utcNow)
    {
        var eligible = pushNudges
            .Where(n => n.Channels.Contains("push", StringComparer.Ordinal))
            .Where(n => n.Kind is "vac_overdue" or "vac_missing_required" or "doc_expiry" or "senior_mobility_tip")
            .ToList();

        if (eligible.Count == 0)
            return null;

        var ranked = Rank(eligible);
        var dateKey = utcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var petNames = ranked.Select(n => n.PetName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var petLabel = petNames.Count switch
        {
            0 => "your pets",
            1 => petNames[0]!,
            _ => $"{petNames.Count} pets",
        };

        var top = ranked.Take(3).Select(n =>
        {
            var prefix = petNames.Count > 1 && !string.IsNullOrWhiteSpace(n.PetName) ? $"{n.PetName}: " : "";
            return $"{prefix}{n.Title}";
        }).ToList();

        var more = ranked.Count > 3 ? $" +{ranked.Count - 3} more" : "";
        var body = $"{string.Join(" · ", top)}{more}. Tap to review in PawBuck.";
        if (body.Length > 240)
            body = body[..237] + "…";

        return new CareNudgeDigestDto
        {
            Title = $"Care reminders for {petLabel}",
            Body = body,
            DedupeKey = $"digest:{userId}:{dateKey}",
            NudgeCount = ranked.Count,
        };
    }

    private static int GetAlertPeriodMonths(string name)
    {
        var n = name.ToLowerInvariant();
        if (n.Contains("rabies", StringComparison.Ordinal))
            return 36;
        if (n.Contains("lepto", StringComparison.Ordinal))
            return 12;

        foreach (var (key, months) in AlertPeriodMonths)
        {
            if (key == "default")
                continue;
            if (n.Contains(key, StringComparison.Ordinal))
                return months;
        }

        return AlertPeriodMonths["default"];
    }

    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "" : string.Join(' ', name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();

    private static string VaccinationsRoute(Guid petId) =>
        $"/(home)/health-record/{petId}/(tabs)/vaccinations";

    private static string MedicationsRoute(Guid petId) =>
        $"/(home)/health-record/{petId}/(tabs)/medications";
}
