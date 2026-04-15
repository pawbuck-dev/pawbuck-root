using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace PawBuck.API.Tests;

/// <summary>
/// Optional live HTTP checks against a deployed PawBuck.API (e.g. ECS).
/// When <c>PAWBUCK_REMOTE_API_BASE</c> is unset, tests are skipped so CI stays green.
/// </summary>
/// <remarks>
/// <para><b>Environment variables</b></para>
/// <list type="bullet">
/// <item><c>PAWBUCK_REMOTE_API_BASE</c> — API origin, no trailing slash (e.g. <c>http://pawbuck-api-alb-….elb.amazonaws.com</c>).</item>
/// <item><c>PAWBUCK_REMOTE_ADMIN_JWT</c> — Supabase <c>access_token</c> for a user with <c>app_metadata.role</c> matching admin policy.</item>
/// </list>
/// <para><b>Visual Studio / Rider:</b> Test → Configure Run Settings → select <c>RemoteApiSmoke.runsettings</c>
/// (copy from <c>RemoteApiSmoke.runsettings.example</c> and paste your JWT).</para>
/// <para><b>CLI:</b> <c>PAWBUCK_REMOTE_API_BASE=… PAWBUCK_REMOTE_ADMIN_JWT=… dotnet test --filter FullyQualifiedName~RemoteApiSmokeTests</c></para>
/// </remarks>
public sealed class RemoteApiSmokeTests
{
    private static string? RemoteBase =>
        Environment.GetEnvironmentVariable("PAWBUCK_REMOTE_API_BASE");

    private static string? AdminJwt =>
        Environment.GetEnvironmentVariable("PAWBUCK_REMOTE_ADMIN_JWT");

    private static HttpClient CreateClient(bool withAdminBearer)
    {
        var baseUrl = RemoteBase!.TrimEnd('/') + "/";
        var client = new HttpClient { BaseAddress = new Uri(baseUrl) };
        if (withAdminBearer)
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminJwt);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    [SkippableFact]
    public async Task Health_returns_healthy()
    {
        Skip.If(string.IsNullOrWhiteSpace(RemoteBase), "Set PAWBUCK_REMOTE_API_BASE to run remote smoke tests.");

        using var client = CreateClient(withAdminBearer: false);
        using var response = await client.GetAsync("api/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        doc.RootElement.GetProperty("status").GetString().Should().Be("healthy");
    }

    [SkippableFact]
    public async Task Support_metrics_returns_aggregate_shape()
    {
        Skip.If(string.IsNullOrWhiteSpace(RemoteBase), "Set PAWBUCK_REMOTE_API_BASE to run remote smoke tests.");
        Skip.If(string.IsNullOrWhiteSpace(AdminJwt), "Set PAWBUCK_REMOTE_ADMIN_JWT for admin /api/support/* checks.");

        using var client = CreateClient(withAdminBearer: true);
        using var response = await client.GetAsync("api/support/metrics");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;
        foreach (var name in new[]
 {
                     "totalUsers", "usersWithPets", "usersWithPetsAndHealthRecords", "newUsersLast7Days",
                     "totalPets", "dailySignups",
                 })
            root.GetProperty(name).ValueKind.Should().NotBe(JsonValueKind.Null);

        root.GetProperty("totalUsers").GetInt32().Should().BeGreaterOrEqualTo(0);
        root.GetProperty("dailySignups").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [SkippableFact]
    public async Task Support_user_directory_first_page()
    {
        Skip.If(string.IsNullOrWhiteSpace(RemoteBase), "Set PAWBUCK_REMOTE_API_BASE to run remote smoke tests.");
        Skip.If(string.IsNullOrWhiteSpace(AdminJwt), "Set PAWBUCK_REMOTE_ADMIN_JWT for admin /api/support/* checks.");

        using var client = CreateClient(withAdminBearer: true);
        using var response = await client.GetAsync("api/support/users/directory?page=1&pageSize=5");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;
        root.GetProperty("page").GetInt32().Should().Be(1);
        root.GetProperty("pageSize").GetInt32().Should().Be(5);
        root.GetProperty("totalCount").GetInt32().Should().BeGreaterOrEqualTo(0);
        var items = root.GetProperty("items");
        items.GetArrayLength().Should().BeLessOrEqualTo(5);
    }

    [SkippableFact]
    public async Task Support_users_list_segment_all()
    {
        Skip.If(string.IsNullOrWhiteSpace(RemoteBase), "Set PAWBUCK_REMOTE_API_BASE to run remote smoke tests.");
        Skip.If(string.IsNullOrWhiteSpace(AdminJwt), "Set PAWBUCK_REMOTE_ADMIN_JWT for admin /api/support/* checks.");

        using var client = CreateClient(withAdminBearer: true);
        using var response = await client.GetAsync("api/support/users/list?segment=all");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
        doc.RootElement.GetArrayLength().Should().BeLessOrEqualTo(500);
    }

    [SkippableFact]
    public async Task Support_pets_search_min_query()
    {
        Skip.If(string.IsNullOrWhiteSpace(RemoteBase), "Set PAWBUCK_REMOTE_API_BASE to run remote smoke tests.");
        Skip.If(string.IsNullOrWhiteSpace(AdminJwt), "Set PAWBUCK_REMOTE_ADMIN_JWT for admin /api/support/* checks.");

        using var client = CreateClient(withAdminBearer: true);
        using var response = await client.GetAsync("api/support/pets/search?q=ab");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
    }
}
