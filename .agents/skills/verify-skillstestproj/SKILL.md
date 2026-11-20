---
name: verify-skillstestproj
description: Verify SkillsTestProj's real Razor Pages UI using isolated Kestrel and Edge/Playwright. Use for clock, home navigation, Privacy and browser side-effect verification; query/save/export are not implemented.
---

# SkillsTestProj 功能驗證

從專案根目錄執行以下命令。先讀 [feature map](features/README.md)，依目標選擇 `clock`、`navigation`、`privacy` 或 `all`。本 skill 驗證真實 Razor 頁面與 JavaScript，不修改產品程式。

## Launch

需求：Windows、可建置 net10.0 的 .NET SDK、Python 3.9+、Node.js、npm、Microsoft Edge、Node.js Playwright。使用現有 `scripts/verify-clock.cjs`；不替換成 mocks 或單純 HTTP 成功判斷。

首次缺少 Playwright 時，在 PowerShell 執行專案既有安裝方式（保留工具目錄）：

```powershell
$clockTools = Join-Path $env:TEMP 'SkillsTestProj-clock-verification'
npm install --prefix $clockTools playwright
$env:NODE_PATH = Join-Path $clockTools 'node_modules'
```

開始一次完整驗證：

```powershell
python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature all
```

執行器會建置 `SkillsTestProj.csproj`，以 `dotnet bin/Debug/net10.0/SkillsTestProj.dll --urls http://127.0.0.1:0` 啟動自己的程序，工作目錄為專案根目錄，環境為 Development。作業系統分配獨立連接埠；實際 URL/PID 記錄在輸出的 `instance.json`。不使用使用者既有的 5078/7172 站台。就緒條件為自己的 PID 持有 listener，首頁有「現在時間」，`/Clock` 有真實時鐘元素，且均回傳 200。

無資料庫、登入、migration 或業務種子資料，也沒有應用程式資料目錄。空白 evidence 目錄和全新非持久化瀏覽器 context 就是測試起點。只保留 .NET 開發環境預設行為，例如框架可能在使用者設定檔建立 Data Protection key；不宣稱整個 OS 零寫入。建置會更新 bin/obj。不要同時建置或修改同一 checkout；需要平行驗證時使用各自 checkout 及 evidence 目錄。

## Doctor

`run` 每次啟動後自動執行唯讀 doctor，寫入 `doctor.json`：比對 DLL SHA-256、確認 netstat listener PID、GET 首頁與 Clock。失敗時不繼續操作。若要對仍存活的本次 instance 重新診斷，使用該次輸出的絕對 evidence 路徑：

```powershell
python .agents/skills/verify-skillstestproj/scripts/verify.py doctor --evidence $verificationEvidence
```

`$verificationEvidence` 必須指向本次實際路徑；不要猜測或重用舊 run。正常 `run` 會在結束前停止 instance，所以完成後 doctor 應失敗，不是重啟命令。操作異常時，本執行器直接失敗並清理；重新 `run` 建立新的 instance、健康檢查與瀏覽器狀態。

## Drive

```powershell
python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature clock
python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature navigation
python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature privacy
```

`drive.cjs` 使用真正首頁連結「現在時間」、`nav` 的 Home／SkillsTestProj、nav/footer 的 Privacy，以及 Clock 的 `#clock-date`、`#clock-time`、`#clock-timezone`。不直接呼叫內部 updateClock。`clock`/`all` 隨後執行原有 `scripts/verify-clock.cjs`，涵蓋時間控制、時區、恢復事件、四種尺寸與真實計時 11 秒。瀏覽器模擬不更動作業系統時間／時區。

## Evidence

每次輸出獨立 `%TEMP%/SkillsTestProj-verify-*` 目錄；也可用 `--evidence` 指定全新目錄。失敗回傳非零，不把未執行項目算通過。`result.json` 的 `unimplemented` 固定列出 query/save/export；`outcome=passed` 僅表示本次選取的既有 feature 通過。

- `instance.json`：URL、PID、DLL hash、Git HEAD/status 與主要來源 hash，涵蓋未提交狀態。
- `build.txt`、`tools.txt`、`server.txt`、`doctor.json`：啟動與健康證據。
- `journey.json`、`trace.zip`：有名稱與時間的動作、實際 request、response 錯誤、JS 錯誤、下載，以及 Playwright 操作前後快照。
- `home-before.png`、`clock-after.png`（Clock journey）、`final.png`、ARIA snapshots：畫面與可讀狀態。
- `storage.json`：比較 cookies、localStorage、sessionStorage 前後；另斷言無下載、無非 GET 請求、無對外請求。
- `existing-clock.txt`、`clock/*.png`：原有時鐘驗證輸出與四種尺寸截圖，限 clock/all。
- `result.json`：本次結果、錯誤及 server 停止狀態。

檢查副作用的範圍是上述 browser storage、下載、HTTP 流量；程式碼目前沒有業務儲存。這不是檔案系統全域監控或 DB 驗證。未來新增儲存時，先補真實資料的前後唯讀查核、隔離與種子資料，才可宣稱驗證了儲存；新增匯出時需檢查檔案內容與筆數。不得以沒有這些功能推論它們已通過。

## Cleanup

瀏覽器 helper 用 `finally` 關閉本次 browser，執行器用 `finally` 停止自己直接啟動的 dotnet PID，等待退出後寫入結果；不依程序名稱終止。所有證據及工具保留，不遞迴刪除或批次 unlink。

正常結束後確認 `result.json` 中 `server_stopped=true`，且證據仍存在。若整個 Python 被強制終止，不能保證 finally 執行：使用該 run 的 instance PID、URL、DLL 路徑與程序開始時間確認身分後，僅停止該程序；不得僅憑歷史 PID 終止。保留目錄交由使用者手動清理。

Windows 的 `terminate()` 主動停止程序可回傳 exit code 1；應以 browser 命令是否成功及 `server_stopped` 判斷此次結果。HTTP-only Development instance 可能記錄 `Failed to determine the https port for redirect`，因為未提供 HTTPS listener；此流程未驗證 TLS／正式環境重新導向。

## Helpers

- `scripts/verify.py run`：建置、啟動、doctor、drive、既有 Clock verifier、清理與結果。
- `scripts/verify.py doctor --evidence`：唯讀檢查尚存活的本次 instance。
- `scripts/drive.cjs`：由執行器傳入實際 URL、evidence 絕對路徑及 feature；所有公開使用方式如上。

瀏覽器缺少／依賴安裝失敗／頁面不可操作皆為阻礙，不降級為僅檢查編譯成功。實體裝置休眠、真實手機瀏覽器及正式部署尚須另外驗證。功能變更後使用 `$maintain-verification-skill` 維護本 skill 與 feature map。

已執行的基線與證據位置見 [VERIFIED.md](VERIFIED.md)。
