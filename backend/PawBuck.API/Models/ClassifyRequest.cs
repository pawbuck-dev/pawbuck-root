namespace PawBuck.API.Models;

/// <summary>
/// Request payload for document classification. Same shape as Supabase Edge function (image_url).
/// </summary>
public class ClassifyRequest
{
    /// <summary>URL of the pet document image to classify (e.g. Supabase storage or public URL).</summary>
    public string? ImageUrl { get; set; }
}
