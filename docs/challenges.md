# Engineering challenges / 工程難題

This section contains de-identified deep dives into real engineering problems that I diagnosed and fixed during the project.

All code examples are illustrative and have been rewritten for this portfolio. They do not contain proprietary source code.

The challenges are ordered from the most fundamental to the more implementation-focused ones. Problems related to output trust and generation come first, followed by backend reliability, frontend experience, and quality assurance.

本段記錄我在專案中實際遇到、分析並解決的工程難題，內容皆已去識別化。

所有程式碼都只用於說明，並已針對作品集重新撰寫，不包含任何專有原始碼。

難題依核心程度排序：最前面是影響輸出可信度與生成品質的問題，後面則是後端穩定性、前端體驗與品質保證。

---

## 1. Making the output trustworthy / 讓輸出值得信任

> **This is the most important property of the system.**
>
> **這是整個系統最重要的特性。**

### Symptom / 現象

A Vision LLM may still return text when an image is too blurry to read clearly. The output can sound confident even when some words were guessed or fabricated.

If that text is treated as a real requirement, the system may generate test cases and coverage results from information that never existed in the source document.

Vision LLM 即使看不清楚模糊圖片，也可能產生一段語氣肯定的文字，其中部分內容可能是猜測或捏造。

如果這些文字被當成真實需求，系統就可能根據原始文件中不存在的資訊生成測試案例與覆蓋結果。

### Diagnosis / 原因

The problem could not be solved simply by improving the prompt or asking the model to be more careful.

As long as uncertain model output could directly enter the generation stage, fabricated text could silently turn into fabricated test coverage.

這個問題無法只靠調整 Prompt，或要求模型「更小心」來解決。

只要模型不確定的輸出可以直接進入生成階段，捏造的文字就可能在沒有警告的情況下變成假的測試覆蓋。

### Fix / 解法

Add a mandatory **human review gate** before case generation.

The workflow becomes:

> Image transcription → **human correction and approval** → case generation

The generation stage receives only human-approved text. Raw images are never forwarded directly to it.

If no text is approved, no test case is generated.

This follows [design decision #1](design-decisions.md#1-human-review-before-generation--生成前先經過人工審查).

在案例生成前加入必要的**人工審查關卡**。

流程改為：

> 圖片轉錄 → **人工修正與確認** → 案例生成

生成階段只會收到人工確認過的文字，原始圖片不會直接傳入。

如果沒有任何文字通過審查，系統就不會生成測試案例。

詳見[設計決策 #1](design-decisions.md#1-human-review-before-generation--生成前先經過人工審查)。

### Result / 結果

Every generated case can be traced back to text that a person reviewed and approved.

The system does not depend on the model always being correct. Instead, trust is built into the workflow itself.

每一筆生成的案例，都能追溯到經過人工審查與確認的文字。

系統不需要假設模型永遠正確，而是直接把可信度建立在流程與架構中。

### Lesson / 收穫

**Trust does not come from making the model appear smarter. It comes from designing a workflow that prevents uncertain output from silently becoming fact.**

**可信度不是靠模型看起來更聰明，而是靠架構防止不確定的內容默默變成事實。**

---

## 2. Generation output cut off mid-JSON / 生成結果在 JSON 中途被截斷

### Symptom / 現象

When processing a large or information-dense chunk, the model occasionally returned incomplete JSON.

For example, the response might stop in the middle of an array. JSON parsing would then fail, causing all test cases from that chunk to be lost.

處理大型或資訊密集的分段時，模型偶爾會回傳不完整的 JSON。

例如，回應可能在陣列中間突然結束，導致 JSON 解析失敗，該分段生成的所有測試案例也會一起遺失。

### Diagnosis / 原因

The issue was not caused by an unstable model or a poorly written prompt. The response had reached the model's hard **output-length limit**.

A large chunk could contain more test cases than one response could hold. Retrying the same oversized request did not help because it repeatedly hit the same limit.

問題並不是模型不穩定，也不是 Prompt 寫得不好，而是回應碰到了模型的**輸出長度上限**。

當一個分段需要產生的案例太多時，單次回應無法完整容納。直接重試同一個過大的請求，只會再次撞到相同限制。

### Fix / 解法

Use a two-layer recovery strategy.

#### 1. Reduce the chance of truncation

Split the document before generation by considering:

- Character count
- Requirement density
- Number of images
- Natural requirement boundaries

This keeps most requests comfortably below the output limit.

See [design decision #3](design-decisions.md#3-structure-aware-chunking-instead-of-fixed-size-splitting--依內容結構切分而非只看固定大小).

#### 2. Detect and recover from truncation

After receiving a response, check whether the JSON is structurally complete.

If truncation is detected:

1. Do not discard the entire chunk.
2. Split the chunk into smaller parts.
3. Generate each smaller part again.
4. Combine the valid results.

採用兩層式的復原策略。

#### 1. 先降低被截斷的機率

生成前先根據以下條件切分文件：

- 文字數量
- 需求密度
- 圖片數量
- 自然的需求邊界

這能讓大多數請求保持在安全的輸出範圍內。

詳見[設計決策 #3](design-decisions.md#3-structure-aware-chunking-instead-of-fixed-size-splitting--依內容結構切分而非只看固定大小)。

#### 2. 偵測截斷並自動復原

收到回應後，檢查 JSON 結構是否完整。

如果發現輸出被截斷：

1. 不直接丟棄整個分段。
2. 將該分段切得更小。
3. 重新生成每個小分段。
4. 合併有效結果。

### Result / 結果

Truncation changed from a silent data-loss bug into a recoverable event.

When a request is too large, the system completes the work using more, smaller calls instead of silently losing test coverage.

輸出截斷不再是無聲的資料遺失，而是可以自動復原的事件。

當請求太大時，系統會改用更多、更小的呼叫完成工作，而不是默默失去測試覆蓋。

### Lesson / 收穫

When facing a hard output limit, retrying the same oversized request is not recovery.

The correct strategy is:

> **Detect truncation → split further → regenerate**

面對硬性的輸出限制，重試同一個過大的請求不算真正的復原。

正確的處理方式是：

> **偵測截斷 → 進一步切分 → 重新生成**

---

## 3. Duplicates that are not textual duplicates / 無法只靠文字比對找出的重複案例

### Symptom / 現象

The same requirement could appear once in an overview and again in a detailed section.

This produced test cases that covered similar ideas but used different wording. Exact text matching could not identify them as duplicates.

同一項需求可能先出現在總覽中，又在詳細說明中再次出現。

這會產生內容相近、但用字不同的測試案例，因此單純的文字完全比對無法找出這些重複。

### Diagnosis / 原因

The duplication was **source-based**, not purely text-based.

The cases overlapped because they came from different descriptions of the same requirement:

> Overview ↔ detail

Two simple approaches were both unsafe:

- Exact matching missed most of the overlap.
- Aggressive fuzzy matching risked deleting cases that covered genuinely different details.

這類重複的本質是**來源重複**，而不只是文字重複。

案例之所以重疊，是因為它們來自同一項需求的不同描述：

> 總覽 ↔ 細節

兩種簡單做法都有問題：

- 完全比對會漏掉大多數重疊案例。
- 過度積極的模糊比對，可能誤刪真正涵蓋不同細節的案例。

### Fix / 解法

Treat suspected duplicates as a **review signal**, not a deletion rule.

The system:

1. Detects possible duplicates locally.
2. Adds a duplicate badge in the triage table.
3. Shows the reason for the warning.
4. Lets a person decide whether the cases should be merged, kept, or removed.

No case is automatically deleted.

See [design decision #6](design-decisions.md#6-near-duplicate-detection-as-a-signal-not-an-auto-delete--將近似重複視為提示而不是自動刪除).

把疑似重複當成**審查提示**，而不是自動刪除規則。

系統會：

1. 在本地偵測疑似重複案例。
2. 在分流表格中加上重複標籤。
3. 顯示被標記的原因。
4. 交由人工決定要合併、保留或刪除。

系統不會自動刪除任何案例。

詳見[設計決策 #6](design-decisions.md#6-near-duplicate-detection-as-a-signal-not-an-auto-delete--將近似重複視為提示而不是自動刪除)。

### Result / 結果

Possible overlap became visible and actionable.

The system can warn reviewers about duplicates without silently reducing test coverage.

可能重疊的案例變得清楚可見，也能直接進行處理。

系統可以提醒審查者注意重複，同時避免在沒有確認的情況下減少測試覆蓋。

### Lesson / 收穫

When duplication depends on meaning and source context, the algorithm should help people review—not make an irreversible decision for them.

當重複與語意及來源有關時，演算法應該協助人工判斷，而不是直接替人做出不可逆的決定。

---

## 4. Usage numbers leaking across concurrent requests / 並行請求的用量數字互相污染

### Symptom / 現象

After generation requests began running concurrently, token and usage statistics became inaccurate.

Usage from one request sometimes appeared in another request's result. The problem never appeared when only one request ran at a time.

當多個生成請求開始並行執行後，Token 與用量統計變得不準確。

某個請求的用量有時會出現在另一個請求的結果中。只有一個請求執行時，則完全看不出問題。

### Diagnosis / 原因

The usage meter depended on state that was effectively shared across the process.

When async requests ran on the same worker, their execution steps interleaved. One request could therefore read or update another request's counters.

This was a concurrency-safety bug hidden by single-user testing.

用量計算依賴了實際上由整個程序共用的狀態。

當多個非同步請求在同一個 worker 上交錯執行時，其中一個請求可能讀取或修改另一個請求的計數器。

這是一個被單人測試掩蓋的並行安全問題。

### Fix / 解法

Move all per-request usage accounting into **context-local storage**.

Each request creates and carries its own isolated counters through the async call chain. Even when several requests share a worker and execute in an interleaved order, their usage data remains separate.

將每個請求的用量統計移到 **context-local storage**。

每個請求都會建立自己的獨立計數器，並沿著非同步呼叫鏈傳遞。即使多個請求共用同一個 worker、執行順序互相交錯，用量資料仍不會混在一起。

### Result / 結果

Token and usage numbers became accurate and isolated for every run, including under concurrent load.

Tests were also added to run multiple requests at the same time and verify that their counters never crossed request boundaries.

每次執行的 Token 與用量數字都能保持正確且彼此隔離，即使在並行負載下也一樣。

另外也加入同時執行多個請求的測試，確認計數器不會跨越請求邊界。

### Lesson / 收穫

A system that works correctly for one user is not automatically safe under concurrency.

**Concurrency correctness must be designed and tested. It cannot be assumed.**

系統在單一使用者下正常，不代表它在並行環境中也安全。

**並行下的正確性必須被設計並測試，不能只靠假設。**

---

## 5. Long jobs killed by a single hard deadline / 長工作被固定總時限中斷

### Symptom / 現象

Generating test cases from a large document could take a long time.

A fixed request timeout caused two opposite problems:

- A valid long-running job could be stopped before completion.
- A truly stuck job could remain active for a long time before failing.

大型文件的案例生成可能需要較長時間。

固定的請求總時限造成了兩個相反的問題：

- 正常但耗時的工作可能在完成前被中斷。
- 真正卡住的工作可能要過很久才會失敗。

### Diagnosis / 原因

A total-time deadline treats **slow** and **stuck** as the same problem.

However, a job that runs for ten minutes while continuously reporting progress is different from a job that produces no progress at all.

No single total-time limit can handle both cases well.

固定總時限把**執行速度慢**與**完全卡住**視為同一種問題。

但一個持續回報進度、執行十分鐘的工作，和一個完全沒有進度的工作並不相同。

單一的總時限無法同時妥善處理這兩種情況。

### Fix / 解法

Stream progress to the client and replace the total deadline with an **idle timeout**.

The request fails only if no progress has arrived for a defined period:

- A healthy long job keeps reporting progress and remains active.
- A stuck job stops reporting and quickly triggers the idle timeout.

See [design decision #7](design-decisions.md#7-streaming-with-an-idle-timeout-not-a-total-deadline--使用閒置逾時而不是固定總時限).

將執行進度串流回前端，並使用**閒置逾時**取代固定總時限。

只有在一段時間內完全沒有收到任何進度時，請求才會失敗：

- 正常的長工作會持續回報進度，因此可以繼續執行。
- 卡住的工作不再回報進度，因此會快速觸發閒置逾時。

詳見[設計決策 #7](design-decisions.md#7-streaming-with-an-idle-timeout-not-a-total-deadline--使用閒置逾時而不是固定總時限)。

### Result / 結果

Healthy long-running jobs can now finish, while stuck jobs fail earlier.

Users also see live progress instead of waiting on a spinner with no explanation.

正常的長工作現在可以順利完成，真正卡住的工作則能更早失敗。

使用者也能看到即時進度，不必只看著一個沒有任何說明的轉圈圖示。

### Lesson / 收穫

The useful question is not:

> How long has the job been running?

It is:

> **Is the job still making progress?**

真正該問的不是：

> 這個工作已經執行多久？

而是：

> **這個工作還有沒有繼續前進？**

---

## 6. The first request after idle was slow / 閒置一段時間後，第一個請求特別慢

### Symptom / 現象

After the application had been idle for a while, the first database-backed request took a few hundred milliseconds longer than usual.

Requests immediately after that were fast again.

應用程式閒置一段時間後，第一個需要存取資料庫的請求會比平常多花幾百毫秒。

但後續請求又會立刻恢復正常速度。

### Diagnosis / 原因

The slowdown was not caused by a large amount of data or normal application warmup.

A firewall was silently closing idle database sockets. The connection pool still appeared to have a connection, but the underlying socket was no longer usable.

The next request therefore had to establish a new database connection before continuing.

變慢的原因不是資料量太大，也不是一般的應用程式暖機。

真正的原因是防火牆會默默關閉閒置太久的資料庫 socket。連線池看起來仍保有連線，但底層 socket 已經無法使用。

因此，下一個請求必須先重新建立資料庫連線，才能繼續處理。

### Fix / 解法

Use two measures to keep the database connection alive:

- Configure a minimum connection-pool size so at least one connection stays available.
- Send a lightweight background ping at regular intervals so the socket does not remain idle long enough to be removed.

使用兩項措施維持資料庫連線：

- 設定最小連線池大小，確保至少保留一條可用連線。
- 定期送出輕量的背景 ping，避免 socket 因閒置過久而被回收。

### Result / 結果

The delay on the first request after an idle period disappeared, and database response times became more consistent.

閒置後第一個請求的延遲消失，資料庫回應時間也變得更穩定。

### Lesson / 收穫

A cold-start symptom is not always caused by application code warming up.

Sometimes the network has removed a connection that the application assumed was persistent.

「冷啟動」的表象不一定代表程式正在暖機。

有時候，真正的原因是網路設備關閉了應用程式以為會持續存在的連線。

---

## 7. An 80-image draft disappeared after refresh / 80 張圖片的草稿在重新整理後消失

### Symptom / 現象

In production, a user could open a draft containing around 80 images and see all of them correctly.

However, after refreshing the page, every image disappeared while the text remained.

The problem did not appear with smaller drafts, which initially made it look environment-specific.

在正式環境中，使用者開啟一份包含約 80 張圖片的草稿時，一開始可以正常看到所有圖片。

但重新整理頁面後，文字仍然存在，圖片卻全部消失。

較小的草稿不會出現這個問題，因此一開始看起來像是特定環境造成的異常。

### Diagnosis / 原因

The issue was caused by data volume, not the environment.

The autosave feature stored the complete draft in `localStorage`, which usually allows only about **5 MB per origin**.

Around 80 base64-encoded images easily exceeded that limit.

The save logic had a fallback path:

1. Try to save the full draft.
2. If the quota is exceeded, remove some large fields.
3. As a final fallback, strip all image bytes and save only text and metadata.

Because the image bytes were removed silently, the save appeared successful. After refresh, the restore process found the text but had no image data to restore.

問題來自資料量，而不是執行環境。

草稿自動儲存原本會把所有資料放進 `localStorage`，但每個來源通常只有約 **5 MB** 的容量。

約 80 張經過 base64 編碼的圖片很容易超過這個限制。

原本的儲存邏輯包含以下備援流程：

1. 嘗試保存完整草稿。
2. 超過容量時，移除部分大型欄位。
3. 最後移除所有圖片 bytes，只保留文字與 metadata。

由於圖片 bytes 是被默默移除的，所以儲存看起來仍然成功。頁面重新整理後，系統找得到文字，卻沒有任何圖片資料可以還原。

### Fix / 解法

Split draft storage according to data type and access pattern.

#### `localStorage`: lightweight snapshot

Store only small, frequently updated data:

- Text
- Metadata
- Image descriptors
- References needed to rebuild the draft

Remove base64 image bytes before saving.

#### `IndexedDB`: image bytes

Store large image data separately in `IndexedDB`, which provides much more space and is designed for larger asynchronous data.

To avoid rewriting all images whenever the user types, calculate a lightweight image signature using:

- Image count
- Length of each image's data

Rewrite the images only when that signature changes.

根據資料型態與存取方式，將草稿儲存拆成兩層。

#### `localStorage`：輕量快照

只保存體積小、經常更新的資料：

- 文字
- Metadata
- 圖片描述資訊
- 還原草稿需要的參照資料

儲存前先移除圖片的 base64 bytes。

#### `IndexedDB`：圖片資料

將大型圖片資料另外存進 `IndexedDB`。它提供更大的容量，也更適合保存大型的非同步資料。

為了避免使用者每輸入一個字就重寫全部圖片，系統會根據以下資訊建立輕量圖片指紋：

- 圖片張數
- 每張圖片的資料長度

只有指紋發生變化時，才重新寫入圖片資料。

```js
// localStorage keeps only a lightweight snapshot.
const lightSnapshot = {
  ...payload,
  images: (payload.images || []).map(({ data_b64, ...metadata }) => metadata),
  preread: (payload.preread || []).map(
    ({ data_b64, src, ...metadata }) => metadata
  ),
}

localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(lightSnapshot))

// IndexedDB keeps the large image bytes.
// Rewrite them only when the image set changes.
const nextSignature = createImageSignature(payload)

if (nextSignature !== previousSignature) {
  await idbPut("draft", {
    images: imageBytes,
    preread: prereadBytes,
  })

  previousSignature = nextSignature
}
```

During restoration:

1. Read the lightweight snapshot from `localStorage`.
2. Render the text and metadata first.
3. Load image bytes asynchronously from `IndexedDB`.
4. Reconnect the bytes to their image metadata.
5. Restore the image previews.

還原草稿時：

1. 從 `localStorage` 讀取輕量快照。
2. 先還原文字與 metadata。
3. 再從 `IndexedDB` 非同步讀取圖片 bytes。
4. 將 bytes 與圖片資訊重新組合。
5. 還原圖片預覽。

### Result / 結果

Drafts containing around 80 images now survive page refreshes.

The change is also backward compatible:

- Older drafts that still contain image bytes in `localStorage` can still be restored.
- If `IndexedDB` cannot return the image bytes, the UI clearly asks the user to upload the missing images again.

The system no longer pretends that a draft is complete when image data is missing.

包含約 80 張圖片的草稿，現在重新整理頁面後仍能完整保留。

這項修改也保有向後相容性：

- 如果舊草稿的圖片 bytes 仍存在 `localStorage`，系統依然可以還原。
- 如果 `IndexedDB` 真的無法取回圖片，UI 會清楚提示使用者重新上傳。

當圖片資料缺失時，系統不再假裝草稿內容完整。

### Lesson / 收穫

Storage technology should match both the data type and its access pattern:

- Small and frequently updated data belongs in `localStorage`.
- Large image bytes belong in `IndexedDB`.
- Silent fallback is dangerous because it hides data loss.

儲存工具應該配合資料型態與存取方式：

- 小型且經常更新的資料適合放在 `localStorage`。
- 大型圖片 bytes 適合放在 `IndexedDB`。
- 默默降級很危險，因為它會把資料遺失藏起來。

---

## 8. Long-running jobs made the UI feel frozen / 長時間工作讓 UI 看起來卡住

### Symptom / 現象

Long-running generation made the original interface feel frozen.

Users received little feedback while waiting, and an idle or interrupted session could leave the interface stuck in an unclear state.

長時間的生成工作會讓原本的介面看起來像是當機。

使用者等待時幾乎看不到進度，閒置或中斷的工作也可能讓畫面停在狀態不明的地方。

### Diagnosis / 原因

The first interface was a script-driven tool built for quick validation.

It treated the entire workflow as one large blocking action. That approach worked for a prototype, but it did not fit a multi-step process with long-running tasks, human review, and recoverable states.

第一版介面是為了快速驗證而建立的腳本式工具。

它把整個流程當成單一的大型阻塞操作。這種方式適合原型，但不適合包含長時間工作、人工審查與狀態復原的多步驟流程。

### Fix / 解法

Rewrite the interface as a proper SPA with:

- A clear multi-step wizard
- Progressive status updates
- Per-step loading and error states
- Streaming progress for long-running generation
- Draft restoration
- The ability to retry individual steps

Move long-running work behind a thin HTTP boundary instead of executing it directly inside the UI.

Because the core pipeline was already separated from the frontend, the UI could be replaced without changing the business logic.

See [design decision #8](design-decisions.md#8-ui-decoupled-core-pipeline--核心流程與-ui-解耦).

將介面重寫為完整的 SPA，並加入：

- 清楚的多步驟精靈
- 逐步更新的處理狀態
- 每個步驟獨立的載入與錯誤狀態
- 長時間生成工作的串流進度
- 草稿還原
- 個別步驟重試

長時間工作改由 HTTP 邊界後方執行，而不是直接放在 UI 中處理。

因為核心流程原本就與前端分離，所以更換 UI 時不需要修改商業邏輯。

詳見[設計決策 #8](design-decisions.md#8-ui-decoupled-core-pipeline--核心流程與-ui-解耦)。

### Result / 結果

The new interface became a responsive multi-step wizard.

Users can see what the system is doing, where it is in the process, and what they can do when a step fails.

The frontend changed completely, while the core pipeline and its tests remained unchanged.

新介面變成一個有即時回饋的多步驟精靈。

使用者可以清楚知道系統正在做什麼、目前進行到哪裡，以及某個步驟失敗時可以如何處理。

前端雖然完整重寫，核心流程與既有測試都不需要修改。

### Lesson / 收穫

The earlier decision to separate the core from the UI paid off when the framework changed.

**The shell was replaced, but the engine stayed the same.**

先前將核心與 UI 解耦的決策，在更換前端框架時直接產生價值。

**更換的是外殼，核心引擎不需要跟著重寫。**

---

## 9. A line-by-line audit uncovered silent failures / 逐行審查找出無聲錯誤

### Symptom / 現象

The pipeline appeared to work, but as the codebase grew, some failures became difficult to notice.

The most dangerous problems were not the ones that crashed or logged an obvious error. They were paths that returned a plausible but incorrect value and allowed the pipeline to continue.

整體流程看起來可以正常運作，但隨著程式碼增加，有些錯誤變得很難察覺。

最危險的問題不是會讓系統崩潰或留下明顯錯誤紀錄的問題，而是那些回傳「看似合理但實際錯誤」的值，並讓流程繼續執行的路徑。

### Diagnosis / 原因

Normal feature testing focused mostly on visible behavior.

That made it easy to miss code paths that:

- Swallowed exceptions
- Used unsafe fallback values
- Returned partial results as if they were complete
- Lost traceability information
- Violated anti-fabrication rules without causing a crash

一般的功能測試主要關注看得見的行為，因此很容易漏掉以下問題：

- 吃掉例外但不回報
- 使用不安全的預設值
- 把不完整結果當成完整結果回傳
- 遺失追溯資訊
- 違反防捏造規則，卻沒有讓程式崩潰

### Fix / 解法

Perform a deliberate **line-by-line audit** of the core pipeline instead of waiting for user bug reports.

The review process was:

1. Read each important path from input to output.
2. List every suspicious behavior.
3. Rank findings by severity and likelihood.
4. Fix the highest-risk silent failures first.
5. Add regression tests for important findings.

The test suite gradually grew into more than 100 `pytest` cases covering:

- Document reading
- Structure-aware chunking
- Image transcription behavior
- Human approval boundaries
- Generation and truncation recovery
- Duplicate detection
- RTM traceability
- Output schema contracts
- Anti-fabrication guarantees

不等待使用者回報，而是主動對核心流程進行**逐行審查**。

審查流程如下：

1. 從輸入到輸出，逐步閱讀每條重要路徑。
2. 列出所有可疑行為。
3. 根據嚴重程度與發生機率排序。
4. 優先修正高風險的無聲錯誤。
5. 為重要問題加入回歸測試。

測試套件最後逐步增加到超過 100 個 `pytest` 測試案例，涵蓋：

- 文件讀取
- 依結構切分內容
- 圖片轉錄行為
- 人工確認邊界
- 案例生成與截斷復原
- 重複案例偵測
- RTM 追溯關係
- 輸出 Schema 契約
- 防止內容捏造的保證

### Result / 結果

Every important issue found during the audit was fixed and protected by a regression test where appropriate.

Refactoring became safer because the team could run the test suite and verify whether a change had broken an existing guarantee.

The audit also found problems before users encountered them.

審查中發現的重要問題都完成修正，並在適合的地方加入回歸測試。

之後進行重構時也更安全，因為可以直接執行測試套件，確認修改是否破壞既有保證。

這次審查也讓許多問題在使用者遇到之前就先被找出。

### Lesson / 收穫

The most expensive bugs are often silent:

- They do not throw exceptions.
- They do not produce obvious logs.
- They return believable but incorrect results.

A strong regression suite turns this question:

> Did I break something?

into something that can be answered with a command instead of a guess.

最昂貴的錯誤通常是無聲的：

- 不會拋出例外。
- 不會留下明顯的 Log。
- 只會回傳看似合理、實際錯誤的結果。

完整的回歸測試可以把這個問題：

> 我有沒有弄壞原本的功能？

從只能靠猜，變成可以直接用一行指令驗證。
