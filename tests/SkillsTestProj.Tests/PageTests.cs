using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SkillsTestProj.Tests;

[Trait("Category", "Integration")]
public sealed class PageTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> application;

    public PageTests(WebApplicationFactory<Program> application) => this.application = application;

    [Theory]
    [InlineData("/")]
    [InlineData("/Clock")]
    [InlineData("/Privacy")]
    public async Task PublicPages_AreAccessibleWithoutLogin(string path)
    {
        using var client = application.CreateClient(new() { AllowAutoRedirect = false });
        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task UnknownPage_ReturnsNotFound()
    {
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/missing-page", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
