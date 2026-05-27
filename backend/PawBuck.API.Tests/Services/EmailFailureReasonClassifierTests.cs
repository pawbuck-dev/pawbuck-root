using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class EmailFailureReasonClassifierTests
{
    [Theory]
    [InlineData("Document 'vax.pdf': breed mismatch ('Canine (Dog)' vs 'Maltese', 29%)", EmailFailureReasonClassifier.PetBreedMismatch)]
    [InlineData("Pet verification failed for Milo: first name mismatch ('Max' vs profile first name 'Milo', 40%)", EmailFailureReasonClassifier.PetNameMismatch)]
    [InlineData("Could not verify Milo: the document must clearly include pet identification (missing: pet name, breed).", EmailFailureReasonClassifier.PetNoIdentification)]
    [InlineData("Document 'lab.pdf': Failed to extract data from document", EmailFailureReasonClassifier.MiloExtractionFailed)]
    [InlineData("analyze-internal not configured on PawBuck.API", EmailFailureReasonClassifier.Configuration)]
    [InlineData("analyze-internal HTTP 502: upstream error", EmailFailureReasonClassifier.MiloApiError)]
    [InlineData("Failed to save to database", EmailFailureReasonClassifier.DbPersistFailed)]
    [InlineData("Failed to process 2 document(s): Document 'a.pdf': Validation failed", EmailFailureReasonClassifier.AttachmentPipeline)]
    [InlineData("attachment_failures:1;calendar_import_error", EmailFailureReasonClassifier.AttachmentPipeline)]
    [InlineData("message_storage_failed", EmailFailureReasonClassifier.ArchiveStorage)]
    [InlineData("Gateway timeout (504) calling analyze-internal", EmailFailureReasonClassifier.GatewayTimeout)]
    public void Classify_maps_known_failure_text(string reason, string expectedCategory)
    {
        Assert.Equal(expectedCategory, EmailFailureReasonClassifier.Classify(reason));
    }

    [Fact]
    public void Classify_empty_returns_unknown()
    {
        Assert.Equal(EmailFailureReasonClassifier.Unknown, EmailFailureReasonClassifier.Classify(null));
        Assert.Equal(EmailFailureReasonClassifier.Unknown, EmailFailureReasonClassifier.Classify("   "));
    }

    [Fact]
    public void GetCategoryLabel_returns_human_label()
    {
        Assert.Equal(
            "Pet breed mismatch",
            EmailFailureReasonClassifier.GetCategoryLabel(EmailFailureReasonClassifier.PetBreedMismatch));
    }

    [Fact]
    public void BuildSqlCategoryCaseExpression_includes_breed_mismatch_pattern()
    {
        var sql = EmailFailureReasonClassifier.BuildSqlCategoryCaseExpression();
        Assert.Contains("breed mismatch", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CASE", sql, StringComparison.Ordinal);
    }
}
