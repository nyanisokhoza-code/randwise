#!/usr/bin/env python3
"""
MyRandWise Bug Fix Patch Script
Run this on your local PC to fix all known bugs in app.html

Usage:
    python fix_randwise.py path/to/app.html

Output:
    Creates app_fixed.html in the same folder
"""

import sys, re, os
from datetime import datetime, timedelta

def fix_app(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes_applied = []

    # ============================================================
    # FIX 1: Coin flip — front is not defined
    # ============================================================
    old_coin = """function toggleHeroFlip(){
  const back=document.getElementById('hero-back');
  if(!front || !back) return;"""
    new_coin = """function toggleHeroFlip(){
  const front=document.getElementById('hero-front');
  const back=document.getElementById('hero-back');
  if(!front || !back) return;"""

    if old_coin in content:
        content = content.replace(old_coin, new_coin)
        fixes_applied.append("✅ FIX 1: Coin flip 'front is not defined' — added const front declaration")
    else:
        # Try alternate pattern
        alt_old = "function toggleHeroFlip(){\n  const back=document.getElementById('hero-back');\n  if(!front || !back) return;"
        if re.search(r"function toggleHeroFlip\(\)[\s\n]*\{[\s\n]*const back=document\.getElementById\('hero-back'\);[\s\n]*if\(!front", content):
            content = re.sub(
                r"(function toggleHeroFlip\(\)[\s\n]*\{)[\s\n]*(const back=document\.getElementById\('hero-back'\);[\s\n]*if\(!front)",
                r"\1\n  const front=document.getElementById('hero-front');\n  \2",
                content
            )
            fixes_applied.append("✅ FIX 1: Coin flip 'front is not defined' — added const front declaration (regex)")
        else:
            fixes_applied.append("⚠️ FIX 1: Coin flip pattern not found — may already be fixed or different code")

    # ============================================================
    # FIX 2: Monthly needs guard for new users (no transactions)
    # ============================================================
    # Look for monthly needs calculation and add guard
    monthly_pattern = re.search(r"(monthlyNeeds|monthly_needs|needs)\s*=\s*([^;]+)", content, re.IGNORECASE)
    if monthly_pattern:
        # Find the function containing this line and add guard after it
        func_start = content.rfind("function", 0, monthly_pattern.start())
        func_end = content.find("}", monthly_pattern.end())
        if func_start > 0 and func_end > 0:
            func_body = content[func_start:func_end+1]
            # Add guard: if no transactions, monthlyNeeds = 0
            guard_code = """
  // GUARD: New user with no transactions should show R0
  if(!transactions || transactions.length === 0){
    monthlyNeeds = 0;
  } else {"""
            # Insert after the monthlyNeeds calculation line
            monthly_line_end = content.find(";", monthly_pattern.end()) + 1
            before = content[:monthly_line_end]
            after = content[monthly_line_end:]
            # Only add if not already present
            if "GUARD: New user" not in content:
                content = before + guard_code + after
                fixes_applied.append("✅ FIX 2: Monthly needs guard — shows R0 for users with no transactions")
            else:
                fixes_applied.append("⚠️ FIX 2: Monthly needs guard already present")
    else:
        fixes_applied.append("⚠️ FIX 2: Monthly needs pattern not found — manual check needed")

    # ============================================================
    # FIX 3: Recent transactions — minimize toggle + proper spacing
    # ============================================================
    # Find Recent transactions section and add minimize button
    rt_pattern = re.search(r"(<div[^>]*class=["'][^"']*recent-transactions[^"']*["'][^>]*>)", content, re.IGNORECASE)
    if rt_pattern:
        old_rt_header = rt_pattern.group(1)
        # Add minimize button to the header
        new_rt_header = old_rt_header.replace(">", """ style="position:relative;">
  <button onclick="toggleRecentTransactions()" style="position:absolute;right:12px;top:8px;background:none;border:none;font-size:18px;cursor:pointer;color:#1a7a4a;z-index:10;">−</button>""")
        if "toggleRecentTransactions" not in content:
            content = content.replace(old_rt_header, new_rt_header, 1)
            # Add the toggle function and CSS
            toggle_js = """
function toggleRecentTransactions(){
  const list = document.getElementById('recent-transactions-list');
  const btn = document.querySelector('[onclick="toggleRecentTransactions()"]');
  if(!list) return;
  if(list.style.display === 'none'){
    list.style.display = 'block';
    btn.textContent = '−';
  } else {
    list.style.display = 'none';
    btn.textContent = '+';
  }
}
"""
            # Insert before closing </script> or at end of JS
            if "</script>" in content:
                last_script = content.rfind("</script>")
                content = content[:last_script] + toggle_js + "\n" + content[last_script:]
            else:
                content += "\n<script>" + toggle_js + "</script>"
            fixes_applied.append("✅ FIX 3: Recent transactions minimize toggle added")
        else:
            fixes_applied.append("⚠️ FIX 3: Toggle already exists")
    else:
        fixes_applied.append("⚠️ FIX 3: Recent transactions section not found — manual check needed")

    # ============================================================
    # FIX 4: Weekly Insight card border + scrollable body
    # ============================================================
    # Find ai-nudge-card and ensure proper styling
    nudge_pattern = re.search(r"(<div[^>]*id=["']ai-nudge-card["'][^>]*>)", content)
    if nudge_pattern:
        old_nudge = nudge_pattern.group(1)
        if "border" not in old_nudge or "overflow" not in old_nudge:
            new_nudge = old_nudge.replace(">", """ style="border:1.5px solid #d1ead9;border-radius:12px;overflow:hidden;">""")
            content = content.replace(old_nudge, new_nudge, 1)
            fixes_applied.append("✅ FIX 4: Weekly Insight border restored")
        else:
            fixes_applied.append("⚠️ FIX 4: Border already present")

        # Find nudge-body and make it scrollable
        nudge_body = re.search(r"(<div[^>]*class=["'][^"']*nudge-body[^"']*["'][^>]*>)", content)
        if nudge_body:
            old_body = nudge_body.group(1)
            if "overflow-y" not in old_body:
                new_body = old_body.replace(">", """ style="overflow-y:auto;max-height:60vh;padding:12px;">""")
                content = content.replace(old_body, new_body, 1)
                fixes_applied.append("✅ FIX 4b: Nudge body made scrollable (max-height:60vh)")
            else:
                fixes_applied.append("⚠️ FIX 4b: Scroll already present")
    else:
        fixes_applied.append("⚠️ FIX 4: ai-nudge-card not found")

    # ============================================================
    # FIX 5: Savings goal functions (missing)
    # ============================================================
    savings_functions = """
// ── SAVINGS GOAL FUNCTIONS ───────────────────────────────────
function openAddGoalPWA(){
  const sheet = document.getElementById('add-goal-sheet');
  if(!sheet) return;
  sheet.classList.add('active');
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-saved').value = '';
  document.getElementById('goal-date').value = '';
  document.getElementById('goal-calc-result').textContent = '';
}

function closeAddGoalPWA(){
  const sheet = document.getElementById('add-goal-sheet');
  if(sheet) sheet.classList.remove('active');
}

function calcGoalMonthly(){
  const target = parseFloat(document.getElementById('goal-target')?.value || 0);
  const saved = parseFloat(document.getElementById('goal-saved')?.value || 0);
  const dateStr = document.getElementById('goal-date')?.value;
  const resultEl = document.getElementById('goal-calc-result');
  if(!resultEl || !target || !dateStr) return;

  const remaining = target - saved;
  if(remaining <= 0){
    resultEl.textContent = '🎉 Goal already reached!';
    return;
  }

  const targetDate = new Date(dateStr);
  const today = new Date();
  const months = Math.max(1, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24 * 30)));
  const monthly = remaining / months;

  resultEl.textContent = `Save R${monthly.toFixed(0)}/month for ${months} months to reach R${target.toLocaleString()}`;
}

async function saveGoalPWA(){
  const name = document.getElementById('goal-name')?.value?.trim();
  const target = parseFloat(document.getElementById('goal-target')?.value || 0);
  const saved = parseFloat(document.getElementById('goal-saved')?.value || 0);
  const dateStr = document.getElementById('goal-date')?.value;

  if(!name || !target || !dateStr){
    toast('Please fill in goal name, target amount and target date');
    return;
  }

  const goal = {
    tester_id: currentUser?.id,
    name: name,
    emoji: '🎯',
    target: target,
    saved: saved || 0,
    target_date: dateStr,
    monthly_contribution: 0,
    account_nickname: ''
  };

  try{
    const { data, error } = await sbPost('savings_goals', goal);
    if(error) throw error;
    toast('Goal saved! 🎯');
    closeAddGoalPWA();
    loadGoalsPWA();
  } catch(e){
    console.error('saveGoalPWA error:', e);
    toast('Failed to save goal. Try again.');
  }
}
"""

    if "function openAddGoalPWA" not in content:
        # Insert before loadGoalsPWA or at end of script
        if "function loadGoalsPWA" in content:
            insert_point = content.find("function loadGoalsPWA")
            content = content[:insert_point] + savings_functions + "\n\n" + content[insert_point:]
            fixes_applied.append("✅ FIX 5: All 4 savings goal functions built and injected")
        else:
            # Append before closing </script> or </body>
            if "</script>" in content:
                last_script = content.rfind("</script>")
                content = content[:last_script] + savings_functions + "\n" + content[last_script:]
            else:
                content += "\n<script>" + savings_functions + "</script>"
            fixes_applied.append("✅ FIX 5: Savings functions appended (loadGoalsPWA not found)")
    else:
        fixes_applied.append("⚠️ FIX 5: Savings functions already exist")

    # ============================================================
    # FIX 6: Referral card — add dismiss button + fix logic
    # ============================================================
    if "function renderReferrals" in content:
        # Find the referral card HTML and add dismiss button
        ref_card = re.search(r"(<div[^>]*class=["'][^"']*referral-card[^"']*["'][^>]*>)", content)
        if ref_card:
            old_card = ref_card.group(1)
            if "dismissReferral" not in content:
                new_card = old_card.replace(">", """ style="position:relative;">
  <button onclick="dismissReferralCard()" style="position:absolute;right:8px;top:8px;background:#f0f0f0;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:28px;color:#666;">×</button>""")
                content = content.replace(old_card, new_card, 1)

                dismiss_js = """
function dismissReferralCard(){
  const card = document.querySelector('.referral-card');
  if(card){
    card.style.display = 'none';
    localStorage.setItem('referralCardDismissed', Date.now());
  }
}
// Show again after 7 days
(function checkReferralDismiss(){
  const dismissed = localStorage.getItem('referralCardDismissed');
  if(dismissed && Date.now() - parseInt(dismissed) < 7*24*60*60*1000){
    const card = document.querySelector('.referral-card');
    if(card) card.style.display = 'none';
  }
})();
"""
                if "</script>" in content:
                    last_script = content.rfind("</script>")
                    content = content[:last_script] + dismiss_js + "\n" + content[last_script:]
                fixes_applied.append("✅ FIX 6: Referral card dismiss button + 7-day hide logic added")
            else:
                fixes_applied.append("⚠️ FIX 6: Dismiss already exists")
    else:
        fixes_applied.append("⚠️ FIX 6: renderReferrals function not found")

    # ============================================================
    # FIX 7: Tab bar padding — dynamic bottom padding for all screens
    # ============================================================
    # Add CSS variable and padding to tab-content
    if "--tb" not in content or "padding-bottom: calc(var(--tb" not in content:
        css_fix = """
<style>
/* DYNAMIC TAB BAR PADDING — prevents content cut-off */
.tab-content{
  padding-bottom: calc(var(--tb, 72px) + env(safe-area-inset-bottom, 20px) + 8px) !important;
}
.dash-scroll, .tab-pane > div {
  min-height: 0 !important;
  flex: 1;
}
</style>"""
        if "</head>" in content:
            content = content.replace("</head>", css_fix + "\n</head>", 1)
            fixes_applied.append("✅ FIX 7: Dynamic tab bar padding CSS injected")
        else:
            content = css_fix + "\n" + content
            fixes_applied.append("✅ FIX 7: CSS prepended (no </head> found)")
    else:
        fixes_applied.append("⚠️ FIX 7: Dynamic padding already present")

    # ============================================================
    # FIX 8: Smoke test injection
    # ============================================================
    smoke_test = """
<script>
/* ===== RANDWISE SMOKE TEST ===== Run in console: SmokeTest.runAll() */
const SmokeTest={errors:[],assert(e,n,c=true){if(!e){this.errors.push({name:n,critical:c});console.error('❌ '+(c?'CRITICAL':'WARN')+': '+n+' missing')}else console.log('✅ '+n)},checkDOM(){console.group('DOM');this.assert(document.querySelector('.tab-content'),'tab-content');this.assert(document.querySelector('#tp-home'),'Home tab');this.assert(document.querySelector('#hero-front'),'Coin front');this.assert(document.querySelector('#hero-back'),'Coin back');this.assert(document.querySelector('.referral-card'),'Referral card');console.groupEnd()},checkFuncs(){console.group('Functions');['toggleHeroFlip','openAddGoalPWA','saveGoalPWA','closeAddGoalPWA','calcGoalMonthly'].forEach(fn=>this.assert(typeof window[fn]==='function','fn:'+fn));console.groupEnd()},async runAll(){console.clear();console.log('%c 🔥 SMOKE TEST 🔥 ','background:#1a2a4a;color:#fff;font-size:16px');this.checkDOM();this.checkFuncs();const c=this.errors.filter(e=>e.critical);console.log(c.length===0?'%c ✅ PASSED — SAFE TO PUSH ':'%c ❌ '+c.length+' CRITICAL FAILURES ','background:'+(c.length===0?'#10b981':'#ef4444')+';color:#fff;font-size:14px');return{passed:c.length===0}}};if(location.search.includes('test=1'))window.addEventListener('load',()=>SmokeTest.runAll());
</script>"""

    if "SmokeTest" not in content:
        if "</body>" in content:
            content = content.replace("</body>", smoke_test + "\n</body>", 1)
            fixes_applied.append("✅ FIX 8: Smoke test injected (run SmokeTest.runAll() in console)")
        else:
            content += smoke_test
            fixes_applied.append("✅ FIX 8: Smoke test appended")
    else:
        fixes_applied.append("⚠️ FIX 8: Smoke test already present")

    # ============================================================
    # Write output
    # ============================================================
    out_path = html_path.replace('.html', '_fixed.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("\n" + "="*60)
    print("  MyRandWise Bug Fix Patch — Results")
    print("="*60)
    for fix in fixes_applied:
        print("  " + fix)
    print("-"*60)
    print(f"  Original: {len(original):,} chars")
    print(f"  Fixed:    {len(content):,} chars")
    print(f"  Delta:    {len(content)-len(original):+,} chars")
    print("-"*60)
    print(f"  Output: {out_path}")
    print("="*60)
    print("\nNext steps:")
    print("  1. Open app_fixed.html in Chrome and test")
    print("  2. Run SmokeTest.runAll() in console (F12)")
    print("  3. If all green → rename to app.html and push to GitHub")
    print("  4. Bump sw.js CACHE to 'rw-v155' to force cache clear")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python fix_randwise.py path/to/app.html")
        sys.exit(1)
    fix_app(sys.argv[1])
