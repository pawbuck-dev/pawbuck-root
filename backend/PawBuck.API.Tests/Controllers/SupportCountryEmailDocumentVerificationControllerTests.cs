using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportCountryEmailDocumentVerificationControllerTests
{
    [Fact]
    public async Task List_ReturnsOkWithItems()
    {
        var items = new List<CountryEmailDocumentVerificationDto>
        {
            new()
            {
                Country = "Canada",
                AllowNameOnlyDocumentTypes = ["clinical_exams"],
                BreedRequiredDocumentTypes = ["vaccinations"],
                FuzzyMatchThreshold = 0.7m,
                Enabled = true,
            },
        };
        var mock = new Mock<ICountryEmailDocumentVerificationService>();
        mock.Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(items);
        var controller = new SupportCountryEmailDocumentVerificationController(mock.Object);

        var result = await controller.List(CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<CountryEmailDocumentVerificationListResponse>().Subject;
        body.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task Patch_WhenUnknown_ReturnsNotFound()
    {
        var mock = new Mock<ICountryEmailDocumentVerificationService>();
        mock.Setup(s => s.TryUpdateAsync(
                "Narnia",
                It.IsAny<PatchCountryEmailDocumentVerificationRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((CountryEmailDocumentVerificationDto?)null);
        var controller = new SupportCountryEmailDocumentVerificationController(mock.Object);

        var result = await controller.Patch(
            "Narnia",
            new PatchCountryEmailDocumentVerificationRequest { Enabled = false },
            CancellationToken.None);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Patch_WhenInvalidType_ReturnsBadRequest()
    {
        var mock = new Mock<ICountryEmailDocumentVerificationService>();
        mock.Setup(s => s.TryUpdateAsync(
                "Canada",
                It.IsAny<PatchCountryEmailDocumentVerificationRequest>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Invalid document type: foo"));
        var controller = new SupportCountryEmailDocumentVerificationController(mock.Object);

        var result = await controller.Patch(
            "Canada",
            new PatchCountryEmailDocumentVerificationRequest
            {
                AllowNameOnlyDocumentTypes = ["foo"],
            },
            CancellationToken.None);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }
}
