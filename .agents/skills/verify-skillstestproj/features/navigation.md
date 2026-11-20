# 首頁與返回導覽

首頁呈現 Welcome 及時鐘入口，使用者可返回並再次進入時鐘。

## Sub-features

- `home-visible`：首頁標題及時鐘入口。
- `home-back`：瀏覽器 Back 返回，再次開啟 Clock。
- `home-nav`：導覽列 Home 返回首頁。
- `home-brand`：直接開啟 Clock 後，網站名稱返回首頁。

## How to get to it (user POV)

- 開啟 `/`。
- 從 Clock 使用 Back、Home 或 SkillsTestProj 網站名稱。

## Driving it with verify-skillstestproj

Preconditions: skill 的依賴可用；run 自動啟動獨立 instance 並通過 doctor；不需資料。

- **首頁及 Clock。** 執行 `python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature navigation`；`home-before.png` 有 Welcome，點「現在時間」後看到時鐘。
- **返回。** 同一次 journey 依序 Back、再次進入、Home、直接 `/Clock`、網站名稱；每個返回路徑應為 `/`，查看 `journey.json`、`trace.zip`。
- **結果與副作用。** `final.png`、`final-aria.txt` 為首頁，storage 前後相同，無下載、非 GET 或對外請求。

## Gotchas

- Clock 是首頁內容入口，不是全站導覽列項目。
- 此選項不跑完整時間邊界／四尺寸 suite；需要時使用 clock 或 all。
