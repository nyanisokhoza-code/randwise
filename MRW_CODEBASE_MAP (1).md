# MyRandWise — Codebase Map & QA Checklist
**Last updated:** June 2026  
**Status:** Split complete ✅ | Tabs fixed ✅ | Push to GitHub: pending

---

## Project Structure

```
randwise/
├── app.html              ← Main shell (HTML only, no inline logic)
├── css/
│   └── app.css           ← All styles
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
├── sw.js                 ← Service worker
├── manifest.json         ← PWA manifest
├── CNAME                 ← myrandwise.co.za
├── 404.html
├── reset-password.html
├── about.html
└── docs/
    ├── PROGRESS.md
    └── MRW_CODEBASE_MAP.md  ← this file
```

---

## File Map — What Lives Where

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

### `js/dashboard.js` — 943 lines | 16 functions
> Home tab rendering, stokvel management, smart budget

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

### `js/debt.js` — 1376 lines | 45 functions
> Debt tracker, payoff accelerator, goals, debit orders UI

| Function | Purpose |
|---|---|
| `loadDebtsPWA()` | Fetch debts from Supabase |
| `openAddDebtPWA()` / `closeAddDebtPWA()` / `saveDebtPWA()` | Add debt flow |
| `openEditDebtPWA()` / `deleteDebtPWA()` | Edit/delete debt |
| `onDebtCatChange()` | Handle debt category change |
| `calcVehicle()` / `setVehicleMode()` / `setVehicleTerm()` / `applyVehicleCalc()` | Vehicle finance calculator |
| `calcMashonisa()` | Mashonisa (loan shark) calculator |
| `renderPayoffAccelerator()` / `updateAccelerator()` / `setAccPct()` / `commitToAcceleratorPlan()` | Payoff accelerator |
| `openAddGoalPWA()` / `closeAddGoalPWA()` / `saveGoalPWA()` / `deleteGoalPWA()` | Savings goals |
| `loadGoalsPWA()` | Fetch goals from Supabase |
| `openContribSheet()` / `closeContribSheet()` / `saveContribution()` | Contribute to goal |
| `selectGoalChip()` / `calcGoalMonthly()` | Goal form helpers |
| `openDebitOrders()` / `closeDebitOrders()` / `renderDebitOrdersList()` / `addDebitOrder()` / `removeDebitOrder()` | Manual debit orders |
| `showToast(msg)` | Toast notification |
| `shareApp()` / `doSignOut()` | App actions |
| `renderInsights()` | Financial insights |
| `requestPushPermission()` / `enablePushNotifications()` / `disablePushNotifications()` / `isPushEnabled()` / `updatePushToggle()` / `togglePushNotifications()` | Push notifications |

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

**Lock constants declared here:** `LOCK_KEY`, `LOCK_PIN_KEY`, `LOCK_TIMEOUT`, `lockTimer`, `lockPinEntry`, `setPinEntry`, `setPinConfirm`, `setPinStage`, `setPinMode`, `lockFailCount`

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

### `js/init.js` — 2040 lines | 108 functions
> App initialisation, import tab, all checkin flows, search, monthly summary

Key areas: intro tour, bank statement import (PDF parsing via Claude API), password reset, see-all transactions, custom categories, monthly summary, premium sheet, payment confirmation, salary/needs/income checkins, search, privacy policy, terms, app rating, weekly insight popup.

---

## QA Testing Checklist

Work through this tab by tab. Open DevTools Console (F12) while testing — any red errors point straight to the broken function.

### 🏠 Home Tab
- [ ] Dashboard loads with greeting and name
- [ ] Weekly budget ring shows correct amount
- [ ] Salary confirm banner appears near pay day
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
- [ ] Debt list loads from Supabase
- [ ] Tap **Add debt** → form opens, all categories work
- [ ] Vehicle finance calculator works
- [ ] Mashonisa calculator works
- [ ] Save debt → appears in list
- [ ] Edit debt → values pre-filled, save works
- [ ] Delete debt → removed from list
- [ ] Payoff accelerator shows and slider works
- [ ] Commit to plan works
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
| 2026-06-15 | `switchTab` missing from split — all tabs broken | transactions.js (was in main.js) | ✅ Fixed |
| 2026-06-15 | 80+ functions missing from split files | missing.js created | ✅ Fixed |
| 2026-06-15 | `globals.js` duplicated constants → SyntaxErrors | Removed globals.js | ✅ Fixed |
| 2026-06-15 | `tp-debt`, `tp-grow`, `tp-import` outside `.tab-content` | app.html restructured | ✅ Fixed |
| 2026-06-15 | Weekly insight popup not appearing as overlay | Pending | 🔲 To do |

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
- [ ] Run full QA checklist above
- [ ] Fix Weekly insight popup overlay
- [ ] Verify `lock.js` and `planner.js` contents (may overlap with missing.js)
- [ ] Push clean structure to GitHub
- [ ] Set up GitHub Pages deployment test
- [ ] Create staging vs production branch strategy

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
| `rw_monthly_needs` | Monthly needs amounts (rent, food etc) | Budget breakdown broken | `beta_testers.monthly_needs` (JSON column) |
| `rw_salary_confirmed_*` | Salary confirmation flags | Salary checkin re-triggers | `beta_testers.salary_confirmed_month` |
| `rw_debit_orders` | Manual debit orders list | Lost from budget calc | New `debit_orders` table |
| `rw_recurring` | Recurring expense templates | User has to re-add | New `recurring_expenses` table |
| `rw_lock_pin` | App lock PIN (hashed) | Lock disabled on new device | `beta_testers.lock_pin_hash` |
| `rw_custom_cats` | Custom expense categories | Custom cats disappear | New `custom_categories` table |
| `rw_stokvels` | Stokvel groups + members | Entire stokvel data lost | New `stokvels` table (already planned) |

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

### Code Changes Needed (per file)

**`js/init.js`** — `maybeShowMonthlyNeedsConfirm`, `maybeShowSalaryConfirm`
- Read confirmed month from Supabase on login, cache in localStorage
- Write confirmation to both localStorage AND Supabase

**`js/transactions.js`** — `saveProfile`, debitOrders var
- On profile save, also write `monthly_needs` to Supabase
- Move debit orders to Supabase table

**`js/debt.js`** — debit orders UI functions
- `loadDebitOrders()` — fetch from Supabase, cache locally
- `addDebitOrder()` / `removeDebitOrder()` — write to Supabase + localStorage

**`js/missing.js`** — `handleSetPinComplete`
- Hash PIN before storing
- Write PIN hash to `beta_testers.lock_pin_hash`
- On login, restore PIN hash from Supabase to localStorage

**`js/dashboard.js`** — stokvel functions
- Move all stokvel CRUD to Supabase `stokvels` table

**`js/features.js`** — custom categories
- `saveCustomCat()` — write to Supabase + localStorage
- `loadCustomCats()` — read from localStorage, fallback to Supabase

### Implementation Order
1. `monthly_needs` + confirmation flags (highest impact, simplest schema change)
2. `debit_orders` table (affects budget calculation)
3. `recurring_expenses` (nice to have)
4. `stokvels` table (own feature)
5. `custom_categories` (low priority)
6. PIN hash sync (security improvement)

### Status
- [ ] Schema changes applied in Supabase
- [ ] `monthly_needs` sync implemented
- [ ] `salary_confirmed_month` sync implemented  
- [ ] Debit orders migrated to Supabase
- [ ] Recurring expenses migrated
- [ ] Stokvels migrated
- [ ] Custom categories migrated
- [ ] PIN hash sync implemented
- [ ] All sync tested on 2 devices
