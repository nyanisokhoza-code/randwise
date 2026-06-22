// ══ INFO TOOLTIPS ════════════════════════════════════════════
const INFO = {
  'net-worth': {
    icon: '💰',
    title: 'Net Worth',
    body: 'Net worth is simply what you own minus what you owe. If your savings are R5,000 and your debt is R8,000, your net worth is -R3,000. The goal is to grow this number every month — either by saving more or paying off debt.',
    example: 'Savings: R5,000\nDebt: R8,000\nNet worth: -R3,000\n\nNext month if you pay R500 off debt:\nNet worth: -R2,500 ✅ Growing!'
  },
  'debt-score': {
    icon: '🎯',
    title: 'Debt Score',
    body: 'Your Debt Score (0–100) measures how healthy your debt situation is. It looks at how much debt you have compared to your income, and how much you\'ve paid off. 100 means debt-free. Below 50 means your debt is a serious burden.',
    example: 'Score 80–100: Excellent — debt is manageable\nScore 60–79: Good — keep paying\nScore 40–59: Caution — debt is growing\nScore 0–39: Danger — need a plan now'
  },
  'snowball': {
    icon: '⚡',
    title: 'Debt Snowball',
    body: 'The snowball method means paying off your smallest debt first, then rolling that payment onto the next debt. Like a snowball rolling downhill — it gets bigger and faster as it goes. It\'s not always the cheapest method, but it\'s the most motivating.',
    example: 'You have:\n• Store card: R2,000 @ R100/mo\n• Car: R50,000 @ R1,000/mo\n\nSnowball: Attack the R2,000 first. Once it\'s done, pay R1,100/mo on the car. Done in less time!'
  },
  'stokvel': {
    icon: '🤝',
    title: 'Stokvel',
    body: 'A stokvel is a rotating savings club. A group of people each contribute a fixed amount every month, and one member receives the full pot each month. It\'s one of the most powerful savings tools in South Africa — over R50 billion moves through stokvels every year.',
    example: '8 people each contribute R500/mo\nTotal pot: R4,000/mo\nEach person gets R4,000 once a year\n\nYou "save" R500 but receive R4,000!'
  },
  'payoff-accelerator': {
    icon: '🚀',
    title: 'Payoff Accelerator',
    body: 'The payoff accelerator shows you exactly how much faster you can become debt-free by paying a little extra each month. Even R100 extra can save you months of payments and thousands in interest.',
    example: 'R8,821 debt @ R300/mo minimum:\n• Minimum only: 20 months\n• +R100/mo: 14 months (6 months faster!)\n• +R200/mo: 10 months (10 months faster!)'
  },
  'debt-to-income': {
    icon: '📊',
    title: 'Debt-to-Income Ratio',
    body: 'Debt-to-income ratio compares your total debt to your monthly income. A ratio above 40% is a warning sign. Above 60% is dangerous. Banks use this to decide if they\'ll give you a loan — and it affects your bond application.',
    example: 'Income: R10,000/mo\nDebt: R50,000\nRatio: 500% (5× income) — danger zone\n\nIdeal: Keep debt below 3× monthly income'
  },
  'weekly-budget': {
    icon: '📅',
    title: 'Weekly Budget',
    body: 'Your weekly budget is your income minus fixed commitments (debit orders, debt minimums, recurring expenses) divided by 4. This gives your real spending money — not just income ÷ 4 which ignores your bills. Add your debit orders and debts to get an accurate number.',
    get example(){
      const inc = Number(user?.income_amount||9000);
      try {
        const {wb, disposable, fixed, breakdown} = getSmartWeeklyBudget();
        if(fixed>0){
          const lines = breakdown.map(b=>`  − ${b.label}: R${Math.round(b.amount).toLocaleString('en-ZA')}`).join('\n');
          return `Income: R${inc.toLocaleString('en-ZA')}/mo\n${lines}\n= R${Math.round(disposable).toLocaleString('en-ZA')}/mo free\nWeekly budget: R${wb.toLocaleString('en-ZA')}/wk`;
        }
        return `Income: R${inc.toLocaleString('en-ZA')}/mo ÷ 4 = R${Math.round(inc/4).toLocaleString('en-ZA')}/wk\n\nAdd your debit orders and debts to see your real number.`;
      } catch(e) {
        return `Income: R${inc.toLocaleString('en-ZA')}/mo\nWeekly budget = (Income − fixed costs) ÷ 4`;
      }
    }
  },
  'bond-readiness': {
    icon: '🏠',
    title: 'Bond Readiness Score',
    body: 'Your bond readiness score tells you how likely a bank is to approve your home loan application. It looks at your income, debt, savings, and spending habits. A score above 70 means you have a good chance of approval.',
    example: 'Banks look at:\n• Income stability (job type)\n• Debt-to-income ratio\n• Savings / deposit\n• Monthly spending patterns\n• Existing debt repayments\n\n⚖️ This score is an estimate for educational purposes only. MyRandWise is not a registered FSP. Consult a bond originator or financial advisor for a formal assessment.'
  },
  'mashonisa': {
    icon: '⚠️',
    title: 'Mashonisa Loan',
    body: 'A Mashonisa is an informal money lender. They typically charge 30% per month — that\'s 360% per year. A bank personal loan charges 20–27% per YEAR. A R1,000 Mashonisa loan costs R300 in interest after just one month.',
    example: 'Borrow R1,000 from Mashonisa:\nMonth 1: owe R1,300\nMonth 2: owe R1,690\nMonth 3: owe R2,197\n\nSame R1,000 from bank: owe R1,020 after 3 months'
  }
};

function showInfo(key){
  const info = INFO[key];
  if(!info) return;
  document.getElementById('info-icon').textContent = info.icon;
  document.getElementById('info-title').textContent = info.title;

  // Special handling for debt score — show real plain English breakdown
  if(key === 'debt-score' && window._debtScoreBreakdown){
    const b = window._debtScoreBreakdown;
    const scoreColor = b.total>=70?'#1a7a4a':b.total>=40?'#ba7517':'#a32d2d';
    const scoreLabel = b.total>=70?'Good standing':b.total>=40?'Getting there':'Needs attention';

    const row = (emoji, label, value, status, meaning) => {
      const statusColor = status==='Good'||status==='Excellent'?'#1a5c35':status==='Fair'?'#ba7517':'#a32d2d';
      const statusBg = status==='Good'||status==='Excellent'?'#eaf3de':status==='Fair'?'#fef3c7':'#fdecea';
      return `<div style="padding:12px 0;border-bottom:1px solid #f0efe9">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:13px;font-weight:700;color:#2c2c2a">${emoji} ${label}</div>
          <span style="background:${statusBg};color:${statusColor};font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">${status}</span>
        </div>
        <div style="font-size:12px;color:#5f5e5a;margin-bottom:2px">${value}</div>
        <div style="font-size:11px;color:#888">${meaning}</div>
      </div>`;
    };

    document.getElementById('info-body').innerHTML = `
      <div style="text-align:center;margin-bottom:16px;padding:16px;background:#f7f6f2;border-radius:14px">
        <div style="font-size:42px;font-weight:900;color:${scoreColor};line-height:1">${b.total}</div>
        <div style="font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.5px">out of 100 — ${scoreLabel}</div>
      </div>
      ${row('💳','Monthly debt payments',
        `R${Math.round(b.totalMinPayments||0).toLocaleString('en-ZA')}/mo — ${b.minPct}% of your income goes to minimum payments`,
        b.minPct<=10?'Excellent':b.minPct<=20?'Good':b.minPct<=30?'Fair':'High',
        b.minPct<=20?'Under 20% is healthy. You have room to breathe.':b.minPct<=30?'Getting tight. Try to avoid taking on new debt.':'Over 30% is a strain. Focus on paying down debt.'
      )}
      ${row('📅','Time to debt free',
        b.payoffMonths<=0?'No debt — congratulations!':
          `Debt free in ${b.payoffStr} at R${Math.round(b.totalMinPayments).toLocaleString('en-ZA')}/mo minimum payments`,
        b.payoffMonths<=0?'Excellent':b.payoffMonths<=36?'Good':b.payoffMonths<=84?'Fair':'High',
        b.payoffMonths<=0?'You have no debt — great work!':
        b.payoffMonths<=36?'Under 3 years — strong position. Extra payments will finish it faster.':
        b.payoffMonths<=84?'Under 7 years — manageable. Try paying a little extra on your smallest debt.':
        `Over 7 years at minimums only. Even R${Math.round((b.totalMinPayments||0)*0.1).toLocaleString('en-ZA')} extra per month cuts this significantly.`
      )}
      ${row('🔢','Number of debts',
        `${b.numDebts} active debt${b.numDebts!==1?'s':''}`,
        b.numDebts===0?'Excellent':b.numDebts<=2?'Good':b.numDebts<=3?'Fair':'High',
        b.numDebts===0?'Debt free!':b.numDebts<=2?'Few debts are easier to manage and pay off.':b.numDebts<=3?'Consider consolidating to simplify payments.':'Multiple debts make it hard to make progress. Target the smallest first.'
      )}
      ${row('📈','Payoff progress',
        b.progressLabel,
        b.numDebts===0?'Excellent':b.progressLabel==='Actively paying'?'Good':'Fair',
        b.numDebts===0?'No debts tracked.':b.progressLabel==='Actively paying'?'Paying more than minimums speeds up your payoff significantly.':'Paying only minimums means slow progress. Even R100 extra per month makes a difference.'
      )}
      <div style="font-size:11px;color:#aaa;padding-top:10px;line-height:1.5">⚖️ This score is an estimate for educational purposes only. Not financial advice.</div>
    `;
    document.getElementById('info-body').style.fontSize='13px';
    const exEl=document.getElementById('info-example');
    if(exEl) exEl.style.display='none';
  } else {
    document.getElementById('info-body').textContent = info.body;
    document.getElementById('info-body').style.fontSize = '';
    const exEl = document.getElementById('info-example');
    const exText = document.getElementById('info-example-text');
    if(info.example){ exText.textContent=info.example; exEl.style.display='block'; }
    else { if(exEl) exEl.style.display='none'; }
  }

  document.getElementById('info-ov').classList.add('open');
  document.getElementById('info-sheet').classList.add('open');
}

function closeInfo(){
  document.getElementById('info-ov').classList.remove('open');
  document.getElementById('info-sheet').classList.remove('open');
}

// ══ CSI FREE PRO PROGRAMME ═══════════════════════════════════
async function grantCSIPro(){
  const email = document.getElementById('csi-email')?.value?.trim()?.toLowerCase();
  const name = document.getElementById('csi-name')?.value?.trim();
  const income = parseFloat(document.getElementById('csi-income')?.value||0);
  const resultEl = document.getElementById('csi-result');
  if(!email){ resultEl.textContent='⚠️ Enter an email address'; return; }
  resultEl.textContent='Processing...';
  try{
    const r = await fetch(`${SB}/rest/v1/beta_testers?email=eq.${encodeURIComponent(email)}`,{
      method:'PATCH',
      headers:{...getH(),'Prefer':'return=minimal'},
      body:JSON.stringify({tier:'pro', upgraded_at: new Date().toISOString(), payfast_payment_id:'CSI-FREE-PRO'})
    });
    if(r.ok){
      // Log CSI grant
      const csiLog = JSON.parse(localStorage.getItem('rw_csi_log')||'[]');
      csiLog.unshift({email, name, income, date: new Date().toISOString()});
      localStorage.setItem('rw_csi_log', JSON.stringify(csiLog.slice(0,50)));
      resultEl.textContent=`✅ Free Pro granted to ${email}`;
      resultEl.style.color='#4ade80';
      // Send alert to owner
      sendOwnerAlert('upgrade',{name:name||email, tier:'pro (CSI FREE)', amount:'0', email});
      loadCSIList();
      document.getElementById('csi-email').value='';
      document.getElementById('csi-name').value='';
      document.getElementById('csi-income').value='';
    } else {
      resultEl.textContent='⚠️ User not found — check email';
      resultEl.style.color='#fbbf24';
    }
  }catch(e){
    resultEl.textContent='Error — try again';
    resultEl.style.color='#f87171';
  }
}

function resetAllTrials(){
  if(!confirm('Reset all user trials to 14 days from today?')) return;
  const newExpiry = new Date(Date.now() + 14*24*60*60*1000).toISOString();
  sbPatch(`beta_testers?id=neq.00000000-0000-0000-0000-000000000000`,{trial_ends_at: newExpiry})
    .then(()=>showToast('✅ All trials reset to 14 days'))
    .catch(()=>showToast('❌ Trial reset failed'));
}
function loadCSIList(){
  const el = document.getElementById('csi-list');
  if(!el) return;
  const log = JSON.parse(localStorage.getItem('rw_csi_log')||'[]');
  if(!log.length){ el.textContent='No CSI grants yet'; return; }
  el.innerHTML = log.slice(0,10).map(r=>`
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07)">
      <div>
        <div style="color:rgba(255,255,255,.8)">${r.name||r.email}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.4)">${r.email}</div>
      </div>
      <div style="text-align:right">
        <div style="color:#4ade80">Free Pro</div>
        <div style="font-size:10px;color:rgba(255,255,255,.4)">${new Date(r.date).toLocaleDateString('en-ZA')}</div>
      </div>
    </div>
  `).join('');
}

function generatePromoCard(){
  const headline = document.getElementById('promo-headline')?.value||'Your money, your rules. 🇿🇦';
  const body = document.getElementById('promo-body')?.value||'Track spending, debt and savings — free for 14 days.';
  document.getElementById('owner-panel').style.display='none';
  generateShareCard(headline, body);
}

// ══ DEBT INTERVENTION ═══════════════════════════════════════
const DI_KEY = 'rw_di_last_shown';
const DI_THRESHOLD_1 = 0.4;  // 40% — yellow alert (base, overridden by admin setting)
const DI_THRESHOLD_2 = 0.6;  // 60% — orange alert
const DI_THRESHOLD_3 = 0.8;  // 80% — red emergency

// ── Debt Payoff Celebration ───────────────────────────────────
function checkDebtPayoffCelebration(){
  if(!debts?.length) return;
  const celebratedKey = 'rw_celebrated_debts';
  const celebrated = JSON.parse(localStorage.getItem(celebratedKey)||'[]');

  debts.forEach(d=>{
    const bal = Number(d.balance||0);
    const id = d.id;
    if(bal <= 0 && id && !celebrated.includes(id)){
      // New debt paid off!
      celebrated.push(id);
      localStorage.setItem(celebratedKey, JSON.stringify(celebrated));

      // Find next debt for snowball message
      const remaining = debts.filter(x=>Number(x.balance||0)>0).sort((a,b)=>Number(a.balance)-Number(b.balance));
      const nextDebt = remaining[0];
      const freedAmount = Number(d.min_payment||0);

      // Show celebration sheet
      setTimeout(()=>showDebtCelebration(d.name||'Debt', freedAmount, nextDebt), 500);
    }
  });
}

function showDebtCelebration(debtName, freedAmount, nextDebt){
  // Create confetti + celebration overlay
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:32px 24px;max-width:340px;width:100%;text-align:center;animation:bounceIn .5s ease">
      <div style="font-size:64px;margin-bottom:8px">🎉</div>
      <div style="font-size:22px;font-weight:900;color:#1a5c35;margin-bottom:8px;letter-spacing:-.5px">${debtName} PAID OFF!</div>
      <div style="font-size:14px;color:#888;line-height:1.6;margin-bottom:20px">
        You just eliminated a debt. That took discipline and consistency — this is a real achievement. 🌱
      </div>
      ${freedAmount > 0 ? `
      <div style="background:#eaf3de;border-radius:14px;padding:14px;margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:#1a5c35;margin-bottom:4px">💰 R${freedAmount.toLocaleString('en-ZA')}/mo freed up</div>
        <div style="font-size:12px;color:#5a8a6a;line-height:1.5">
          ${nextDebt
            ? `Roll this onto <strong>${nextDebt.name}</strong> and pay it off ${Math.round(Number(nextDebt.balance||0)/(Number(nextDebt.min_payment||0)+freedAmount))} months faster.`
            : 'Put this into savings or your emergency fund — you\'ve earned it.'}
        </div>
      </div>` : ''}
      <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:14px;background:#1a7a4a;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit">Keep going 💪</button>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });

  // Launch confetti
  launchConfetti();

  // Send owner alert
  sendOwnerAlert(`🎉 ${user?.name||'A user'} just paid off their ${debtName}! R${freedAmount}/mo freed up.`, 'low');
}

function launchConfetti(){
  const colors=['#1a7a4a','#a5d6a7','#fbbf24','#f59e0b','#34d399','#fff'];
  for(let i=0;i<60;i++){
    const el=document.createElement('div');
    const size=Math.random()*10+5;
    el.style.cssText=`position:fixed;top:-20px;left:${Math.random()*100}vw;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'2px'};z-index:10000;pointer-events:none;animation:confettiFall ${Math.random()*2+1.5}s ease forwards`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 4000);
  }
}

function checkDebtIntervention(){
  if(!getSetting('debt_intervention')) return;
  if(!user || !debts?.length) return;
  const inc = Number(user.income_amount||0);
  if(inc <= 0) return;

  // Separate asset-backed debt (car, bond) from unsecured debt (store, personal loans)
  // Asset debt is NOT an emergency — it's wealth-building or necessary
  // Only unsecured debt ratio triggers the intervention
  const ASSET_CATEGORIES = ['vehicle','bond','home loan','mortgage','car'];
  const unsecuredDebts = debts.filter(d=>{
    const cat = (d.category||d.name||'').toLowerCase();
    return !ASSET_CATEGORIES.some(a => cat.includes(a));
  });
  const assetDebts = debts.filter(d=>{
    const cat = (d.category||d.name||'').toLowerCase();
    return ASSET_CATEGORIES.some(a => cat.includes(a));
  });

  const totalDebt = debts.reduce((s,d)=>s+Number(d.balance||0),0);
  const unsecuredTotal = unsecuredDebts.reduce((s,d)=>s+Number(d.balance||0),0);

  // Use unsecured debt for DTI calculation
  const dti = unsecuredTotal / inc;
  const dtiPct = Math.round(dti * 100);
  const totalDtiPct = Math.round(totalDebt / inc * 100);

  // Use admin-configured threshold as the minimum trigger point
  const adminThreshold = Number(getSetting('debt_intervention_threshold'))/100 || 0.4;
  const t1 = Math.max(adminThreshold, 0.4);
  const t2 = Math.max(t1 + 0.2, 0.6);
  const t3 = Math.max(t2 + 0.2, 0.8);

  // Only show once per week per threshold level
  const lastShown = localStorage.getItem(DI_KEY);
  const weekAgo = Date.now() - 7*24*60*60*1000;
  if(lastShown && Number(lastShown) > weekAgo) return;

  let level = null;
  if(dti >= t3) level = 'critical';
  else if(dti >= t2) level = 'high';
  else if(dti >= t1) level = 'moderate';
  if(!level) return;

  const name = (user.name||'').split(' ')[0] || 'Friend';
  const minPayments = debts.reduce((s,d)=>s+Number(d.min_payment||0),0);
  const minPct = inc > 0 ? Math.round(minPayments/inc*100) : 0;

  let headline, message, steps, cardHeadline, cardBody;

  if(level === 'critical'){
    headline = `${name}, your store debt is at ${dtiPct}% of your income`;
    message = `Your unsecured debt (store accounts, loans) of R${Math.round(unsecuredTotal).toLocaleString('en-ZA')} is ${dtiPct}% of your monthly income — and R${Math.round(minPayments).toLocaleString('en-ZA')} (${minPct}%) goes to minimum payments every month. This needs urgent attention. Here's your 3-step plan:`;
    steps = [
      {n:'1', icon:'🛑', title:'Stop new debt immediately', desc:'No new store accounts, loans or buy-now-pay-later. Every new debt makes this harder.'},
      {n:'2', icon:'⚡', title:'Attack the smallest debt first', desc:`Pay R${Math.round(minPayments + 100).toLocaleString('en-ZA')}/mo on your smallest debt until it's gone. Then roll that payment onto the next.`},
      {n:'3', icon:'📞', title:'Call your creditors', desc:'Ask for a payment holiday or reduced instalment. Most creditors would rather negotiate than write it off.'}
    ];
    cardHeadline = `${dtiPct}% of my income goes to debt 🚨`;
    cardBody = `I'm taking control with MyRandWise's debt intervention plan. Small steps, big change. 💪`;
  } else if(level === 'high'){
    headline = `${name}, your store debt is at ${dtiPct}% of your income`;
    message = `Your unsecured debt of R${Math.round(unsecuredTotal).toLocaleString('en-ZA')} is ${dtiPct}% of your monthly income. ${assetDebts.length > 0 ? `(Your car/bond of R${Math.round(assetDebts.reduce((s,d)=>s+Number(d.balance||0),0)).toLocaleString('en-ZA')} is asset-backed — that's separate.) ` : ''}You're in the danger zone. Act now before it gets worse:`;
    steps = [
      {n:'1', icon:'🎯', title:'Focus on one debt at a time', desc:'Pick your smallest debt and throw everything at it. Don\'t spread payments — concentrate them.'},
      {n:'2', icon:'✂️', title:'Cut one expense this month', desc:'Find R200–500 you can redirect to debt. Takeaways, subscriptions, data — one cut makes a difference.'},
      {n:'3', icon:'📈', title:'Track every rand', desc:'Use MyRandWise daily. Awareness alone reduces spending by 15–20%.'}
    ];
    cardHeadline = `My debt is ${dtiPct}% of my income 📊`;
    cardBody = `Using MyRandWise to track and attack my debt. Join me — free for 14 days. 🌱`;
  } else {
    headline = `${name}, your debt is at ${dtiPct}% of your income`;
    message = `Your debt of R${Math.round(totalDebt).toLocaleString('en-ZA')} is ${dtiPct}% of your monthly income. You're in the moderate zone — but now is the time to act, before it grows:`;
    steps = [
      {n:'1', icon:'📋', title:'Know your full picture', desc:'List every debt with its interest rate. The one charging the most is costing you the most.'},
      {n:'2', icon:'💡', title:'Pay R100 extra/month', desc:`Even R100 extra on your smallest debt saves you months. Use the Payoff Accelerator in MyRandWise to see exactly how much.`},
      {n:'3', icon:'🛡️', title:'Build a R500 emergency fund', desc:'Before anything else — save R500. This stops you from needing new debt when something breaks.'}
    ];
    cardHeadline = `I just checked — my debt is ${dtiPct}% of my income`;
    cardBody = `Getting on top of it with MyRandWise. Free SA finance app. 🇿🇦`;
  }

  // Store for share card
  window._shareCardData = { cardHeadline, cardBody };

  // Populate and show
  document.getElementById('di-headline').textContent = headline;
  document.getElementById('di-message').textContent = message;
  document.getElementById('di-steps').innerHTML = steps.map(s=>`
    <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px">
      <div style="width:32px;height:32px;background:#f0faf4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${s.icon}</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px">${s.title}</div>
        <div style="font-size:12px;color:#555;line-height:1.5">${s.desc}</div>
      </div>
    </div>
  `).join('');

  localStorage.setItem(DI_KEY, Date.now().toString());
  showDebtIntervention();
}

function showDebtIntervention(){
  const overlay = document.getElementById('debt-intervention-overlay');
  const sheet = document.getElementById('debt-intervention-sheet');
  if(overlay && sheet){
    overlay.style.display='flex';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; }));
  }
}

function closeDebtIntervention(){
  const overlay = document.getElementById('debt-intervention-overlay');
  const sheet = document.getElementById('debt-intervention-sheet');
  if(sheet) sheet.style.transform='translateY(100%)';
  setTimeout(()=>{ if(overlay) overlay.style.display='none'; },350);
}

// ══ SHAREABLE CARD ═══════════════════════════════════════════
function generateShareCard(customHeadline, customBody){
  const data = window._shareCardData || {};
  const headline = customHeadline || data.cardHeadline || 'I\'m taking control of my money 💚';
  const body = customBody || data.cardBody || 'Tracking my spending, debt and savings with MyRandWise. 🇿🇦';

  document.getElementById('sc-headline').textContent = headline;
  document.getElementById('sc-body').textContent = body;

  closeDebtIntervention();
  const overlay = document.getElementById('share-card-overlay');
  if(overlay) overlay.style.display='flex';
}

function closeShareCard(){
  const overlay = document.getElementById('share-card-overlay');
  if(overlay) overlay.style.display='none';
}

function shareCard(){
  const name = (user?.name||'').split(' ')[0]||'';
  const text = `${document.getElementById('sc-headline')?.textContent||''}\n\n${document.getElementById('sc-body')?.textContent||''}\n\nTry MyRandWise free 👇\nhttps://myrandwise.co.za`;
  if(navigator.share){
    navigator.share({title:'MyRandWise',text,url:'https://myrandwise.co.za'});
  } else {
    navigator.clipboard?.writeText(text).then(()=>showToast('✅ Copied — paste into WhatsApp or Instagram'));
  }
  // Instruct to screenshot
  showToast('📸 Screenshot the card then share!');
}

// Milestone share cards — called from various places
function shareDebtMilestone(debtName, amtPaid){
  window._shareCardData = {
    cardHeadline: `I just paid off ${debtName}! 🎉`,
    cardBody: `R${Math.round(amtPaid).toLocaleString('en-ZA')} down. Debt freedom is real. Tracking with MyRandWise 🌱`
  };
  generateShareCard();
}

function shareSavingsMilestone(goalName, saved, target){
  const pct = Math.round(saved/target*100);
  window._shareCardData = {
    cardHeadline: `${pct}% of the way to my ${goalName} goal 🎯`,
    cardBody: `R${Math.round(saved).toLocaleString('en-ZA')} saved so far. Every rand counts. MyRandWise 🌱`
  };
  generateShareCard();
}

// ══ SHARE & EARN NUDGE ══════════════════════════════════════
function showShareNudge(){
  const overlay=document.getElementById('share-nudge-overlay');
  const sheet=document.getElementById('share-nudge-sheet');
  const codeEl=document.getElementById('share-nudge-code');
  if(codeEl) codeEl.textContent=user?.referral_code||'—';
  if(overlay&&sheet){
    overlay.style.display='flex';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; }));
  }
}
function closeShareNudge(){
  const overlay=document.getElementById('share-nudge-overlay');
  const sheet=document.getElementById('share-nudge-sheet');
  if(sheet) sheet.style.transform='translateY(100%)';
  setTimeout(()=>{ if(overlay) overlay.style.display='none'; },350);
}
function copyReferralCode(){
  const code=user?.referral_code||'';
  if(code) navigator.clipboard?.writeText(code).then(()=>showToast('✅ Code copied!')).catch(()=>showToast('Code: '+code));
}
function shareAppFromNudge(){
  closeShareNudge();
  shareApp();
}
document.addEventListener('click',e=>{ if(e.target===document.getElementById('share-nudge-overlay')) closeShareNudge(); });

// ══ WHAT'S NEW POPUP ════════════════════════════════════════
const WHATS_NEW = {
  'v46': [
    { icon:'🔒', title:'App lock', desc:'Protect your finances with a PIN or fingerprint' },
    { icon:'💳', title:'Real payments live', desc:'PayFast verified — you can now upgrade to Pro or Premium' },
    { icon:'🏦', title:'Bank parser fixed', desc:'Statement import now works — upload any SA bank PDF' },
    { icon:'🦈', title:'Mashonisa calculator', desc:'See exactly what a Mashonisa loan really costs you' },
  ],
  'v45': [
    { icon:'💳', title:'PayFast live', desc:'Real payments now accepted — upgrade to Pro or Premium' },
    { icon:'💡', title:'Debt insights', desc:'Payoff accelerator now shows interest saved per scenario' },
    { icon:'🌱', title:'Branded splash screen', desc:'New loading animation when you open the app' },
  ],
  'v44': [
    { icon:'🏦', title:'Bank statement import', desc:'Upload your PDF bank statement — AI reads every transaction' },
    { icon:'🔧', title:'Bug fixes', desc:'Login flow, splash screen and SW caching all improved' },
  ],
};

function showWhatsNew(version){
  if(!getSetting('whats_new_popup')) return;
  const key='rw_wn_seen_'+version;
  if(localStorage.getItem(key)) return; // already seen
  localStorage.setItem(key,'1');

  const shortVer = version.replace('2026-04-20-','').replace('2026-04-16-','').replace('2026-04-15-','');
  const features = WHATS_NEW[shortVer];
  if(!features) return;

  // Populate
  const badge = document.getElementById('wn-version-badge');
  if(badge) badge.textContent = 'Version '+shortVer;

  const list = document.getElementById('wn-features');
  if(list){
    list.innerHTML = features.map(f=>`
      <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f0f0f0">
        <div style="width:40px;height:40px;background:#f0faf4;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${f.icon}</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:2px">${f.title}</div>
          <div style="font-size:12px;color:#5a8a6a;line-height:1.5">${f.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // Show with animation
  const overlay = document.getElementById('whats-new-overlay');
  const sheet = document.getElementById('whats-new-sheet');
  if(overlay && sheet){
    overlay.style.display='flex';
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; });
    });
  }
}

function closeWhatsNew(){
  const overlay = document.getElementById('whats-new-overlay');
  const sheet = document.getElementById('whats-new-sheet');
  if(sheet) sheet.style.transform='translateY(100%)';
  setTimeout(()=>{ if(overlay) overlay.style.display='none'; }, 350);
}

// Close on backdrop tap
document.addEventListener('click', e=>{
  const overlay = document.getElementById('whats-new-overlay');
  if(e.target === overlay) closeWhatsNew();
});

// ── About MyRandWise ─────────────────────────────────────────
function showAbout(){
  const overlay=document.getElementById('about-overlay');
  const sheet=document.getElementById('about-sheet');
  if(!overlay||!sheet)return;
  overlay.style.display='flex';
  requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; });
}
function closeAbout(){
  const overlay=document.getElementById('about-overlay');
  const sheet=document.getElementById('about-sheet');
  if(sheet) sheet.style.transform='translateY(100%)';
  setTimeout(()=>{ if(overlay) overlay.style.display='none'; }, 350);
  // Don't set permanent seen flag — we track by week count now
}
// Show About to new users (first login, hasn't seen it)
function maybeShowAbout(){
  if(!getSetting('about_screen')) return;
  const {tier, trialActive} = getTier();

  // Never show to paid users
  if(tier === 'pro' || tier === 'premium') return;

  // For expired free users — never show (don't annoy them)
  if(tier === 'free' && !trialActive) return;

  // For trial users — show twice a week max
  // Track: how many times shown this week
  const now = new Date();
  const weekKey = `rw_about_week_${now.getFullYear()}_W${Math.ceil(now.getDate()/7)}`;
  const shownThisWeek = parseInt(localStorage.getItem(weekKey)||'0');

  if(shownThisWeek < 2){
    localStorage.setItem(weekKey, shownThisWeek + 1);
    setTimeout(showAbout, 800);
  }
}
// Close About on backdrop tap
document.addEventListener('click', e=>{
  const overlay=document.getElementById('about-overlay');
  if(e.target===overlay) closeAbout();
});

const LOCK_KEY='rw_lock_enabled';
const LOCK_PIN_KEY='rw_lock_pin';
const LOCK_TIMEOUT=5*60*1000; // 5 minutes
let lockTimer=null;
let lockPinEntry='';
let setPinEntry='';
let setPinConfirm='';
let setPinStage='first'; // 'first' or 'confirm'
let setPinMode='set'; // 'set' or 'change'
let lockFailCount=0;

