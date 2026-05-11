using System.Linq;
using System.Text;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Maps <see cref="PetConversationalContextDto"/> into compact vet-email medical lines (spec §2.6).</summary>
public static class VetMedicalContextMapper
{
    public static MiloVetMedicalContextDto? FromPetContext(PetConversationalContextDto ctx)
    {
        var dto = new MiloVetMedicalContextDto();
        var hasAny = false;

        var events = ctx.RecentMedicalHistory
            .OrderByDescending(e => e.Date)
            .ToList();

        if (events.Count > 0)
        {
            var last = events[0];
            dto.LastVisitDate = last.Date;
            var label = new StringBuilder();
            label.Append(last.Type).Append(": ").Append(last.Name);
            if (!string.IsNullOrWhiteSpace(last.Details))
                label.Append(" — ").Append(last.Details);
            dto.LastVisitLabel = label.ToString();
            hasAny = true;
        }

        var vaccs = events.Where(e => string.Equals(e.Type, "vaccination", StringComparison.OrdinalIgnoreCase))
            .Take(5)
            .Select(e => $"{e.Name} ({e.Date})")
            .ToList();
        if (vaccs.Count > 0)
        {
            dto.VaccinesStatus = "Recent";
            dto.VaccinesDetail = string.Join(", ", vaccs);
            hasAny = true;
        }

        var meds = events.Where(e => string.Equals(e.Type, "medication_started", StringComparison.OrdinalIgnoreCase))
            .Take(6)
            .Select(e => string.IsNullOrWhiteSpace(e.Details) ? $"{e.Name} ({e.Date})" : $"{e.Name} ({e.Date}) — {e.Details}")
            .ToList();
        if (meds.Count > 0)
        {
            dto.MedicationsLine = string.Join("; ", meds);
            hasAny = true;
        }

        return hasAny ? dto : null;
    }
}
