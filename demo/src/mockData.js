// Mock data + mocked "LLM" for the clean-room demo.
// Everything here is SYNTHETIC and GENERIC (a made-up "User Login" feature). There is no
// network, no real model, and no proprietary content. The "LLM" calls are just canned
// responses returned after a short artificial delay so the UX matches the real pipeline.

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Placeholder "spec screenshots" ────────────────────────────────────────────
// Inline SVG data-URIs standing in for the real thing: spec text baked into a low-quality
// image. A slight blur sells the "hard to OCR" problem the tool solves.
function specImage({ title, lines, blur = 0 }) {
  const body = lines
    .map((t, i) => `<text x="24" y="${86 + i * 30}" font-family="monospace" font-size="16" fill="#1f2937">${t}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="260">
    <defs><filter id="b"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>
    <rect width="440" height="260" fill="#f8fafc" stroke="#cbd5e1"/>
    <g filter="url(#b)">
      <rect x="0" y="0" width="440" height="44" fill="#e2e8f0"/>
      <text x="24" y="29" font-family="monospace" font-size="17" font-weight="bold" fill="#0f172a">${title}</text>
      ${body}
    </g>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// The synthetic sample document: one feature, three embedded images of increasing blur.
export const sampleDocument = {
  name: 'sample-spec_user-login.pdf',
  feature: 'User Login',
  images: [
    {
      id: 'img-1',
      filename: 'login_form.png',
      src: specImage({
        title: 'Fig 1. Login form',
        lines: ['- Username (required)', '- Password (required, masked)', '- [x] Remember me', '- Button: Log in'],
        blur: 0.3,
      }),
    },
    {
      id: 'img-2',
      filename: 'password_policy.png',
      src: specImage({
        title: 'Fig 2. Password policy',
        lines: ['- min length: 8', '- >= 1 uppercase', '- >= 1 digit', '- reject common passwords'],
        blur: 1.1,
      }),
    },
    {
      id: 'img-3',
      filename: 'lockout_rules.png',
      src: specImage({
        title: 'Fig 3. Lockout & errors',
        lines: ['- 5 failed -> lock 15 min', '- msg: "Invalid credentials"', '- msg: "Account locked"', '- reset via email link'],
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
      'Login form fields: Username (required), Password (required, masked input), ' +
      '"Remember me" checkbox, primary button labelled "Log in".',
    confidence: '高', // high
  },
  'img-2': {
    text:
      'Password policy: minimum length 8; at least 1 uppercase letter; at least 1 digit; ' +
      'reject common/breached passwords.',
    confidence: '中', // medium — image is blurrier
  },
  'img-3': {
    text:
      'Lockout: after 5 failed attempts, lock account for 15 minutes. Error messages: ' +
      '"Invalid credentials", "Account locked". Reset available via email link.',
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
      module: 'User Login',
      system_scope: '功能',
      title: 'Log in with valid username and password',
      precondition: 'A registered, unlocked account exists.',
      steps: '1. Open login form\n2. Enter valid username\n3. Enter valid password\n4. Click "Log in"',
      test_data: 'user: alice / pass: Passw0rd!',
      expected: 'User is authenticated and redirected to the home page.',
      priority: '高',
      confidence: '高',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 2,
      case_id: 'TC-LOGIN-002',
      req_id: 'SI-02',
      module: 'User Login',
      system_scope: '功能',
      title: 'Reject password shorter than 8 characters',
      precondition: 'On the registration/login validation path.',
      steps: '1. Enter a 7-character password\n2. Submit',
      test_data: 'pass: Ab1xyz',
      expected: 'Submission rejected with a password-policy validation error.',
      priority: '中',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 3,
      case_id: 'TC-LOGIN-003',
      req_id: 'SI-02',
      module: 'User Login',
      system_scope: '功能',
      title: 'Reject password without an uppercase letter',
      precondition: 'On the validation path.',
      steps: '1. Enter "passw0rd!" (no uppercase)\n2. Submit',
      test_data: 'pass: passw0rd!',
      expected: 'Rejected with a password-policy validation error.',
      priority: '中',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 4,
      case_id: 'TC-LOGIN-004',
      req_id: 'SI-03',
      module: 'User Login',
      system_scope: '功能',
      title: 'Lock account after 5 consecutive failed attempts',
      precondition: 'A registered account with 0 recent failures.',
      steps: '1. Enter wrong password 5 times',
      test_data: '5 x wrong password',
      expected: 'Account is locked for 15 minutes; "Account locked" message is shown.',
      priority: '高',
      confidence: '低', // from the blurriest image → low confidence → needs review
      discrepancy: '',
      review_status: '',
    },
    {
      no: 5,
      case_id: 'TC-LOGIN-005',
      req_id: 'SI-03',
      module: 'User Login',
      system_scope: '功能',
      title: 'Show "Invalid credentials" on a single wrong password',
      precondition: 'A registered account.',
      steps: '1. Enter a wrong password once\n2. Submit',
      test_data: 'pass: wrong',
      expected: 'Login fails with the message "Invalid credentials".',
      priority: '中',
      confidence: '中',
      // discrepancy example: the stated expected result differs from the approved text nuance
      discrepancy: 'Approved text says lockout counter increments on this failure; the case does not assert the counter — verify expected result.',
      review_status: '',
    },
    {
      no: 6,
      case_id: 'TC-LOGIN-006',
      req_id: 'SI-03',
      module: 'User Login',
      system_scope: '功能',
      // near-duplicate of #4 (overview vs. detail phrasing of the same lockout requirement)
      title: 'Account gets locked after too many failed logins',
      precondition: 'A registered account.',
      steps: '1. Fail login repeatedly until locked',
      test_data: 'repeated wrong password',
      expected: 'Account becomes locked and cannot log in until the lockout expires.',
      priority: '中',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
    {
      no: 7,
      case_id: 'TC-LOGIN-007',
      req_id: 'SI-04',
      module: 'User Login',
      system_scope: '功能',
      title: 'Reset password via emailed link',
      precondition: 'A registered account with a valid email.',
      steps: '1. Click "Forgot password"\n2. Submit email\n3. Open reset link\n4. Set a new valid password',
      test_data: 'email: alice@example.com',
      expected: 'A reset link is sent; following it lets the user set a new password.',
      priority: '低',
      confidence: '中',
      discrepancy: '',
      review_status: '',
    },
  ]
}

// The requirement items (frozen) the cases trace back to — drives the RTM / coverage view.
export const requirementItems = [
  { id: 'SI-01', text: 'User can log in with a valid username and password.' },
  { id: 'SI-02', text: 'Password must be >= 8 chars, with an uppercase letter and a digit.' },
  { id: 'SI-03', text: 'After 5 failed attempts the account locks for 15 minutes; show error messages.' },
  { id: 'SI-04', text: 'User can reset a forgotten password via an emailed link.' },
  { id: 'SI-05', text: 'Session persists when "Remember me" is checked.' }, // intentionally uncovered → coverage gap
]

// ── Near-duplicate detection (local heuristic) ────────────────────────────────
// A tiny word-overlap (Jaccard-ish) heuristic. In the real system dedup is source-based;
// here it's enough to flag the overview/detail pair (#4 vs #6) as a review signal.
export function findDuplicateIds(cases) {
  const norm = (s) =>
    new Set(
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    )
  const dup = new Set()
  for (let i = 0; i < cases.length; i++) {
    for (let j = i + 1; j < cases.length; j++) {
      if (cases[i].req_id !== cases[j].req_id) continue // same requirement only
      const a = norm(cases[i].title + ' ' + cases[i].expected)
      const b = norm(cases[j].title + ' ' + cases[j].expected)
      const inter = [...a].filter((w) => b.has(w)).length
      const union = new Set([...a, ...b]).size || 1
      if (inter / union >= 0.34) {
        dup.add(cases[i].case_id)
        dup.add(cases[j].case_id)
      }
    }
  }
  return dup
}

export const SCHEMA_VERSION = '1.0-demo'
