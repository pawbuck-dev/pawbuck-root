using FluentAssertions;
using Xunit;

namespace PawBuck.API.Tests.Compliance;

/// <summary>
/// Ensures every public table created in migrations has RLS enabled in the same or a later migration.
/// </summary>
public class PublicTablesRlsTests
{
    [Fact]
    public void EveryPublicMigrationTable_hasEnableRlsInMigrationChain()
    {
        var repoRoot = DataInventoryDriftTestsHelper.FindRepoRoot();
        var migrationsDir = Path.Combine(repoRoot, "supabase", "migrations");
        var files = Directory.EnumerateFiles(migrationsDir, "*.sql").OrderBy(f => f).ToList();

        var created = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var rlsEnabled = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var file in files)
        {
            var text = File.ReadAllText(file);
            foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(
                         text,
                         @"CREATE TABLE (?:IF NOT EXISTS )?public\.([a-z_0-9]+)",
                         System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            {
                var table = m.Groups[1].Value;
                created.TryAdd(table, Path.GetFileName(file));
            }

            foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(
                         text,
                         @"ALTER TABLE public\.([a-z_0-9]+) ENABLE ROW LEVEL SECURITY",
                         System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            {
                rlsEnabled.Add(m.Groups[1].Value);
            }
        }

        var missing = created.Keys.Where(t => !rlsEnabled.Contains(t)).OrderBy(t => t).ToList();

        missing.Should().BeEmpty(
            "Enable RLS (and policies or service_role-only access) for each public table. Missing: "
            + string.Join(", ", missing.Select(t => $"{t} (created in {created[t]})")));
    }
}

/// <summary>Shared repo root lookup for compliance tests.</summary>
internal static class DataInventoryDriftTestsHelper
{
    internal static string FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            if (Directory.Exists(Path.Combine(dir, "supabase", "migrations"))
                && File.Exists(Path.Combine(dir, "docs", "compliance", "inventoried-tables.txt")))
            {
                return dir;
            }

            dir = Directory.GetParent(dir)?.FullName ?? string.Empty;
        }

        throw new InvalidOperationException("Could not locate repo root from test output directory.");
    }
}
