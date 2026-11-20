# SkillsTestProj feature map

目前可見功能與實際路由以 `Pages/`、`Program.cs`、`wwwroot/js/clock.js` 為依據。先在專案根目錄執行 skill 的 `run`，它會建立獨立站台、doctor 及全新 Edge context。無需登入、DB 或種子資料。

| Feature | 入口 | 命令選項 |
| --- | --- | --- |
| [時鐘](clock.md) | 首頁「現在時間」、直接 `/Clock` | `--feature clock` |
| [首頁及返回導覽](navigation.md) | `/`、瀏覽器 Back、Home、網站名稱 | `--feature navigation` |
| [Privacy](privacy.md) | 導覽列、頁尾、直接 `/Privacy` | `--feature privacy` |

共同命令前綴：`python .agents/skills/verify-skillstestproj/scripts/verify.py run`。`--feature all` 執行全部三項。每次有不同 evidence 目錄，不以另一入口成功替代未測入口。時鐘格式與更新的深入檢查在 clock/all；navigation 的直接 Clock 開啟只驗證導覽返回。

## 優先需求缺口

查詢、儲存、匯出目前沒有頁面、handler、資料儲存或下載操作可驗證。三者是 **尚未實作／不可執行**，並非測試通過或已由 Clock 覆蓋。將來有真實入口後補對應 feature file、種子資料、空結果／失敗案例、持久化前後比對、匯出內容查核；不得建立虛構的旅程或增加產品功能來讓本次驗證過關。

## 證據規則

每次先 doctor，再以真實畫面操作；動作及結果由 trace、journey、截圖和 ARIA 保留。無預期 browser storage 寫入、下載、外部或非 GET HTTP 流量。這只覆蓋瀏覽器副作用，不聲稱全域磁碟或 DB 零寫入。證據保留到 finally 清理後，`result.json` 明列選取 feature、結果及 server 停止狀態。
