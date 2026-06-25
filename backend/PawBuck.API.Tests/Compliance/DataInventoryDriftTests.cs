using FluentAssertions;
using Xunit;

namespace PawBuck.API.Tests.Compliance;

/// <summary>
/// Fails CI when a migration adds a public table not listed in docs/compliance/inventoried-tables.txt.
/// </summary>
public class DataInventoryDriftTests
{
    [Fact]
    public void AllMigrationTables_areInventoried_orSystemExempt()
    {
        var repoRoot = FindRepoRoot();
        var migrationsDir = Path.Combine(repoRoot, "supabase", "migrations");
        var inventoryPath = Path.Combine(repoRoot, "docs", "compliance", "inventoried-tables.txt");

        File.Exists(inventoryPath).Should().BeTrue("inventoried-tables.txt must exist");
        Directory.Exists(migrationsDir).Should().BeTrue();

        var inventoried = File.ReadAllLines(inventoryPath)
            .Select(l => l.Trim())
            .Where(l => l.Length > 0 && !l.StartsWith('#'))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var systemExempt = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "clinic_scheduling_config",
            "country_email_document_verification",
            "documentation",
            "document_expiry_reminder_sent",
            "email_delete_audit",
            "faq_documents",
            "faq_source",
            "founding_member_counter",
            "founding_member_purchases",
            "marketplace_service_bookings",
            "medication_adr_entries",
            "medication_adr_ingestion_runs",
            "medication_adr_overrides",
            "medication_products",
            "milo_curated_snippets",
            "milo_journal_config",
            "one_time_ops_log",
            "ops_probe_results",
            "pet_family_notification_prefs",
            "pet_journal_transfer_highlights",
            "service_areas",
            "service_offerings",
            "subscription_feature_gates",
            "subscription_limits",
            "vet_booking_reminder_sent",
            "country_vaccine_requirements",
            "vaccine_equivalencies",
            "vet_information",
        };

        var migrationTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var file in Directory.EnumerateFiles(migrationsDir, "*.sql"))
        {
            var text = File.ReadAllText(file);
            foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(
                         text,
                         @"CREATE TABLE (?:IF NOT EXISTS )?public\.([a-z_0-9]+)",
                         System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            {
                migrationTables.Add(m.Groups[1].Value);
            }
        }

        var missing = migrationTables
            .Where(t => !inventoried.Contains(t) && !systemExempt.Contains(t))
            .OrderBy(t => t)
            .ToList();

        missing.Should().BeEmpty(
            "Add each table to docs/compliance/inventoried-tables.txt and DATA-INVENTORY.md, or to systemExempt in this test if system-only.");
    }

    private static string FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            if (Directory.Exists(Path.Combine(dir, "supabase", "migrations"))
                && File.Exists(Path.Combine(dir, "docs", "compliance", "inventoried-tables.txt")))
                return dir;
            dir = Directory.GetParent(dir)?.FullName ?? "";
        }

        throw new InvalidOperationException("Could not find repo root from test output directory.");
    }
}
