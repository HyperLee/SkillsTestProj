# Privacy 範本頁

使用者可從導覽列、頁尾或直接網址閱讀目前保留的 Privacy 範本文字。

## Sub-features

- `privacy-nav`：導覽列入口。
- `privacy-footer`：頁尾入口。
- `privacy-direct`：直接網址。

## How to get to it (user POV)

- 全站導覽列 Privacy。
- 頁尾 Privacy。
- 直接 `/Privacy`。

## Driving it with verify-skillstestproj

Preconditions: skill 依賴可用，run 的 doctor 已通過；公開頁面不需權限或資料。

- **兩個連結。** 執行 `python .agents/skills/verify-skillstestproj/scripts/verify.py run --feature privacy`；helper 分別點擊 nav/footer 的 Privacy，URL 應為 `/Privacy`，顯示 Privacy Policy 標題及 `Use this page to detail your site's privacy policy.`。
- **直接網址。** 同一次 journey 再開 `/Privacy`，應看到相同標題。
- **證據及副作用。** `final.png`、`final-aria.txt`、`trace.zip`、`journey.json` 保留每個入口及結果；`storage.json` 相同，無下載與資料變更 HTTP 請求。

## Gotchas

- 此頁只有範本內容，通過驗證不表示已具備正式隱私權政策。
- 沒有同意儲存或匯出功能；不要虛構相關按鈕／handler。
