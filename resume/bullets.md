# Résumé bullets / 履歷條列句

The content below is ready to copy and paste into a résumé. All details have been de-identified, with no employer name, API endpoints, or proprietary information.

Choose the version that best fits the available space on your résumé.

以下內容可直接貼到履歷中。所有資訊皆已去識別化，不包含雇主名稱、API 端點或專有細節。

你可以依照履歷篇幅，選擇一句話版、精簡三條版或詳細成就版。

---

## One-liner / 一句話版

**EN**

Built an end-to-end Vision LLM application with Vue 3, FastAPI, and MongoDB that converts requirement documents into structured, review-ready acceptance test cases, using a mandatory human review gate to prevent uncertain AI output from becoming fabricated test coverage.

**中**

使用 Vue 3、FastAPI 與 MongoDB 打造端到端 Vision LLM 工具，將需求文件轉換成結構化、可審閱的驗收測試案例，並透過必要的人工審查關卡，避免不確定的 AI 輸出變成錯誤的測試覆蓋。

---

## Short: 3 bullets / 精簡三條版

### EN

- Designed and built a Vision LLM pipeline that transcribes specification text from low-quality images, generates standards-aligned acceptance test cases, and exports results to Excel and structured JSON for downstream automation.
- Architected a mandatory **human-in-the-loop review gate** so test-case generation uses only human-approved text and never receives raw images, turning silent hallucination risk into a clear review step.
- Built the Vue 3 and PrimeVue SPA end to end, including a six-step wizard, editable review workflow, risk-triage table with reason badges, requirements traceability matrix, and near-duplicate detection.

### 中

- 設計並實作 Vision LLM 管線，判讀低品質圖片中的規格文字、生成符合規範的驗收測試案例，並匯出 Excel 與結構化 JSON，供下游自動化流程使用。
- 設計必要的**人工審查關卡**，讓案例生成只使用人工確認過的文字，且不直接接收原始圖片，將模型可能默默產生錯誤內容的風險，轉換成明確的審查步驟。
- 端到端打造 Vue 3 與 PrimeVue SPA，包含六步驟精靈、可編輯的審查流程、含原因標籤的風險分流表、需求追溯矩陣（RTM）與近似重複偵測。

---

## Detailed: achievement-oriented / 詳細成就版

### EN

- **Designed trustworthy AI output at the architecture level:** built a mandatory human-in-the-loop review gate where a Vision LLM transcribes specification text from images with confidence signals, while test-case generation runs only on human-approved text and never receives raw images, preventing uncertain transcription from becoming fabricated coverage.
- **Owned the full-stack implementation:** developed a Vue 3, PrimeVue, and Vite SPA with a six-step wizard, editable review gate, risk-triage table with reason badges, and coverage view; connected it through a thin FastAPI HTTP layer to a UI-independent Python pipeline covering read, chunk, generate, deduplicate, RTM, and export.
- **Built reliable requirements traceability:** designed a two-phase RTM workflow—edit requirement items, freeze them with stable IDs, then generate test cases linked to those IDs—making coverage measurable for each requirement.
- **Improved data safety and system resilience:** implemented whitelist-based MongoDB persistence, stored review images separately in GridFS by reference, and excluded prompts, secrets, and original full specification text; removed idle database connection delays through connection-pool keepalive; migrated large draft image data from `localStorage` to `IndexedDB`, allowing drafts with around 80 images to survive page refreshes.
- **Made large-document generation recoverable:** designed structure-aware chunking based on character count, requirement density, image budget, and requirement boundaries; added **automatic truncation recovery** that detects incomplete model output, splits the affected chunk further, and regenerates it instead of silently dropping test cases.
- **Maintained correctness under concurrency and load:** isolated per-request usage counters with context-local storage to prevent cross-request data leakage; replaced a fixed request deadline with **streaming progress and an idle timeout**, allowing healthy long-running jobs to finish while failing stuck jobs quickly; added global concurrency and upload limits for traffic protection.
- **Built a strong regression safety net:** authored more than 100 `pytest` cases covering document reading, structure-aware chunking, image transcription, human-review boundaries, output contracts, and anti-fabrication guarantees; also performed a **line-by-line audit** that identified silent failure paths such as swallowed errors and plausible but incorrect fallback values.

### 中

- **從架構層級建立可信的 AI 輸出：** 設計必要的人工審查關卡，由 Vision LLM 判讀圖片中的規格文字並提供信心值；案例生成只使用人工確認過的文字，且不直接接收原始圖片，避免不確定的轉錄內容進一步變成錯誤的測試覆蓋。
- **端到端負責全端實作：** 使用 Vue 3、PrimeVue 與 Vite 打造 SPA，包含六步驟精靈、可編輯的審查關卡、含原因標籤的風險分流表與覆蓋檢視；並透過輕量 FastAPI HTTP 層，串接與 UI 解耦的 Python 核心管線，涵蓋讀取、切分、生成、重複偵測、RTM 與匯出。
- **建立可靠的需求追溯流程：** 設計兩階段 RTM 流程，先編輯需求項目，再以穩定 ID 凍結，最後生成綁定這些 ID 的測試案例，讓每項需求的覆蓋情況都能被追蹤與計算。
- **提升資料安全與系統韌性：** 實作 MongoDB 白名單式持久化，將審查圖片以參照方式另外存放於 GridFS，並排除 Prompt、密鑰與原始規格全文；透過連線池 keepalive 解決資料庫閒置連線造成的延遲；將大型草稿圖片資料從 `localStorage` 遷移至 `IndexedDB`，讓約 80 張圖片的草稿在重新整理後仍能完整保留。
- **讓大型文件生成具備自動復原能力：** 根據文字量、需求密度、圖片預算與自然需求邊界設計結構式切分；加入**輸出截斷自動復原**，偵測到不完整回應時會進一步切分並重新生成，而不是默默遺失測試案例。
- **確保並行與流量下的正確性：** 使用 context-local storage 隔離每個請求的用量計數，避免並行請求互相污染；以**進度串流與閒置逾時**取代固定請求總時限，讓正常的長工作完成、卡住的工作快速失敗；並加入全域並行上限與上傳限制，提升流量下的穩定性。
- **建立完整的回歸保護網：** 撰寫超過 100 個 `pytest` 測試案例，涵蓋文件讀取、結構式切分、圖片轉錄、人工審查邊界、輸出契約與防捏造保證；另進行**逐行程式碼審查**，找出吞掉錯誤、回傳看似合理但實際錯誤值等無聲失敗路徑。

---

## Skills tags / 技能標籤

### Frontend / 前端

`Vue 3` `PrimeVue` `Vite` `JavaScript` `IndexedDB`

### Backend and data / 後端與資料

`Python` `FastAPI` `MongoDB` `GridFS` `REST API`

### AI and system design / AI 與系統設計

`Vision LLM` `Prompt Engineering` `Human-in-the-loop` `System Design` `Requirements Traceability`

### Reliability and quality / 穩定性與品質

`SSE` `Streaming` `Concurrency` `Idle Timeout` `Schema Versioning` `pytest`

