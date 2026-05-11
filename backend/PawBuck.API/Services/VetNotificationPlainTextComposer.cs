using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Server-side plain-text vet notification draft (pairs with consumer <c>buildVetMessageFromJournalSession</c>).</summary>
public static class VetNotificationPlainTextComposer
{
    private const int SubjectMax = 70;
    private const int UrgencyRationaleMax = 80;
    private const int OneLineMaxWords = 25;

    public static (string Subject, string Body) Compose(MiloVetNotificationDraftRequest r)
    {
        var petName = (r.PetName ?? "").Trim();
        if (string.IsNullOrEmpty(petName))
            petName = "Pet";

        var breed = (r.Breed ?? "").Trim();
        if (string.IsNullOrEmpty(breed))
            breed = (r.AnimalType ?? "").Trim();
        if (string.IsNullOrEmpty(breed))
            breed = "unknown";

        var ageBody = FormatAgeBody(r.DateOfBirth);
        var ageCompact = FormatAgeCompact(r.DateOfBirth);
        var sex = FormatSex(r.Sex);
        var weight = FormatWeight(r.WeightValue, r.WeightUnit);
        var petEmail = FormatPetEmail(r.EmailId, petName);
        var chip = string.IsNullOrWhiteSpace(r.Microchip) ? "Not registered" : r.Microchip.Trim();

        var journalPlain = StripMarkdown(r.JournalSummary ?? "");
        var user = (r.UserTurns ?? new List<string>()).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
        var oneLine = BuildOneLine(petName, user, journalPlain);

        var tag = SubjectTag(r.VetNotification?.Triage?.Level, r.Severity);
        var head = $"{petName} ({breed}, {ageCompact} {sex})";
        var budget = SubjectMax - head.Length - tag.Length - 9;
        var summarySeg = TruncateChars(oneLine, Math.Max(8, budget));
        var subject = $"{head} · {summarySeg} · {tag}";
        if (subject.Length > SubjectMax)
            subject = TruncateChars(subject, SubjectMax);

        var owner = string.IsNullOrWhiteSpace(r.OwnerSigningName) ? "Pet parent" : r.OwnerSigningName.Trim();
        var phone = string.IsNullOrWhiteSpace(r.OwnerPhone) ? "not provided" : r.OwnerPhone.Trim();
        var email = string.IsNullOrWhiteSpace(r.OwnerEmail) ? "not provided" : r.OwnerEmail.Trim();
        var preferred = string.IsNullOrWhiteSpace(r.PreferredContactLine) ? "Email reply" : r.PreferredContactLine.Trim();
        var logged = FormatLogged(r.LogIsoTimestamp, r.TimezoneAbbrev, r.SessionDateLabel ?? "");
        var urgency = BodyUrgency(r.VetNotification?.Triage, r.Severity);
        var obs = BuildObservations(r.VetNotification, user, journalPlain);
        var neg = r.VetNotification?.NegativeFindings?
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .ToList() ?? new List<string>();
        var negLine = neg.Count > 0 ? $"Owner reports normal: {string.Join(", ", neg)}." : "";
        var medLines = FormatMedicalLines(r.VetMedicalContext);
        var ask = string.IsNullOrWhiteSpace(r.VetNotification?.AskLine)
            ? $"Should {petName} be examined in person, or is home monitoring with criteria for an urgent visit appropriate?"
            : r.VetNotification!.AskLine!.Trim();
        var recordId = string.IsNullOrWhiteSpace(r.JournalRecordId) ? petName : r.JournalRecordId.Trim();
        var footerDate = string.IsNullOrWhiteSpace(r.SessionDateLabel) ? logged : r.SessionDateLabel.Trim();

        var sb = new StringBuilder();
        sb.AppendLine($"PET        {petName} · {breed} · {ageBody} · {sex} · {weight}");
        sb.AppendLine($"PET ID     {petEmail}  ·  Microchip: {chip}");
        sb.AppendLine($"OWNER      {owner} · {phone} · {email}");
        sb.AppendLine($"PREFERRED  {preferred}");
        sb.AppendLine($"LOGGED     {logged}  ·  via PawBuck mobile app");
        sb.AppendLine($"URGENCY    {urgency}");
        sb.AppendLine();
        sb.AppendLine(oneLine);
        sb.AppendLine();
        sb.AppendLine("OBSERVATIONS");
        sb.AppendLine(obs);
        sb.AppendLine();
        if (!string.IsNullOrEmpty(negLine))
        {
            sb.AppendLine(negLine);
            sb.AppendLine();
        }

        if (medLines.Count > 0)
        {
            sb.AppendLine("MEDICAL CONTEXT");
            foreach (var line in medLines)
                sb.AppendLine(line);
            sb.AppendLine();
        }

        sb.AppendLine(ask);
        sb.AppendLine();
        sb.AppendLine($"Reply directly to this email — your response routes to {petName}'s record.");
        sb.AppendLine($"View full journal: https://pawbuck.com/r/{Uri.EscapeDataString(recordId)}");
        sb.AppendLine($"Sent on behalf of {owner} via PawBuck. This message was generated from observations the owner logged on {footerDate}. It is not a diagnosis. PawBuck does not provide medical advice.");
        sb.AppendLine();
        sb.AppendLine(owner);
        sb.AppendLine($"{petName}'s parent · sent via PawBuck");

        return (subject, sb.ToString());
    }

    private static List<string> FormatMedicalLines(MiloVetMedicalContextDto? ctx)
    {
        var lines = new List<string>();
        if (ctx == null)
            return lines;
        if (!string.IsNullOrWhiteSpace(ctx.LastVisitDate) || !string.IsNullOrWhiteSpace(ctx.LastVisitLabel))
        {
            var p = string.Join(" · ", new[] { ctx.LastVisitDate, ctx.LastVisitLabel }.Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(p))
                lines.Add($"LAST VISIT     {p}");
        }

        if (!string.IsNullOrWhiteSpace(ctx.VaccinesStatus) || !string.IsNullOrWhiteSpace(ctx.VaccinesDetail))
        {
            var v = string.Join(" — ", new[] { ctx.VaccinesStatus, ctx.VaccinesDetail }.Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(v))
                lines.Add($"VACCINES       {v}");
        }

        if (!string.IsNullOrWhiteSpace(ctx.MedicationsLine))
            lines.Add($"MEDICATIONS    {ctx.MedicationsLine.Trim()}");
        if (!string.IsNullOrWhiteSpace(ctx.AllergiesLine))
            lines.Add($"ALLERGIES      {ctx.AllergiesLine.Trim()}");
        if (!string.IsNullOrWhiteSpace(ctx.InsuranceLine))
            lines.Add($"INSURANCE      {ctx.InsuranceLine.Trim()}");
        if (!string.IsNullOrWhiteSpace(ctx.WeightTrendSummary))
            lines.Add($"WEIGHT TREND   {ctx.WeightTrendSummary.Trim()}");
        return lines;
    }

    private static string BuildObservations(MiloVetNotificationPayloadDto? payload, List<string> user, string journalPlain)
    {
        var obs = payload?.Observations?.Where(o => ObservationWhat(o).Length > 0).ToList() ?? new List<MiloVetNotificationObservationDto>();
        if (obs.Count > 0)
            return string.Join("\n\n", obs.Select((o, i) => FormatObservationBlock(i + 1, o)));
        if (user.Count > 0)
            return string.Join("\n\n", user.Select((line, i) => FormatObservationBlock(i + 1, line, "Owner-reported")));
        if (!string.IsNullOrWhiteSpace(journalPlain))
            return FormatObservationBlock(1, journalPlain.Replace("\n", " ").Trim(), "Session summary");
        return FormatObservationBlock(1, "No typed lines captured; see PawBuck journal for this session.", "Owner-reported");
    }

    private static string ObservationWhat(MiloVetNotificationObservationDto o)
    {
        if (!string.IsNullOrWhiteSpace(o.UserText))
            return o.UserText.Trim();
        if (!string.IsNullOrWhiteSpace(o.DisplayLabel))
            return o.DisplayLabel.Trim();
        if (!string.IsNullOrWhiteSpace(o.PrimaryChip))
            return o.PrimaryChip.Trim();
        return "";
    }

    private static string FormatObservationBlock(int index, MiloVetNotificationObservationDto o)
    {
        var label = string.IsNullOrWhiteSpace(o.DisplayLabel) ? $"Observation {index}" : o.DisplayLabel.Trim();
        var sb = new StringBuilder();
        sb.AppendLine($"{index}. {label}");
        sb.AppendLine($"   What:       {ObservationWhat(o)}");
        if (!string.IsNullOrWhiteSpace(o.Onset))
            sb.AppendLine($"   Onset:      {o.Onset.Trim()}");
        if (!string.IsNullOrWhiteSpace(o.Frequency))
            sb.AppendLine($"   Frequency:  {o.Frequency.Trim()}");
        if (!string.IsNullOrWhiteSpace(o.Severity))
            sb.AppendLine($"   Severity:   {o.Severity.Trim()}");
        if (!string.IsNullOrWhiteSpace(o.Trend))
            sb.AppendLine($"   Trend:      {o.Trend.Trim()}");
        if (!string.IsNullOrWhiteSpace(o.OnsetContext))
            sb.AppendLine($"   Context:    {o.OnsetContext.Trim()}");
        return sb.ToString().TrimEnd();
    }

    private static string FormatObservationBlock(int index, string what, string label)
    {
        return $"{index}. {label}\n   What:       {what}";
    }

    private static string BodyUrgency(MiloVetNotificationTriageDto? triage, string? severity)
    {
        var rationale = TruncateChars(triage?.Rationale?.Trim() ?? "", UrgencyRationaleMax);
        var level = (triage?.Level ?? "").Trim().ToLowerInvariant();
        if (level == "emergency")
            return string.IsNullOrEmpty(rationale)
                ? "Emergency — Owner directed to call; email suppressed per protocol."
                : $"Emergency — {rationale}";
        if (level == "fyi")
            return string.IsNullOrEmpty(rationale) ? "FYI — routine owner update." : $"FYI — {rationale}";
        if (level == "soon")
            return string.IsNullOrEmpty(rationale) ? "Soon — please advise within 24h." : $"Soon — {rationale}";
        if (level == "advice")
            return string.IsNullOrEmpty(rationale) ? "Advice requested — owner seeks guidance." : $"Advice requested — {rationale}";
        var sev = (severity ?? "").Trim().ToLowerInvariant();
        if (sev == "urgent")
            return string.IsNullOrEmpty(rationale) ? "Sameday callback requested — acute concern reported." : $"Sameday callback requested — {rationale}";
        if (sev == "high")
            return string.IsNullOrEmpty(rationale) ? "Please advise within 24h — elevated concern reported." : $"Please advise within 24h — {rationale}";
        if (sev == "medium")
            return string.IsNullOrEmpty(rationale) ? "Advice requested." : $"Advice requested — {rationale}";
        return string.IsNullOrEmpty(rationale) ? "FYI — owner update." : $"FYI — {rationale}";
    }

    private static string SubjectTag(string? triageLevel, string? severity)
    {
        var level = (triageLevel ?? "").Trim().ToLowerInvariant();
        if (level == "emergency")
            return "Sameday callback requested";
        if (level == "fyi")
            return "FYI";
        if (level == "soon")
            return "Please advise within 24h";
        if (level == "advice")
            return "Advice requested";
        var sev = (severity ?? "").Trim().ToLowerInvariant();
        return sev switch
        {
            "urgent" => "Sameday callback requested",
            "high" => "Please advise within 24h",
            "medium" => "Advice requested",
            _ => "FYI",
        };
    }

    private static string BuildOneLine(string petName, List<string> user, string journalPlain)
    {
        var baseText = user.Count > 0 ? string.Join(" ", user) : Regex.Replace(journalPlain, @"\s+", " ").Trim();
        var core = string.IsNullOrEmpty(baseText)
            ? (string.IsNullOrEmpty(journalPlain) ? "Owner logged a health journal session." : Regex.Replace(journalPlain, @"\s+", " ").Trim())
            : baseText;
        var withPet = core.StartsWith(petName, StringComparison.OrdinalIgnoreCase) ? core : $"{petName}: {core}";
        return TruncateWords(withPet, OneLineMaxWords);
    }

    private static string TruncateWords(string text, int maxWords)
    {
        var words = text.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length <= maxWords)
            return string.Join(" ", words);
        return string.Join(" ", words.Take(maxWords)) + "…";
    }

    private static string TruncateChars(string text, int maxChars)
    {
        var t = text.Trim();
        if (t.Length <= maxChars)
            return t;
        if (maxChars <= 1)
            return "…";
        return t[..(maxChars - 1)] + "…";
    }

    private static string StripMarkdown(string raw)
    {
        var s = raw.Replace("\r\n", "\n", StringComparison.Ordinal);
        s = Regex.Replace(s, @"\*\*([^*]+)\*\*", "$1");
        s = Regex.Replace(s, @"\*([^*]+)\*", "$1");
        s = Regex.Replace(s, @"^#{1,6}\s+", "", RegexOptions.Multiline);
        s = Regex.Replace(s, @"^[-*]\s+", "• ", RegexOptions.Multiline);
        return Regex.Replace(s, @"\n{3,}", "\n\n").Trim();
    }

    private static string FormatAgeCompact(string? dob)
    {
        if (string.IsNullOrWhiteSpace(dob) || !DateTime.TryParse(dob, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var birth))
            return "age unknown";
        var today = DateTime.UtcNow.Date;
        var years = today.Year - birth.Year;
        if (today.DayOfYear < birth.DayOfYear)
            years--;
        if (years <= 0)
        {
            var months = (today.Year - birth.Year) * 12 + today.Month - birth.Month;
            if (today.Day < birth.Day)
                months--;
            months = Math.Max(0, months);
            return months <= 1 ? "1mo" : $"{months}mo";
        }

        return years == 1 ? "1yr" : $"{years}yr";
    }

    private static string FormatAgeBody(string? dob)
    {
        var c = FormatAgeCompact(dob);
        if (c == "age unknown")
            return c;
        if (c.EndsWith("yr", StringComparison.Ordinal))
            return c[..^2] + " yr";
        if (c.EndsWith("mo", StringComparison.Ordinal))
            return c[..^2] + " mo";
        return c;
    }

    private static string FormatSex(string? sex)
    {
        var s = (sex ?? "").Trim();
        if (string.IsNullOrEmpty(s))
            return "sex unknown";
        var lower = s.ToLowerInvariant();
        if (lower.StartsWith("m", StringComparison.Ordinal))
            return "M";
        if (lower.StartsWith("f", StringComparison.Ordinal))
            return "F";
        return s.Length <= 6 ? s : s[..6] + "…";
    }

    private static string FormatWeight(double value, string? unit)
    {
        if (double.IsNaN(value))
            return "weight unknown";
        var u = string.IsNullOrWhiteSpace(unit) ? "kg" : unit.Trim();
        return $"{value} {u}";
    }

    private static string FormatPetEmail(string? emailId, string petName)
    {
        var local = string.IsNullOrWhiteSpace(emailId)
            ? petName.ToLowerInvariant().Replace(" ", "", StringComparison.Ordinal)
            : emailId.Trim().ToLowerInvariant();
        return $"{local}@pawbuck.app";
    }

    private static string FormatLogged(string? iso, string? tzAbbr, string? fallback)
    {
        if (!string.IsNullOrWhiteSpace(iso) && DateTime.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var d))
        {
            var tz = string.IsNullOrWhiteSpace(tzAbbr) ? "" : " " + tzAbbr.Trim();
            return $"{d:yyyy-MM-dd, HH:mm}{tz}";
        }

        return string.IsNullOrWhiteSpace(fallback)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : fallback.Trim();
    }
}
