using System.Collections.Concurrent;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace SkillsTestProj.Tests;

[Trait("Category", "Browser")]
public sealed class ClockTests : IClassFixture<ClockApplication>, IAsyncLifetime
{
    private readonly ClockApplication application;
    private IBrowserContext context = null!;
    private IPage page = null!;
    private readonly ConcurrentQueue<string> errors = new();

    public ClockTests(ClockApplication application) => this.application = application;

    public async ValueTask InitializeAsync()
    {
        context = await application.Browser.NewContextAsync(new() { TimezoneId = "Asia/Taipei" });
        page = await context.NewPageAsync();
        page.PageError += (_, error) => errors.Enqueue(error);
        page.Response += (_, response) =>
        {
            if (response.Status >= 400) errors.Enqueue($"{response.Status}: {response.Url}");
        };
        await page.Clock.InstallAsync(new() { TimeString = "2026-01-05T01:05:03Z" });
        await page.Clock.PauseAtAsync("2026-01-05T01:05:03Z");
    }

    public async ValueTask DisposeAsync() => await context.DisposeAsync();

    private async Task OpenClockAsync()
    {
        await page.GotoAsync(new Uri(application.BaseAddress, "/Clock").ToString());
        await Expect(page.Locator("#clock-date")).ToHaveTextAsync("2026/01/05");
        await Expect(page.Locator("#clock-timezone")).ToHaveTextAsync("Asia/Taipei · UTC+08:00");
        Assert.Empty(errors);
    }

    private async Task ExpectClockAsync(string date, string time)
    {
        await Expect(page.Locator("#clock-date")).ToHaveTextAsync(date);
        await Expect(page.Locator("#clock-time")).ToHaveTextAsync(time);
        Assert.Empty(errors);
    }

    [Fact]
    public async Task HomeEntry_OpensClockInSameTab_AndAllowsReturning()
    {
        await page.GotoAsync(application.BaseAddress.ToString());
        var entry = page.GetByRole(AriaRole.Link, new() { Name = "現在時間", Exact = true });
        await Expect(entry).ToBeVisibleAsync();
        Assert.Null(await entry.GetAttributeAsync("target"));
        Assert.Equal(0, await page.Locator("nav a[href='/Clock']").CountAsync());
        Assert.True(await entry.EvaluateAsync<bool>("e => e.closest('main') !== null"));
        await entry.ClickAsync();
        await ExpectClockAsync("2026/01/05", "09:05:03");
        Assert.Single(context.Pages);
        Assert.Equal("/Clock", new Uri(page.Url).AbsolutePath);

        await page.GoBackAsync();
        await Expect(entry).ToBeVisibleAsync();
        await entry.ClickAsync();
        await page.Locator("nav .navbar-brand").ClickAsync();
        await Expect(entry).ToBeVisibleAsync();
    }

    [Theory]
    [InlineData("2026-01-05T01:05:03Z", "2026/01/05", "09:05:03")]
    [InlineData("2026-01-05T13:05:03Z", "2026/01/05", "21:05:03")]
    [InlineData("2026-01-04T16:00:00Z", "2026/01/05", "00:00:00")]
    public async Task Clock_FormatsLocalDateAnd24HourTime(string instant, string date, string time)
    {
        await page.Clock.SetSystemTimeAsync(instant);
        await page.GotoAsync(new Uri(application.BaseAddress, "/Clock").ToString());
        await ExpectClockAsync(date, time);
    }

    [Theory]
    [InlineData("2026-01-05T01:05:59Z", "2026/01/05", "09:06:00")]
    [InlineData("2026-01-05T01:59:59Z", "2026/01/05", "10:00:00")]
    [InlineData("2026-11-20T15:59:59Z", "2026/11/21", "00:00:00")]
    [InlineData("2026-04-30T15:59:59Z", "2026/05/01", "00:00:00")]
    [InlineData("2026-12-31T15:59:59Z", "2027/01/01", "00:00:00")]
    [InlineData("2028-02-28T15:59:59Z", "2028/02/29", "00:00:00")]
    [InlineData("2028-02-29T15:59:59Z", "2028/03/01", "00:00:00")]
    public async Task Clock_UpdatesDateAndTimeTogetherAtBoundaries(string before, string date, string time)
    {
        await OpenClockAsync();
        await page.Clock.SetSystemTimeAsync(before);
        await page.Clock.RunForAsync(1000);
        await ExpectClockAsync(date, time);
    }

    [Fact]
    public async Task Clock_UpdatesEverySecondForTenSeconds()
    {
        await OpenClockAsync();
        for (var second = 4; second <= 13; second++)
        {
            await page.Clock.RunForAsync(1000);
            await ExpectClockAsync("2026/01/05", $"09:05:{second:00}");
        }
    }

    [Theory]
    [InlineData("2030-06-01T02:03:04Z", "2030/06/01", "10:03:04")]
    [InlineData("2020-01-01T00:00:00Z", "2020/01/01", "08:00:00")]
    public async Task Clock_ReflectsForwardAndBackwardDeviceTimeChangesWithinOneSecond(string instant, string date, string time)
    {
        await OpenClockAsync();
        await page.Clock.SetSystemTimeAsync(instant);
        await page.Clock.RunForAsync(500);
        await ExpectClockAsync(date, time);
    }

    [Theory]
    [InlineData("visibilitychange")]
    [InlineData("focus")]
    [InlineData("pageshow")]
    public async Task Clock_ResynchronizesOnResumeWithoutReplayingElapsedSeconds(string eventName)
    {
        await OpenClockAsync();
        await page.Clock.SetSystemTimeAsync("2027-06-01T02:03:04Z");
        await page.EvaluateAsync("event => (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event))", eventName);
        await ExpectClockAsync("2027/06/01", "10:03:04");
    }

    [Theory]
    [InlineData("America/Los_Angeles", "2026/11/20", "08:30:00", "UTC-08:00")]
    [InlineData("Asia/Tokyo", "2026/11/21", "01:30:00", "UTC+09:00")]
    [InlineData("Asia/Colombo", "2026/11/20", "22:00:00", "UTC+05:30")]
    [InlineData("UTC", "2026/11/20", "16:30:00", "UTC+00:00")]
    public async Task Clock_UsesEachDevicesTimezone(string timezone, string date, string time, string offset)
    {
        await using var otherContext = await application.Browser.NewContextAsync(new() { TimezoneId = timezone });
        var otherPage = await otherContext.NewPageAsync();
        await otherPage.Clock.SetFixedTimeAsync("2026-11-20T16:30:00Z");
        await otherPage.GotoAsync(new Uri(application.BaseAddress, "/Clock").ToString());
        await Expect(otherPage.Locator("#clock-date")).ToHaveTextAsync(date);
        await Expect(otherPage.Locator("#clock-time")).ToHaveTextAsync(time);
        await Expect(otherPage.Locator("#clock-timezone")).ToHaveTextAsync($"{timezone} · {offset}");
    }

    [Theory]
    [InlineData(1440, 900)]
    [InlineData(390, 844)]
    [InlineData(320, 568)]
    [InlineData(568, 320)]
    public async Task Clock_RemainsReadableAndCenteredAtDifferentViewportSizes(int width, int height)
    {
        await page.SetViewportSizeAsync(width, height);
        await OpenClockAsync();
        Assert.True(await page.EvaluateAsync<bool>("""
            () => {
                const date = document.querySelector('#clock-date').getBoundingClientRect();
                const time = document.querySelector('#clock-time').getBoundingClientRect();
                const main = document.querySelector('.clock').getBoundingClientRect();
                const timezone = document.querySelector('#clock-timezone').getBoundingClientRect();
                return document.documentElement.scrollWidth <= innerWidth
                    && time.left >= 0 && time.right <= innerWidth
                    && date.bottom < time.top
                    && timezone.top > time.bottom
                    && timezone.left >= main.left && timezone.right <= main.right + 1
                    && Math.abs(timezone.bottom - main.bottom) < 1
                    && Math.abs((time.left + time.right - main.left - main.right) / 2) < 1
                    && Math.abs((time.top + time.bottom - main.top - main.bottom) / 2) < 1;
            }
            """));
    }

    [Fact]
    public async Task Clock_ReflectsTimezoneChangesWhilePageRemainsOpen()
    {
        await using var changingContext = await application.Browser.NewContextAsync();
        var changingPage = await changingContext.NewPageAsync();
        var cdp = await changingContext.NewCDPSessionAsync(changingPage);
        await cdp.SendAsync("Emulation.setTimezoneOverride", new() { ["timezoneId"] = "Asia/Taipei" });
        await changingPage.Clock.InstallAsync(new() { TimeString = "2026-11-20T16:30:00Z" });
        await changingPage.Clock.PauseAtAsync("2026-11-20T16:30:00Z");
        await changingPage.GotoAsync(new Uri(application.BaseAddress, "/Clock").ToString());
        await Expect(changingPage.Locator("#clock-date")).ToHaveTextAsync("2026/11/21");
        await Expect(changingPage.Locator("#clock-time")).ToHaveTextAsync("00:30:00");
        await Expect(changingPage.Locator("#clock-timezone")).ToHaveTextAsync("Asia/Taipei · UTC+08:00");

        await cdp.SendAsync("Emulation.setTimezoneOverride", new() { ["timezoneId"] = "America/Los_Angeles" });
        await changingPage.Clock.RunForAsync(500);
        await Expect(changingPage.Locator("#clock-date")).ToHaveTextAsync("2026/11/20");
        await Expect(changingPage.Locator("#clock-time")).ToHaveTextAsync("08:30:00");
        await Expect(changingPage.Locator("#clock-timezone")).ToHaveTextAsync("America/Los_Angeles · UTC-08:00");
    }
}
