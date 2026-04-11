using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloCuratedSnippetsServiceTests
{
    [Theory]
    [InlineData("Shih Tzu", "shih_tzu")]
    [InlineData("Golden Retriever", "golden_retriever")]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void NormalizeBreedKey_MatchesEdgeConvention(string? input, string? expected)
    {
        Assert.Equal(expected, MiloCuratedSnippetsService.NormalizeBreedKey(input));
    }
}
