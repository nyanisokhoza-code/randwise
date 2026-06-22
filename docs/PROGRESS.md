# MyRandWise — Project Progress Tracker
> Last updated: 2026-06-15

---

## 🗂️ Project Structure

```
randwise/
├── app.html                  ← Main SPA shell (was monolithic 10k-line file)
├── css/
│   └── app.css               ← All styles extracted from app.html
├── js/
│   ├── auth-redirect.js      ← Pre-paint auth/OTP redirect handler
│   ├── sw-init.js            ← Service worker registration
│   ├── main.js               ← Core: Supabase, budget, transactions, screens
│   ├── features.js           ← Upgrade wall, tier management, app refresh
│   └── init.js               ← Intro tour, tab bar setup, final init
├── assets/
│   └── icons/                ← App icons (icon_192.png etc)
├── docs/
│   └── PROGRESS.md           ← This file
├── sw.js                     ← Service worker (copy from original repo)
├── manifest.json             ← PWA manifest (copy from original repo)
├── 404.html                  ← (copy from original repo)
├── reset-password.html       ← (copy from original repo)
└── about.html                ← (copy from original repo)
```

---

## ✅ Phase 1 — Repo Organisation

- [x] Design correct folder structure
- [x] Split monolithic `app.html` (10,468 lines) into:
  - `css/app.css` (228 lines)
  - `js/auth-redirect.js` (27 lines)
  - `js/sw-init.js` (33 lines)
  - `js/main.js` (4,653 lines)
  - `js/features.js` (1,180 lines)
  - `js/init.js` (2,040 lines)
  - `app.html` shell (2,293 lines)
- [ ] Copy `sw.js`, `manifest.json`, `404.html`, `reset-password.html`, `about.html` from original repo
- [ ] Copy `icon_192.png` and other assets into `assets/icons/`
- [ ] Set up local folder: `C:\Users\Bongane Khoza\Documents\Projects\randwise`

---

## 🧪 Phase 2 — Local Testing / Staging

- [ ] Run local server (`npx serve .` or Python `http.server`) from `randwise/`
- [ ] Verify splash screen loads
- [ ] Verify auth / login flow works
- [ ] Verify home dashboard renders
- [ ] Verify expense logging works
- [ ] Verify debt tab works
- [ ] Verify grow tab works
- [ ] Verify settings / profile tab works
- [ ] Verify monthly needs overlay works
- [ ] Test on mobile (Android / iOS via local network IP)

---

## 🚀 Phase 3 — GitHub Push

- [ ] Initialise git in `Documents\Projects\randwise`
- [ ] Set remote to `github.com/nyanisokhoza-code/randwise`
- [ ] Commit organised structure with message: `Refactor: split monolithic app.html into css/ + js/ modules`
- [ ] Push to `main` branch
- [ ] Verify GitHub Pages deployment still works
- [ ] Test live URL: `myrandwise.co.za`

---

## 🧹 Phase 4 — GitHub Cleanup

- [ ] Remove old flat files from repo root (old `app.html`, loose JS snippets)
- [ ] Confirm `CNAME` file is still present (needed for custom domain)
- [ ] Confirm `manifest.json` is at root
- [ ] Confirm `sw.js` is at root (service workers must be at root)
- [ ] Archive or delete `admin_dashboard.html`, `financial_model.html`, `founder_tracker.html` (move to `docs/` or remove)

---

## 🔮 Future / Backlog

- [ ] Further split `main.js` (4,653 lines) into feature modules:
  - `js/budget.js` — budget calculations, weekly budget logic
  - `js/transactions.js` — add/edit/delete/render expenses
  - `js/screens.js` — screen routing, tab switching
  - `js/onboarding.js` — onboarding flow
- [ ] Add `eslint` / `prettier` config
- [ ] Add local staging script (`package.json` with `serve` script)
- [ ] Consider moving to Vercel for better deploy previews

---

## 📝 Notes

- The repo uses **GitHub Pages** for hosting. The `CNAME` file must stay at root.
- `sw.js` (service worker) **must** remain at root — browsers only trust SWs at their own scope level.
- `manifest.json` should also stay at root for PWA install prompts to work.
- Auth uses **Supabase** — credentials are in `js/main.js` (publishable key, safe to expose).
- `auth-redirect.js` must load **synchronously** (no `defer`/`async`) as it needs to run before paint to avoid flash of wrong screen on magic link / recovery flows.
