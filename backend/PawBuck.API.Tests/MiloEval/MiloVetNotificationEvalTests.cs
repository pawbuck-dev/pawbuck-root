using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using PawBuck.API.Tests.MiloEval;
using Xunit;

namespace PawBuck.API.Tests.MiloEval;

public class MiloVetNotificationEvalTests
{
    public static IEnumerable<object[]> ExampleIds =>
        MiloEvalFixtureLoader.LoadVetNotificationExamples().Select(e => new object[] { e.Id });

    [Theory]
    [MemberData(nameof(ExampleIds))]
    public void VetNotificationExamples_MatchFormatSpec(string exampleId)
    {
        var example = MiloEvalFixtureLoader.LoadVetNotificationExamples().Single(e => e.Id == exampleId);
        var (subject, body) = VetNotificationPlainTextComposer.Compose(example.Request);

        if (example.Expect.SubjectMustNotContain is { Count: > 0 } subjectBanned)
        {
            foreach (var token in subjectBanned)
                subject.Should().NotContain(token, exampleId);
        }

        if (example.Expect.SubjectMaxLength is int maxLen)
            subject.Length.Should().BeLessOrEqualTo(maxLen, exampleId);

        if (example.Expect.BodyMustNotContain is { Count: > 0 } bodyBanned)
        {
            foreach (var token in bodyBanned)
                body.Should().NotContain(token, exampleId);
        }

        if (example.Expect.BodyMustContain is { Count: > 0 } bodyRequired)
        {
            foreach (var token in bodyRequired)
                body.Should().Contain(token, exampleId);
        }
    }
}
