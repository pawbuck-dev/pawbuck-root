using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class ClinicalDocumentSyncPolicyTests
{
    [Theory]
    [InlineData(true, true, true)]
    [InlineData(true, false, false)]
    [InlineData(false, true, false)]
    [InlineData(false, false, false)]
    public void ShouldSkipSync_OnlyWhenSyncedAndRowsStillExist(
        bool clinicalSyncedAtSet,
        bool clinicalRowsExistForDocument,
        bool expected)
    {
        ClinicalDocumentSyncPolicy.ShouldSkipSync(clinicalSyncedAtSet, clinicalRowsExistForDocument)
            .Should()
            .Be(expected);
    }
}
