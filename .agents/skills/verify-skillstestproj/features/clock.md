# 現在時間

使用者從首頁開啟時鐘，查看裝置日期、24 小時制時間與當地時區，時間持續更新。

## Sub-features

- `clock-home-entry`：首頁「現在時間」在原分頁開啟。
- `clock-display`：日期、時間、時區與秒數更新。
- `clock-boundaries`：分鐘、小時、跨日、月底、年底、閏年及時間前後跳動。
- `clock-resume-zone`：切換時區及恢復事件後更新。
- `clock-layout-live`：四種尺寸與真實計時 11 秒。

## How to get to it (user POV)

- `/` 主要內容中的「現在時間」。
- 直接開啟 `/Clock`。

## Driving it with verify-skillstestproj

Preconditions: Windows、Edge、Node Playwright、.NET 10、Python；從專案根目錄執行；無登入或資料前置條件。

- **首頁入口。** 執行 `python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature clock`；helper 點擊「現在時間」，應到 `/Clock`、只存在一個分頁。
- **可見結果。** 日期 `yyyy/MM/dd`、時間 `HH:mm:ss`、模擬瀏覽器時區 `Asia/Taipei · UTC+08:00`，真實秒數前進。查看 `clock-after.png`、`clock-aria.txt`、`trace.zip`。
- **深入與直接入口。** 同一命令接著執行既有 `scripts/verify-clock.cjs`，包含直接 `/Clock` 的真實計時、邊界、時區、恢復事件及四尺寸；`existing-clock.txt` 必須為 PASS，`clock/` 保留四張截圖。
- **副作用。** `storage.json` 前後相同，`journey.json` 無下載、JS/網路錯誤、非 GET 或外部請求。

## Gotchas

- 時鐘顯示裝置時間，沒有查詢伺服器或網路校時。
- 邊界／恢復採 Playwright 控制或事件派送，不能代替實體裝置休眠驗收。
- 深入原有腳本使用獨立 context；副作用記錄覆蓋補充 helper 的 journey，不延伸宣稱原有腳本全部操作皆有 storage/network 監控。
- 無查詢、儲存或匯出入口；資料操作無法在這個功能中驗證。
