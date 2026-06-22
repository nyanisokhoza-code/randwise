# MyRandWise — Codebase Map & QA Checklist
**Last updated:** 20 June 2026  
**Status:** PWA split complete ✅ | Home tab QA ✅ | Debt tab QA in progress | Marketing website restructured ✅ | Site nav unified with "Free tools" dropdown ✅ | Push to GitHub: pending

---

## Project Structure

```
randwise/
├── app.html              ← Main shell (HTML only, no inline logic)
├── index.html            ← Marketing site homepage (myrandwise.co.za)
├── css/
│   └── app.css           ← All styles (PWA)
├── js/
│   ├── supabase.js       ← DB config, API helpers, global state
│   ├── auth.js           ← Login, register, onboarding screens
│   ├── dashboard.js      ← Home tab, stokvel, budget rendering
│   ├── transactions.js   ← Add/save/delete expenses, tab switching, profile edit
│   ├── debt.js           ← Debt tracker, goals, debit orders, payoff accelerator
│   ├── features.js       ← Tier system, upgrade wall, owner panel, edit expense
│   ├── social.js         ← Share cards, debt celebration, interventions, lock vars
│   ├── lock.js           ← (check if still needed or merged into missing.js)
│   ├── planner.js        ← (check if still needed or merged into missing.js)
│   ├── notifications.js  ← Push notification helpers
│   ├── missing.js        ← 42 functions not placed during original split
│   └── init.js           ← App init, import tab, checkins, search, monthly summary
├── pages/                ← Marketing site sub-pages (linked from index.html)
│   ├── about.html                   ← "Free tools" dropdown added
│   ├── partners.html     ← Company Overview section upgraded; Business Model, Risk Profile, Audience sections pending
│   ├── terms.html                   ← Legal-only nav (no dropdown, by design)
│   ├── privacy.html                 ← Legal-only nav (no dropdown, by design)
│   ├── randwise-tools-widget.html   ← Embedded as iframe on index.html homepage; minimal nav (by design)
│   ├── randwise-blog-template.html  ← ⚠️ UNLINKED — no nav points here anymore (see Known Issues)
│   ├── randwise-referral.html       ← "Free tools" dropdown added; placeholder ref code replaced with honest CTA
│   ├── randwise-dashboard.html      ← Spending analytics demo page; "Free tools" dropdown added; sample-data badge added
│   └── car-buffer.html              ← "Free tools" dropdown added; mobile hamburger menu added
├── sw.js                 ← Service worker
├── manifest.json         ← PWA manifest
├── CNAME                 ← myrandwise.co.za
├── 404.html
├── reset-password.html
└── docs/
    ├── PROGRESS.md
    └── MRW_CODEBASE_MAP.md  ← this file
```

---

## Marketing Website — Navigation System

### Structure
- **`index.html`** lives at the project root, all other public pages live in `pages/`
- Every page inside `pages/` uses `../` to reach `index.html` and `css/`, and bare filenames to reach sibling pages (e.g. `about.html`, `car-buffer.html`)

### "Free tools" dropdown
A hover dropdown in the top nav, present on: `index.html`, `pages/about.html`, `pages/partners.html`, `pages/car-buffer.html`, `pages/randwise-dashboard.html`, `pages/randwise-referral.html`.

Current contents (4 items — Blog removed 2026-06-20):
1. 📊 Spending demo → `randwise-dashboard.html`
2. 🚗 Car buffer calculator → `car-buffer.html`
3. 🧮 Budget tools → `randwise-tools-widget.html`
4. 🎁 Refer & earn → `randwise-referral.html`

**Deliberately excluded from the dropdown:**
- `terms.html` / `privacy.html` — legal-only nav, no dropdown, by design
- `randwise-tools-widget.html` — embedded iframe page, minimal nav, by design
- `randwise-blog-template.html` — unlinked as of 2026-06-20 (see Known Issues)

### Footer pattern (site-wide)
Footers carry legal/account links only: Open App, Download APK, About, Partners, Terms, Privacy, Delete Account, Contact. Feature/conversion links (demo, tools, referral, blog) live in the nav dropdown, not the footer — this was a deliberate fix on 2026-06-20 after demo/tools links were found buried next to "Delete Account" with identical visual weight.

### Mobile behavior
- `index.html` — hamburger opens a flat list (Features/Pricing/FAQ, then a "Free tools" label + the 4 tool links, then About/Partners/Open App)
- `car-buffer.html` — same pattern via a dedicated `.mobile-panel` + `#navToggle` button (added 2026-06-20)
- `about.html` / `partners.html` — dropdown is hover-only; no mobile-specific fallback yet (see Known Issues)
- `randwise-dashboard.html` / `randwise-referral.html` — dropdown is hover-only; no mobile-specific fallback yet (see Known Issues)

### Known CSS gotcha — dropdown hover gap
Any `.ndd-menu` must use `top:100%` + `padding-top` (not `top:calc(100% + Xpx)` + small padding) so the menu's own hoverable area bridges the visual gap to the trigger. Using a real gap there breaks hover on mouse-down movement. Already fixed on index.html, about.html, partners.html, car-buffer.html, randwise-dashboard.html, randwise-referral.html.

---

### `js/supabase.js` — 73 lines | 7 functions
> DB config, API helpers, shared global state

| Function | Purpose |
|---|---|
| `refreshTokenIfNeeded` | Refresh JWT before it expires |
| `getH()` | Build auth headers using current token |
| `sbP(path, body)` | Supabase POST |
| `sbG(path)` | Supabase GET |
| `sbD(path)` | Supabase DELETE |
| `sbPatch(path, body)` | Supabase PATCH |
| `authPost(path, body)` | Supabase Auth POST |

**Global state declared here:**
`SB`, `APP_URL`, `AK`, `H`, `user`, `expenses`, `selectedCat`, `debts`, `ob`, `step`, `CATS`

---

### `js/auth.js` — 304 lines | 19 functions
> Login, register, onboarding flow

| Function | Purpose |
|---|---|
| `show(id)` | Switch visible screen |
| `togglePass(id, btn)` | Show/hide password field |
| `startOB()` | Start onboarding |
| `renderStep()` | Render current onboarding step |
| `valStep()` | Validate onboarding step |
| `obNext()` / `obBack()` | Onboarding navigation |
| `selStage()` / `selIType()` / `selFreq()` | Onboarding selections |
| `updInc()` | Update income preview |
| `togGoal()` | Toggle goal chips |
| `doRegister()` | Create account |
| `doLogin()` | Sign in |
| `logLoginFailure()` | Log failed attempts to Supabase |
| `requestLoginHelp()` | Send login help request |
| `handleForgot()` | Password reset flow |
| `showErr(id, msg)` / `hideErr(id)` | Form validation errors |

---

### `js/dashboard.js` — ~980 lines | 17 functions
> Home tab rendering, stokvel management, smart budget, committed plan badge

| Function | Purpose |
|---|---|
| `openDash()` | Load and render home tab |
| `loadExp()` | Fetch expenses from Supabase |
| `getSmartWeeklyBudget()` | Calculate weekly budget from salary/debts/needs |
| `renderDash()` | Render full home dashboard |
| `getStokvels()` / `saveStokvels()` | LocalStorage stokvel helpers |
| `openAddStokvel()` / `closeAddStokvel()` / `saveStokvel()` | Add stokvel flow |
| `updateStokvelPreview()` | Update stokvel form preview |
| `loadStokvelList()` | Render stokvel cards |
| `openStokvelDetail(id)` / `closeStokvelDetail()` | Stokvel detail sheet |
| `toggleStokvelPayment()` / `deleteStokvel()` | Stokvel actions |
| `shareStokvelCard(id)` | Share stokvel as card |

**New in this session:**
- Committed debt plan badge (`#acc-plan-home-badge`) renders on home tab when user has an active accelerator plan
- `getSmartWeeklyBudget()` now correctly deducts accelerator extra from disposable
- Budget breakdown shows `/wk` suffix for weekly earners
- "After commitments" label is frequency-aware

---

### `js/transactions.js` — 144 lines | 12 functions
> Expense sheet, tab switching, profile editing, debit orders var

| Function | Purpose |
|---|---|
| `openSheet()` / `closeSheet()` | Add expense bottom sheet |
| `selectCat(el)` | Select expense category |
| `setAmt(v)` / `chkSave()` | Amount input helpers |
| `toggleRecurringStyle()` | Toggle recurring expense UI |
| `saveExp()` | Save expense (optimistic + Supabase sync) |
| `delExp(id)` | Delete expense |
| `switchTab(t)` | Switch between Home/Debt/Grow/Health/Profile |
| `openEditProfile()` / `closeEditProfile()` / `saveProfile()` | Profile edit sheet |

**Variable declared here:** `debitOrders`

---

### `js/debt.js` — ~1450 lines | 48 functions
> Debt tracker, payoff accelerator, goals, debit orders UI, push notifications

| Function | Purpose |
|---|---|
| `loadDebtsPWA()` | Fetch debts from Supabase |
| `openAddDebtPWA()` / `closeAddDebtPWA()` / `saveDebtPWA()` | Add debt flow |
| `openEditDebtPWA()` / `deleteDebtPWA()` | Edit/delete debt |
| `onDebtCatChange()` | Handle debt category change |
| `calcVehicle()` / `setVehicleMode()` / `setVehicleTerm()` / `applyVehicleCalc()` | Vehicle finance calculator |
| `calcMashonisa()` | Mashonisa (loan shark) calculator |
| `renderPayoffAccelerator()` / `updateAccelerator()` / `setAccPct()` | Payoff accelerator |
| `commitToAcceleratorPlan()` | Save commitment + show success sheet + schedule nudge |
| `showCommitSuccessSheet(plan, attackDebt)` | Post-commitment bottom sheet with payday action |
| `schedulePushNudges(plan)` | Schedule payday push reminder for committed plan |
| `openAddGoalPWA()` / `closeAddGoalPWA()` / `saveGoalPWA()` / `deleteGoalPWA()` | Savings goals |
| `loadGoalsPWA()` | Fetch goals from Supabase |
| `openContribSheet()` / `closeContribSheet()` / `saveContribution()` | Contribute to goal |
| `selectGoalChip()` / `calcGoalMonthly()` | Goal form helpers |
| `openDebitOrders()` / `closeDebitOrders()` / `renderDebitOrdersList()` / `addDebitOrder()` / `removeDebitOrder()` | Manual debit orders |
| `showToast(msg)` | Toast notification |
| `shareApp()` / `doSignOut()` | App actions |
| `renderInsights()` | Financial insights |
| `requestPushPermission()` / `enablePushNotifications()` / `disablePushNotifications()` / `isPushEnabled()` / `updatePushToggle()` / `togglePushNotifications()` | Push notifications |

**New in this session:**
- `commitToAcceleratorPlan()` now shows a post-commitment success sheet instead of just a toast
- `showCommitSuccessSheet()` — new bottom sheet showing exact payday action, total to pay, snowball explanation
- `schedulePushNudges()` — previously called but undefined; now implemented. Stores nudge config in localStorage for SW, schedules in-app toast for payday
- Time formatting fixed: `1y 2mo` → "1 year 2 months", `14mo` → "14 months"
- Payoff accelerator now has a manual "Or type an amount" input field synced with the slider

---

### `js/features.js` — 1180 lines | 36 functions
> Tier system, upgrade wall, owner panel, edit expense, connectivity

| Function | Purpose |
|---|---|
| `getTier()` | Get user's plan (free/pro/trial) |
| `applyTierTheme()` | Apply visual tier indicators |
| `showUpgradeWall()` / `continueFreePlan()` / `doUpgrade()` | Upgrade flow |
| `scheduleUpgradeNudges()` | Scheduled upgrade reminders |
| `editExp()` / `closeEditSheet()` / `saveEdit()` | Edit existing expense |
| `ownerTap()` / `openOwnerPinModal()` / `checkOwnerPin()` / `closeOwnerPin()` / `openOwnerPanel()` | Owner/admin panel |
| `switchTestTier()` / `highlightTierBtn()` | Tier testing |
| `refreshApp()` / `hardRefresh()` / `doAppUpdate()` | App refresh/update |
| `checkConnectivity()` / `checkManualMaintenanceFlag()` / `loadAppSettings()` / `getSetting()` / `goToMaintenance()` | Connectivity & maintenance |
| `armFrozenCheck()` | Detect frozen app state |
| `sendGoalWelcomeEmail()` / `sendOwnerAlert()` / `reportIssue()` / `submitReport()` | Alerts & reporting |
| `scheduleCoinAnim()` / `pulseCoin()` / `stopCoinAnim()` | Coin animation |
| `toggleHeroFlip()` / `updateHeroWeekPanel()` | Hero panel toggle |
| `trackDeadTap()` / `getScrollContainer()` | UX helpers |

---

### `js/social.js` — 609 lines | 26 functions
> Share cards, debt celebration, interventions, lock constants

| Function | Purpose |
|---|---|
| `showInfo(key)` / `closeInfo()` | Info tooltips |
| `grantCSIPro()` / `resetAllTrials()` / `loadCSIList()` | CSI/admin tools |
| `generatePromoCard()` | Promo share card |
| `checkDebtPayoffCelebration()` / `showDebtCelebration()` / `launchConfetti()` | Debt payoff celebration |
| `checkDebtIntervention()` / `showDebtIntervention()` / `closeDebtIntervention()` | Debt intervention alerts |
| `generateShareCard()` / `closeShareCard()` / `shareCard()` | Generic share card |
| `shareDebtMilestone()` / `shareSavingsMilestone()` | Milestone sharing |
| `showShareNudge()` / `closeShareNudge()` / `copyReferralCode()` / `shareAppFromNudge()` | Referral sharing |
| `showWhatsNew()` / `closeWhatsNew()` | What's new modal |
| `showAbout()` / `closeAbout()` / `maybeShowAbout()` | About screen |

**Lock constants declared here:** `LOCK_KEY`, `LOCK_PIN_KEY`, `LOCK_TIMEOUT`, `lockTimer`, `lockPinEntry`, `setPinEntry`, `setPinConfirm`, `setPinStage`, `setPinMode`, `setPinEntry`, `lockFailCount`

---

### `js/missing.js` — 1140 lines | 42 functions
> Functions not placed during original split. Lock, PIN, Bond, AI Nudge, Planner, Export.

| Function | Purpose |
|---|---|
| `initPushToggle()` | Init push toggle UI state |
| `sendLocalNotification()` / `schedulePushNudges()` | Local push notifications |
| `isLockEnabled()` / `getLockPin()` | Lock state helpers |
| `initLock()` / `toggleAppLock()` | App lock setup |
| `startLockTimer()` / `stopLockTimer()` / `resetLockTimer()` | Lock timer |
| `showLockScreen()` / `hideLockScreen()` | Lock screen visibility |
| `updateLockDots()` / `lockPinTap()` / `lockPinBack()` / `checkLockPin()` | PIN entry |
| `lockBiometric()` / `lockForgotPin()` | Biometric & PIN recovery |
| `openSetPin()` / `closeSetPin()` / `updateSetPinDots()` / `setPinTap()` / `setPinBack()` / `handleSetPinComplete()` | Set new PIN |
| `updateBondPreview()` / `openBondReadiness()` / `closeBondReadiness()` / `applyForBond()` / `renderBondReadiness()` | Bond readiness calculator |
| `loadAINudge()` / `generateAINudge()` / `toggleNudgeExpand()` / `dismissAINudge()` / `refreshAINudge()` | AI financial nudge |
| `openWeeklyPlanner()` / `closeWeeklyPlanner()` / `selectWeek()` / `getWeekSpent()` / `getWeekCarryover()` / `renderWeeklyPlanner()` | Weekly planner |
| `exportCSV()` / `exportPDF()` | Data export |

---

### `js/init.js` — ~2100 lines | 110+ functions
> App initialisation, import tab, all checkin flows, search, monthly summary

Key areas: intro tour, bank statement import (PDF parsing via Claude API), password reset, see-all transactions, custom categories, monthly summary, premium sheet, payment confirmation, salary/needs/income checkins, search, privacy policy, terms, app rating, weekly insight popup.

**New in this session:**
- `maybeShowSalaryConfirm(force)` — `force=true` now correctly bypasses localStorage cache
- `nudgeIncompleteBreakdown()` — shows amber nudge inside breakdown card after login
- Budget breakdown flow: 2-step (salary + needs) when no debts; 3-step when debts exist
- Post-needs: "Do you have any debt?" popup → "No debt 🎉" or "Go to Debt tab" flow
- Duplicate `loadMonthlyNeedsFromSupabase` removed (old version overwrote fresh needs)

---

## Marketing Website — Structure & Status

> Separate from the PWA (`app.html` + `js/`). This is the public site at `myrandwise.co.za` — `index.html` at the project root plus sub-pages in `pages/`.

### `index.html` — Homepage
| Area | Status |
|---|---|
| Nav (desktop + mobile) | ✅ Links to all `pages/` files + anchors to on-page sections (#features, #pricing, #referral, #faq) |
| Footer | ✅ Links to all 9 `pages/` files, APK download, delete-account, contact |
| Inline referral section (`#referral`) | ✅ Has secondary link out to `pages/randwise-referral.html` for full rewards breakdown |
| Tools preview section | ✅ Fixed — `randwise-tools-widget.html` now embeds correctly in a proper section (previously a stray `<iframe>` sat outside `</html>` and never rendered) |
| Newsletter signup | ✅ Posts to Supabase + sends welcome email via Resend (keys are inline in client JS — flagged as a risk, see Known Issues) |

### `pages/` — Sub-pages
| File | Purpose | Link status |
|---|---|---|
| `about.html` | Company/about page | ✅ Fixed — `../css/style.css`, `../index.html`, sibling links |
| `partners.html` | Partner-facing company info | ✅ Company Overview section visually upgraded (icon badges, status pills, stat cards). Business Model, Risk Profile, Audience sections still plain — pending |
| `terms.html` | Terms of service | ✅ Fixed |
| `privacy.html` | Privacy policy | ✅ Fixed |
| `randwise-tools-widget.html` | Embeddable budget/health calculators | ✅ Fixed — brand links now `../index.html` (kept `target="_blank"` since it's designed to be iframed) |
| `randwise-blog-template.html` | Blog post template | ✅ Fixed — dead `/tools` links repointed to `randwise-tools-widget.html` |
| `randwise-referral.html` | Full referral programme landing page | ✅ Fixed |
| `randwise-dashboard.html` | Spending analytics demo page | ✅ Fixed — dead `/tools` footer link repointed |
| `car-buffer.html` | Vehicle finance / repossession-risk landing page | ✅ Fixed — full sitewide nav had root-relative paths (`/about.html` etc.) that would 404; converted to relative. Also fixed two CTAs that pointed at the bare homepage instead of `app.html` |

### Linking convention established
- Logo/Home links from any `pages/` file → `../index.html`
- Links between sibling pages inside `pages/` → bare filename (`about.html`, not `../pages/about.html`)
- Links to the PWA itself → absolute `https://myrandwise.co.za/app.html` (app lives in a different deploy)
- CSS in `about/partners/terms/privacy` → `../css/style.css`; the five feature pages (tools, blog, referral, dashboard, car-buffer) are self-contained with inline `<style>`, no external CSS dependency

---



All RandWise tables are locked down. Applied in this session:

| Table | Policies | Rule |
|---|---|---|
| `beta_testers` | SELECT, INSERT, UPDATE, DELETE | `auth_id = auth.uid()` |
| `debts` | SELECT, INSERT, UPDATE, DELETE | `tester_id` → user's account |
| `debt_payments` | SELECT, INSERT, UPDATE, DELETE | via `debt_id` → user's account |
| `expenses` | SELECT, INSERT, UPDATE, DELETE | `tester_id` → user's account |
| `savings_goals` | SELECT, INSERT, UPDATE, DELETE | `tester_id` → user's account |

Removed dangerous open policies: `beta_testers_all` (qual=true for all public), `anon_update_testers`.  
Kept: `anon_insert_testers` — required for registration.

---

## QA Testing Checklist

### 🏠 Home Tab
- [x] Dashboard loads with greeting and name
- [x] Weekly budget ring shows correct amount
- [x] Income label is frequency-aware (WEEKLY INCOME / SALARY RECEIVED)
- [x] Salary confirm banner appears near pay day
- [x] Budget breakdown check-in flow (salary → needs → debt question)
- [x] Budget breakdown shows `/wk` amounts for weekly earners
- [x] "Do you have debt?" popup after needs confirmation
- [x] Incomplete breakdown nudge shows after login
- [x] Committed debt plan badge shows on home tab when plan active
- [ ] Tap **+** button — expense sheet opens
- [ ] Select category, enter amount, tap Save — expense appears
- [ ] Tap expense → edit works
- [ ] Swipe/tap delete on expense
- [ ] Recurring expense toggle works
- [ ] Debit orders card shows correctly
- [ ] Net worth card shows
- [ ] Debt score card shows
- [ ] Stokvel section loads
- [ ] Weekly insight popup appears (or tap to trigger)
- [ ] Search icon opens search, results show

### 💳 Debt Tab
- [x] Debt list loads from Supabase
- [x] Payoff accelerator slider works
- [x] Manual amount input synced with slider
- [x] Time formatting: "1 year 2 months" not "1y 2mo"
- [x] Commit to plan → success sheet shows with payday action
- [x] Payday push nudge scheduled on commit
- [x] "You're on this plan — committed!" badge shows
- [ ] Tap **Add debt** → form opens, all categories work
- [ ] Vehicle finance calculator works
- [ ] Mashonisa calculator works
- [ ] Save debt → appears in list
- [ ] Edit debt → values pre-filled, save works
- [ ] Delete debt → removed from list
- [ ] Debt score updates
- [ ] Payoff celebration triggers (if debt cleared)

### 🌱 Grow Tab
- [ ] Goals list loads
- [ ] Add goal → form opens, chips selectable
- [ ] Monthly contribution calculates correctly
- [ ] Save goal → appears in list
- [ ] Contribute to goal → balance updates
- [ ] Delete goal works
- [ ] Stokvel section loads

### 💡 Health Tab (Import)
- [ ] Tab opens (Pro/trial only)
- [ ] Bank selector shows
- [ ] PDF upload button works
- [ ] Statement parses via Claude API
- [ ] Import results show with confirm/remove options
- [ ] Confirm import adds transactions

### 👤 Profile Tab
- [ ] Name, income, pay day display correctly
- [ ] Edit profile sheet opens, saves correctly
- [ ] Debit orders list shows and editable
- [ ] Push notifications toggle works
- [ ] App lock toggle works
- [ ] Set PIN flow works (4-digit entry, confirm)
- [ ] Biometric lock works (if device supports)
- [ ] Bond readiness calculator opens and renders
- [ ] Sign out works

### 🔒 Lock Screen
- [ ] Lock activates after 5 min background
- [ ] PIN entry shows dots correctly
- [ ] Wrong PIN shows error
- [ ] Correct PIN unlocks
- [ ] Forgot PIN option works

### 📊 Overlays & Modals
- [ ] Monthly summary opens and shows data
- [ ] Export CSV downloads file
- [ ] Export PDF downloads file
- [ ] AI nudge loads on home tab
- [ ] Weekly planner opens and shows week data
- [ ] Share card generates image
- [ ] Referral code copies/shares
- [ ] What's new modal (on version bump)
- [ ] Upgrade wall shows for free users on pro features
- [ ] Premium sheet shows feature details

### 🌐 Auth & General
- [ ] Login works
- [ ] Register/onboarding all 5 steps work
- [ ] Forgot password sends email
- [ ] Password reset page works
- [ ] Token refresh happens silently
- [ ] Sign out clears state and returns to splash
- [ ] App works offline (cached via SW)
- [ ] PWA install prompt works

---

## Known Issues Log

| Date | Issue | File | Status |
|---|---|---|---|
| 2026-06-15 | `switchTab` missing from split — all tabs broken | transactions.js | ✅ Fixed |
| 2026-06-15 | 80+ functions missing from split files | missing.js created | ✅ Fixed |
| 2026-06-15 | `globals.js` duplicated constants → SyntaxErrors | Removed globals.js | ✅ Fixed |
| 2026-06-15 | `tp-debt`, `tp-grow`, `tp-import` outside `.tab-content` | app.html restructured | ✅ Fixed |
| 2026-06-15 | Weekly insight popup not appearing as overlay | planner.js + app.html | ✅ Fixed |
| 2026-06-15 | Income ÷4 bug — weekly earners showed wrong amount | dashboard.js | ✅ Fixed |
| 2026-06-15 | Budget breakdown auto-confirmed without user input | init.js | ✅ Fixed |
| 2026-06-15 | Supabase overwrote fresh monthly needs on every render | init.js | ✅ Fixed |
| 2026-06-16 | Sign out broken — doSignOut z-index too low | debt.js | ✅ Fixed |
| 2026-06-16 | `schedulePushNudges` called but never defined | debt.js | ✅ Fixed |
| 2026-06-16 | Payoff time showed "1y 2mo" — unprofessional format | debt.js | ✅ Fixed |
| 2026-06-16 | No manual input for accelerator amount | debt.js | ✅ Fixed |
| 2026-06-16 | No post-commitment success screen | debt.js | ✅ Fixed |
| 2026-06-16 | RLS enabled but no policies on key tables | Supabase SQL | ✅ Fixed |
| 2026-06-16 | `beta_testers_all` open policy exposed all user rows | Supabase SQL | ✅ Fixed |
| 2026-06-17 | Tools widget `<iframe>` sat outside `</html>` — never rendered | index.html | ✅ Fixed |
| 2026-06-17 | car-buffer.html nav used root-relative paths (`/about.html`) → would 404 from `pages/` | car-buffer.html | ✅ Fixed |
| 2026-06-17 | car-buffer.html "Open App" nav button + "Start Free" CTA both linked to bare homepage, not app.html | car-buffer.html | ✅ Fixed |
| 2026-06-17 | Blog + dashboard pages linked to dead `/tools` path | randwise-blog-template.html, randwise-dashboard.html | ✅ Fixed |
| 2026-06-17 | Resend API key + Supabase key exposed client-side in index.html newsletter script | index.html | ⚠️ Open — works but exposes secrets in page source |
| 2026-06-20 | "Free tools" dropdown closed if mouse crossed the visual gap between trigger and menu | All pages with dropdown | ✅ Fixed — menu padding now bridges the gap |
| 2026-06-20 | Feature/conversion links (demo, tools, blog) buried in footer with same weight as "Delete Account" | index.html footer | ✅ Fixed — moved to "Free tools" nav dropdown |
| 2026-06-20 | `randwise-referral.html` showed fake `YOUR_CODE` placeholder link to all visitors | randwise-referral.html | ✅ Fixed — honest "sign in to get your link" CTA |
| 2026-06-20 | `randwise-dashboard.html` showed fake data with no indication it wasn't real | randwise-dashboard.html | ✅ Fixed — added "Sample data" badge |
| 2026-06-20 | car-buffer.html Terms/Privacy sat in top nav instead of footer, inconsistent with rest of site | car-buffer.html | ✅ Fixed — moved to footer |
| 2026-06-20 | car-buffer.html had no mobile menu — Home/About/Partners unreachable on phones | car-buffer.html | ✅ Fixed — hamburger + slide panel added |
| 2026-06-20 | Blog "Related articles" section linked 3 cards to `#` (nowhere) | randwise-blog-template.html | ✅ Fixed — section removed |
| 2026-06-20 | `randwise-dashboard.html` and `randwise-referral.html` missing "Free tools" dropdown that every other page has | Both files | ✅ Fixed — dropdown added to both |
| 2026-06-20 | Blog page fully unlinked from site nav (no traffic can reach it) | All nav locations | ⚠️ Open — intentional for now; relink once more posts exist |
| 2026-06-20 | `about.html`, `partners.html`, `randwise-dashboard.html`, `randwise-referral.html` dropdown has no mobile fallback (hover-only, doesn't work on touch) | 4 files | ⚠️ Open — only car-buffer.html and index.html have mobile menus so far |

---

## Script Load Order (app.html)
```
auth-redirect.js   ← OTP/magic link (in <head>)
sw-init.js         ← Service worker (in <head>)
supabase.js        ← Config + state (bottom of body)
auth.js            ← Login/register
dashboard.js       ← Home tab
transactions.js    ← Expenses + switchTab
debt.js            ← Debt + goals
notifications.js   ← Push helpers
social.js          ← Share + lock constants
lock.js            ← (verify contents)
planner.js         ← (verify contents)
features.js        ← Tier + owner panel
missing.js         ← 42 recovered functions
init.js            ← App init (always last)
```

---

## Next Steps
- [ ] Continue Debt tab QA (add/edit/delete debt, vehicle calc, debt score)
- [ ] Grow tab — full QA
- [ ] Health tab — full QA
- [ ] Profile tab — full QA (sign out, PIN, lock, bond calc)
- [ ] Verify `lock.js` and `planner.js` contents (may overlap with missing.js)
- [ ] Push clean structure to GitHub
- [ ] Set up GitHub Pages deployment test
- [ ] Create staging vs production branch strategy
- [ ] Style remaining partners.html sections (Business Model, Risk Profile, Audience) to match the upgraded Company Overview section
- [ ] Move Resend + Supabase keys out of client-side JS in index.html (currently exposed in page source)
- [ ] Add mobile menu fallback to about.html, partners.html, randwise-dashboard.html, randwise-referral.html (currently hover-only dropdown, broken on touch devices)
- [ ] Decide fate of randwise-blog-template.html — write more posts and relink, or delete the file
- [ ] Full click-through test of website nav/footer across all 9 `pages/` files (not yet personally verified end-to-end — only spot-checked)

---

## Phase 2 — Data Persistence (localStorage → Supabase Sync)

### The Problem
Critical user data currently only lives in `localStorage`. If a user clears their browser, switches devices, or reinstalls the PWA — this data is lost permanently.

### The Fix: Local-First + Supabase Sync
```
WRITE → localStorage (instant, works offline)
              ↓ background sync
WRITE → Supabase (persistent, cross-device)

READ  → localStorage first (fast)
              ↓ if missing/stale
READ  → Supabase (fallback + refresh local cache)
```

### Data That Needs Migrating to Supabase

| localStorage Key | What it stores | Risk if lost | Supabase home |
|---|---|---|---|
| `rw_needs_confirmed_YYYY_M` | Monthly needs confirmation flag | User re-prompted every new device | `beta_testers.needs_confirmed_month` |
| `rw_monthly_needs` | Monthly needs amounts (rent, food etc) | Budget breakdown broken | `beta_testers.monthly_needs` (JSON column) ✅ exists |
| `rw_salary_confirmed_*` | Salary confirmation flags | Salary checkin re-triggers | `beta_testers.salary_confirmed_month` |
| `rw_debit_orders` | Manual debit orders list | Lost from budget calc | New `debit_orders` table |
| `rw_recurring` | Recurring expense templates | User has to re-add | New `recurring_expenses` table |
| `rw_lock_pin` | App lock PIN (hashed) | Lock disabled on new device | `beta_testers.lock_pin_hash` |
| `rw_custom_cats` | Custom expense categories | Custom cats disappear | New `custom_categories` table |
| `rw_stokvels` | Stokvel groups + members | Entire stokvel data lost | New `stokvels` table (already planned) |
| `rw_acc_plan` | Committed accelerator plan | Plan lost on new device | `beta_testers.accelerator_plan` ✅ exists |

### Supabase Schema Changes Needed

```sql
-- Add to beta_testers table
ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS needs_confirmed_month TEXT;
ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS salary_confirmed_month TEXT;
ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS monthly_needs JSONB DEFAULT '{}';
ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS lock_pin_hash TEXT;

-- New tables
CREATE TABLE debit_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_id UUID REFERENCES beta_testers(id),
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_id UUID REFERENCES beta_testers(id),
  category TEXT,
  category_id TEXT,
  emoji TEXT,
  amount NUMERIC,
  note TEXT,
  added TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custom_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_id UUID REFERENCES beta_testers(id),
  name TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stokvels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_id UUID REFERENCES beta_testers(id),
  name TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Implementation Order
1. `monthly_needs` + confirmation flags (highest impact, simplest schema change)
2. `debit_orders` table (affects budget calculation)
3. `recurring_expenses` (nice to have)
4. `stokvels` table (own feature)
5. `custom_categories` (low priority)
6. PIN hash sync (security improvement)

### Status
- [x] `monthly_needs` sync implemented (beta_testers.monthly_needs column)
- [x] `salary_confirmed_month` sync implemented (beta_testers.salary_confirmed_key)
- [x] `accelerator_plan` sync implemented (beta_testers.accelerator_plan column)
- [ ] Schema changes for new tables applied in Supabase
- [ ] Debit orders migrated to Supabase
- [ ] Recurring expenses migrated
- [ ] Stokvels migrated
- [ ] Custom categories migrated
- [ ] PIN hash sync implemented
- [ ] All sync tested on 2 devices
