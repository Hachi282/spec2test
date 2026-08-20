# Engineering challenges / 工程難題

De-identified deep-dives into problems I diagnosed and fixed. Code is illustrative and
rewritten for the portfolio — no proprietary source. 去識別化的難題深掘；程式碼為說明用途、
為作品集重寫，非專有原始碼。

---

## 1. 80-image draft vanishes on refresh / 80 張圖草稿一重整就消失

**Symptom.** On production, a user returns to a draft with ~80 images, sees them, then hits
refresh — and all images are gone. Locally it seemed fine, which made it look
environment-specific.

**Diagnosis.** It wasn't the environment; it was the **data volume**. Draft autosave wrote to
`localStorage`, which caps around **5 MB per origin**. Eighty base64-encoded images blow past
that. The save path had a quota fallback that, at its last tier, **stripped image bytes to
save the text** — so after a refresh the restore found text but no images. The "silent strip"
made it look like data loss rather than a deliberate degrade.

**Fix.** Split storage by data type:

- **localStorage** — a *light* snapshot: text + metadata, with image base64 removed.
  Small, synchronous, effectively never over quota.
- **IndexedDB** — the image bytes. Hundreds of MB of quota; written **only when the image set
  changes** (detected by a cheap fingerprint of count + per-image length), so typing doesn't
  rewrite 80 images every couple of seconds.

Restore reads the light snapshot synchronously, then asynchronously pulls image bytes back
from IndexedDB and re-hydrates the previews.

```js
// Light snapshot (localStorage): strip the heavy bytes
const light = {
  ...payload,
  images: (payload.images || []).map(({ data_b64, ...rest }) => rest),
  preread: (payload.preread || []).map(({ data_b64, src, ...rest }) => rest),
}
localStorage.setItem(KEY, JSON.stringify(light))

// Heavy bytes (IndexedDB): only rewrite when the image set actually changed
const sig = imagesSignature(payload)            // count + per-image length
if (sig !== lastSig) {
  await idbPut('draft', { images: imageBytes, preread: prereadBytes })
  lastSig = sig
}
```

**Result.** An 80-image draft now survives refresh. As a bonus, the fix is backward
compatible: an older draft whose bytes still live in localStorage restores fine, and if
IndexedDB truly can't return the bytes the UI *tells the user* to re-upload instead of
pretending everything's there.

**收穫。** 正確的儲存工具要配資料型態與存取樣態；「默默降級」比明講缺失更難查——所以修完也讓
UI 在真的救不回時**明確提示重傳**，不再假裝一切都在。

---

## 2. First request after idle is slow / 久沒用後第一個請求變慢

**Symptom.** After the app sat idle for a while, the *first* database-backed request took a
few hundred extra milliseconds; subsequent ones were fast.

**Diagnosis.** Not data volume, not connection-pool warmup in the usual sense — a **firewall
was silently killing idle database sockets**. The next request had to re-establish a
connection from scratch.

**Fix.** Keep at least one connection warm (a minimum pool size) and run a lightweight
background ping on an interval so the socket never sits idle long enough to be reaped.

**Result.** The idle-then-slow spike disappeared. The lesson: a "cold start" symptom isn't
always your code warming up — sometimes the network is tearing down what you assumed was persistent.

**收穫。**「冷啟動」的表象不一定是程式在暖機——有時是網路把你以為持久的東西拆掉了。用最小連線數
＋背景定時 ping 讓 socket 不閒到被回收即可。

---

## 3. A UI that freezes on long jobs / 長工作卡死 UI

**Symptom.** Long-running generation could leave the UI feeling frozen; idle sessions could
wedge.

**Diagnosis + response.** This became the trigger to **rewrite the UI from a script-driven
tool to a proper SPA**, with the long work behind an HTTP boundary and progressive,
per-step feedback instead of one monolithic blocking call. Because the core pipeline was
already **decoupled from the UI**, the rewrite touched no business logic — the core stayed
identical and its tests kept passing.

**Result.** A responsive multi-step wizard; the same core, a new shell. The payoff of the
earlier decoupling decision showed up exactly here.

**收穫。** 早先「核心與 UI 解耦」的決策，在整包換框架時直接回本——換殼不動核心、測試照過。

---

## 4. Duplicates that aren't textual duplicates / 不是文字重複的重複

**Symptom.** The same requirement, described once as an overview and once in detail, produced
overlapping-but-not-identical cases. Naive text matching missed them.

**Diagnosis.** The duplication was **source-based** (overview ↔ detail), not a clean string
match — so an exact-match dedup found nothing, and an aggressive fuzzy dedup risked deleting
genuinely distinct cases.

**Fix.** Treat suspected duplicates as a **review signal**, not an auto-delete: detect them
locally, badge them in the triage table, and let a human decide. Coverage is never silently reduced.

**Result.** Overlap becomes visible and actionable instead of either invisible or
destructively removed.

**收穫。** 當「重複」的本質不是文字比對能抓的，就別讓演算法默默砍覆蓋率——偵測、標記、交人定奪。

---

## 5. Making the output trustworthy / 讓輸出可信

**Symptom.** A vision LLM reading blurry images will *always* return text, sometimes
confidently wrong. Downstream, that becomes fabricated test coverage.

**Fix.** The **human review gate** (see [design-decisions.md](design-decisions.md#1-human-review-gate-before-generation--生成前的人工審查關卡)):
transcription is always surfaced for human correction/approval *before* generation, and
generation consumes only the approved text — the raw image is never forwarded.

**Result.** The tool's output is trustworthy by construction: every generated case traces to
text a human signed off on. This is the single most important design property of the system.

**收穫。** 可信不是靠模型更聰明，而是靠**架構**：讓每個案例都能追溯到人簽核過的文字，原圖不下傳。
這是整個系統最重要的設計性質。
