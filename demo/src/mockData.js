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

// The synthetic sample document: one feature, three embedded images of increasing blur.
export const sampleDocument = {
  name: 'sample-spec_user-login.pdf',
  feature: '使用者登入',
  images: [
    {
      id: 'img-1',
      filename: 'login_form.png',
      src: specImage({
        title: '圖 1. 登入表單',
        lines: ['- 帳號（必填）', '- 密碼（必填、遮罩）', '- [x] 記住我', '- 按鈕：登入'],
        blur: 0.3,
      }),
    },
    {
      id: 'img-2',
      filename: 'password_policy.png',
      src: specImage({
        title: '圖 2. 密碼規則',
        lines: ['- 最短長度：8', '- 至少 1 個大寫字母', '- 至少 1 個數字', '- 拒絕常見弱密碼'],
        blur: 1.1,
      }),
    },
    {
      id: 'img-3',
      filename: 'lockout_rules.png',
      src: specImage({
        title: '圖 3. 鎖定與錯誤訊息',
        lines: ['- 失敗 5 次 → 鎖定 15 分鐘', '- 訊息：「帳號或密碼錯誤」', '- 訊息：「帳號已鎖定」', '- 可經 email 連結重設'],
        blur: 2.2,
      }),
    },
  ],
}

// ── Mocked vision transcription ───────────────────────────────────────────────
// Returns verbatim text + a confidence that (realistically) tracks image blur.
const TRANSCRIPTIONS = {
  'img-1': {
    text:
      '登入表單欄位：帳號（必填）、密碼（必填、遮罩輸入）、' +
      '「記住我」核取方塊、主要按鈕標示「登入」。',
    confidence: '高', // high
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
}

export async function transcribeImages(images) {
  await delay(700)
  return images.map((im) => ({
    id: im.id,
    filename: im.filename,
    src: im.src,
    ...TRANSCRIPTIONS[im.id],
  }))
}

// ── Mocked case generation ────────────────────────────────────────────────────
// Produces structured acceptance cases from the (human-approved) transcriptions.
// Deliberately includes: a low-confidence case, a discrepancy-flagged case, and a
// near-duplicate pair (overview vs. detail) — the three triage signals the UI surfaces.
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
      priority: '中',
      confidence: '中',
      // discrepancy example: the stated expected result differs from the approved text nuance
      discrepancy: '核准文字提到此次失敗應累加鎖定計數；本案例未驗證計數——請確認預期結果。',
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
      priority: '低',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
  ]
}

// The requirement items (frozen) the cases trace back to — drives the RTM / coverage view.
export const requirementItems = [
  { id: 'SI-01', text: '使用者可用有效的帳號與密碼登入。' },
  { id: 'SI-02', text: '密碼長度須至少 8 碼，且含大寫字母與數字。' },
  { id: 'SI-03', text: '連續 5 次登入失敗後鎖定帳號 15 分鐘，並顯示錯誤訊息。' },
  { id: 'SI-04', text: '使用者可透過 email 連結重設遺忘的密碼。' },
  { id: 'SI-05', text: '勾選「記住我」時 session 需保留。' }, // intentionally uncovered → coverage gap
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
