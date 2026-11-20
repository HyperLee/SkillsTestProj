# xUnit 測試

測試專案使用 xUnit v3，目標框架與網站相同，均為 .NET 10。由 WebApplicationFactory 自動啟動網站；瀏覽器測試使用動態連接埠，每個案例建立獨立瀏覽器環境，不需手動開站，也不修改裝置時間。

選用官方 `xunit.v3.mtp-off` 套件，配合 VSTest adapter，保留一般 `dotnet test`、`--filter` 與 `--logger trx` 用法，無需修改全專案的測試執行器設定。套件差異見 [xUnit 官方說明](https://xunit.net/docs/getting-started/v3/microsoft-testing-platform)。

## 執行全部測試

Windows 已安裝 Microsoft Edge 時，在專案根目錄執行：

```powershell
$env:CLOCK_TEST_BROWSER_CHANNEL = 'msedge'
dotnet test SkillsTestProj.slnx
```

也可使用 Playwright 配套 Chromium（適用於 CI）。先建置、安裝瀏覽器，再執行：

```powershell
dotnet build SkillsTestProj.slnx
pwsh tests/SkillsTestProj.Tests/bin/Debug/net10.0/playwright.ps1 install chromium
Remove-Item Env:CLOCK_TEST_BROWSER_CHANNEL -ErrorAction SilentlyContinue
dotnet test SkillsTestProj.slnx
```

Linux CI 安裝瀏覽器時可改用 `install --with-deps chromium`。瀏覽器缺少或啟動失敗會讓測試失敗，不會略過測試。

## 分組執行

```powershell
# HTTP 整合測試，不需瀏覽器
dotnet test SkillsTestProj.slnx --filter 'Category=Integration'

# 時鐘與導覽的瀏覽器測試
$env:CLOCK_TEST_BROWSER_CHANNEL = 'msedge'
dotnet test SkillsTestProj.slnx --filter 'Category=Browser'

# 輸出 TRX 報告
dotnet test SkillsTestProj.slnx --logger trx --results-directory TestResults
```

## 覆蓋範圍

| 測試 | 驗證行為 |
| --- | --- |
| PageTests | 首頁、時鐘及既有 Privacy 頁可匿名存取；不存在頁面回傳 404 |
| HomeEntry | 首頁主要內容入口、同分頁開啟、無全站時鐘入口、返回與再次進入 |
| FormatsLocalDateAnd24HourTime | 補零日期、上午／下午 24 小時制、午夜 00 點 |
| UpdatesDateAndTimeTogetherAtBoundaries | 分鐘／小時進位、跨日、月底、年底、閏年二月 |
| UpdatesEverySecondForTenSeconds | 以可控制的瀏覽器時鐘逐秒推進十秒並檢查每次顯示 |
| ReflectsForwardAndBackwardDeviceTimeChanges | 時間向前／向後調整後，一秒內同步 |
| ResynchronizesOnResume | visibilitychange、focus、pageshow 後立即反映跳轉後的時間 |
| UsesEachDevicesTimezone | 不同瀏覽器時區可顯示不同日期與時間 |
| ReflectsTimezoneChangesWhilePageRemainsOpen | 同一頁面開啟期間改變時區，日期與時間同步變更 |
| RemainsReadableAndCentered | 四種桌面／手機尺寸無水平溢出、日期與時間不重疊、時間置中 |

測試執行真實 Razor 頁面與 JavaScript，沒有以 C# 重寫時間邏輯。時間邊界使用 Playwright 時鐘控制，避免依賴執行當下日期。實體裝置鎖定／休眠與手機瀏覽器仍需人工驗收；原有 `scripts/verify-clock.cjs` 另保留真實計時 11 秒的檢查。

本次為既有功能補回歸測試，沒有先前確認的缺陷，因此沒有宣稱修復前失敗、修復後通過的 TDD 證據。

參考：[xUnit v3](https://xunit.net/docs/getting-started/v3/getting-started)、[WebApplicationFactory.UseKestrel](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.testing.webapplicationfactory-1.usekestrel?view=aspnetcore-10.0)、[Playwright 時鐘控制](https://playwright.dev/dotnet/docs/clock)。
