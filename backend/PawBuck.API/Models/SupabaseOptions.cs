namespace PawBuck.API.Models;

/// <summary>
/// Supabase project settings. The mobile app uses <c>EXPO_PUBLIC_SUPABASE_URL</c> + <b>anon</b> key for PostgREST/Auth.
/// <list type="bullet">
/// <item><description><see cref="Url"/> + <see cref="AnonKey"/> — Supabase REST client (same as the app).</description></item>
/// <item><description><see cref="ConnectionString"/> or <see cref="Url"/> + <see cref="DbPassword"/> — Npgsql for raw SQL (dashboard <b>database</b> password, not the anon JWT).</description></item>
/// </list>
/// </summary>
public class SupabaseOptions
{
    public const string SectionName = "Supabase";

    /// <summary>Full Npgsql connection string when you prefer a single value (e.g. Session pooler from the dashboard).</summary>
    public string? ConnectionString { get; set; }

    /// <summary>Project URL, same as the app: <c>https://YOUR_REF.supabase.co</c>.</summary>
    public string? Url { get; set; }

    /// <summary>Public anon key (JWT) from Dashboard → API — same as <c>EXPO_PUBLIC_SUPABASE_KEY</c>. Powers the Supabase REST client when paired with <see cref="Url"/>.</summary>
    public string? AnonKey { get; set; }

    /// <summary>Database password from Supabase Dashboard → Database (not the <c>anon</c> or <c>service_role</c> JWT).</summary>
    public string? DbPassword { get; set; }

    /// <summary>
    /// Optional Postgres host override. Defaults to <c>db.YOUR_REF.supabase.co</c>. For IPv4-only networks use the Session pooler host from the dashboard, e.g. <c>aws-0-REGION</c> or <c>aws-1-REGION</c> (copy the full hostname; edge index varies by project).
    /// </summary>
    public string? PostgresHost { get; set; }

    /// <summary>
    /// If set (e.g. <c>us-east-1</c>) and <see cref="PostgresHost"/> is empty, uses Session pooler <c>aws-{PoolerAwsCluster}-{region}.pooler.supabase.com</c>. Must match the project's region in the Supabase dashboard.
    /// </summary>
    public string? PoolerAwsRegion { get; set; }

    /// <summary>
    /// Pooler edge index: <c>0</c> or <c>1</c> (e.g. <c>aws-0-us-east-1</c> vs <c>aws-1-us-east-1</c>). Must match Dashboard → Connect → Session pooler if you see <c>Tenant or user not found</c> (XX000). Default <c>0</c> when composing from region only.
    /// </summary>
    public string? PoolerAwsCluster { get; set; }

    /// <summary>When true, normalize <c>db.*.supabase.co</c> hostname to IPv4 for Npgsql when DNS is IPv6-only. Pooler hostnames are left as-is.</summary>
    public bool PreferIpv4 { get; set; } = true;
}
