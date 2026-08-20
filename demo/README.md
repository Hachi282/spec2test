# spec2test — clean-room demo

A small, self-contained Vue 3 + Vite app that walks the full **spec → test case** pipeline on
**synthetic data** with a **mocked LLM**. It shares no code with the original system — it was
written from scratch for this portfolio to illustrate the design safely.

一個自包含的 Vue 3 + Vite 小程式，用**假資料**＋**mock LLM** 走完整條「規格 → 測試案例」管線。
與原系統**零共用程式碼**，為作品集從零重寫，只為安全地展示設計。

## What it shows / 展示什麼

1. **Upload** — load a synthetic "User Login" document whose spec text is baked into blurry images.
2. **Human review gate** — verbatim transcription + a confidence badge per image; text is editable.
   Generation later uses **only this approved text** (the guardrail against fabrication).
3. **Generate** — canned, structured acceptance cases.
4. **Triage** — a data-table with reason badges (**discrepancy / low-confidence / duplicate**) and approve actions.
5. **Coverage & export** — an RTM view (requirement ↔ cases, with a deliberate coverage gap) and a downloadable, schema-versioned JSON contract.

## Run locally / 本地執行

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build / 靜態建置

```bash
npm run build      # → dist/  (relative base path, GitHub-Pages ready)
npm run preview    # serve the built dist locally
```

## Deploy to GitHub Pages / 部署到 GitHub Pages

Two options:

- **Automatic** — this repo ships a workflow at `.github/workflows/deploy-demo.yml`. Push to
  `main`, then in the repo settings set **Pages → Source → GitHub Actions**. The demo builds
  and publishes automatically. Your live URL will be `https://<user>.github.io/<repo>/`.
- **Manual** — run `npm run build` and publish the `dist/` folder to a `gh-pages` branch (e.g.
  with the `gh-pages` npm package or `git subtree`).

`vite.config.js` uses `base: './'` so the build works under any `/<repo>/` subpath without
hardcoding the repository name.

## Honesty note / 誠實聲明

The "LLM" here is `setTimeout` + canned responses in [`src/mockData.js`](src/mockData.js).
The point is to demonstrate the **pipeline, UX, and design decisions** — not to reproduce the
model or any proprietary content. 這裡的「LLM」是 `setTimeout` ＋罐頭回應，目的是展示**管線、
UX 與設計決策**，不重現模型或任何專有內容。
