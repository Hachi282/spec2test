# Design decisions / 設計取捨

This section has been de-identified. Every entry describes a real decision made during the project using the same structure:

**Problem → options → choice → reason**

The decisions are ordered from the most fundamental to the more implementation-focused ones. Decisions that define what the tool is and why its output can be trusted come first, followed by decisions about system reliability and engineering tools.

本段內容已去識別化。每一則都是專案開發過程中的真實決策，並統一依照以下結構說明：

**問題 → 選項 → 選擇 → 理由**

這些決策依重要性排列。最前面是決定「這個工具是什麼」以及「為什麼它的輸出值得信任」的核心設計，後面則是系統穩定性與工程實作方面的選擇。

---

## 1. Human review before generation / 生成前先經過人工審查

> **This is the most important design principle in the system. Every other decision supports it.**
>
> **這是整個系統最重要的設計原則，其他決策都是為了支援它。**

### Problem / 問題

Some specification text exists only inside blurry images. Even when a Vision LLM cannot read an image clearly, it may still return text that sounds confident and reasonable.

If that incorrect text is treated as a real requirement, the system may generate test cases and coverage results from information that never existed in the original document. The final result may look complete even though its foundation is wrong.

部分規格文字只存在於模糊圖片中。即使 Vision LLM 沒有真正看清楚圖片，仍可能產生一段語氣肯定、看起來合理的文字。

如果系統把這些錯誤文字當成真實需求，就可能根據不存在的內容產生測試案例與覆蓋結果。最後的結果看似完整，實際上卻建立在錯誤資訊上。

### Options / 選項

- **Option A:** Transcribe the image and generate test cases in one step, then mark low-confidence results afterward.
- **Option B:** Transcribe first, require human approval, and generate test cases only from approved text.

- **選項 A：** 一次完成圖片轉錄與案例生成，事後再標記低信心結果。
- **選項 B：** 先轉錄圖片，再由人工確認，只使用通過審查的文字生成案例。

### Choice / 選擇

Choose **Option B**:

> Transcribe → **human review gate** → generate from approved text

The generation step receives only text that has been approved by a person. Raw images are never forwarded directly to case generation.

If no text is approved, no test case is generated.

選擇 **選項 B**：

> 圖片轉錄 → **人工審查關卡** → 使用已確認的文字生成案例

案例生成階段只會收到人工確認過的文字，不會直接取得原始圖片。

如果沒有任何文字通過審查，系統就不會產生測試案例。

### Why / 理由

In a QA tool, a visible coverage gap is safer than a false claim that something has already been tested.

The human review gate prevents uncertain model output from quietly entering the generation pipeline. Confidence scores help reviewers focus on the content most likely to be wrong.

在 QA 工具中，**清楚顯示「這裡還沒有覆蓋」比錯誤宣稱「這裡已經測過」更安全**。

人工審查關卡可以防止模型不確定的內容默默進入後續流程。信心值則能協助審查者優先檢查最可能出錯的部分。

---

## 2. Enhance blurry images, never invent pixels / 只增強模糊圖片，絕不捏造像素

### Problem / 問題

A large amount of specification text appears in low-resolution images. It is tempting to use powerful image upscaling to make the text look clearer.

However, generative super-resolution does not only enhance existing pixels. It may create missing details, including characters that were never present in the original image. This would introduce exactly the kind of fabricated information the tool is designed to prevent.

許多規格文字存在於低解析度圖片中，因此很容易讓人想使用強力的圖片放大或超解析度技術，讓文字看起來更清楚。

但生成式超解析度不只是增強原有像素，也可能自行補出不存在的細節，甚至產生原圖中根本沒有的文字。這正是本工具最需要避免的資訊捏造問題。

### Options / 選項

- **Option A:** Use generative super-resolution to reconstruct sharper-looking text.
- **Option B:** Use only non-generative enhancement, such as contrast adjustment, sharpening, and denoising. Let the Vision LLM report uncertainty through confidence scores and an explicit `in-doubt` marker.

- **選項 A：** 使用生成式超解析度，重建看起來更清晰的文字。
- **選項 B：** 只使用不會生成新內容的圖片增強，例如調整對比、銳化與去雜訊。模型若仍無法確定，就以信心值與明確的 `in-doubt` 標記表達。

### Choice / 選擇

Choose **Option B**.

Image enhancement may make existing pixels easier to read, but it must never create new details.

If the model is still unsure—for example, when reading a flowchart and the meaning of an arrow is unclear—it returns an explicit **in-doubt** marker instead of guessing. That item is then sent to the human review gate.

選擇 **選項 B**。

圖片增強只能讓既有像素更容易辨識，不能產生新的細節。

如果模型仍無法確定，例如判讀流程圖時無法確認某個箭頭的意思，就必須輸出明確的 **存疑標記**，而不是自行猜測。該項內容接著會進入人工審查關卡。

### Why / 理由

This choice follows the system's main principle: it is better to say “not sure” than to confidently return incorrect text.

Generative upscaling aims to produce a better-looking image. This tool needs a faithful image instead. The `in-doubt` marker gives the model a safe way to express uncertainty without being forced to provide a falsely precise answer.

這項選擇符合系統的核心原則：**寧可清楚表示「不確定」，也不要自信地產生錯誤內容**。

生成式超解析度追求的是「看起來更漂亮」的圖片，但本工具需要的是「忠於原始內容」的圖片。`in-doubt` 標記讓模型可以誠實表達不確定，而不是被迫給出看似精確、實際上可能錯誤的答案。

---

## 3. Structure-aware chunking instead of fixed-size splitting / 依內容結構切分，而非只看固定大小

### Problem / 問題

A specification document may be very large and contain dozens of images. Sending the entire document to the model in one request is slow, may exceed context or output limits, and can mix unrelated requirements together.

However, splitting only by character count also causes problems. It may cut a requirement in half or place too many images into one chunk.

一份規格文件可能很大，並包含數十張圖片。如果一次把整份文件傳給模型，不只處理速度慢，也可能超過內容或輸出限制，還會把彼此無關的需求混在一起。

但如果只按照固定字數切分，也可能把同一項需求從中間切開，或讓某個分段包含過多圖片。

### Options / 選項

- **Option A:** Split the document using only a fixed character limit.
- **Option B:** Split the document using several limits together:
  - Character count
  - Requirement or feature density
  - Number of images per chunk
  - Natural requirement boundaries

- **選項 A：** 只按照固定字數切分文件。
- **選項 B：** 同時考量多項限制：
  - 文字數量
  - 需求或功能的密度
  - 每個分段可包含的圖片數量
  - 自然的需求邊界

### Choice / 選擇

Choose **Option B**.

Each chunk must stay within the character, requirement-density, and image limits. At the same time, the system avoids splitting a requirement in the middle whenever possible.

選擇 **選項 B**。

每個分段都必須符合文字量、需求密度與圖片數量的限制。同時，系統會盡量沿著自然的需求邊界切分，避免把同一項需求拆成兩半。

### Why / 理由

The main issue is not only how large a chunk is, but also where it is split.

Keeping each requirement intact allows generated test cases to stay connected to complete source information. Limiting the number of images also prevents a single chunk from becoming too crowded and reducing the model's attention and accuracy.

Fixed-size splitting is easier to implement, but it produces less reliable cases. That simplicity is not worth the loss in output quality.

真正的問題不只是「每段有多大」，還包括「切在什麼位置」。

保留完整的需求內容，可以讓生成的測試案例對應到完整的來源資訊。限制每段圖片數量，也能避免單一分段內容過多，影響模型的注意力與判讀品質。

固定字數切分雖然比較容易實作，但會降低案例品質。這樣的簡化並不值得。

---

## 4. Two-phase RTM with an explicit freeze / 兩階段 RTM 與明確凍結

### Problem / 問題

Requirement items may be added, deleted, reordered, or renumbered during editing.

If test cases are linked directly to numbers that continue to change, the relationship between requirements and cases can break. Once that happens, RTM traceability and coverage calculations are no longer reliable.

需求項目在編輯期間可能會被新增、刪除、重新排序或重新編號。

如果測試案例直接綁定持續變動的編號，需求與案例之間的關聯就可能失效，RTM 追蹤與覆蓋率計算也會變得不可靠。

### Options / 選項

- **Option A:** Generate test cases while requirement items are still being edited.
- **Option B:** Finish editing first, freeze the items with stable IDs, and then generate test cases linked to those IDs.

- **選項 A：** 在需求項目仍持續編輯時就生成測試案例。
- **選項 B：** 先完成需求編輯，凍結項目並建立穩定 ID，再生成綁定這些 ID 的測試案例。

### Choice / 選擇

Choose **Option B** and divide the process into two phases:

> Edit requirement items → **freeze and assign stable IDs** → generate cases linked to frozen IDs

The freeze step is an explicit contract boundary.

選擇 **選項 B**，將流程分成兩個階段：

> 編輯需求項目 → **凍結並建立穩定 ID** → 根據凍結 ID 生成案例

「凍結」就是一條明確的契約界線。

### Why / 理由

Temporary numbering is useful while editing, but it should not be used as a permanent identity.

Before the freeze, users may freely edit and reorder requirement items. After the freeze, each ID becomes a stable reference that test cases and the RTM coverage view can safely depend on.

暫時編號在編輯時很方便，但不適合當成永久識別方式。

凍結前，使用者可以自由編輯與調整需求項目；凍結後，每個 ID 都會成為穩定的參照，讓測試案例與 RTM 覆蓋檢視能可靠地使用。

---

## 5. Schema-versioned output contract / 使用 Schema 版本管理輸出格式

### Problem / 問題

Other tools and automated processes need to read the exported JSON.

If the JSON structure changes without a clear version update, downstream systems may fail silently or read the data incorrectly.

其他工具與自動化流程需要讀取系統匯出的 JSON。

如果 JSON 結構改變，卻沒有清楚的版本更新，下游系統可能會默默失敗，或用錯誤的方式解析資料。

### Options / 選項

- **Option A:** Allow the JSON structure to change whenever the internal implementation changes.
- **Option B:** Publish a JSON Schema and use an explicit schema version to track incompatible changes.

- **選項 A：** 內部實作變更時，JSON 結構也直接跟著改變。
- **選項 B：** 提供公開的 JSON Schema，並使用明確的版本號管理不相容的格式變更。

### Choice / 選擇

Choose **Option B**:

- Include `SCHEMA_VERSION` in the output.
- Publish a JSON Schema that defines the expected structure.
- Increase the version only when the output structure becomes incompatible.
- Keep the version unchanged when only internal behavior changes.

選擇 **選項 B**：

- 在輸出中加入 `SCHEMA_VERSION`。
- 提供 JSON Schema，明確定義輸出結構。
- 只有在輸出格式出現不相容變更時才升版。
- 如果只是內部行為改變，格式版本維持不變。

### Why / 理由

A stable, versioned output format allows downstream automation to depend on the JSON without coordinating every internal change.

It also turns the question “Did the output format change?” into something that can be compared, validated, and tested instead of guessed.

穩定且有版本的輸出格式，可以讓下游自動化流程放心使用，不需要每次內部調整都重新協調。

更重要的是，「輸出格式有沒有改變」不再需要靠猜，而是可以直接比較、驗證與測試。

---

## 6. Near-duplicate detection as a signal, not an auto-delete / 將近似重複視為提示，而不是自動刪除

### Problem / 問題

The same requirement may appear in both an overview section and a detailed section. This can produce test cases that look similar but are not necessarily identical.

Automatically deleting one of them may remove a case that covers a genuinely different detail.

同一項需求可能同時出現在總覽與詳細說明中，因此系統可能產生看起來相似、實際上卻不完全相同的測試案例。

如果自動刪除其中一筆，就可能誤刪真正涵蓋不同細節的案例。

### Options / 選項

- **Option A:** Automatically delete cases that appear to be duplicates.
- **Option B:** Mark suspected duplicates and send them to human review.

- **選項 A：** 自動刪除看起來重複的案例。
- **選項 B：** 標記疑似重複的案例，再交由人工確認。

### Choice / 選擇

Choose **Option B**.

The system detects possible duplicates locally and adds a **triage badge**. The badge highlights the case for human review, but the system never deletes it automatically.

選擇 **選項 B**。

系統會在本地偵測疑似重複的案例，並加上**分流標籤**，提醒使用者進行人工確認，但不會自動刪除任何案例。

### Why / 理由

These duplicates are usually source-based: the same requirement appears at different levels, such as overview and detail. They are not always simple text duplicates.

The safer approach is to make the overlap visible and let a person decide. An algorithm should not silently remove possible test coverage.

這類重複通常與內容來源有關，例如同一需求分別出現在總覽與細節中，不一定只是單純的文字重複。

更安全的做法是把可能重疊的地方清楚標示出來，再交由人工判斷。演算法不應該默默刪除可能仍有價值的測試覆蓋。

---

## 7. Streaming with an idle timeout, not a total deadline / 使用閒置逾時，而不是固定總時限

### Problem / 問題

Generating test cases from a large document may legitimately take a long time.

A single fixed request deadline does not fit this kind of task:

- If the deadline is too short, a healthy long-running job may be stopped halfway.
- If the deadline is too long, a truly stuck job may remain unnoticed for several minutes.

大型文件的案例生成本來就可能需要較長時間。

使用單一固定總時限並不適合這類工作：

- 時限太短，正常但耗時的工作可能被中途停止。
- 時限太長，真正卡住的工作可能要過好幾分鐘才會被發現。

### Options / 選項

- **Option A:** Set one fixed deadline for the entire generation request.
- **Option B:** Stream progress to the client and use an **idle timeout**. Fail only when no progress has been received for a period of time.

- **選項 A：** 為整個生成請求設定固定總時限。
- **選項 B：** 將進度串流回前端，並使用**閒置逾時**。只有在一段時間內完全沒有收到進度時，才判定工作失敗。

### Choice / 選擇

Choose **Option B**.

The backend streams partial progress to the client. The job fails only when no progress has been reported for `N` seconds.

A long but healthy job keeps reporting progress and remains active. A truly stuck job triggers the idle timeout quickly.

選擇 **選項 B**。

後端會持續將部分進度串流回前端。只有在連續 `N` 秒都沒有任何進度時，系統才會判定工作失敗。

耗時但正常的工作會持續回報進度，因此不會被中斷；真正卡住的工作則會快速觸發閒置逾時。

### Why / 理由

The important question is not “How long has this taken?” but “Is it still making progress?”

An idle timeout can distinguish a slow job from a stuck job, while a fixed total deadline cannot. Streaming also gives users visible progress instead of showing a spinner with no explanation.

真正重要的問題不是「它跑多久了？」，而是「它還有沒有繼續前進？」。

閒置逾時可以區分「執行速度慢」與「完全卡住」，這是固定總時限做不到的。進度串流也能讓使用者看見目前狀態，而不是只能面對一個沒有任何說明的轉圈圖示。

---

## 8. UI-decoupled core pipeline / 核心流程與 UI 解耦

### Problem / 問題

The first version used a simple script-based UI. As the product grew, it needed a more complete SPA.

However, core business logic—such as document reading, chunking, generation, duplicate detection, RTM, and export—should not depend on a specific UI framework.

第一版使用簡單的腳本式 UI。隨著產品功能增加，系統需要改成更完整的 SPA。

但文件讀取、內容切分、案例生成、重複偵測、RTM 與匯出等核心邏輯，不應該依賴特定的 UI 框架。

### Options / 選項

- **Option A:** Put the business logic directly inside the UI application.
- **Option B:** Keep the business logic in an independent library and expose it through an HTTP API.

- **選項 A：** 將商業邏輯直接寫進 UI 應用程式。
- **選項 B：** 將商業邏輯保留在獨立函式庫中，再透過 HTTP API 提供給前端使用。

### Choice / 選擇

Choose **Option B**:

- Keep the core pipeline as a **framework-independent library**.
- Add a thin FastAPI HTTP boundary in front of it.
- Let the SPA communicate only with the API layer.

選擇 **選項 B**：

- 將核心流程維持為**不依賴 UI 框架的函式庫**。
- 在核心前方加入一層輕量的 FastAPI HTTP 邊界。
- SPA 前端只透過 API 層與核心功能互動。

### Why / 理由

The UI was later rewritten from a script-based interface to a Vue SPA without changing the core pipeline. The core code remained the same, and its existing tests continued to pass.

This showed the value of decoupling: replacing the frontend did not require rewriting or retesting the main business logic.

後來 UI 從腳本式介面完整改寫成 Vue SPA 時，核心流程完全不需要修改，原有測試也能繼續通過。

這證明了解耦的價值：**更換前端技術時，不需要連主要商業邏輯一起重寫**。

---

## 9. Whitelist-based persistence / 使用白名單控制持久化資料

### Problem / 問題

Saving the entire request to the database may seem convenient for debugging.

However, a request may contain unnecessary or sensitive content, including the full specification, prompts, images, API keys, or other secrets.

為了方便除錯，把整個請求存進資料庫看起來很方便。

但請求中可能包含不需要保存或具有敏感性的內容，例如完整規格文件、Prompt、圖片、API Key 或其他密鑰。

### Options / 選項

- **Option A:** Save the complete request first and remove sensitive data later.
- **Option B:** Define a whitelist and store only the fields the system actually needs.

- **選項 A：** 先保存完整請求，之後再移除敏感資料。
- **選項 B：** 建立白名單，只保存系統真正需要的欄位。

### Choice / 選擇

Choose **Option B** and persist only approved fields.

The main database document stores:

- Run metadata
- Generated test cases
- Human-reviewed text
- References to review images

Review images are stored separately in GridFS:

- The main document stores only a pointer.
- The image bytes are stored in GridFS.
- Image size and count are limited.

The system does **not** store:

- The original full specification text
- Prompt content
- API keys or other secrets

選擇 **選項 B**，只保存白名單中允許的欄位。

主要資料文件會保存：

- 執行紀錄與相關 metadata
- 生成的測試案例
- 經過人工確認的文字
- 審查圖片的參照指標

審查圖片則另外存放在 GridFS：

- 主要資料文件只保存圖片指標。
- 圖片 bytes 存放在 GridFS。
- 圖片大小與數量都有上限。

系統**不會保存**：

- 原始規格文件全文
- Prompt 內容
- API Key 或其他密鑰

### Why / 理由

Storing less data by default provides several benefits:

- Lower storage usage
- Lower risk of exposing sensitive information
- A clearer privacy boundary
- Easier control over data retention

Images are a deliberate exception because reviewers need them when reopening a previous run for editing.

Even so, images are stored outside the main document instead of being embedded as large inline blobs.

預設少存資料可以帶來幾項好處：

- 降低儲存空間用量
- 降低敏感資訊外洩的風險
- 建立更清楚的隱私界線
- 更容易管理資料保留範圍

圖片是刻意保留的例外，因為使用者重新開啟過去的執行紀錄時，仍需要查看圖片並進行審查。

即使如此，圖片仍會存放在主要資料文件之外，而不是以大型 blob 直接內嵌。

---

## 10. IndexedDB for draft image bytes / 使用 IndexedDB 保存草稿圖片

### Problem / 問題

The original autosave feature stored the entire draft in `localStorage`, which usually provides only about 5 MB of storage per origin.

A document containing around 80 images exceeded this limit. The fallback logic silently removed the image bytes, so all draft images disappeared after the page was refreshed.

原本的草稿自動儲存功能會把所有資料存進 `localStorage`，但每個來源通常只有約 5 MB 的儲存空間。

當文件包含約 80 張圖片時，資料量會超過限制。當時的備援邏輯會默默移除圖片 bytes，導致使用者重新整理頁面後，草稿中的圖片全部消失。

### Options / 選項

- **Option A:** Continue using `localStorage` and compress or remove images when storage is full.
- **Option B:** Separate lightweight draft data from large image data and store them using different browser storage tools.

- **選項 A：** 繼續使用 `localStorage`，並在容量不足時壓縮或移除圖片。
- **選項 B：** 將輕量草稿資料與大型圖片資料分開，使用不同的瀏覽器儲存工具。

### Choice / 選擇

Choose **Option B** and split draft storage into two layers:

- **`localStorage`** stores a lightweight snapshot containing text and metadata.
- **`IndexedDB`** stores the image bytes.
- Image bytes are rewritten only when the image set actually changes.

選擇 **選項 B**，將草稿儲存分成兩層：

- **`localStorage`** 保存文字與 metadata 等輕量快照。
- **`IndexedDB`** 保存圖片 bytes。
- 只有圖片集合真的發生變化時，才重新寫入圖片資料。

### Why / 理由

`localStorage` is simple and synchronous, but it is not suitable for storing multi-megabyte binary data.

`IndexedDB` supports much larger data and better matches the access pattern of draft images: images are changed infrequently and are mainly read when restoring a draft.

The system uses a lightweight fingerprint based on the image count and the length of each image to detect changes. This prevents all 80 images from being rewritten every time the user types a character.

`localStorage` 使用簡單，而且是同步操作，但不適合保存數 MB 的圖片或二進位資料。

`IndexedDB` 可以處理更大的資料量，也更符合草稿圖片的存取方式：圖片很少被修改，主要是在還原草稿時讀取。

系統會根據「圖片張數＋每張圖片的資料長度」建立輕量指紋，用來判斷圖片集合是否真的發生變化。這樣就不會在使用者每輸入一個字時，都重新寫入全部 80 張圖片。

For implementation details, see [`challenges.md`](challenges.md).

實作細節請參考 [`challenges.md`](challenges.md)。

---

## 11. Knowing when to abandon an approach / 知道何時該放棄一種做法

> **This is not a system mechanism, but an engineering judgement worth recording.**
>
> **這不是一項系統機制，而是一次值得記錄的工程判斷。**

### Problem / 問題

An early experiment tried to reduce duplicate cases by classifying each case by type and comparing results across two parallel processing tracks.

This added significant complexity to the pipeline. The important question was whether that extra complexity actually improved the results.

早期曾經嘗試依照「類型」分類每筆案例，再透過兩條平行處理流程互相比對，以減少重複案例。

這個做法讓整體管線變得複雜許多。真正需要確認的是：增加的複雜度是否真的改善了結果？

### Options / 選項

- **Option A:** Keep the two-track, type-based comparison and continue tuning it.
- **Option B:** Remove it after evidence showed that duplication was mainly source-based—such as overview versus detail—not type-based. Then invest in a simpler source-based approach.

- **選項 A：** 保留雙軌、以類型為基礎的比對方式，並持續調整。
- **選項 B：** 當證據顯示重複主要來自不同內容來源，例如總覽與細節，而不是案例類型時，就移除原本做法，改用更簡單的來源式方法。

### Choice / 選擇

Choose **Option B**.

After measurement showed that the two-track approach did not improve the result, it was **removed**.

The effort was redirected to source-based fuzzy duplicate detection, with suspected duplicates shown as a review signal instead of being deleted automatically. See [decision #6](#6-near-duplicate-detection-as-a-signal-not-an-auto-delete--將近似重複視為提示而不是自動刪除).

選擇 **選項 B**。

實際評估後，雙軌方法並沒有明顯改善結果，因此這套做法被**移除**。

開發心力改投入以來源為基礎的模糊重複偵測，並將疑似重複顯示為審查提示，而不是自動刪除。詳見[決策 #6](#6-near-duplicate-detection-as-a-signal-not-an-auto-delete--將近似重複視為提示而不是自動刪除)。

### Why / 理由

Removing code that took time to build is uncomfortable, but keeping complexity that provides no clear value is worse.

Unnecessary complexity slows future changes, increases maintenance costs, and can hide the real cause of a problem.

Measuring the experiment, accepting the negative result, and removing the approach was the correct engineering decision—not a failure. Removing the first approach also made it easier to identify the real source of duplication.

刪除花時間完成的程式碼並不容易，但保留沒有明確價值的複雜設計更糟。

不必要的複雜度會拖慢未來的修改、增加維護成本，也可能讓真正的問題原因更難被看見。

評估實驗結果、接受它沒有幫助，並移除這套做法，是正確的工程判斷，而不是失敗。也因為第一種方法被完整移除，團隊才能更清楚地找出重複案例真正的來源。
