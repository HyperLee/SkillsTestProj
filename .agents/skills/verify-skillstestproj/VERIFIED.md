# 驗證基線

2026-11-20 在此 Windows checkout 執行：

```powershell
python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature all
```

最終證據目錄：`C:\Users\A6005\AppData\Local\Temp\SkillsTestProj-verify-ko4q_25q`。
先前首跑證據亦保留：`C:\Users\A6005\AppData\Local\Temp\SkillsTestProj-verify-r58bkjmx`。

- 網站建置成功：0 warnings、0 errors，目標 net10.0；本機 SDK 11.0.100、Python 3.14.4、Node v25.9.0、Edge headless。
- 自有 Kestrel PID 與 listener 通過 doctor，首頁與 Clock 均為 HTTP 200。
- all journey 成功：首頁進 Clock、真實秒數更新、Back、再次進入、Home、網站名稱、Privacy 導覽列／頁尾／直接網址。
- 既有時鐘 verifier：`PASS: 32 browser checks`，含時間邊界、時區、恢復事件、版面與真實計時。
- 補充 journey 的 cookies、localStorage、sessionStorage 前後相同；無下載、非 GET／對外請求、JS 錯誤或失敗 response。
- 結束後 server 已停止，結果與 trace、截圖、文字證據保留。server exit code 1 是 Windows 主動 terminate 的結果，不是 browser test 失敗。

這是本機真實 Razor/JS 功能驗證，不是正式部署或手機驗收。瀏覽器時區／時間控制只作用於測試 context；未更動 OS 設定。查詢、儲存、匯出尚未實作，明列於 result 的 unimplemented，未宣稱通過。證據目錄為本機產物，不會隨 Git checkout 移轉；日後需重新執行產生自己的證據。
