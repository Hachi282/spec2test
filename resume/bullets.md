# Résumé bullets / 履歷條列句

Copy-paste ready. De-identified — no employer name, endpoints, or proprietary details.
Pick the variant that fits your résumé's length. 可直接貼上；去識別化，無雇主名／端點／專有細節。

---

## One-liner / 一句話版

**EN** — Built an end-to-end vision-LLM tool (Vue 3 + FastAPI + MongoDB) that turns
requirement documents into review-ready, structured acceptance test cases, with a
human-in-the-loop review gate that eliminates LLM fabrication by construction.

**中** — 打造 Vision-LLM 端到端工具（Vue 3 + FastAPI + MongoDB），把需求文件轉成可審閱的結構化
驗收測試案例，並以人工審查關卡從架構上杜絕 LLM 捏造。

---

## Short (3 bullets) / 精簡三條

**EN**
- Designed and built a vision-LLM pipeline that transcribes spec text embedded in
  low-quality images and generates standards-aligned acceptance test cases, exporting to
  Excel and structured JSON for downstream automation.
- Architected a **human-in-the-loop review gate** so generation consumes only human-approved
  text (raw images never forwarded) — turning silent hallucination risk into an explicit,
  low-cost review step.
- Owned the Vue 3 + PrimeVue SPA end-to-end: a 6-step wizard, editable review steps, a
  risk-triage data-table, requirements-traceability matrix, and near-duplicate detection.

**中**
- 設計並實作 Vision-LLM 管線：逐字判讀「印在低品質圖片裡」的規格文字，生成符合規範的驗收測試
  案例，並輸出 Excel 與結構化 JSON 供下游自動化。
- 設計**人工審查關卡**，讓生成只吃人核過的文字（原圖不下傳）——把默默幻覺的風險換成明確、低成本
  的審查步驟。
- 端到端負責 Vue 3 + PrimeVue SPA：六步精靈、可編輯審查步驟、風險分流表、需求追溯矩陣（RTM）、
  近似重複偵測。

---

## Detailed (achievement-oriented) / 詳細成就版

**EN**
- **Trustworthy AI output by design:** architected a human-in-the-loop review gate where a
  vision LLM transcribes image-embedded spec text with a confidence signal, and generation
  runs only on human-approved text — the raw image is never forwarded, making fabricated test
  coverage structurally impossible.
- **Full-stack ownership:** built a Vue 3 + PrimeVue + Vite SPA (6-step wizard, editable
  review gate, risk-triage data-table with reason badges, coverage view) over a FastAPI thin
  boundary and a UI-decoupled Python core pipeline (read → chunk → generate → dedup → RTM →
  export).
- **Two-phase requirements traceability (RTM):** items → freeze (stable IDs) → generated cases
  bound to frozen IDs, making per-requirement coverage computable.
- **Data & resilience engineering:** MongoDB persistence with a curated whitelist (images
  stored out-of-line in GridFS by pointer; no prompt content, secrets, or original spec text);
  fixed a firewall-idled-socket slowdown with pool keepalive;
  moved large draft image bytes from localStorage to IndexedDB so an 80-image draft survives
  a page refresh.
- **Quality:** authored a 100+ case pytest regression net guarding core reading/chunking/
  transcription behavior and the downstream contract, enabling refactors without silent drift.

**中**
- **可信 AI 輸出（架構層級）：** 設計人工審查關卡——Vision LLM 逐字判讀圖中規格文字並附信心值，
  生成只跑在人核過的文字上、原圖不下傳，使「假覆蓋率」在結構上不可能發生。
- **全端負責：** 於 FastAPI 薄邊界與 UI 解耦的 Python 核心管線（讀→切段→生成→去重→RTM→匯出）
  之上，打造 Vue 3 + PrimeVue + Vite SPA（六步精靈、可編輯審查關卡、含原因徽章的風險分流表、
  覆蓋檢視）。
- **兩段式需求追溯（RTM）：** 項目 → 凍結（穩定 ID）→ 綁凍結 ID 生成，使逐需求覆蓋率可計算。
- **資料與韌性工程：** MongoDB 以白名單持久化（圖以指標外置存於 GridFS；不存 prompt、密鑰、原始全文）；以連線 keepalive 修掉
  「防火牆砍閒置 socket」造成的變慢；把大型草稿圖 bytes 從 localStorage 遷到 IndexedDB，讓 80 張圖
  草稿重整後仍保留。
- **品質：** 撰寫 100+ 筆 pytest 回歸測試網，守住核心讀圖／切段／判讀行為與下游契約，讓重構不再
  默默飄移。

---

## Skills tags / 技能標籤

`Vue 3` `PrimeVue` `Vite` `JavaScript` `IndexedDB`
`Python` `FastAPI` `MongoDB` `pytest`
`LLM / prompt engineering` `Vision models` `Human-in-the-loop` `System design`
`REST API`

---

### Tips / 小提醒

- Keep quantitative claims honest — if you cite a number (time saved, case count), be ready
  to explain it in an interview. This file avoids employer-tied metrics on purpose.
- Link the GitHub repo (this portfolio) and, if you deploy it, the live demo URL.
- 面試時任何數字都要能解釋來源；本檔刻意不放與雇主綁定的量化數字。附上此作品集 repo，若部署了
  也附上 demo 網址。
