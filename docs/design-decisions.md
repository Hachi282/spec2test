# Design decisions / 設計取捨

De-identified. Each entry is a real decision from the project, framed as *problem → options
→ choice → why*. 去識別化；每則都是專案裡的真實決策，以「問題→選項→抉擇→理由」呈現。

---

## 1. Human review gate *before* generation / 生成前的人工審查關卡

**Problem.** Spec text lives inside blurry images. A vision LLM will always return *something*
— including confident-sounding text it never actually read. Fabricated requirements produce
fabricated test coverage that looks real.

**Options.**
- (a) Transcribe and generate in one pass; flag low confidence after the fact.
- (b) Transcribe → **hard human gate** → generate only from approved text.

**Choice: (b).** Generation consumes *only* human-approved text; the raw image is never
forwarded. No approved text → no case.

**Why.** In a QA tool, a false "this is tested" is worse than a visible gap. Making the human
the source of truth for anything the model wasn't sure about converts silent hallucination
risk into an explicit, cheap review action. The confidence signal focuses that review.

**取捨。** 圖片模糊時 Vision LLM 總會「讀」出東西（包括其實沒讀到、卻講得很篤定的字），捏造的
需求會產生看似真實的假覆蓋率。選擇「先判讀 → **硬性人審** → 只用人核過的文字生成、原圖不下傳」。
理由：QA 工具裡「假的已測」比「看得見的缺口」更危險；把模型不確定的東西交給人當真相來源，等於
把默默幻覺的風險換成明確又便宜的審查動作，而信心值把注意力導到最該看的地方。

---

## 2. UI-decoupled core pipeline / UI 解耦的核心管線

**Problem.** The first version was a quick script-driven UI. A richer SPA was needed, but the
business logic (reading, chunking, generation, dedup, RTM, export) shouldn't be held hostage
by a UI framework choice.

**Choice.** Keep the core pipeline as a **framework-agnostic library**; put a thin HTTP
boundary (FastAPI) in front; let the SPA talk only to that boundary.

**Why.** The UI was later rewritten wholesale (script-UI → Vue SPA) **without touching the
core** — the core stayed byte-for-byte identical and its tests kept passing. Decoupling paid
for itself the moment the framework changed.

**取捨。** 商業邏輯不該被 UI 框架綁架 → 核心維持成**框架無關的函式庫**、前面加薄 HTTP 邊界、
前端只跟邊界對話。理由：後來 UI 整包重寫（腳本式 UI → Vue SPA）時**完全沒動核心**，核心保持
byte 相同、測試照過——框架一換，解耦立刻回本。

---

## 3. Two-phase RTM with an explicit freeze / 兩段式 RTM 與明確凍結

**Problem.** If cases link to requirement items whose numbering keeps shifting during editing,
traceability breaks and coverage can't be computed.

**Choice.** Split into *edit items* → **freeze (stable IDs)** → *generate cases bound to
frozen IDs*. The freeze is an explicit contract boundary.

**Why.** Local renumbering is convenient while editing but toxic as an identity. A freeze
step draws a clean line: before it, IDs are fluid; after it, they're a contract that cases and
the coverage view can rely on.

**取捨。** 邊編邊變的編號當身分會讓追溯崩掉 → 拆成「編項目 → **凍結（穩定 ID）** → 綁凍結 ID
生成」。理由：本地重編號在編輯時方便、當身分時有毒；凍結畫出乾淨的界線，之後 ID 就是案例與覆蓋
檢視可依賴的契約。

---

## 4. Schema-versioned output contract / Schema 版本化輸出契約

**Problem.** Downstream automation wants to consume the JSON output, but an evolving shape
would silently break consumers.

**Choice.** Ship a `SCHEMA_VERSION` plus a published JSON Schema; bump the version only on
shape-breaking changes, keep it stable for behavior-only changes.

**Why.** A stable, versioned shape means downstream automation *can* build on the output
without coordinating on every internal tweak. Concretely, it turns "did the output shape
change?" from a guessing game into a diffable, testable fact.

**取捨。** 下游要吃 JSON、但格式漂移會默默弄壞消費者 → 提供 `SCHEMA_VERSION` 與公開 JSON Schema；
只有「破壞格式」才升版，純行為變更維持不動。理由：穩定且版本化的輸出結構，讓下游自動化**得以**
在上面對接、不必為每次內部調整而協調；更實在的是，它把「格式變了嗎」從猜謎變成可 diff、可測的事實。

---

## 5. Near-duplicate detection as a *signal*, not an auto-delete / 近似重複當「訊號」而非自動刪

**Problem.** The same requirement described at both overview and detail level yields
overlapping cases. Auto-deleting risks losing a genuinely distinct case.

**Choice.** Detect suspected duplicates locally and surface them as a **triage badge** that
routes the case to human review — don't delete automatically.

**Why.** Duplication here is *source-based* (overview ↔ detail), not a clean textual match.
The safe move is to make the overlap visible and let a human decide, rather than have an
algorithm quietly drop coverage.

**取捨。** 同一需求在「總覽」與「細節」都描述會產生重疊案例；自動刪有刪掉真正相異案例的風險 →
本地偵測疑似重複、以**分流徽章**導入人審，不自動刪。理由：這裡的重複是 source-based（總覽↔細節）
而非乾淨的文字比對，安全做法是讓重疊「被看見」交由人判斷，而非讓演算法默默砍掉覆蓋率。

---

## 6. Whitelist persistence / 白名單式持久化

**Problem.** It's tempting to just dump the whole request into the database for
"debuggability."

**Choice.** Persist a curated **whitelist**: run metadata, generated cases, and human-reviewed
text in the main document; **review images go out-of-line to GridFS, referenced by pointer**.
Never the original full spec text, prompt content, or secrets.

**Why.** Storing less by default is a feature: smaller footprint, no accidental secret
leakage, a clear privacy boundary. Images are the deliberate exception — the review step
needs them to reload a run for editing — so they're kept out-of-line (pointer in the
document, bytes in GridFS, with size/count caps) instead of embedded as inline blobs.

**取捨。** 為了「好除錯」把整包請求塞進 DB 很誘人 → 只存**精選白名單**：主文件放 run metadata、
產出案例、人核過文字；**判讀圖以指標外置存於 GridFS**；絕不存原始 SRS 全文、prompt 內容、密鑰。
理由：預設少存就是功能——體積小、不會誤漏密鑰、隱私界線清楚。圖片是**刻意例外**：審查步驟要靠它把
紀錄載回來編輯，所以採「主文件存指標、bytes 進 GridFS（並設大小／張數上限）」的方式外置，而非內嵌 blob。

---

## 7. IndexedDB for draft image bytes / 用 IndexedDB 存草稿圖片

**Problem.** Draft autosave used localStorage (~5 MB per origin). A document with ~80 images
blew the quota; the fallback silently stripped image bytes, so a refresh lost all images.

**Choice.** Split storage: **localStorage** keeps a light text/metadata snapshot (always
fits, synchronous); **IndexedDB** keeps image bytes (hundreds of MB quota), written only when
the image set actually changes.

**Why.** localStorage is the wrong tool for multi-MB blobs. IndexedDB matches the data
(large, binary-ish) and the access pattern (write-rarely, read-on-restore). A cheap
fingerprint (count + per-image length) avoids rewriting 80 images on every keystroke.

**取捨。** 草稿用 localStorage（每來源約 5MB），80 張圖爆 quota、fallback 默默剝掉圖 bytes，
重整後圖全沒 → 拆兩層：**localStorage** 存輕量文字/metadata 快照（同步、必塞得下）、**IndexedDB**
存圖 bytes（額度數百 MB），只在圖組真的變動時才寫。理由：localStorage 本就不該裝數 MB blob；
IndexedDB 才符合資料型態（大、近二進位）與存取樣態（少寫、還原時讀）；用便宜的指紋（張數＋各張
長度）避免每次打字重寫 80 張。詳見 [`challenges.md`](challenges.md)。
