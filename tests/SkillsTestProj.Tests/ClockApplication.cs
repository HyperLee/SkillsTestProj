using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Playwright;

namespace SkillsTestProj.Tests;

public sealed class ClockApplication : WebApplicationFactory<Program>, IAsyncLifetime
{
    private IPlaywright? playwright;
    private IBrowser? browser;

    public Uri BaseAddress { get; private set; } = null!;
    public IBrowser Browser => browser!;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseStaticWebAssets();
    }

    public async ValueTask InitializeAsync()
    {
        UseKestrel(0);
        using var client = CreateClient();
        BaseAddress = client.BaseAddress!;
        playwright = await Playwright.CreateAsync();
        browser = await playwright.Chromium.LaunchAsync(new()
        {
            Headless = true,
            Channel = Environment.GetEnvironmentVariable("CLOCK_TEST_BROWSER_CHANNEL")
        });
    }

    public override async ValueTask DisposeAsync()
    {
        if (browser is not null) await browser.DisposeAsync();
        playwright?.Dispose();
        await base.DisposeAsync();
    }
}
