using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class MailControllerTests
{
    [Fact]
    public async Task Resolve_Returns400_WhenEmailIdEmpty()
    {
        var mock = new Mock<IMailInboxResolveService>();
        var controller = new MailController(mock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())],
                        "Test")),
                },
            },
        };

        var result = await controller.Resolve(
            new MailResolveRequest
            {
                EmailId = Guid.Empty,
                SelectedPetId = Guid.NewGuid(),
                SelectedDocType = "vaccinations",
            },
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Resolve_Returns200_WhenServiceOk()
    {
        var mock = new Mock<IMailInboxResolveService>();
        mock
            .Setup(m => m.ResolveAsync(It.IsAny<Guid>(), It.IsAny<MailResolveRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MailInboxResolveResult { Ok = true, StatusCode = 200 });

        var uid = Guid.NewGuid();
        var controller = new MailController(mock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, uid.ToString())],
                        "Test")),
                },
            },
        };

        var eid = Guid.NewGuid();
        var pid = Guid.NewGuid();
        var result = await controller.Resolve(
            new MailResolveRequest
            {
                EmailId = eid,
                SelectedPetId = pid,
                SelectedDocType = "lab",
            },
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        mock.Verify(
            m => m.ResolveAsync(
                uid,
                It.Is<MailResolveRequest>(r => r.EmailId == eid && r.SelectedPetId == pid),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
