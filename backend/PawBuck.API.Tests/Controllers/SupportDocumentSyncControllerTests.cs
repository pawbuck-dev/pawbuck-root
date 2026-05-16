using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportDocumentSyncControllerTests
{
    private readonly Mock<IPetDocumentClinicalSyncService> _syncMock = new();
    private readonly SupportDocumentSyncController _controller;

    public SupportDocumentSyncControllerTests()
    {
        _controller = new SupportDocumentSyncController(_syncMock.Object);
    }

    [Fact]
    public async Task Run_CallsServiceWithClampedBatchSize()
    {
        _syncMock
            .Setup(s => s.ProcessPendingDocumentsAsync(100, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);

        var result = await _controller.Run(500, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<SupportDocumentSyncRunResponse>().Subject;
        body.RowsAttempted.Should().Be(3);
        body.Message.Should().Contain("3");

        _syncMock.Verify(s => s.ProcessPendingDocumentsAsync(100, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Run_WhenZero_ReturnsExplanatoryMessage()
    {
        _syncMock.Setup(s => s.ProcessPendingDocumentsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var result = await _controller.Run(20, CancellationToken.None);

        var body = (result as OkObjectResult)!.Value as SupportDocumentSyncRunResponse;
        body!.RowsAttempted.Should().Be(0);
        body.Message.Should().Contain("No pending");
    }

    [Fact]
    public async Task Resync_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _syncMock
            .Setup(s => s.ResyncDocumentByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PetDocumentClinicalSyncResult { Error = "document_not_found" });

        var result = await _controller.Resync(id, CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Resync_WhenSuccess_ReturnsOk()
    {
        var id = Guid.NewGuid();
        _syncMock
            .Setup(s => s.ResyncDocumentByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PetDocumentClinicalSyncResult { Synced = true, VaccinationsCreated = 2 });

        var result = await _controller.Resync(id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<PetDocumentClinicalSyncResult>().Subject;
        body.VaccinationsCreated.Should().Be(2);
    }
}
