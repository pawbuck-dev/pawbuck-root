using PawBuck.API.Models;
using Xunit;

namespace PawBuck.API.Tests.Services;

/// <summary>
/// Documents expected null-safe mapping for pets with optional date_of_birth (onboarding skip).
/// </summary>
public class SupportDirectoryReadPetTests
{
    [Fact]
    public void SupportPetRow_AllowsNullDateOfBirth()
    {
        var row = new SupportPetRow
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Name = "Benji",
            Breed = "Mix",
            AnimalType = "dog",
            DateOfBirth = null,
            Sex = "male",
        };

        Assert.Null(row.DateOfBirth);
    }
}
