// Mock data + mocked "LLM" for the clean-room demo.
// Everything here is SYNTHETIC and GENERIC (a made-up "User Login" feature). There is no
// network, no real model, and no proprietary content. The "LLM" calls are just canned
// responses returned after a short artificial delay so the UX matches the real pipeline.
// 介面文字為繁體中文，與真實工具的中文產出一致；內容全為虛構的「使用者登入」範例。

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Placeholder "spec screenshots" ────────────────────────────────────────────
// Inline SVG data-URIs standing in for the real thing: spec text baked into a low-quality
// image. A slight blur sells the "hard to OCR" problem the tool solves.
function specImage({ title, lines, blur = 0 }) {
  const body = lines
    .map((t, i) => `<text x="24" y="${86 + i * 30}" font-family="'Noto Sans TC', sans-serif" font-size="16" fill="#1f2937">${t}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="260">
    <defs><filter id="b"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>
    <rect width="440" height="260" fill="#f8fafc" stroke="#cbd5e1"/>
    <g filter="url(#b)">
      <rect x="0" y="0" width="440" height="44" fill="#e2e8f0"/>
      <text x="24" y="29" font-family="'Noto Sans TC', sans-serif" font-size="17" font-weight="bold" fill="#0f172a">${title}</text>
      ${body}
    </g>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// An ANNOTATED UI mockup (示意圖): the picture is just an illustration; the requirement lives
// in the callout boxes drawn on top of it. The tool must read the annotations, not the mockup.
function mockupImage() {
  const box = (x, y, w, h, fill = '#ffffff') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="#94a3b8"/>`
  const label = (x, y, t) =>
    `<text x="${x}" y="${y}" font-family="'Noto Sans TC', sans-serif" font-size="12" fill="#b3282d">${t}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="260">
    <rect width="440" height="260" fill="#eef2f7"/>
    <text x="18" y="26" font-family="'Noto Sans TC', sans-serif" font-size="14" font-weight="bold" fill="#334155">介面示意圖（非規格文字）</text>
    ${box(40, 54, 220, 30)}${box(40, 96, 220, 30)}
    <rect x="40" y="140" width="16" height="16" rx="3" fill="#fff" stroke="#94a3b8"/>
    ${box(40, 176, 96, 32, '#004b87')}
    <text x="60" y="197" font-family="'Noto Sans TC', sans-serif" font-size="13" fill="#fff">登入</text>
    <!-- annotation callouts (dashed) — THIS is where the requirement is -->
    <g stroke="#b3282d" stroke-dasharray="4 3" fill="none">
      <rect x="278" y="52" width="150" height="34"/>
      <rect x="278" y="94" width="150" height="34"/>
      <rect x="278" y="134" width="150" height="30"/>
      <line x1="260" y1="69" x2="278" y2="69"/><line x1="260" y1="111" x2="278" y2="111"/><line x1="56" y1="148" x2="278" y2="149"/>
    </g>
    ${label(286, 74, '帳號：必填')}
    ${label(286, 116, '密碼：必填・遮罩')}
    ${label(286, 154, '記住我：選用')}
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// A purely DECORATIVE diagram (示意圖，無需求): boxes and arrows with no extractable
// requirement. The tool must NOT invent a requirement from it.
function diagramImage() {
  const box = (x, t) =>
    `<rect x="${x}" y="110" width="96" height="44" rx="6" fill="#fff" stroke="#94a3b8"/>` +
    `<text x="${x + 48}" y="137" text-anchor="middle" font-family="'Noto Sans TC', sans-serif" font-size="13" fill="#334155">${t}</text>`
  const arrow = (x) =>
    `<line x1="${x}" y1="132" x2="${x + 32}" y2="132" stroke="#94a3b8" marker-end="url(#a)"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="260">
    <defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#94a3b8"/></marker></defs>
    <rect width="440" height="260" fill="#f1f5f9"/>
    <text x="18" y="34" font-family="'Noto Sans TC', sans-serif" font-size="14" font-weight="bold" fill="#334155">系統示意圖（僅供參考）</text>
    ${box(40, '前端')}${arrow(136)}${box(172, 'API')}${arrow(268)}${box(304, '資料庫')}
    <text x="40" y="200" font-family="'Noto Sans TC', sans-serif" font-size="12" fill="#94a3b8">— 此圖僅示意系統組成，未描述任何驗收需求 —</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// The synthetic sample document. The point it makes: requirements are SCATTERED across a
// single file — some in body text, some baked into spec screenshots, some only in an
// annotated UI mockup — and one image is purely illustrative and carries no requirement.
export const sampleDocument = {
  name: 'sample-spec_user-login.xlsx',
  feature: '使用者登入',
  // Some requirements live in plain body text, not in any image.
  bodyText: [
    {
      heading: '1. 概述',
      text: '使用者可用有效的帳號與密碼登入系統，成功後導向首頁。（此需求直接寫在內文。）',
    },
    {
      heading: '5. 備註 · session',
      text: '勾選「記住我」時，登入 session 應在關閉瀏覽器後保留。此需求僅出現在內文、未附任何圖片。',
    },
  ],
  images: [
    {
      id: 'img-1',
      filename: 'login_form_mockup.png',
      kind: 'annotated', // 介面示意圖，需求在標註框裡
      note: '介面示意圖：需求在標註框，不是圖像本身',
      src: mockupImage(),
    },
    {
      id: 'img-2',
      filename: 'password_policy.png',
      kind: 'spec', // 規格文字燒進圖片
      note: '規格文字內嵌於圖片',
      src: specImage({
        title: '圖 2. 密碼規則',
        lines: ['- 最短長度：8', '- 至少 1 個大寫字母', '- 至少 1 個數字', '- 拒絕常見弱密碼'],
        blur: 1.1,
      }),
    },
    {
      id: 'img-3',
      filename: 'lockout_rules.png',
      kind: 'spec',
      note: '規格文字內嵌於圖片（較模糊）',
      src: specImage({
        title: '圖 3. 鎖定與錯誤訊息',
        lines: ['- 失敗 5 次 → 鎖定 15 分鐘', '- 訊息：「帳號或密碼錯誤」', '- 訊息：「帳號已鎖定」', '- 可經 email 連結重設'],
        blur: 2.2,
      }),
    },
    {
      id: 'img-4',
      filename: 'system_context.png',
      kind: 'decorative', // 純示意，無可擷取需求
      note: '純示意圖，無可擷取需求',
      src: diagramImage(),
    },
  ],
}

// ── Mocked vision transcription ───────────────────────────────────────────────
// Returns verbatim text + a confidence that (realistically) tracks image blur.
const TRANSCRIPTIONS = {
  // Annotated mockup: the image is decorative, but the callout boxes carry the requirement,
  // so we transcribe the annotations (not the mock UI) and flag the source.
  'img-1': {
    text:
      '（自標註框讀取，非圖像本身）登入表單欄位：帳號（必填）、' +
      '密碼（必填、遮罩輸入）、「記住我」為選用。',
    confidence: '中', // annotations are legible but hand-drawn → not "high"
  },
  'img-2': {
    text:
      '密碼規則：最短長度 8 碼；至少 1 個大寫字母；至少 1 個數字；' +
      '拒絕常見／已外洩的弱密碼。',
    confidence: '中', // medium — image is blurrier
  },
  'img-3': {
    text:
      '鎖定規則：連續 5 次失敗後鎖定帳號 15 分鐘。錯誤訊息：' +
      '「帳號或密碼錯誤」、「帳號已鎖定」。可經 email 連結重設密碼。',
    confidence: '低', // low — most blurred; a human should verify
  },
  // Purely decorative diagram: no extractable requirement. We do NOT invent one — the model
  // returns empty text and flags no_requirement, leaving a human to confirm it's illustrative.
  'img-4': {
    text: '',
    confidence: '—',
    no_requirement: true,
  },
}

export async function transcribeImages(images) {
  await delay(700)
  return images.map((im) => ({
    id: im.id,
    filename: im.filename,
    src: im.src,
    kind: im.kind,
    note: im.note,
    ...TRANSCRIPTIONS[im.id],
  }))
}

// ── Mocked requirement-item extraction (the "freeze" step) ────────────────────
// The real pipeline is two-phase: pull requirement items out of the approved text,
// let a human edit them, then FREEZE the set before any case is generated — so items
// and cases can't drift apart. Here we just return a copy after a short delay.
export async function extractRequirements() {
  await delay(600)
  return requirementItems.map((r) => ({ ...r }))
}

// ── Mocked case generation ────────────────────────────────────────────────────
// Produces structured acceptance cases from the (human-approved, frozen) requirements.
// Deliberately includes: a low-confidence case, a discrepancy-flagged case, and a
// near-duplicate pair (overview vs. detail) — the three triage signals the UI surfaces.
// The code-grounded fields (api_assertion / code_ref / code_verified) show the schema's
// downstream-automation intent; they are populated only where a machine check applies,
// and left null elsewhere — code-grounding is an optional, partial layer, not a claim
// that every case is auto-verified.
export async function generateCases() {
  await delay(900)
  return [
    {
      no: 1,
      case_id: 'TC-LOGIN-001',
      req_id: 'SI-01',
      module: '使用者登入',
      system_scope: '功能',
      title: '以有效帳號與密碼登入',
      precondition: '已存在一個已註冊且未鎖定的帳號。',
      steps: '1. 開啟登入表單\n2. 輸入有效帳號\n3. 輸入有效密碼\n4. 點「登入」',
      test_data: '帳號：alice／密碼：Passw0rd!',
      expected: '通過身分驗證並導向首頁。',
      api_assertion: 'POST /api/session → 200，並設定 session cookie',
      code_ref: 'services/auth.py::authenticate',
      code_verified: true,
      priority: '高',
      confidence: '高',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 2,
      case_id: 'TC-LOGIN-002',
      req_id: 'SI-02',
      module: '使用者登入',
      system_scope: '功能',
      title: '拒絕長度不足 8 碼的密碼',
      precondition: '位於註冊／登入的驗證流程。',
      steps: '1. 輸入 7 碼密碼\n2. 送出',
      test_data: '密碼：Ab1xyz',
      expected: '註冊流程擋下該輸入，因長度未達 8 碼。',
      api_assertion: null,
      code_ref: null,
      code_verified: null,
      priority: '中',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 3,
      case_id: 'TC-LOGIN-003',
      req_id: 'SI-02',
      module: '使用者登入',
      system_scope: '功能',
      title: '拒絕未含大寫字母的密碼',
      precondition: '位於驗證流程。',
      steps: '1. 輸入「passw0rd!」（無大寫）\n2. 送出',
      test_data: '密碼：passw0rd!',
      expected: '輸入因缺少大寫字母被判為不符強度要求。',
      api_assertion: null,
      code_ref: null,
      code_verified: null,
      priority: '中',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 4,
      case_id: 'TC-LOGIN-004',
      req_id: 'SI-03',
      module: '使用者登入',
      system_scope: '功能',
      title: '連續 5 次登入失敗後鎖定帳號',
      precondition: '一個近期無失敗紀錄的已註冊帳號。',
      steps: '1. 連續輸入 5 次錯誤密碼',
      test_data: '5 次錯誤密碼',
      expected: '帳號鎖定 15 分鐘，並顯示「帳號已鎖定」訊息。',
      api_assertion: '連續 5 次 401 後 → 423 Locked，Retry-After: 900',
      code_ref: 'services/auth.py::register_failure',
      code_verified: true,
      priority: '高',
      confidence: '低', // from the blurriest image → low confidence → needs review
      discrepancy: '',
      review_status: '',
    },
    {
      no: 5,
      case_id: 'TC-LOGIN-005',
      req_id: 'SI-03',
      module: '使用者登入',
      system_scope: '功能',
      title: '單次密碼錯誤時顯示「帳號或密碼錯誤」',
      precondition: '一個已註冊帳號。',
      steps: '1. 輸入一次錯誤密碼\n2. 送出',
      test_data: '密碼：wrong',
      expected: '登入失敗並顯示「帳號或密碼錯誤」訊息。',
      api_assertion: null,
      code_ref: 'services/auth.py::register_failure',
      code_verified: false,
      priority: '中',
      confidence: '中',
      // code-grounded discrepancy: comparing against the reference implementation surfaced
      // a behaviour the case doesn't cover → flagged for human decision, not auto-resolved.
      discrepancy: '對照參考實作 services/auth.py：失敗計數於成功登入後才歸零；本案例未涵蓋「單次失敗仍應累加鎖定計數」的行為，預期結果請人工確認。',
      review_status: '',
    },
    {
      no: 6,
      case_id: 'TC-LOGIN-006',
      req_id: 'SI-03',
      module: '使用者登入',
      system_scope: '功能',
      // near-duplicate of #4 (overview vs. detail phrasing of the same lockout requirement)
      title: '登入失敗多次後鎖定帳號',
      precondition: '一個已註冊帳號。',
      steps: '1. 重複登入失敗直到帳號被鎖定',
      test_data: '重複輸入錯誤密碼',
      expected: '連續登入失敗後帳號遭鎖定，並顯示「帳號已鎖定」訊息，鎖定到期前無法登入。',
      api_assertion: null,
      code_ref: null,
      code_verified: null,
      priority: '中',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 7,
      case_id: 'TC-LOGIN-007',
      req_id: 'SI-04',
      module: '使用者登入',
      system_scope: '功能',
      title: '透過 email 連結重設密碼',
      precondition: '一個具有效 email 的已註冊帳號。',
      steps: '1. 點「忘記密碼」\n2. 送出 email\n3. 開啟重設連結\n4. 設定新的有效密碼',
      test_data: 'email：alice@example.com',
      expected: '寄出重設連結；點擊後可設定新密碼。',
      api_assertion: 'POST /api/password/reset → 202 Accepted',
      code_ref: 'services/password.py::request_reset',
      code_verified: true,
      priority: '低',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
  ]
}

// The requirement items the cases trace back to — seeds the freeze step and RTM / coverage.
// `source` records WHERE in the file each requirement came from — the whole point of the
// sample is that they're scattered across body text and several images.
export const requirementItems = [
  { id: 'SI-01', text: '使用者可用有效的帳號與密碼登入。', source: '內文 §1 ＋ 圖 1 標註' },
  { id: 'SI-02', text: '密碼長度須至少 8 碼，且含大寫字母與數字。', source: '圖 2（內嵌文字）' },
  { id: 'SI-03', text: '連續 5 次登入失敗後鎖定帳號 15 分鐘，並顯示錯誤訊息。', source: '圖 3（內嵌文字）' },
  { id: 'SI-04', text: '使用者可透過 email 連結重設遺忘的密碼。', source: '圖 3（內嵌文字）' },
  { id: 'SI-05', text: '勾選「記住我」時 session 需保留。', source: '內文 §5（未附圖）' }, // intentionally uncovered → coverage gap
]

// ── Near-duplicate detection (local heuristic) ────────────────────────────────
// Word-overlap (Jaccard-ish) heuristic adapted for Traditional Chinese: since CJK text
// has no spaces, similarity is measured on CJK character bigrams (plus any ASCII words).
// In the real system dedup is source-based; here it's enough to flag the overview/detail
// pair (#4 vs #6) as a review signal.
export function findDuplicateIds(cases) {
  const norm = (s) => {
    const str = String(s || '').toLowerCase()
    const grams = new Set()
    // ASCII words (len >= 3)
    for (const w of str.replace(/[^a-z0-9]+/g, ' ').split(/\s+/)) {
      if (w.length >= 3) grams.add('w:' + w)
    }
    // CJK character bigrams
    const cjk = str.match(/[一-鿿]/g) || []
    for (let i = 0; i < cjk.length - 1; i++) grams.add('c:' + cjk[i] + cjk[i + 1])
    return grams
  }
  const dup = new Set()
  for (let i = 0; i < cases.length; i++) {
    for (let j = i + 1; j < cases.length; j++) {
      if (cases[i].req_id !== cases[j].req_id) continue // same requirement only
      const a = norm(cases[i].title + ' ' + cases[i].expected)
      const b = norm(cases[j].title + ' ' + cases[j].expected)
      const inter = [...a].filter((w) => b.has(w)).length
      const union = new Set([...a, ...b]).size || 1
      if (inter / union >= 0.3) {
        dup.add(cases[i].case_id)
        dup.add(cases[j].case_id)
      }
    }
  }
  return dup
}

export const SCHEMA_VERSION = '1.0-demo'
