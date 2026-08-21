# Screenshots / 截圖

Put **de-identified** UI screenshots here and reference them from the top-level README.
放**去識別化**的 UI 截圖，並在頂層 README 引用。

## Golden rule / 鐵則

**Never publish a screenshot containing real requirement content or anything that identifies
the employer.** When in doubt, blur it or use the demo. 有真實需求內容或任何可辨識雇主的東西，
一律不要公開；不確定就打碼，或直接用 demo 截圖。

## What must NOT appear / 絕不能出現

- Employer name / logo / department name / internal URLs
- Real spec text, real product/module names, real screenshots-inside-screenshots
- Usernames, employee IDs, avatars, email addresses
- Any endpoint, host, token, or "powered by <internal service>" string
- Browser tabs/bookmarks/title bars that leak the above

雇主名／logo／部門／內部網址、真實規格文字、真實產品或模組名、使用者名／員編／頭像／email、
任何端點/host/token、以及會洩漏上述資訊的分頁/書籤/標題列。


## Suggested shots (filenames the README expects) / 建議截圖（README 預期檔名）

| Filename | Shows |
|----------|-------|
| `01-wizard-overview.png` | The 6-step wizard / overall layout |
| `02-review-gate.png` | The human review gate — editable transcription + confidence |
| `03-triage-table.png` | Triage data-table with reason badges (discrepancy / low-conf / duplicate) + Excel/JSON export |
| `04-rtm-coverage.png` | RTM / coverage view (requirement ↔ cases) |

Add each with a one-line caption in the README. Keep widths ~720px for GitHub rendering.
每張在 README 配一句說明；寬度約 720px 最適合 GitHub 呈現。

## Redaction checklist / 打碼檢查清單

- [ ] No employer name/logo anywhere (including favicons, watermarks)
- [ ] No real requirement or product text
- [ ] No usernames / IDs / emails / avatars
- [ ] No internal hostnames, endpoints, or tokens
- [ ] Browser chrome (URL bar, tabs, bookmarks) cropped out
- [ ] Checked at 100% zoom — nothing readable slipped through
