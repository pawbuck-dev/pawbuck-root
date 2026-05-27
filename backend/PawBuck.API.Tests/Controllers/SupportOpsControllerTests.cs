using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportOpsControllerTests
{
    [Fact]
    public void GetOpsHealth_ReturnsOkWithChecks()
    {
        var controller = new SupportOpsController(
            Microsoft.Extensions.Options.Options.Create(new MiloOptions { InternalServiceKey = "k" }),
            Microsoft.Extensions.Options.Options.Create(new SupabaseOptions
            {
                Url = "https://x",
                ServiceRoleKey = "s",
                ConnectionString = "cs",
            }),
            Microsoft.Extensions.Options.Options.Create(new GeminiOptions { ApiKey = "g" }));

        var result = controller.GetOpsHealth();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<SupportOpsHealthResponse>().Subject;
        body.AllReady.Should().BeTrue();
        body.Checks.Should().NotBeEmpty();
    }
}
