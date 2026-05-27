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

    /// <summary>Admin-friendly checklist for email/OCR pipeline readiness (no secrets).</summary>
    public static SupportOpsHealthResponse BuildAdminOpsHealth(
        MiloOptions milo,
        SupabaseOptions supabase,
        GeminiOptions gemini)
    {
        var miloOk = !string.IsNullOrWhiteSpace(milo.InternalServiceKey);
        var supabaseUrl = !string.IsNullOrWhiteSpace(supabase.Url);
        var supabaseServiceRole = !string.IsNullOrWhiteSpace(supabase.ServiceRoleKey);
        var supabaseDatabase = !string.IsNullOrWhiteSpace(supabase.ConnectionString);
        var mailResolveOk = supabaseUrl && supabaseServiceRole;
        var geminiOk = !string.IsNullOrWhiteSpace(gemini.ApiKey);

        var checks = new List<SupportOpsHealthCheckDto>
        {
            new()
            {
                Id = "miloAnalyzeInternal",
                Label = "Milo analyze-internal (email filing)",
                Ok = miloOk,
                Hint = miloOk
                    ? "PawBuck.API Milo__InternalServiceKey is set. Must match Edge MILO_INTERNAL_SERVICE_KEY."
                    : "Set Milo__InternalServiceKey on PawBuck.API and MILO_INTERNAL_SERVICE_KEY on Edge, then redeploy both.",
            },
            new()
            {
                Id = "mailResolve",
                Label = "Owner Confirm + admin reprocess",
                Ok = mailResolveOk,
                Hint = mailResolveOk
                    ? "Supabase URL + service role configured for mail resolve and attachment preview."
                    : "Set Supabase:Url and Supabase:ServiceRoleKey on PawBuck.API.",
            },
            new()
            {
                Id = "supabaseDatabase",
                Label = "Postgres (processed_emails)",
                Ok = supabaseDatabase,
                Hint = supabaseDatabase
                    ? "Database connection configured."
                    : "Set Supabase:ConnectionString on PawBuck.API.",
            },
            new()
            {
                Id = "gemini",
                Label = "Gemini (API-side Milo)",
                Ok = geminiOk,
                Hint = geminiOk
                    ? "Gemini API key configured on PawBuck.API."
                    : "Set Gemini:ApiKey on PawBuck.API for analyze-internal vision.",
            },
        };

        return new SupportOpsHealthResponse
        {
            AllReady = checks.All(c => c.Ok),
            Checks = checks,
        };
    }
}
