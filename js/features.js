// ── FEATURES: refresh, upgrade, tier management ─────────────────
// App refresh, upgrade wall display, PayFast integration,
// subscription tier UI updates.
// ══ REFRESH APP ═════════════════════════════════════════════
async function refreshApp(){
  const btn=document.querySelector('[onclick="refreshApp()"]');
  if(btn){btn.style.animation='spin .6s linear infinite';btn.style.display='inline-block';}
  showToast('🔄 Refreshing...');
  if(user?.id){
    try{
      const f=await sbG(`beta_testers?id=eq.${user.id}&limit=1&select=*`);
      showToast('✅ Up to date');
    }catch{showToast('⚠️ Could not refresh — check connection');}
  }
  if(btn){btn.style.animation='';}
}

// ══ FROZEN SCREEN DETECTION ══════════════════════════════════
// Only show error if user TAPS a button and nothing happens within 3 seconds
function armFrozenCheck(){
  const timer = setTimeout(()=>{
    // If still on splash after tapping - something is wrong
    const splash = document.getElementById('splash');
    if(splash && splash.classList.contains('active')){
      document.getElementById('splash-error').style.display = 'block';
    }
  }, 3000);
  // If we navigate away, cancel the timer
  document.addEventListener('click', ()=> clearTimeout(timer), {once:true});
}
document.getElementById('splash')?.addEventListener('click', (e)=>{
  if(e.target.tagName === 'BUTTON') armFrozenCheck();
});

// ══ REPORT ISSUE ════════════════════════════════════════════

// ── Goal-triggered welcome email ─────────────────────────────
async function sendGoalWelcomeEmail(name, email, goals){
  if(!email||!goals||!goals.length) return;
  const firstName = name.split(' ')[0];

  // Pick the single most specific goal to lead with
  const priority = [
    'Pay off my debt',
    'Save for a home',
    'Save for education',
    'Start investing',
    'Build an emergency fund',
    'Make my money last the whole month',
    'Provide for my family',
    'Know where my money goes',
    'Save for a holiday',
    'Understand my spending'
  ];
  const lead = priority.find(p => goals.includes(p)) || goals[0];

  const templates = {
    'Pay off my debt': {
      subject: `${firstName}, here's your debt-free plan — MyRandWise`,
      headline: `You said you want to pay off your debt. Here's exactly how.`,
      body: `Most people with debt don't have a plan — they just pay minimums and hope for the best. That's why it takes 8 years instead of 3.

MyRandWise shows you the snowball method: attack your smallest debt first with every extra rand, then roll that payment onto the next one. It's not magic — it's math. And it works.

<strong>What to do right now:</strong>
<ol>
<li>Open MyRandWise and go to the Debt tab</li>
<li>Add each debt — name, balance, minimum payment</li>
<li>See your Debt Score and your payoff timeline</li>
<li>Use the Payoff Accelerator to see what even R200/mo extra does</li>
</ol>

One user added their debts and saw they could be debt-free 4 years sooner by moving R300/mo. That's R300 they already had — they just didn't know where to put it.`,
      cta: 'See my debt-free date →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    },
    'Save for a home': {
      subject: `${firstName}, your home deposit plan starts here — MyRandWise`,
      headline: `You said you want to save for a home. Let's make it real.`,
      body: `Saving for a home in South Africa feels impossible until you have a number. Most people guess — "I need like R100,000?" — and never actually start.

MyRandWise gives you a Bond Readiness Score and shows you exactly how much to save each month to hit your deposit target by a specific date.

<strong>What to do right now:</strong>
<ol>
<li>Open MyRandWise and check your Bond Readiness Score (under Grow)</li>
<li>Create a "Home deposit" savings goal with your target amount</li>
<li>The app will tell you: save R X/mo → ready in Y months</li>
<li>Watch your score improve as your savings grow</li>
</ol>

The average first-time buyer in South Africa needs R80,000–R150,000 for a deposit. Break that down to a monthly number and it becomes a plan, not a dream.`,
      cta: 'Check my bond readiness →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    },
    'Save for education': {
      subject: `${firstName}, a plan for education fees that actually works — MyRandWise`,
      headline: `Education in South Africa is expensive. Here's how to stay ahead of it.`,
      body: `Whether it's your own studies or your child's, education costs don't wait. Fees go up every year. Bursaries aren't guaranteed. The only thing that helps is starting early with a plan.

MyRandWise helps you set a specific savings goal — "R45,000 by February 2027" — and shows you exactly what to put away each month to get there. No spreadsheet required.

<strong>What to do right now:</strong>
<ol>
<li>Open MyRandWise and go to the Grow tab</li>
<li>Create a new savings goal — name it "Education fees" or "Fees 2027"</li>
<li>Set your target amount and date</li>
<li>MyRandWise will tell you exactly how much to save monthly</li>
</ol>

The earlier you start, the smaller the monthly amount. R500/mo for 3 years beats R2,000/mo for 9 months — and your stress levels will thank you.`,
      cta: 'Set my education goal →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    },
    'Start investing': {
      subject: `${firstName}, you want to invest — here's where to start — MyRandWise`,
      headline: `Investing isn't just for wealthy people. Here's the honest starting point.`,
      body: `The hardest part of investing isn't choosing the right ETF. It's knowing if you actually have money to invest — after debt, after bills, after life.

MyRandWise shows you your real disposable income: what's left after every commitment. That number is your investing starting point. Even R200/mo in a TFSA, started today, is worth more than R5,000/mo started in 5 years.

<strong>What to do right now:</strong>
<ol>
<li>Open MyRandWise — look at "After commitments" on the home screen</li>
<li>That's your real free money. Even 10% of it goes a long way.</li>
<li>Use the Payoff Accelerator to clear any debt first — debt interest beats investment returns</li>
<li>Once debt is clear, that freed money becomes your investment budget</li>
</ol>

South Africa's TFSA (Tax-Free Savings Account) lets you invest R36,000/year completely tax-free. That's the first account every South African should have.`,
      cta: 'See my free money →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    },
    'Build an emergency fund': {
      subject: `${firstName}, one unexpected bill shouldn't derail everything — MyRandWise`,
      headline: `An emergency fund is the most important financial move you can make.`,
      body: `Before investing. Before extra debt payments. Before anything else: 3 months of expenses in a savings account you don't touch.

Why? Because without it, one car repair or medical bill puts you back on credit. With it, you handle it and move on.

MyRandWise helps you calculate exactly what 3 months of your expenses looks like — and how many months it takes to get there from what you can actually save.

<strong>What to do right now:</strong>
<ol>
<li>Open MyRandWise and check your monthly expenses total</li>
<li>Multiply by 3 — that's your emergency fund target</li>
<li>Create a "Emergency fund" goal in the Grow tab</li>
<li>Set your monthly saving amount and watch the timeline</li>
</ol>

Most South Africans could build a 3-month emergency fund in under 18 months with R500–R1,000/mo. Start with whatever you have.`,
      cta: 'Build my emergency fund →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    },
    'Make my money last the whole month': {
      subject: `${firstName}, why your money runs out — and how to fix it — MyRandWise`,
      headline: `You're not spending too much. You just don't know where it's going yet.`,
      body: `Most people who feel broke at month-end aren't actually spending irresponsibly. They're spending in the dark — no clear picture of what's left after bills and debt.

MyRandWise shows you the number nobody tells you: what's actually yours after every debit order, every minimum payment, every regular expense. That number is your real budget — not your salary.

<strong>What to do right now:</strong>
<ol>
<li>Open MyRandWise — the home screen shows "After commitments"</li>
<li>That's what you actually have left to spend this month</li>
<li>Log your expenses as you go — takes 10 seconds each</li>
<li>The weekly planner breaks your free money into 4 manageable weeks</li>
</ol>

Users who log expenses for just 2 weeks say they find R800–R2,000 they didn't know they were spending. Not to guilt-trip — to choose.`,
      cta: 'See what I actually have →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    },
    'default': {
      subject: `${firstName}, your MyRandWise plan is ready`,
      headline: `You've got goals. Here's how MyRandWise helps you reach them.`,
      body: `You signed up with ${goals.length} goal${goals.length!==1?'s':''} in mind: <strong>${goals.join(', ')}</strong>.

Every feature in MyRandWise was built around goals exactly like yours. Here's where to start:

<strong>This week:</strong>
<ol>
<li>Check your "After commitments" number on the home screen — that's your real free money</li>
<li>Log your first expenses to see where your money actually goes</li>
<li>Add your debts in the Debt tab if you have any</li>
<li>Set your first savings goal in the Grow tab</li>
</ol>

The app gets more useful the more you use it. Most users see their full financial picture clearly within 2 weeks.`,
      cta: 'Open MyRandWise →',
      cta_url: 'https://myrandwise.co.za/randwise/'
    }
  };

  const t = templates[lead] || templates['default'];

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e0">
  <div style="background:#1a5c35;padding:28px 32px">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">MyRandWise</div>
    <div style="font-size:12px;color:#a8d5b8;margin-top:2px">Your money. Your plan.</div>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;color:#888;margin:0 0 8px">Hi ${firstName},</p>
    <h2 style="font-size:20px;font-weight:700;color:#1a1a18;margin:0 0 20px;line-height:1.3">${t.headline}</h2>
    <div style="font-size:14px;color:#444;line-height:1.8">${t.body.split('\n').join('<br>')}</div>
    <div style="margin:28px 0">
      <a href="${t.cta_url}" style="display:inline-block;background:#1a5c35;color:#ffffff;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">${t.cta}</a>
    </div>
    <hr style="border:none;border-top:1px solid #f0f0e8;margin:24px 0">
    <p style="font-size:12px;color:#aaa;margin:0;line-height:1.7">You're getting this because you signed up for MyRandWise and selected goals during onboarding. If you have questions, reply to this email.<br><br>MyRandWise · <a href="https://myrandwise.co.za/randwise/" style="color:#1a5c35">myrandwise.co.za</a></p>
  </div>
</div>
</body>
</html>`;

  try{
    await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer re_G4nEVBHr_oVQovCPqcBCeUgtV5f6FknqS'},
      body:JSON.stringify({
        from:'MyRandWise <support@myrandwise.co.za>',
        to:[email],
        subject: t.subject,
        html
      })
    });
  }catch(e){ console.warn('Goal welcome email failed:',e); }
}

async function sendOwnerAlert(type, data){
  // Severity classification
  const critical = ['login_failed','login_help','reset_failed','duplicate_attempt',
                    'connectivity_failure','unresponsive_ui','user_report_critical'];
  const isCritical = critical.includes(type) || data?.error_source === 'user_report_critical';

  const msgs = {
    new_user: `🌱 New user: ${data.name} (${data.email}) — ${data.life_stage} — R${Number(data.income_amount||0).toLocaleString('en-ZA')}/mo${data.referred_by?' — ref: '+data.referred_by:''}`,
    upgrade: `💰 Upgrade: ${data.name} → ${data.tier} — R${data.amount}/mo`,
    bug_report: `${isCritical?'🚨 CRITICAL':'🐛'} Bug from ${data.user_name||'unknown'}: ${data.error_message}`,
    reset_requested: `🔑 Password reset requested: ${data.email}`,
    reset_failed: `⚠️ Reset FAILED — email not found: ${data.email}. User may try to create duplicate account.`,
    reset_error: `❌ Reset error for ${data.email}: ${data.error}`,
    duplicate_attempt: `🔁 DUPLICATE ACCOUNT — ${data.name} (${data.email}) tried to register again. Help them sign in.`,
    login_failed: `🔐 LOGIN FAILED — ${data.email} — attempt ${data.attempts} — reason: ${data.reason}.`,
    login_help: `🆘 LOGIN HELP — ${data.email} cannot get in. Please assist manually within 24h.`,
    connectivity_failure: `🚨 OUTAGE — ${data.error_message}`,
    unresponsive_ui: `🚨 UI FROZEN — ${data.user_name}: ${data.error_message}`,
    export: `📤 Export: ${data.name} downloaded ${data.type} (${data.count} transactions)`,
    bond_apply: `🏠 Bond inquiry: ${data.name} (R${Number(data.income||0).toLocaleString('en-ZA')}/mo income)`,
  };

  const summary = msgs[type] || `Alert [${type}]: ${JSON.stringify(data)}`;

  // Track critical issues for 24h escalation
  if(isCritical){
    const key = `rw_alert_${type}_${data.email||data.user_name||'sys'}`;
    const existing = localStorage.getItem(key);
    if(!existing){
      localStorage.setItem(key, Date.now().toString());
    } else {
      const age = Date.now() - parseInt(existing);
      if(age > 86400000){ // 24 hours passed — escalate
        data._escalated = true;
        data._hours_open = Math.round(age/3600000);
        localStorage.removeItem(key); // reset so it can fire again
      }
    }
  }

  try{
    await fetch(`${SB}/functions/v1/send-alert`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':AK,'Authorization':'Bearer '+AK},
      body:JSON.stringify({
        type,
        data,
        summary,
        severity: isCritical ? 'critical' : 'info',
        escalated: data._escalated || false,
        from_name: 'MyRandWise Alerts',
        reply_to: 'noreply@myrandwise.co.za'
      })
    });
  }catch(e){ console.warn('Alert send failed:',e); }
}

// ── Report a Problem — proper form ──────────────────────────
function reportIssue(){
  // Remove existing modal if any
  const existing = document.getElementById('report-modal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'report-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;
    display:flex;align-items:flex-end;justify-content:center;
    animation:fadeIn .2s ease;
  `;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:24px 24px 40px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
      <div style="width:36px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 20px;"></div>
      <div style="font-size:18px;font-weight:800;color:#1a1a1a;margin-bottom:4px;">Report a problem</div>
      <div style="font-size:13px;color:#888;margin-bottom:20px;">We'll look into this and get back to you.</div>

      <div style="margin-bottom:14px;">
        <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:6px;">YOUR NAME</label>
        <input id="rp-name" type="text" placeholder="e.g. Thandi" value="${(typeof user!=='undefined'&&user?.name)||''}"
          style="width:100%;box-sizing:border-box;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:14px;outline:none;">
      </div>

      <div style="margin-bottom:14px;">
        <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:6px;">WHAT WENT WRONG? <span style="color:#c00">*</span></label>
        <select id="rp-category" style="width:100%;box-sizing:border-box;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:14px;background:#fff;outline:none;margin-bottom:10px;">
          <option value="">— Select issue type —</option>
          <option value="login">Can't log in / password reset not working</option>
          <option value="data">My data isn't saving or showing</option>
          <option value="buttons">Buttons not responding</option>
          <option value="loading">Page won't load / stuck on loading</option>
          <option value="bank_import">Bank statement import failed</option>
          <option value="payments">Payment / upgrade issue</option>
          <option value="other">Something else</option>
        </select>
        <textarea id="rp-desc" rows="3" placeholder="Tell us more — what were you doing when it happened?"
          style="width:100%;box-sizing:border-box;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:14px;resize:none;outline:none;"></textarea>
      </div>

      <div id="rp-error" style="color:#c00;font-size:12px;margin-bottom:10px;display:none;"></div>

      <button onclick="submitReport()" style="width:100%;background:#1a5c35;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">
        Send report →
      </button>
      <button onclick="document.getElementById('report-modal').remove()"
        style="width:100%;background:none;border:none;color:#999;font-size:13px;cursor:pointer;padding:8px;">
        Cancel
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  // Close on backdrop tap
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
}

async function submitReport(){
  const name = document.getElementById('rp-name')?.value?.trim() || (typeof user!=='undefined'&&user?.name) || 'Anonymous';
  const category = document.getElementById('rp-category')?.value;
  const desc = document.getElementById('rp-desc')?.value?.trim();
  const errEl = document.getElementById('rp-error');

  if(!category){ errEl.textContent='Please select an issue type.'; errEl.style.display='block'; return; }
  if(!desc){ errEl.textContent='Please describe what happened.'; errEl.style.display='block'; return; }
  if(errEl) errEl.style.display='none';

  // Determine severity
  const serious = ['login','payments','loading'].includes(category);
  const errorSource = serious ? 'user_report_critical' : 'user_report';

  const reportData = {
    user_id: (typeof user!=='undefined'&&user?.id) || null,
    user_name: name,
    error_message: `[${category.toUpperCase()}] ${desc}`,
    error_source: errorSource,
    error_line: 0,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString()
  };

  const btn = document.querySelector('#report-modal button');
  if(btn){ btn.textContent = 'Sending...'; btn.disabled = true; }

  try{
    await fetch(`${SB}/rest/v1/bug_reports`,{
      method:'POST',
      headers:{...H,'Prefer':'return=minimal'},
      body:JSON.stringify(reportData)
    });
    sendOwnerAlert('bug_report', reportData);
    document.getElementById('report-modal').remove();
    showToast(serious
      ? '🚨 Report sent — this is marked urgent and we\'ll respond ASAP.'
      : '✅ Report sent. Thank you! We\'ll look into this.');
  }catch{
    if(btn){ btn.textContent='Send report →'; btn.disabled=false; }
    if(errEl){ errEl.textContent='Could not send. Please try again.'; errEl.style.display='block'; }
  }
}

// ══ HARD REFRESH ════════════════════════════════════════════
function hardRefresh(){
  window.location.reload();
}

// ══ PULL TO REFRESH ═════════════════════════════════════════
let ptr_startY=0,ptr_pulling=false,ptr_lastRefresh=0;
const ptr_threshold=120; // Increased from 80 to reduce accidental triggers
function getScrollContainer(){
  // Get the actual scroll container - tab-content or the active tab's inner div
  const tc=document.querySelector('.tab-content');
  return tc||document.body;
}
document.addEventListener('touchstart',e=>{
  const sc=getScrollContainer();
  if(sc.scrollTop===0) ptr_startY=e.touches[0].clientY;
},{ passive:true});
document.addEventListener('touchmove',e=>{
  if(!ptr_startY) return;
  const dy=e.touches[0].clientY-ptr_startY;
  const sc=getScrollContainer();
  if(dy>20&&sc.scrollTop===0) ptr_pulling=true;
},{ passive:true});
document.addEventListener('touchend',e=>{
  if(ptr_pulling&&ptr_startY>0){
    const dy=e.changedTouches[0].clientY-ptr_startY;
    const now2=Date.now();
    if(dy>ptr_threshold&&user?.id&&(now2-ptr_lastRefresh)>10000){
      ptr_lastRefresh=now2;
      showToast('🔄 Refreshing...');
      Promise.all([
        loadExp().catch(()=>{}),
        sbG(`debts?tester_id=eq.${user?.id}&order=balance.asc`).then(d=>{debts=d||[];}).catch(()=>{debts=[];})
      ]).then(()=>{renderDash();showToast('✅ Updated');});
    }
  }
  ptr_startY=0; ptr_pulling=false;
});

// ══ GLOBAL ERROR HANDLER ═════════════════════════════════════
let _errCount=0;
window.addEventListener('error',async(e)=>{
  _errCount++;
  // Log to Supabase silently
  try{
    await fetch(`${SB}/rest/v1/bug_reports`,{
      method:'POST',
      headers:{...H,'Prefer':'return=minimal'},
      body:JSON.stringify({
        user_id:user?.id||null,
        user_name:user?.name||'unknown',
        error_message:e.message||'Unknown error',
        error_source:e.filename||'',
        error_line:e.lineno||0,
        page_url:window.location.href,
        user_agent:navigator.userAgent,
        created_at:new Date().toISOString()
      })
    });
  }catch{}
  // Alert owner on repeated errors
  if(_errCount===3){
    sendOwnerAlert('bug_report',{
      user_name:user?.name||'unknown',
      error_message:`Repeated errors (3x): ${e.message} @ ${e.filename||''}:${e.lineno||0}`
    });
    showToast('⚠️ Something went wrong. Pull down to refresh.');
  }
});

// ══ SMART MAINTENANCE SYSTEM ════════════════════════════════
// Two triggers: (1) auto-detect Supabase unreachable, (2) manual admin switch
// Severity detection: serious issues notify owner immediately

async function checkConnectivity(){
  try{
    const r = await fetch(`${SB}/rest/v1/beta_testers?limit=0`,{
      headers:{'apikey':AK,'Authorization':'Bearer '+AK},
      signal:AbortSignal.timeout(5000)
    });
    return r.ok || r.status===406 || r.status===400 || r.status===401;
  }catch{ return false; }
}

async function checkManualMaintenanceFlag(){
  try{
    const r = await fetch(`${SB}/rest/v1/app_config?key=eq.maintenance_mode&select=value`,{
      headers:{'apikey':AK,'Authorization':'Bearer '+AK},
      signal:AbortSignal.timeout(1500)
    });
    if(r.ok){const data=await r.json();return data?.[0]?.value==='true';}
  }catch{}
  return false;
}

// Global notification/popup settings loaded from app_config
let APP_SETTINGS = {
  daily_reminder: true,
  debt_intervention: true,
  debt_intervention_threshold: 60,
  share_nudge: true,
  share_nudge_frequency: 'weekly',
  whats_new_popup: true,
  about_screen: true,
  monthly_recap: true,
  upgrade_nudge: true,
  upgrade_nudge_text: "Unlock the full power of MyRandWise — from R49/mo"
};

async function loadAppSettings(){
  try{
    const r=await fetch(`${SB}/rest/v1/app_config?key=like.setting_*&select=key,value`,{
      headers:{'apikey':AK,'Authorization':'Bearer '+AK},
      signal:AbortSignal.timeout(1500)
    });
    if(r.ok){
      const data=await r.json();
      data.forEach(row=>{
        const k=row.key.replace('setting_','');
        if(k in APP_SETTINGS){
          // Parse booleans, numbers and strings
          const v=row.value;
          if(v==='true')APP_SETTINGS[k]=true;
          else if(v==='false')APP_SETTINGS[k]=false;
          else if(!isNaN(Number(v))&&v!=='')APP_SETTINGS[k]=Number(v);
          else APP_SETTINGS[k]=v;
        }
      });
    }
  }catch(e){console.warn('Could not load app settings, using defaults',e);}
}

function getSetting(key){
  return APP_SETTINGS[key]??true;
}

function goToMaintenance(reason){
  // Store reason so maintenance page can show it
  sessionStorage.setItem('maintenance_reason', reason || 'scheduled');
  document.body.innerHTML='<div style="position:fixed;inset:0;background:#1a5c35;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:24px"><div style="font-size:64px;margin-bottom:24px">🌱</div><div style="font-size:24px;font-weight:800;margin-bottom:12px">Back soon</div><div style="font-size:15px;opacity:.8;max-width:280px;line-height:1.6">MyRandWise is under maintenance. We will be back shortly.</div></div>';
}

// Button unresponsiveness detection
// If user taps any interactive element 5+ times with no response in 8 seconds → flag
// Excludes PIN pad, lock screen, and any open sheets
let _deadTapCount = 0;
let _deadTapTimer = null;
function trackDeadTap(){
  // Never fire during PIN entry, lock screen, open sheets, or accelerator buttons
  const lockVisible = document.getElementById('app-lock-screen')?.style?.display === 'flex';
  const setPinOpen = document.getElementById('set-pin-sheet')?.classList?.contains('open');
  const anySheetOpen = document.querySelector('.sheet.open');
  const onPinPad = event?.target?.closest?.('#app-lock-screen, #set-pin-sheet');
  // Exclude accelerator % buttons and slider — user taps these repeatedly by design
  const onAccelerator = event?.target?.closest?.('#payoff-accelerator, #accelerator-scenarios');
  // Exclude debt tab buttons (mark payment, delete, edit) 
  const onDebtCard = event?.target?.closest?.('#debt-list-pwa');
  // Exclude hero flip — tapping coin/header is intentional interactive element
  const onHeroFlip = event?.target?.closest?.('#hero-flip-inner, #ring-wrap, #ring-svg');
  if(lockVisible || setPinOpen || anySheetOpen || onPinPad || onAccelerator || onDebtCard || onHeroFlip) return;

  _deadTapCount++;
  clearTimeout(_deadTapTimer);
  _deadTapTimer = setTimeout(()=>{ _deadTapCount=0; }, 15000);
  if(_deadTapCount >= 15){ // Increased from 10 to 15 to reduce false positives
    _deadTapCount = 0;
    // Check if we're on main app (not splash)
    const mainEl = document.getElementById('main');
    if(mainEl && mainEl.style.display !== 'none'){
      sendOwnerAlert('bug_report',{
        user_name: user?.name||'unknown',
        error_message: 'BUTTONS UNRESPONSIVE — user tapped 5+ times with no response',
        error_source: 'unresponsive_ui',
        page_url: window.location.href
      });
      goToMaintenance('unresponsive');
    }
  }
}

let _offlineCount = 0;
let _maintenanceNotified = false;

window.addEventListener('load', ()=>{

  // Dead tap tracking on all buttons
  document.addEventListener('click', e=>{
    const el = e.target.closest('button, [onclick], .tab-btn');
    if(el) trackDeadTap();
  }, true);

  // Main connectivity + manual flag check every 30s
  setInterval(async()=>{
    if(document.hidden) return;

    // Skip if maintenance suppressed (e.g. right after choosing free plan)
    if(window._suppressMaintenanceUntil && Date.now() < window._suppressMaintenanceUntil) return;

    // Don't redirect during PIN setup, lock screen, or any open sheet
    const anySheetOpen = document.querySelector('.sheet.open');
    const lockVisible = document.getElementById('app-lock-screen')?.style?.display === 'flex';
    const setPinOpen = document.getElementById('set-pin-sheet')?.classList?.contains('open');
    if(anySheetOpen || lockVisible || setPinOpen) return;

    // Check manual override first (admin flipped switch)
    const manualMaintenance = await checkManualMaintenanceFlag();
    if(manualMaintenance){
      goToMaintenance('manual');
      return;
    }

    // Auto-detect: Supabase unreachable
    const online = await checkConnectivity();
    if(!online){
      _offlineCount++;
      if(_offlineCount >= 2){
        // Only notify owner once per outage
        if(!_maintenanceNotified){
          _maintenanceNotified = true;
          sendOwnerAlert('bug_report',{
            user_name: user?.name||'system',
            error_message: '🚨 CRITICAL: App went to maintenance — Supabase unreachable for 60+ seconds',
            error_source: 'connectivity_failure',
            page_url: window.location.href
          });
        }
        goToMaintenance('outage');
      }
    } else {
      _offlineCount = 0;
      _maintenanceNotified = false;
    }
  }, 30000);

});

// ══ MOBILE KEYBOARD FIX ═════════════════════════════════════
// Scroll focused input into view above keyboard on Android
document.addEventListener('focusin',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'){
    setTimeout(()=>{
      e.target.scrollIntoView({behavior:'smooth',block:'center'});
    },300);
  }
});

// ══ UPGRADE WALL ════════════════════════════════════════════
function getTier(){
  const t=user?.tier||'free';
  const created=user?.created_at;
  const days=created?Math.floor((Date.now()-new Date(created).getTime())/86400000):0;
  const trialActive=t==='free'&&days<14;
  return{tier:t,trialActive,trialDays:Math.max(0,14-days),isPro:t==='pro'||t==='premium'||trialActive,isPremium:t==='premium'};
}

function applyTierTheme(){
  const{tier,trialActive,trialDays,isPro,isPremium}=getTier();
  const root=document.getElementById('app');
  if(!root)return;
  root.classList.remove('theme-free','theme-pro','theme-premium');
  if(isPremium)root.classList.add('theme-premium');
  else if(isPro)root.classList.add('theme-pro');
  else root.classList.add('theme-free');

  // Trial / upgrade banner
  const trialBanner=document.getElementById('trial');
  if(trialBanner){
    if(tier==='free'&&trialActive){
      trialBanner.style.display='flex';
      const trialT=document.getElementById('trial-t');
      const trialC=document.getElementById('trial-c');
      if(trialDays<=3){
        trialBanner.style.background='#ffebee';trialBanner.style.borderBottom='.5px solid #ffcdd2';
        if(trialT){trialT.textContent=`⚠️ ${trialDays} day${trialDays!==1?'s':''} left — expires soon!`;trialT.style.color='#c62828';}
        if(trialC)trialC.style.color='#c62828';
      } else if(trialDays<=5){
        trialBanner.style.background='#fffde7';trialBanner.style.borderBottom='.5px solid #fff176';
        if(trialT){trialT.textContent=`🕐 ${trialDays} days left — upgrade soon`;trialT.style.color='#f57f17';}
        if(trialC)trialC.style.color='#f57f17';
      } else {
        trialBanner.style.background='';trialBanner.style.borderBottom='';
        if(trialT){trialT.textContent=`🎁 ${trialDays} day${trialDays!==1?'s':''} left in your free trial`;trialT.style.color='';}
      }
      const trialCBtn=document.getElementById('trial-c');
      if(trialCBtn)trialCBtn.onclick=()=>showUpgradeWall(false);
    } else if(tier==='free'&&!trialActive){
      // Trial expired — soft nudge, not hard block
      trialBanner.style.display='flex';
      trialBanner.style.background='#f3e5f5';trialBanner.style.borderBottom='.5px solid #ce93d8';
      const trialT=document.getElementById('trial-t');
      const trialC=document.getElementById('trial-c');
      if(trialT){trialT.textContent='🔓 Free plan — tap to unlock Pro features';trialT.style.color='#6a1b9a';}
      if(trialC){trialC.textContent='Upgrade →';trialC.style.color='#6a1b9a';trialC.onclick=()=>showUpgradeWall(false);}
    } else {
      trialBanner.style.display='none';
    }
  }

  // Pro-gated features (soft lock — user sees blurred card, taps to upgrade)
  // NOTE: stat-debt-card and stat-goal-card are FREE per landing page pricing
  const proFeatures=['daily-dots-row','snowball-card','debt-score-card','debt-total-bar'];
  proFeatures.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    if(!isPro){
      if(!el.querySelector('.tier-lock-overlay')){
        el.style.position='relative';el.style.overflow='hidden';
        const ov=document.createElement('div');
        ov.className='tier-lock-overlay';
        ov.style.cssText='position:absolute;inset:0;background:rgba(240,250,244,0.88);backdrop-filter:blur(2px);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border-radius:14px;z-index:10';
        const nudgeMsg=getSetting('upgrade_nudge')?`<div style="font-size:10px;color:#1a5c35;margin-top:5px;line-height:1.4;text-align:center;padding:0 6px;font-weight:600">${getSetting('upgrade_nudge_text')}</div>`:'<div style="font-size:10px;color:#5a8a6a;margin-top:2px">Tap to upgrade</div>';
        ov.innerHTML='<div style="font-size:20px;margin-bottom:4px">🔒</div><div style="font-size:12px;font-weight:700;color:#1a5c35">Pro feature</div>'+nudgeMsg;
        ov.onclick=()=>showUpgradeWall(false);
        el.appendChild(ov);
      }
    } else {
      const ov=el.querySelector('.tier-lock-overlay');
      if(ov)ov.remove();
      el.style.overflow='';
    }
  });

  // Premium-gated: stokvel
  const premiumFeatures=['stokvel-section'];
  premiumFeatures.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    if(!isPremium){
      if(!el.querySelector('.tier-lock-overlay')){
        el.style.position='relative';el.style.overflow='hidden';
        const ov=document.createElement('div');
        ov.className='tier-lock-overlay';
        ov.style.cssText='position:absolute;inset:0;background:rgba(237,233,254,0.88);backdrop-filter:blur(2px);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border-radius:14px;z-index:10';
        ov.innerHTML='<div style="font-size:20px;margin-bottom:4px">👑</div><div style="font-size:12px;font-weight:700;color:#534ab7">Premium feature</div><div style="font-size:10px;color:#534ab7;margin-top:2px;opacity:.7">Tap to upgrade</div>';
        ov.onclick=()=>showUpgradeWall(false);
        el.appendChild(ov);
      }
    } else {
      const ov=el.querySelector('.tier-lock-overlay');
      if(ov)ov.remove();
      el.style.overflow='';
    }
  });

  // Import tab lock
  const importLock=document.getElementById('import-lock-banner');
  if(importLock)importLock.style.display=isPro?'none':'block';
}

function showUpgradeWall(hardBlock){
  const wall=document.getElementById('upgrade-wall');
  wall.style.display='flex';
  const freePlanDiv=document.getElementById('uw-free-plan');
  if(!hardBlock){
    document.getElementById('uw-icon').textContent='⭐';
    document.getElementById('uw-title').textContent='Unlock the full MyRandWise';
    document.getElementById('uw-sub').textContent='You\'re on the free plan. Upgrade to Pro for bank imports, AI nudges, and more.';
    document.getElementById('uw-continue').style.display='block';
    if(freePlanDiv) freePlanDiv.style.display='none';
  } else {
    document.getElementById('uw-icon').textContent='⏰';
    document.getElementById('uw-title').textContent='Your free trial has ended';
    document.getElementById('uw-sub').textContent='You\'ve experienced what MyRandWise can do. Don\'t lose your data — upgrade to keep going.';
    document.getElementById('uw-continue').style.display='none';
    if(freePlanDiv) freePlanDiv.style.display='block';
    // Intercept back button so users can't navigate away
    history.pushState(null,'',location.href);
    window.onpopstate=()=>{
      // Close info sheet if open, otherwise push state again
      const infoSheet=document.getElementById('info-sheet');
      if(infoSheet?.classList?.contains('open')){ closeInfo(); history.pushState(null,'',location.href); return; }
      const wpScreen=document.getElementById('weekly-planner');
      if(wpScreen?.style?.display==='flex'){ closeWeeklyPlanner?.(); history.pushState(null,'',location.href); return; }
      history.pushState(null,'',location.href);
    };
  }
}
function continueFreePlan(){
  // Set tier to free in Supabase and locally
  if(user?.id) sbPatch(`beta_testers?id=eq.${user.id}`,{tier:'free'}).catch(()=>{});
  if(user) user.tier='free';
  localStorage.setItem('rw_tier','free');
  localStorage.setItem('rw_chose_free','1'); // prevents hard block on renderDash
  document.getElementById('upgrade-wall').style.display='none';
  // Suppress connectivity/maintenance check for 60s to avoid false maintenance screen
  window._suppressMaintenanceUntil = Date.now() + 60000;
  applyTierTheme();
  showToast('You\'re on the free plan. Upgrade anytime from your profile.');
  // Schedule upgrade nudge cards — shown periodically while on free plan
  scheduleUpgradeNudges();
}
function scheduleUpgradeNudges(){
  // Show first nudge after 2 minutes, then every 5 minutes, max 3 per session
  let nudgeCount=0;
  const maxNudges=3;
  const nudgeMessages=[
    {title:'📊 Unlock Debt Payoff Strategy',body:'See exactly how to clear your debt faster — from R49/month'},
    {title:'🎯 Unlock Savings Goals',body:'Set and track goals for what matters most — from R49/month'},
    {title:'💡 Unlock AI Money Nudges',body:'Get personalised tips based on your spending — from R49/month'},
  ];
  const showNudge=()=>{
    if(nudgeCount>=maxNudges) return;
    const tier=user?.tier||localStorage.getItem('rw_tier')||'free';
    if(tier!=='free') return; // Stop if they upgraded
    const msg=nudgeMessages[nudgeCount];
    nudgeCount++;
    // Remove existing nudge if any
    document.getElementById('upgrade-nudge-card')?.remove();
    const card=document.createElement('div');
    card.id='upgrade-nudge-card';
    card.style.cssText='position:fixed;bottom:76px;left:16px;right:16px;background:#132e1e;border:1.5px solid rgba(74,222,128,.4);border-radius:14px;padding:14px 16px;z-index:300;display:flex;align-items:center;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,.5);animation:slideUp .3s ease';
    card.innerHTML=`<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px">${msg.title}</div><div style="font-size:12px;color:rgba(255,255,255,.55)">${msg.body}</div></div><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end"><button onclick="showUpgradeWall(false)" style="background:#4ade80;color:#0d3d22;border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer">Upgrade</button><button onclick="this.closest('#upgrade-nudge-card').remove()" style="background:none;border:none;color:rgba(255,255,255,.25);font-size:11px;cursor:pointer;padding:2px">Not now</button></div>`;
    document.body.appendChild(card);
    // Auto-dismiss after 8 seconds
    setTimeout(()=>document.getElementById('upgrade-nudge-card')?.remove(), 8000);
    // Schedule next nudge
    if(nudgeCount<maxNudges) setTimeout(showNudge, 5*60*1000);
  };
  setTimeout(showNudge, 2*60*1000);
}
function doUpgrade(plan){
  const mid='17641839',mkey='ggvw6iyb2c213';
  const sandbox=false;
  const base=sandbox?'https://sandbox.payfast.co.za/eng/process':'https://www.payfast.co.za/eng/process';
  const amt=plan==='premium'?'129.00':'49.00';
  const name=plan==='premium'?'MyRandWise Premium':'MyRandWise Pro';
  // Store pending plan so we know what to upgrade to when user returns
  localStorage.setItem('rw_pending_plan', plan);
  localStorage.setItem('rw_pending_payment_id', user?.id||'');
  const notifyUrl=`https://mmezkseblafurjolkfkt.supabase.co/functions/v1/payfast-webhook`;
  const params=new URLSearchParams({
    merchant_id:sandbox?'10000100':mid,
    merchant_key:sandbox?'46f0cd694581a':mkey,
    return_url:APP_URL+'?paid=1&plan='+plan,
    cancel_url:APP_URL+'?paid=0',
    notify_url:notifyUrl,
    name_first:(user?.name||'User').split(' ')[0],
    email_address:user?.email||'',
    m_payment_id:user?.id||Date.now(),
    amount:amt,
    item_name:name
  });
  window.open(`${base}?${params.toString()}`,'_blank');
}

// ── PayFast return handler ────────────────────────────────────
(()=>{
  const p=new URLSearchParams(window.location.search);
  if(p.get('paid')==='1'){
    const plan=p.get('plan')||localStorage.getItem('rw_pending_plan')||'pro';
    showToast('🎉 Payment received! Activating your '+plan+' plan...');
    // Poll for tier update — webhook updates DB, we check every 5s for 60s
    let attempts=0;
    const poll=setInterval(async()=>{
      attempts++;
      try{
        const rows=await sbG(`beta_testers?id=eq.${user?.id}&select=tier&limit=1`);
        const newTier=rows?.[0]?.tier;
        if(newTier&&newTier!=='free'){
          clearInterval(poll);
          user.tier=newTier;
          localStorage.setItem('rw_user',JSON.stringify(user));
          localStorage.removeItem('rw_pending_plan');
          localStorage.removeItem('rw_pending_payment_id');
          renderDash();
          showToast('✅ '+plan.charAt(0).toUpperCase()+plan.slice(1)+' activated! Welcome 🎉');
          sendOwnerAlert('upgrade',{name:user?.name||'Unknown',tier:newTier,amount:newTier==='premium'?'129':'49'});
          // Clear URL params
          window.history.replaceState({},'',APP_URL);
        }
      }catch{}
      if(attempts>=12){ // 60 seconds
        clearInterval(poll);
        // Fallback — upgrade locally and let webhook catch up
        const fallbackTier=plan==='premium'?'premium':'pro';
        user.tier=fallbackTier;
        localStorage.setItem('rw_user',JSON.stringify(user));
        renderDash();
        showToast('✅ Plan activated! If features are locked, please refresh.');
        window.history.replaceState({},'',APP_URL);
      }
    },5000);
  } else if(p.get('paid')==='0'){
    showToast('Payment cancelled — no charge made');
    window.history.replaceState({},'',APP_URL);
  }
})();

// ══ EDIT EXPENSE ════════════════════════════════════════════
function editExp(id){
  const e=expenses.find(x=>x.id===id);
  if(!e)return;
  document.getElementById('edit-id').value=id;
  document.getElementById('edit-amt').value=e.amount;
  document.getElementById('edit-note').value=e.note||'';
  document.getElementById('edit-sheet').classList.add('open');
  document.getElementById('edit-ov').classList.add('open');
}
function closeEditSheet(){
  document.getElementById('edit-sheet').classList.remove('open');
  document.getElementById('edit-ov').classList.remove('open');
}
async function saveEdit(){
  const id=document.getElementById('edit-id').value;
  const amt=parseFloat(document.getElementById('edit-amt').value);
  const note=document.getElementById('edit-note').value.trim();
  if(!amt||amt<=0){showToast('Enter a valid amount');return;}
  expenses=expenses.map(e=>e.id===id?{...e,amount:amt,note}:e);
  renderDash();closeEditSheet();showToast('✅ Expense updated');
  if(!id.startsWith('tmp-')){
    try{await fetch(`${SB}/rest/v1/expenses?id=eq.${id}`,{method:'PATCH',headers:{...H,'Prefer':'return=minimal'},body:JSON.stringify({amount:amt,note})});}catch(e){console.warn('Expense update sync error:',e);showToast('Saved locally — will sync shortly');}
  }
}

// ══ VERSION CHECK & UPDATE BANNER ════════════════════════════
let _heroFlipTimer = null;
let _heroFlipState = 'front'; // 'front' or 'back'
// ── Coin idle attraction animation ────────────────────────────
let _coinAnimTimer = null;
let _coinDiscovered = false;

function scheduleCoinAnim(){
  if(_coinDiscovered) return;
  clearTimeout(_coinAnimTimer);
  // First fire: 8 seconds after dashboard loads
  _coinAnimTimer = setTimeout(()=>{ pulseCoin(); }, 8000);
}

function pulseCoin(){
  if(_coinDiscovered) return;
  const coin = document.getElementById('ring-wrap');
  if(!coin || _heroFlipState !== 'front') {
    // Not on monthly front — try again in 3 mins
    _coinAnimTimer = setTimeout(()=>pulseCoin(), 3*60*1000);
    return;
  }
  // Shake for 1.5s then spin for 1.5s = 3s total
  coin.style.animation = 'coinShake 0.6s ease infinite';
  setTimeout(()=>{
    if(_coinDiscovered) return;
    coin.style.animation = 'coinSpin 1.2s linear infinite';
    setTimeout(()=>{
      if(_coinDiscovered) return;
      coin.style.animation = '';
      // Repeat every 3 minutes
      _coinAnimTimer = setTimeout(()=>pulseCoin(), 3*60*1000);
    }, 1500);
  }, 1500);
}

function stopCoinAnim(){
  _coinDiscovered = true;
  clearTimeout(_coinAnimTimer);
  const coin = document.getElementById('ring-wrap');
  if(coin) coin.style.animation = '';
}

function toggleHeroFlip(){
  stopCoinAnim();
  const front = document.getElementById('hero-front');
  const back = document.getElementById('hero-week-back');
  if(!front || !back) return;
  clearTimeout(_heroFlipTimer);
  if(_heroFlipState === 'front'){
    // Switch to weekly back
    front.style.opacity='0';
    setTimeout(()=>{
      front.style.display='none';
      back.style.display='flex';
      back.style.opacity='0';
      setTimeout(()=>{ back.style.opacity='1'; }, 20);
    }, 250);
    _heroFlipState = 'back';
    // Auto-return after 8s
    _heroFlipTimer = setTimeout(()=>{ if(_heroFlipState==='back') toggleHeroFlip(); }, 8000);
  } else {
    // Switch back to monthly front
    back.style.opacity='0';
    setTimeout(()=>{
      back.style.display='none';
      front.style.display='flex';
      front.style.opacity='0';
      setTimeout(()=>{ front.style.opacity='1'; }, 20);
    }, 250);
    _heroFlipState = 'front';
  }
}
function updateHeroWeekPanel(sp, wbOverride){
  // Use wb from getSmartWeeklyBudget — same source as weekly planner
  const wb = wbOverride || (sp>0 ? Math.round(sp/4) : 0);
  const now=new Date();
  const weekStart=new Date(now);
  weekStart.setDate(now.getDate()-((now.getDay()+6)%7));
  weekStart.setHours(0,0,0,0);
  const weekSpent=(window.expenses||[]).filter(e=>{
    if(!e.logged_at)return false;
    const d=new Date(e.logged_at);
    return !isNaN(d.getTime())&&d>=weekStart&&d<=now;
  }).reduce((s,e)=>s+Number(e.amount||0),0);
  const remaining=Math.max(0,wb-weekSpent);
  const overspent=weekSpent>wb&&wb>0;
  // Days left in week (Mon=0...Sun=6 → days until Sunday)
  const dayOfWeek=(now.getDay()+6)%7; // 0=Mon,6=Sun
  const daysLeft=Math.max(0,6-dayOfWeek);
  const safeDaily=daysLeft>0?Math.round(remaining/daysLeft):0;
  const pct=wb>0?Math.min(weekSpent/wb,1):0;
  // Week number in month
  const weekNum=Math.ceil(now.getDate()/7);
  const weeksInMonth=Math.ceil(new Date(now.getFullYear(),now.getMonth()+1,0).getDate()/7);
  const t=document.getElementById('hw-title');
  const b=document.getElementById('hw-budget');
  const bar=document.getElementById('hw-bar');
  const days=document.getElementById('hw-days');
  const daily=document.getElementById('hw-daily');
  const rem=document.getElementById('hw-remaining');
  if(t) t.textContent=`Week ${weekNum} of ${weeksInMonth}`;
  if(b) b.textContent=wb>0?'R'+wb.toLocaleString('en-ZA')+' budget':'Confirm to unlock';
  if(bar){
    bar.style.width=(pct*100)+'%';
    bar.style.background=overspent?'#f87171':pct>0.7?'#fbbf24':'#4ade80';
  }
  if(days) days.textContent=daysLeft||'—';
  if(daily){ daily.textContent=safeDaily>0?'R'+safeDaily.toLocaleString('en-ZA'):'R0'; daily.style.color=overspent?'#f87171':'#4ade80'; }
  if(rem){ rem.textContent=overspent?'-R'+(weekSpent-wb).toLocaleString('en-ZA'):'R'+remaining.toLocaleString('en-ZA'); rem.style.color=overspent?'#f87171':'white'; }
}

const APP_VERSION = '2026-05-07-v181';

// ── SUPABASE KEEP-ALIVE — prevents free tier project pausing ──
// Pings Supabase every 3 days with a lightweight query
// This keeps the project active even during quiet periods
(function keepSupabaseAlive(){
  const key = 'rw_last_ping';
  const now = Date.now();
  const last = Number(localStorage.getItem(key)||0);
  const threeDays = 3*24*60*60*1000;
  if(now - last > threeDays){
    fetch(`${SB}/rest/v1/app_config?key=eq.maintenance_mode&select=value`,{
      headers:{'apikey':AK,'Authorization':'Bearer '+AK},
      signal:AbortSignal.timeout(2000)
    }).then(()=>{
      localStorage.setItem(key, now);
    }).catch(()=>{});
  }
  setInterval(()=>{
    const n=Date.now();
    const l=Number(localStorage.getItem(key)||0);
    if(n-l>threeDays){
      fetch(`${SB}/rest/v1/app_config?key=eq.maintenance_mode&select=value`,{
        headers:{'apikey':AK,'Authorization':'Bearer '+AK},
        signal:AbortSignal.timeout(2000)
      }).then(()=>localStorage.setItem(key,n)).catch(()=>{});
    }
  }, 24*60*60*1000);
})();
(()=>{
  try {
    const stored = localStorage.getItem('rw_app_version');
    if(!stored){ localStorage.setItem('rw_app_version', APP_VERSION); return; }
    if(stored !== APP_VERSION){
      // Only show banner inside the main app, not on splash/login/onboarding
      const currentScreen = document.querySelector('.screen[style*="flex"], .screen:not([style*="none"])');
      const isInApp = document.getElementById('main')?.style?.display === 'flex' ||
                      document.getElementById('main')?.style?.display === 'block';
      const banner = document.getElementById('update-banner');
      if(banner){
        if(isInApp){
          banner.style.display='flex';
        } else {
          // Store flag — show banner once user gets to main app
          sessionStorage.setItem('rw_pending_update','1');
        }
      }
    }
  } catch(e){}
})();
function doAppUpdate(){
  localStorage.setItem('rw_app_version', APP_VERSION);
  if('caches' in window){
    caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>location.reload(true));
  } else { location.reload(true); }
}

let ownerTapCount=0,ownerTapTimer=null,ownerPinAction='panel';
const TIERS=['free','pro','premium'];
function ownerTap(){
  ownerTapCount++;
  clearTimeout(ownerTapTimer);
  ownerTapTimer=setTimeout(()=>{
    if(ownerTapCount===1) switchTab('profile');
    ownerTapCount=0;
  },800);
  if(ownerTapCount>=5){
    clearTimeout(ownerTapTimer);
    ownerTapCount=0;
    ownerPinAction='panel';
    openOwnerPinModal();
  } else if(ownerTapCount===3){
    clearTimeout(ownerTapTimer);
    ownerTapCount=0;
    ownerPinAction='tier';
    openOwnerPinModal();
  }
}
function openOwnerPinModal(){
  document.getElementById('owner-pin-modal').style.display='flex';
  document.getElementById('owner-pin-input').value='';
  document.getElementById('owner-pin-err').style.display='none';
  setTimeout(()=>document.getElementById('owner-pin-input').focus(),100);
}
async function checkOwnerPin(){
  const pin=document.getElementById('owner-pin-input').value;
  const VALID_HASH='625b43807ec2899fc6365fe066a44035c92c57f6e46a4363fc15d9181e587af1';
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pin));
  const hash=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(hash===VALID_HASH){
    document.getElementById('owner-pin-modal').style.display='none';
    if(ownerPinAction==='tier'){
      // Cycle tier
      const currentTier=user?.tier||'free';
      const nextTier=TIERS[(TIERS.indexOf(currentTier)+1)%TIERS.length];
      if(user) user.tier=nextTier;
      localStorage.setItem('rw_user',JSON.stringify(user));
      if(user?.id) sbPatch(`beta_testers?id=eq.${user.id}`,{tier:nextTier}).catch(()=>{});
      applyTierTheme();
      renderDash();
      showToast(`🔄 Switched to ${nextTier.toUpperCase()} — triple-tap again to cycle`);
    } else {
      openOwnerPanel();
    }
  } else {
    document.getElementById('owner-pin-err').style.display='block';
    document.getElementById('owner-pin-input').value='';
  }
}
function closeOwnerPin(){document.getElementById('owner-pin-modal').style.display='none';}
document.getElementById('owner-pin-input').addEventListener('keydown',e=>{if(e.key==='Enter')checkOwnerPin();});

async function openOwnerPanel(){
  document.getElementById('owner-panel').style.display='block';
  document.getElementById('owner-date').textContent='Session: '+new Date().toLocaleString('en-ZA');
  highlightTierBtn(user?.tier||'free');
  loadCSIList();
  try{
    const users=await sbG('beta_testers?select=id,name,tier,created_at&order=created_at.desc&limit=50');
    const exps=await sbG('expenses?select=id');
    const total=users?.length||0;
    const paid=(users||[]).filter(u=>u.tier==='pro'||u.tier==='premium').length;
    const mrr=paid*49;
    document.getElementById('stat-total').textContent=total;
    document.getElementById('stat-paid').textContent=paid;
    document.getElementById('stat-mrr').textContent='R'+mrr.toLocaleString('en-ZA');
    document.getElementById('stat-exp').textContent=exps?.length||0;
    localStorage.setItem('rw_total_users',total);
    const list=(users||[]).slice(0,8).map(u=>{
      const tierCol=u.tier==='premium'?'#a78bfa':u.tier==='pro'?'#fbbf24':'#4ade80';
      const d=new Date(u.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short'});
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <span>${u.name||'—'}</span>
        <span style="display:flex;gap:8px;align-items:center">
          <span style="font-size:10px;background:${tierCol}22;color:${tierCol};padding:2px 8px;border-radius:10px;font-weight:700">${(u.tier||'free').toUpperCase()}</span>
          <span style="font-size:11px;color:rgba(255,255,255,.4)">${d}</span>
        </span>
      </div>`;
    }).join('');
    document.getElementById('owner-users').innerHTML=list||'<span style="color:rgba(255,255,255,.4)">No users yet</span>';
  }catch(e){document.getElementById('owner-users').innerHTML='<span style="color:#f87171">Could not load — check Supabase</span>';}
}

function switchTestTier(tier){
  if(!user)return;
  user.tier=tier;
  localStorage.setItem('rw_user',JSON.stringify(user));
  renderDash();
  highlightTierBtn(tier);
  const msgs={free:'👆 Now viewing FREE experience — trial banner shows, Pro features locked after trial',pro:'⭐ Now viewing PRO experience — full access, R49/month badge',premium:'👑 Now viewing PREMIUM experience — everything unlocked, R129/month'};
  document.getElementById('tier-test-info').textContent=msgs[tier]||'';
  document.getElementById('owner-panel').style.display='none';
  show('main');
}
function highlightTierBtn(tier){
  ['free','pro','premium'].forEach(t=>{
    const b=document.getElementById('tier-btn-'+t);
    if(!b)return;
    b.style.background=t===tier?'#4ade80':'rgba(255,255,255,.1)';
    b.style.color=t===tier?'#0d3d22':'#fff';
  });
}
