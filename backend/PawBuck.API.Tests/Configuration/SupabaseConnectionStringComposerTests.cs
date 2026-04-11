using FluentAssertions;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using Xunit;

namespace PawBuck.API.Tests.Configuration;

public class SupabaseConnectionStringComposerTests
{
    [Theory]
    [InlineData("https://abcd1234.supabase.co", "abcd1234")]
    [InlineData("http://abcd1234.supabase.co", "abcd1234")]
    [InlineData("abcd1234.supabase.co", "abcd1234")]
    public void TryParseProjectRef_extracts_ref(string url, string expected)
    {
        SupabaseConnectionStringComposer.TryParseProjectRef(url, out var r, out var err).Should().BeTrue();
        r.Should().Be(expected);
        err.Should().BeNull();
    }

    [Fact]
    public void TryParseProjectRef_rejects_non_supabase_host()
    {
        SupabaseConnectionStringComposer.TryParseProjectRef("https://example.com", out _, out var err).Should().BeFalse();
        err.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void TryCompose_direct_db_uses_postgres_user()
    {
        var o = new SupabaseOptions
        {
            Url = "https://projref.supabase.co",
            DbPassword = "secret",
        };
        SupabaseConnectionStringComposer.TryCompose(o, null, null, null, null, null).Should().BeTrue();
        o.ConnectionString.Should().Contain("Host=db.projref.supabase.co");
        o.ConnectionString.Should().Contain("Username=postgres");
        o.ConnectionString.Should().NotContain("Username=postgres.projref");
    }

    /// <summary>
    /// Session pooler hostname must match Dashboard → Connect (some projects use <c>aws-0-…</c>, others <c>aws-1-…</c>).
    /// This test only checks that a pooler host yields user <c>postgres.&lt;ref&gt;</c>.
    /// </summary>
    [Fact]
    public void TryCompose_pooler_host_uses_postgres_ref_user()
    {
        var o = new SupabaseOptions
        {
            Url = "https://projref.supabase.co",
            DbPassword = "secret",
            PostgresHost = "aws-1-us-east-1.pooler.supabase.com",
        };
        SupabaseConnectionStringComposer.TryCompose(o, null, null, null, null, null).Should().BeTrue();
        o.ConnectionString.Should().Contain("Host=aws-1-us-east-1.pooler.supabase.com");
        o.ConnectionString.Should().Contain("Username=postgres.projref");
    }

    [Fact]
    public void TryCompose_prefers_connection_string_when_set()
    {
        var o = new SupabaseOptions { ConnectionString = "Host=x;Username=u" };
        SupabaseConnectionStringComposer.TryCompose(o, "https://a.supabase.co", "p", "h", null, null).Should().BeFalse();
        o.ConnectionString.Should().Be("Host=x;Username=u");
    }

    [Fact]
    public void TryCompose_env_url_and_password()
    {
        var o = new SupabaseOptions();
        SupabaseConnectionStringComposer.TryCompose(o, "https://zz.supabase.co", "pw", null, null, null).Should().BeTrue();
        o.ConnectionString.Should().Contain("Host=db.zz.supabase.co");
    }

    [Fact]
    public void TryCompose_pooler_aws_region_builds_host()
    {
        var o = new SupabaseOptions
        {
            Url = "https://aa.supabase.co",
            DbPassword = "x",
            PoolerAwsRegion = "ca-central-1",
        };
        SupabaseConnectionStringComposer.TryCompose(o, null, null, null, null, null).Should().BeTrue();
        o.ConnectionString.Should().Contain("Host=aws-0-ca-central-1.pooler.supabase.com");
        o.ConnectionString.Should().Contain("Username=postgres.aa");
    }

    [Fact]
    public void TryCompose_PostgresHost_wins_over_region()
    {
        var o = new SupabaseOptions
        {
            Url = "https://aa.supabase.co",
            DbPassword = "x",
            PostgresHost = "custom.pooler.supabase.com",
            PoolerAwsRegion = "eu-west-1",
        };
        SupabaseConnectionStringComposer.TryCompose(o, null, null, null, null, null).Should().BeTrue();
        o.ConnectionString.Should().Contain("Host=custom.pooler.supabase.com");
    }

    [Fact]
    public void TryCompose_pooler_aws_region_uses_cluster_1_when_set()
    {
        var o = new SupabaseOptions
        {
            Url = "https://aa.supabase.co",
            DbPassword = "x",
            PoolerAwsRegion = "us-east-1",
            PoolerAwsCluster = "1",
        };
        SupabaseConnectionStringComposer.TryCompose(o, null, null, null, null, null).Should().BeTrue();
        o.ConnectionString.Should().Contain("Host=aws-1-us-east-1.pooler.supabase.com");
    }
}
