<script setup>
import { ref, reactive, computed } from 'vue'
import {
  sampleDocument,
  transcribeImages,
  generateCases,
  requirementItems,
  findDuplicateIds,
  SCHEMA_VERSION,
} from './mockData.js'

const STEPS = ['Upload', 'Review gate', 'Generate', 'Triage', 'Export']
const step = ref(1)

const doc = ref(null)
const transcriptions = ref([]) // { id, filename, src, text (editable), confidence }
const cases = ref([])
const dupIds = ref(new Set())
const busy = reactive({ transcribe: false, generate: false })

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

// ── Step 3: generate cases FROM THE HUMAN-APPROVED TEXT ONLY ──
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

// ── Step 5: RTM coverage + export ──
const rtm = computed(() =>
  requirementItems.map((item) => ({
    ...item,
    cases: cases.value.filter((c) => c.req_id === item.id),
  })),
)
const coverage = computed(() => {
  const covered = rtm.value.filter((r) => r.cases.length > 0).length
  return { covered, total: requirementItems.length }
})

const exportJson = computed(() =>
  JSON.stringify(
    {
      schema_version: SCHEMA_VERSION,
      feature: doc.value?.feature,
      requirements: requirementItems.map((r) => ({ id: r.id, text: r.text })),
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
  if (step.value === 3) return cases.value.length > 0
  return step.value < STEPS.length
})
function next() { if (canNext.value && step.value < STEPS.length) step.value++ }
function back() { if (step.value > 1) step.value-- }
function restart() {
  step.value = 1
  doc.value = null
  transcriptions.value = []
  cases.value = []
  dupIds.value = new Set()
}
</script>

<template>
  <div class="app">
    <header class="masthead">
      <h1>spec2test<span class="demo-badge">CLEAN-ROOM DEMO</span></h1>
      <p>
        Requirement document → vision transcription → <strong>human review gate</strong> →
        structured acceptance test cases. Mock data, no services, no proprietary code.
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
      <h2>① Upload document</h2>
      <p class="sub">
        In the real tool you'd drop a spec document here. For the demo, load a synthetic sample —
        a made-up "User Login" feature whose spec text is baked into low-quality images.
      </p>
      <div class="row">
        <button class="btn" @click="loadSample" :disabled="!!doc">
          {{ doc ? 'Sample loaded ✓' : 'Load sample document' }}
        </button>
        <span v-if="doc" class="mono" style="color: var(--muted)">{{ doc.name }}</span>
      </div>
      <div v-if="doc" class="img-grid" style="margin-top: 16px">
        <div v-for="im in doc.images" :key="im.id" class="img-card">
          <img :src="im.src" :alt="im.filename" />
          <div class="cap">{{ im.filename }} — spec text embedded in image</div>
        </div>
      </div>
    </section>

    <!-- Step 2: Review gate -->
    <section v-if="step === 2" class="panel">
      <h2>② Human review gate</h2>
      <p class="sub">Each image is transcribed verbatim with a confidence signal. You edit and approve — this is the anti-fabrication guardrail.</p>
      <div class="gate-note">
        🔒 Generation (next step) consumes <strong>only this approved text</strong>. The raw image is never forwarded downstream — no approved text, no generated case.
      </div>
      <div class="row" v-if="transcriptions.length === 0">
        <button class="btn" @click="runTranscribe" :disabled="busy.transcribe">
          <span v-if="busy.transcribe" class="spinner"></span>
          {{ busy.transcribe ? ' Transcribing…' : 'Run vision transcription' }}
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
            <span v-if="t.confidence === '低'" style="color: var(--red-ink)"> ← verify this one</span>
          </div>
          <textarea v-model="t.text"></textarea>
        </div>
      </div>
    </section>

    <!-- Step 3: Generate -->
    <section v-if="step === 3" class="panel">
      <h2>③ Generate acceptance cases</h2>
      <p class="sub">Approved text is turned into standards-aligned acceptance cases. (Mocked — canned output after a short delay.)</p>
      <div class="row">
        <button class="btn" @click="runGenerate" :disabled="busy.generate">
          <span v-if="busy.generate" class="spinner"></span>
          {{ busy.generate ? ' Generating…' : cases.length ? 'Regenerate' : 'Generate cases' }}
        </button>
        <span v-if="cases.length" style="color: var(--muted)">Generated {{ cases.length }} cases.</span>
      </div>
    </section>

    <!-- Step 4: Triage -->
    <section v-if="step === 4" class="panel">
      <h2>④ Triage &amp; review</h2>
      <p class="sub">Cases are auto-routed by risk badges so review effort goes where it matters. {{ pendingCount }} pending.</p>
      <div class="row" style="margin-bottom: 12px">
        <button class="btn sm" @click="approveAll">Approve all</button>
        <div class="spacer"></div>
        <span class="badge b-red">落差 discrepancy</span>
        <span class="badge b-amber">中低信心 low-conf</span>
        <span class="badge b-grey">重複 duplicate</span>
        <span class="badge b-green">已確認 approved</span>
      </div>
      <table class="cases">
        <thead>
          <tr>
            <th style="width: 130px">覆核原因 Reason</th>
            <th style="width: 96px">Case</th>
            <th>Title</th>
            <th style="width: 70px">Conf.</th>
            <th style="width: 90px">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cases" :key="c.case_id" :class="{ approved: isApproved(c) }">
            <td>
              <div class="reasons">
                <span v-if="reviewReasons(c).disc" class="badge b-red" :title="c.discrepancy">落差</span>
                <span v-if="reviewReasons(c).lowconf" class="badge b-amber" title="判讀信心中／低">中低信心</span>
                <span v-if="reviewReasons(c).dup" class="badge b-grey" title="疑似重複">重複</span>
                <span v-if="isApproved(c)" class="badge b-green">已確認</span>
              </div>
            </td>
            <td class="mono">{{ c.case_id }}<br /><small style="color: var(--muted)">{{ c.req_id }}</small></td>
            <td>
              {{ c.title }}
              <div v-if="reviewReasons(c).disc" style="color: var(--red-ink); font-size: 0.76rem; margin-top: 4px">
                ⚠ {{ c.discrepancy }}
              </div>
            </td>
            <td><span class="badge" :class="confClass(c.confidence)">{{ c.confidence }}</span></td>
            <td>
              <button class="btn sm" :class="{ ghost: isApproved(c) }" @click="toggleApprove(c)">
                {{ isApproved(c) ? 'Undo' : 'Approve' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Step 5: Export -->
    <section v-if="step === 5" class="panel">
      <h2>⑤ Coverage &amp; export</h2>
      <p class="sub">
        RTM maps every requirement to its cases; uncovered requirements are flagged.
        Coverage: <strong>{{ coverage.covered }}/{{ coverage.total }}</strong> requirements have at least one case.
      </p>

      <div class="rtm" style="margin-bottom: 20px">
        <div v-for="r in rtm" :key="r.id" class="rtm-row" :class="{ gap: r.cases.length === 0 }">
          <span class="rtm-id">{{ r.id }}</span>
          <span>
            {{ r.text }}
            <template v-if="r.cases.length"><br /><small style="color: var(--muted)">→ {{ r.cases.map((c) => c.case_id).join(', ') }}</small></template>
          </span>
          <span v-if="r.cases.length" class="badge b-green">{{ r.cases.length }} case(s)</span>
          <span v-else class="badge b-red">no case — gap</span>
        </div>
      </div>

      <div class="row" style="margin-bottom: 12px">
        <button class="btn" @click="downloadJson">⬇ Download JSON contract</button>
        <span style="color: var(--muted)">Excel export exists in the real tool; here we show the machine-readable JSON.</span>
      </div>
      <pre class="json">{{ exportJson }}</pre>
    </section>

    <!-- Nav -->
    <div class="row">
      <button class="btn ghost" @click="back" :disabled="step === 1">← Back</button>
      <div class="spacer"></div>
      <button class="btn ghost" @click="restart">Restart</button>
      <button v-if="step < STEPS.length" class="btn" @click="next" :disabled="!canNext">Next →</button>
    </div>

    <p class="footer-note">
      De-identified clean-room demo · synthetic data · mocked LLM · no network · no proprietary source.
    </p>
  </div>
</template>
