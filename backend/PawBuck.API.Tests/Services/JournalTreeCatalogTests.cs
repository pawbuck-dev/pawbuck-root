using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class JournalTreeCatalogTests
{
    [Fact]
    public void ResolveByTopic_vomiting_returns_vomiting_tree()
    {
        var env = new TestWebHostEnvironment();
        var catalog = new JournalTreeCatalog(env, NullLogger<JournalTreeCatalog>.Instance);
        var tree = catalog.ResolveByTopic("Max has been vomiting since yesterday");
        tree.Should().NotBeNull();
        tree!.TreeId.Should().Be("vomiting_v1.5");
    }

    private static string ResolveApiContentRootWithJournalTrees()
    {
        foreach (var configuration in new[] { "Release", "Debug" })
        {
            var candidate = Path.GetFullPath(
                Path.Combine(
                    AppContext.BaseDirectory,
                    "..",
                    "..",
                    "..",
                    "..",
                    "PawBuck.API",
                    "bin",
                    configuration,
                    "net8.0"));
            if (Directory.Exists(Path.Combine(candidate, "JournalTrees")))
                return candidate;
        }

        throw new InvalidOperationException(
            "JournalTrees not found under PawBuck.API bin output. Build PawBuck.API before running this test.");
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PawBuck.API.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = ResolveApiContentRootWithJournalTrees();
        public string EnvironmentName { get; set; } = "Development";
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}
