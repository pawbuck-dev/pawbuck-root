using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Configuration;

/// <summary>Non-secret configuration flags for GET /api/health (ops / ECS smoke checks).</summary>
public static class ApiHealthStatusBuilder
{
    public static object Build(MiloOptions milo, SupabaseOptions supabase, GeminiOptions gemini)
    {
        var supabaseUrl = !string.IsNullOrWhiteSpace(supabase.Url);
        var supabaseServiceRole = !string.IsNullOrWhiteSpace(supabase.ServiceRoleKey);
        var supabaseJwt = !string.IsNullOrWhiteSpace(supabase.JwtSecret);
        var supabaseDatabase = !string.IsNullOrWhiteSpace(supabase.ConnectionString);
        var geminiConfigured = !string.IsNullOrWhiteSpace(gemini.ApiKey);

        return new
        {
            status = "healthy",
            miloAnalyzeInternalConfigured = !string.IsNullOrWhiteSpace(milo.InternalServiceKey),
            mailResolveConfigured = supabaseUrl && supabaseServiceRole,
            supabaseUrlConfigured = supabaseUrl,
            supabaseServiceRoleConfigured = supabaseServiceRole,
            supabaseJwtConfigured = supabaseJwt,
            supabaseDatabaseConfigured = supabaseDatabase,
            geminiConfigured,
        };
    }
}
