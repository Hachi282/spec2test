<script setup>
import { ref, reactive, computed } from 'vue'
import {
  sampleDocument,
  transcribeImages,
  extractRequirements,
  generateCases,
  findDuplicateIds,
  SCHEMA_VERSION,
} from './mockData.js'

const STEPS = ['上傳', '判讀審閱', '需求定版', '生成', '分流覆核', '覆蓋與匯出']
const step = ref(1)

const doc = ref(null)
const transcriptions = ref([]) // { id, filename, src, text (editable), confidence }
const reqItems = ref([]) // editable requirement items (before freeze)
const frozen = ref(false) // once frozen, items lock and generation unlocks
const cases = ref([])
const dupIds = ref(new Set())
const busy = reactive({ transcribe: false, extract: false, generate: false })

// ── Step 1: load the synthetic sample document ──
function loadSample() {
  doc.value = sampleDocument
}

// ── Step 2: run the mocked vision transcription (this is where "read, don't guess" lives) ──
async function runTranscribe() {
  busy.transcribe = true
  transcriptions.value = await transcribeImages(doc.value.images)
  busy.transcribe = false
}

// ── Step 3: extract requirement items, edit, then FREEZE (the two-phase gate) ──
async function runExtract() {
  busy.extract = true
  reqItems.value = await extractRequirements(transcriptions.value)
  busy.extract = false
}
function addReqItem() {
  const n = String(reqItems.value.length + 1).padStart(2, '0')
  reqItems.value.push({ id: 'SI-' + n, text: '' })
}
function removeReqItem(i) { reqItems.value.splice(i, 1) }
function freezeRequirements() {
  // re-number sequentially on freeze, mirroring the real "定版" behaviour
  reqItems.value = reqItems.value
    .filter((r) => String(r.text || '').trim())
    .map((r, i) => ({ id: 'SI-' + String(i + 1).padStart(2, '0'), text: r.text.trim() }))
  frozen.value = true
}
function unfreeze() { frozen.value = false }

// ── Step 4: generate cases FROM THE FROZEN REQUIREMENTS ONLY ──
async function runGenerate() {
  busy.generate = true
  cases.value = await generateCases(transcriptions.value)
  dupIds.value = findDuplicateIds(cases.value)
  busy.generate = false
}

// ── Step 4: triage signals + human approval ──
function reviewReasons(c) {
  return {
    disc: !!String(c.discrepancy || '').trim(),
    lowconf: ['中', '低'].includes(c.confidence),
    dup: dupIds.value.has(c.case_id),
  }
}
function isApproved(c) { return c.review_status === 'approved' }
function toggleApprove(c) { c.review_status = isApproved(c) ? '' : 'approved' }
function approveAll() { cases.value.forEach((c) => { c.review_status = 'approved' }) }

const confClass = (c) => ({ 高: 'b-high', 中: 'b-mid', 低: 'b-low' }[c] || 'b-grey')
const pendingCount = computed(() => cases.value.filter((c) => !isApproved(c)).length)

// ── Step 6: RTM coverage + export (traces to the FROZEN requirement set) ──
const rtm = computed(() =>
  reqItems.value.map((item) => ({
    ...item,
    cases: cases.value.filter((c) => c.req_id === item.id),
  })),
)
const coverage = computed(() => {
  const covered = rtm.value.filter((r) => r.cases.length > 0).length
  return { covered, total: reqItems.value.length }
})

const exportJson = computed(() =>
  JSON.stringify(
    {
      schema_version: SCHEMA_VERSION,
      feature: doc.value?.feature,
      requirement_set: { frozen: frozen.value, count: reqItems.value.length },
      requirements: reqItems.value.map((r) => ({ id: r.id, text: r.text })),
      cases: cases.value.map((c) => ({
        case_id: c.case_id,
        req_id: c.req_id,
        module: c.module,
        system_scope: c.system_scope,
        title: c.title,
        precondition: c.precondition,
        steps: c.steps,
        test_data: c.test_data,
        expected: c.expected,
        // code-grounded fields for downstream automation (null where no machine check applies)
        api_assertion: c.api_assertion ?? null,
        code_ref: c.code_ref ?? null,
        code_verified: c.code_verified ?? null,
        discrepancy: c.discrepancy || null,
        priority: c.priority,
        confidence: c.confidence,
        review_status: c.review_status || 'pending',
      })),
    },
    null,
    2,
  ),
)

function downloadJson() {
  const blob = new Blob([exportJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'testcases.json'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Navigation ──
const canNext = computed(() => {
  if (step.value === 1) return !!doc.value
  if (step.value === 2) return transcriptions.value.length > 0
  if (step.value === 3) return frozen.value // must freeze the requirement set first
  if (step.value === 4) return cases.value.length > 0
  return step.value < STEPS.length
})
function next() { if (canNext.value && step.value < STEPS.length) step.value++ }
function back() { if (step.value > 1) step.value-- }
function restart() {
  step.value = 1
  doc.value = null
  transcriptions.value = []
  reqItems.value = []
  frozen.value = false
  cases.value = []
  dupIds.value = new Set()
}
</script>

<template>
  <div class="app">
    <header class="masthead">
      <h1>spec2test<span class="demo-badge">CLEAN-ROOM DEMO</span></h1>
      <p>
        需求文件 → 讀圖判讀 → <strong>人工審查關卡</strong> → 需求定版凍結 →
        結構化驗收測試案例。假資料、無後端服務、零專有程式碼。
      </p>
    </header>

    <!-- Stepper -->
    <nav class="stepper">
      <div
        v-for="(s, i) in STEPS"
        :key="s"
        class="step"
        :class="{ active: step === i + 1, done: step > i + 1 }"
      >
        <span class="num">{{ step > i + 1 ? '✓' : i + 1 }}</span>{{ s }}
      </div>
    </nav>

    <!-- Step 1: Upload -->
    <section v-if="step === 1" class="panel">
      <h2>① 上傳文件</h2>
      <p class="sub">
        真實工具在這裡拖入規格文件。示範版請載入一份合成範例——虛構的「使用者登入」功能，
        其規格文字被燒進低品質截圖裡。
      </p>
      <div class="row">
        <button class="btn" @click="loadSample" :disabled="!!doc">
          {{ doc ? '範例已載入 ✓' : '載入範例文件' }}
        </button>
        <span v-if="doc" class="mono" style="color: var(--muted)">{{ doc.name }}</span>
      </div>
      <div v-if="doc" class="img-grid" style="margin-top: 16px">
        <div v-for="im in doc.images" :key="im.id" class="img-card">
          <img :src="im.src" :alt="im.filename" />
          <div class="cap">{{ im.filename }} — 規格文字內嵌於圖片</div>
        </div>
      </div>
    </section>

    <!-- Step 2: Review gate -->
    <section v-if="step === 2" class="panel">
      <h2>② 人工審查關卡</h2>
      <p class="sub">每張圖逐字判讀並附信心標記。由你編修並核准——這是防捏造的把關點。</p>
      <div class="gate-note">
        🔒 下一步生成<strong>只吃這份核准過的文字</strong>。原始圖片不會往下游傳遞——沒有核准文字，就沒有生成案例。
      </div>
      <div class="row" v-if="transcriptions.length === 0">
        <button class="btn" @click="runTranscribe" :disabled="busy.transcribe">
          <span v-if="busy.transcribe" class="spinner"></span>
          {{ busy.transcribe ? ' 判讀中…' : '執行讀圖判讀' }}
        </button>
      </div>
      <div v-for="t in transcriptions" :key="t.id" class="review-card">
        <div>
          <img :src="t.src" :alt="t.filename" />
        </div>
        <div>
          <div class="filename">
            {{ t.filename }} ·
            <span class="badge" :class="confClass(t.confidence)">信心 {{ t.confidence }}</span>
            <span v-if="t.confidence === '低'" style="color: var(--fail-ink)"> ← 這張要核對</span>
          </div>
          <textarea v-model="t.text"></textarea>
        </div>
      </div>
    </section>

    <!-- Step 3: Freeze the requirement set (two-phase gate) -->
    <section v-if="step === 3" class="panel">
      <h2>③ 需求定版</h2>
      <p class="sub">
        從核准文字抽出可追溯的需求項目（SI-xx），由你編修後<strong>凍結定版</strong>。
        生成必須以凍結後的需求為準——項目與案例才不會各自漂移。
      </p>
      <div class="gate-note">
        🔒 這是兩段式流程的第一段：<strong>先定版需求、再生成案例</strong>。凍結前可自由增刪編修；凍結後項目鎖定，下一步才會解鎖。
      </div>

      <div class="row" v-if="reqItems.length === 0">
        <button class="btn" @click="runExtract" :disabled="busy.extract">
          <span v-if="busy.extract" class="spinner"></span>
          {{ busy.extract ? ' 抽取中…' : '抽出需求項目' }}
        </button>
      </div>

      <div v-if="reqItems.length" class="rtm" style="margin-bottom: 14px">
        <div v-for="(r, i) in reqItems" :key="i" class="rtm-row" :class="{ frozen: frozen }">
          <span class="rtm-id">{{ r.id }}</span>
          <textarea
            v-if="!frozen"
            v-model="r.text"
            class="req-edit"
            rows="1"
            placeholder="需求項目敘述…"
          ></textarea>
          <span v-else>{{ r.text }}</span>
          <button v-if="!frozen" class="btn sm ghost" @click="removeReqItem(i)">移除</button>
          <span v-else class="badge b-green">已凍結</span>
        </div>
      </div>

      <div class="row" v-if="reqItems.length">
        <button v-if="!frozen" class="btn sm ghost" @click="addReqItem">＋ 新增項目</button>
        <div class="spacer"></div>
        <button v-if="!frozen" class="btn" @click="freezeRequirements">🔒 凍結並定版（{{ reqItems.length }} 項）</button>
        <template v-else>
          <span class="badge b-green">需求集已凍結 · {{ reqItems.length }} 項</span>
          <button class="btn sm ghost" @click="unfreeze">解除凍結以編修</button>
        </template>
      </div>
    </section>

    <!-- Step 4: Generate -->
    <section v-if="step === 4" class="panel">
      <h2>④ 生成驗收案例</h2>
      <p class="sub">把<strong>凍結後的需求</strong>轉成符合規範的驗收案例。（示範版為 mock——短暫延遲後回傳罐頭輸出。）</p>
      <div class="row">
        <button class="btn" @click="runGenerate" :disabled="busy.generate">
          <span v-if="busy.generate" class="spinner"></span>
          {{ busy.generate ? ' 生成中…' : cases.length ? '重新生成' : '生成案例' }}
        </button>
        <span v-if="cases.length" style="color: var(--muted)">已生成 {{ cases.length }} 筆案例。</span>
      </div>
    </section>

    <!-- Step 5: Triage -->
    <section v-if="step === 5" class="panel">
      <h2>⑤ 分流覆核</h2>
      <p class="sub">案例依風險徽章自動分流，讓覆核心力用在刀口上。尚待覆核 {{ pendingCount }} 筆。</p>
      <ul class="signal-legend">
        <li><span class="badge b-red">落差</span> 案例預期結果與核准需求／參考實作對照後有出入，需人工裁決（不自動改）。</li>
        <li><span class="badge b-amber">中低信心</span> 來源判讀信心偏低（多半是模糊圖），優先複核。</li>
        <li><span class="badge b-grey">重複</span> 同一需求下的近似案例——常是「總覽 vs. 細節」同源改寫，擇一保留。</li>
        <li><span class="badge b-green">已確認</span> 已通過人工覆核。</li>
      </ul>
      <div class="row" style="margin-bottom: 12px">
        <button class="btn sm" @click="approveAll">全部核准</button>
      </div>
      <table class="cases">
        <thead>
          <tr>
            <th style="width: 130px">覆核原因</th>
            <th style="width: 96px">案例</th>
            <th>標題</th>
            <th style="width: 70px">信心</th>
            <th style="width: 90px">動作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cases" :key="c.case_id" :class="{ approved: isApproved(c) }">
            <td>
              <div class="reasons">
                <span v-if="reviewReasons(c).disc" class="badge b-red" :title="c.discrepancy">落差</span>
                <span v-if="reviewReasons(c).lowconf" class="badge b-amber" title="判讀信心中／低">中低信心</span>
                <span v-if="reviewReasons(c).dup" class="badge b-grey" title="同需求下近似案例（總覽↔細節同源）">重複</span>
                <span v-if="isApproved(c)" class="badge b-green">已確認</span>
              </div>
            </td>
            <td class="mono">{{ c.case_id }}<br /><small style="color: var(--muted)">{{ c.req_id }}</small></td>
            <td>
              {{ c.title }}
              <div v-if="reviewReasons(c).disc" style="color: var(--fail-ink); font-size: 0.76rem; margin-top: 4px">
                ⚠ {{ c.discrepancy }}
              </div>
              <div v-if="reviewReasons(c).dup" style="color: var(--muted); font-size: 0.76rem; margin-top: 4px">
                ↔ 與同需求另一案例近似（總覽 vs. 細節，同源改寫）——建議擇一保留。
              </div>
              <div v-if="c.code_ref" class="code-ref">
                ⛓ {{ c.code_ref }}
                <span v-if="c.code_verified" class="badge b-green">code 已對照</span>
                <span v-else class="badge b-amber">code 待確認</span>
              </div>
            </td>
            <td><span class="badge" :class="confClass(c.confidence)">{{ c.confidence }}</span></td>
            <td>
              <button class="btn sm" :class="{ ghost: isApproved(c) }" @click="toggleApprove(c)">
                {{ isApproved(c) ? '取消' : '核准' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Step 6: Export -->
    <section v-if="step === 6" class="panel">
      <h2>⑥ 覆蓋檢視與匯出</h2>
      <p class="sub">
        RTM 把<strong>凍結後</strong>的每條需求對應到它的案例；未覆蓋的需求會被標示出來。
        覆蓋率：<strong>{{ coverage.covered }}/{{ coverage.total }}</strong> 條需求至少有一筆案例。
      </p>

      <div class="rtm" style="margin-bottom: 20px">
        <div v-for="r in rtm" :key="r.id" class="rtm-row" :class="{ gap: r.cases.length === 0 }">
          <span class="rtm-id">{{ r.id }}</span>
          <span>
            {{ r.text }}
            <template v-if="r.cases.length"><br /><small style="color: var(--muted)">→ {{ r.cases.map((c) => c.case_id).join(', ') }}</small></template>
          </span>
          <span v-if="r.cases.length" class="badge b-green">{{ r.cases.length }} 筆案例</span>
          <span v-else class="badge b-red">無案例 — 覆蓋缺口</span>
        </div>
      </div>

      <div class="row" style="margin-bottom: 8px">
        <button class="btn" @click="downloadJson">⬇ 下載 JSON 契約</button>
        <span style="color: var(--muted)">真實工具另有 Excel 匯出；這裡展示機器可讀的 JSON。</span>
      </div>
      <p class="sub" style="margin: 0 0 10px">
        契約帶版本號（<span class="mono">schema_version</span>）與可餵下游自動化的 code-grounded 欄位——
        <span class="mono">steps</span> / <span class="mono">api_assertion</span> /
        <span class="mono">code_ref</span> / <span class="mono">code_verified</span> /
        <span class="mono">discrepancy</span>。code 對照是選用的部分層，只在適用處填值，其餘為 null。
      </p>
      <pre class="json">{{ exportJson }}</pre>
    </section>

    <!-- Nav -->
    <div class="row">
      <button class="btn ghost" @click="back" :disabled="step === 1">← 上一步</button>
      <div class="spacer"></div>
      <button class="btn ghost" @click="restart">重新開始</button>
      <button v-if="step < STEPS.length" class="btn" @click="next" :disabled="!canNext">下一步 →</button>
    </div>

    <p class="footer-note">
      去識別化 clean-room 示範 · 假資料 · mock LLM · 無網路 · 無專有原始碼
    </p>
  </div>
</template>
