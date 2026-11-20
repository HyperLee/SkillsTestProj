# 時鐘驗證

先以專案既有 Development 設定啟動網站：

```powershell
dotnet run --urls http://127.0.0.1:5138
```

在另一個 PowerShell 視窗準備測試工具並執行（需要已安裝 Microsoft Edge）：

```powershell
$clockTools = Join-Path $env:TEMP 'SkillsTestProj-clock-verification'
npm install --prefix $clockTools playwright
$env:NODE_PATH = Join-Path $clockTools 'node_modules'
node scripts/verify-clock.cjs http://127.0.0.1:5138 (Join-Path $clockTools 'screenshots')
```

腳本透過實際瀏覽器檢查首頁導覽、格式、模擬時間連續更新、分鐘／小時進位、跨日／月底／年底／閏年、時間向前及向後跳動、執行期間切換時區、恢復事件與四種畫面尺寸，另以真實計時停留 11 秒比對裝置時間。截圖與工具保留於上述暫存目錄。

背景恢復使用 visibilitychange、focus、pageshow 事件驗證；實體裝置鎖定、休眠及手機瀏覽器仍須人工驗收。腳本不會修改作業系統時間或時區。
