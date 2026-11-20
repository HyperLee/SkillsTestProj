# SkillsTestProj

SkillsTestProj 是 ASP.NET Core Razor Pages 網站，目前提供「現在時間」數位時鐘頁面。你可以從首頁查看裝置當地日期、24 小時制時間與時區，無須手動重新整理。

本文件以目前程式碼與設定為依據，供第一次接觸專案的開發者查閱。專案名稱以外的業務背景與正式部署環境，無法從目前檔案確認。

## 已實作功能

| 頁面 | 路徑 | 目前行為 |
| --- | --- | --- |
| 首頁 | `/` | 顯示 Welcome 內容，以及主要內容上方的「現在時間」入口。 |
| 現在時間 | `/Clock` | 顯示裝置當地日期、時間、時區名稱與 UTC 偏移量。 |
| Privacy | `/Privacy` | 保留範本的隱私權政策提示文字，尚非正式政策內容。 |
| 錯誤頁 | `/Error` | 顯示錯誤訊息與可用的 Request ID。非 Development 環境使用此頁處理例外。 |

目前頁面沒有登入要求。程式碼沒有資料庫存取、資料儲存、網路校時、鬧鐘、倒數計時、碼表或手動選擇時區功能。

## 技術架構

網站專案使用 `Microsoft.NET.Sdk.Web`，目標框架為 `net10.0`，並啟用 Nullable 與 ImplicitUsings。

| 層級 | 實作 |
| --- | --- |
| 網站啟動 | `Program.cs` 註冊 Razor Pages，設定路由與 HTTP 請求處理流程。 |
| 頁面呈現 | `Pages/*.cshtml` 由 Razor Pages 產生 HTML。Clock 沒有獨立的 `Clock.cshtml.cs`。 |
| 共用版型 | `_Layout.cshtml` 提供導覽列、頁尾、共用資源，以及頁面專用的 `Styles` 與 `Scripts` 區段。 |
| Clock 前端 | 原生 JavaScript 讀取裝置時間並更新 DOM。專用 CSS 控制日期、時間與時區位置。 |
| 共用前端資源 | 版型載入 `wwwroot/lib` 內的 Bootstrap 與 jQuery。Clock 的時間邏輯不依賴這兩個函式庫。 |
| 靜態資源 | `MapStaticAssets()` 與 `WithStaticAssets()` 對應網站資源。Clock 的 CSS 與 JavaScript 使用 `asp-append-version`。 |
| 測試 | 獨立的 .NET 10 測試專案使用 xUnit v3、WebApplicationFactory 與 Microsoft.Playwright。 |

`Program.cs` 啟用 HTTPS 重新導向、路由與授權中介軟體。程式碼未設定登入驗證或頁面授權限制。非 Development 環境另啟用 HSTS 與 `/Error` 例外處理。

`appsettings.json` 設定記錄層級與 `AllowedHosts`。`appsettings.Development.json` 另啟用 `DetailedErrors`。這兩份設定沒有連線字串或 Clock 專用選項。

## 環境需求

| 用途 | 需求 |
| --- | --- |
| 建置及啟動網站 | 可建置 `net10.0` 的 .NET SDK。專案沒有 `global.json` 固定 SDK 版本。 |
| 使用 Clock | 支援 JavaScript、`Date`、`Intl.DateTimeFormat` 與目前 CSS 語法的瀏覽器。程式碼未宣告最低瀏覽器版本。 |
| 以 HTTPS 開發 | 可用且受瀏覽器信任的 ASP.NET Core HTTPS 開發憑證。 |
| 還原測試套件 | 可存取套件來源。測試專案的套件與版本列於其 `.csproj`。 |
| 執行瀏覽器測試 | Playwright 可啟動的瀏覽器，可使用已安裝的 Microsoft Edge 或 Playwright 配套 Chromium。 |
| 執行獨立驗證腳本 | Node.js、npm、Node.js 版 Playwright 與 Microsoft Edge。一般網站啟動不需要這些工具。 |

目前檔案未限定開發作業系統。以下啟動命令以 PowerShell 為例。

## 啟動方式

在專案根目錄執行以下命令。`--project` 明確指定網站，避免將測試專案當成啟動目標。

```powershell
dotnet restore SkillsTestProj.csproj
dotnet run --project SkillsTestProj.csproj --launch-profile http
```

`http` 設定檔使用 Development 環境，設定的首頁網址為 `http://localhost:5078`。Clock 網址為 `http://localhost:5078/Clock`。實際監聽位址以終端機的啟動輸出為準。

若要使用 HTTPS，先確認開發憑證可用，再改用 `https` 設定檔。

```powershell
dotnet dev-certs https --trust
dotnet run --project SkillsTestProj.csproj --launch-profile https
```

`https` 設定檔同時設定 `https://localhost:7172` 與 `http://localhost:5078`。HTTPS 的 Clock 網址為 `https://localhost:7172/Clock`。網站啟用 HTTPS 重新導向，HTTP 請求可能轉至 HTTPS 位址。

這些連接埠與環境名稱來自 [launchSettings.json](Properties/launchSettings.json)。目前檔案不足以確認正式環境的網域、憑證、反向代理與部署流程。

## Clock 頁面的使用方式

首頁與 Clock 的操作流程如下。

1. 開啟網站首頁。
2. 點選主要內容上方的 **現在時間**，在同一分頁進入 `/Clock`。
3. 查看左上方日期、中央時間與右下方時區資訊。
4. 點選導覽列的 **Home** 或 **SkillsTestProj**，或使用瀏覽器返回功能回到首頁。

你也可以直接開啟 `/Clock`。全站導覽列沒有獨立的 Clock 入口。

### 顯示格式與更新行為

| 項目 | 行為與範例 |
| --- | --- |
| 日期 | 西元 `yyyy/MM/dd`，月份與日期補零，例如 `2026/01/05`。 |
| 時間 | 24 小時制 `HH:mm:ss`，例如 `09:05:03`。午夜為 `00:00:00`。 |
| 時區 | 瀏覽器提供的時區名稱與當下 UTC 偏移量，例如 `Asia/Taipei · UTC+08:00`。無時區名稱時只顯示偏移量。 |
| 初次顯示 | JavaScript 載入後立即更新。伺服器產生的時間元素原本為空。 |
| 持續更新 | `setInterval` 設定每 250 毫秒重新讀取一次裝置時間，顯示精度為秒。 |
| 返回頁面 | 頁面重新可見、觸發 `pageshow` 或視窗取得焦點時，立即重新讀取時間。 |
| 停用 JavaScript | 顯示「請啟用 JavaScript 以顯示裝置當地日期與時間。」提示。 |

每次更新都以同一個 `new Date()` 取得日期與時間，不累加前次顯示值。時區名稱與 UTC 偏移量也在每次更新時重新取得。因此，時間依裝置與瀏覽器設定顯示，不固定為台灣時間。

Clock 不查詢伺服器時間，也不校正裝置時間。裝置時間不準確時，顯示值也會受影響。瀏覽器的背景分頁節流與裝置休眠可能延後計時器執行，250 毫秒是程式設定的間隔，不是所有環境下的更新保證。

### 版面與輔助資訊

日期、時間與時區的位置都以 `.clock` 內容區為準。時間使用等寬字型與 `clamp()` 調整字體大小。內容區高度使用視窗高度計算，並設定最小高度。

Clock 區段標示 `lang="zh-Hant"`，日期與時間使用 `<time>` 元素。時間元素設有 `role="timer"` 與 `aria-live="off"`。共用版型的文件語言仍為 `en`，其他範本頁面保留英文內容。

## 相關檔案

| 檔案 | 用途 |
| --- | --- |
| [Pages/Clock.cshtml](Pages/Clock.cshtml) | 定義 `/Clock`、頁面標題、顯示元素、無 JavaScript 提示與專用資源引用。 |
| [wwwroot/js/clock.js](wwwroot/js/clock.js) | 取得日期、時間與時區，格式化顯示值，註冊計時器與恢復事件。 |
| [wwwroot/css/clock.css](wwwroot/css/clock.css) | 設定時鐘內容區、日期、中央時間與時區的版面。 |
| [Pages/Index.cshtml](Pages/Index.cshtml) | 提供首頁的「現在時間」入口。 |
| [Pages/Shared/_Layout.cshtml](Pages/Shared/_Layout.cshtml) | 提供導覽列、頁尾與共用資源，載入 Clock 的頁面區段。 |
| [Pages/Shared/_Layout.cshtml.css](Pages/Shared/_Layout.cshtml.css) | 定義導覽、連結與頁尾的隔離樣式。 |
| [wwwroot/css/site.css](wwwroot/css/site.css) | 定義全站字體大小、焦點樣式與頁尾預留空間。 |
| [Pages/_ViewStart.cshtml](Pages/_ViewStart.cshtml) | 指定共用版型 `_Layout`。 |
| [Pages/_ViewImports.cshtml](Pages/_ViewImports.cshtml) | 設定 Razor 命名空間與 Tag Helpers。 |
| [Program.cs](Program.cs) | 設定服務、請求流程、靜態資源與 Razor Pages 路由。 |
| [SkillsTestProj.csproj](SkillsTestProj.csproj) | 設定網站目標框架，排除 `tests` 內檔案成為網站專案項目。 |
| [SkillsTestProj.slnx](SkillsTestProj.slnx) | 收錄網站與測試專案。 |
| [specs/spec1.md](specs/spec1.md) | 記錄時鐘需求與驗收條件，屬規格文件，不代表驗收結果。 |

## 測試與待確認事項

HTTP 整合測試檢查公開頁面與不存在路徑的回應。Clock 瀏覽器測試涵蓋導覽、格式、時間邊界、裝置時間變更、時區切換、恢復事件與不同視窗尺寸。

在專案根目錄，可用以下命令執行不需瀏覽器的 HTTP 整合測試。

```powershell
dotnet test SkillsTestProj.slnx --filter 'Category=Integration'
```

若已安裝 Microsoft Edge，可在 PowerShell 指定瀏覽器後執行全部測試。

```powershell
$env:CLOCK_TEST_BROWSER_CHANNEL = 'msedge'
dotnet test SkillsTestProj.slnx
```

完整測試設定與 Chromium 安裝方式見 [測試說明](tests/README.md)。另有 Node.js 版 [時鐘驗證腳本說明](scripts/README.md)，其腳本包含真實計時 11 秒的檢查。

本次文件整理僅檢閱程式碼與設定，未重新啟動網站或執行測試。上述覆蓋範圍描述的是現有測試內容，不表示本次已通過。實體裝置鎖定、休眠恢復與手機瀏覽器行為仍需人工驗收。最低支援瀏覽器版本與正式部署結果目前無法確認。
