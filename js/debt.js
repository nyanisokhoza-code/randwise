// ══ SILENT ERROR LOGGER ═════════════════════════════════════
// Invisible to users. Access via console: getErrors()
const ERR_KEY = 'rw_err_log';
const ERR_MAX = 100;

function logErr(src, err, ctx) {
  const log = JSON.parse(localStorage.getItem(ERR_KEY) || '[]');
  log.unshift({
    t: new Date().toISOString(),
    src: src,
    msg: err?.message || String(err),
    stack: err?.stack?.split('\n')?.slice(0,3)?.join(' | ') || '',
    ctx: ctx || {},
    url: location.href,
    line: err?.lineNumber || err?.lineno || 0
  });
  if(log.length > ERR_MAX) log.length = ERR_MAX;
  localStorage.setItem(ERR_KEY, JSON.stringify(log));
  console.error(`[ERR:${src}]`, err, ctx);
}

// Wrap functions to auto-catch
function wrap(fn, name) {
  return function(...a) {
    try { return fn.apply(this, a); }
    catch(e) { logErr(name||fn.name, e, {args:a.length}); throw e; }
  };
}

// Auto-wrap on load
addEventListener('load', () => {
  ['loadDebtsPWA','renderPayoffAccelerator','openAddGoalPWA','closeAddGoalPWA','calcGoalMonthly','saveGoalPWA','loadGoalsPWA','openAddDebtPWA','saveDebtPWA','calcMashonisa','calcVehicle']
    .forEach(n => { if(window[n]) window[n] = wrap(window[n], n); });
});

// Global catchers
addEventListener('error', e => logErr('uncaught', e.error||new Error(e.message), {l:e.lineno,c:e.colno}));
addEventListener('unhandledrejection', e => logErr('promise', e.reason, {}));

// Admin console commands — type in DevTools:
window.getErrors = () => JSON.parse(localStorage.getItem(ERR_KEY)||'[]');
window.clearErrors = () => localStorage.removeItem(ERR_KEY);
window.sendErrors = async () => {
  const errs = getErrors();
  if(!errs.length) { console.log('No errors'); return; }
  const body = errs.map(e => `[${e.t.slice(11,19)}] ${e.src}: ${e.msg}`).join('\n');
  await sendOwnerAlert('error_dump', {count: errs.length, body, url: location.href});
  console.log(`Sent ${errs.length} errors to owner`);
  clearErrors();
};
// Usage: getErrors() → see all, sendErrors() → email to you, clearErrors() → wipe


function openDebitOrders(){
  document.getElementById('debit-orders-sheet').classList.add('open');
  document.getElementById('debit-orders-ov').classList.add('open');
  renderDebitOrdersList();
}
function closeDebitOrders(){
  document.getElementById('debit-orders-sheet').classList.remove('open');
  document.getElementById('debit-orders-ov').classList.remove('open');
}
function renderDebitOrdersList(){
  const el=document.getElementById('debit-orders-list');
  if(!el)return;
  // Combine manually added debit orders + debt minimum payments
  const debtItems=(typeof debts!=='undefined'?debts:[])
    .filter(d=>Number(d.min_payment||0)>0)
    .map(d=>({name:d.name,amount:Number(d.min_payment),auto:true}));
  const allItems=[...debitOrders.map(d=>({...d,auto:false})),...debtItems];
  if(!allItems.length){
    el.innerHTML='<div style="text-align:center;padding:16px;color:var(--mu);font-size:13px">No debit orders added yet</div>';
    return;
  }
  const total=allItems.reduce((s,d)=>s+Number(d.amount||0),0);
  el.innerHTML='<div style="background:#f0faf4;border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;justify-content:space-between"><span style="font-size:12px;font-weight:700;color:#5a8a6a">Total commitments</span><span style="font-size:14px;font-weight:800;color:#1a5c35">R'+total.toLocaleString('en-ZA')+'/mo</span></div>'+
  allItems.map((d,i)=>{
    const badge=d.auto?'<span style="font-size:10px;background:#e8f5e9;color:#1a7a4a;padding:2px 6px;border-radius:6px;margin-left:6px">via Debt</span>':'';
    const removeBtn=d.auto?'<button onclick="addDebtAsDebitOrder(null,\''+d.name+'\','+d.amount+')" style="background:#e8f5e9;border:1px solid #1a7a4a;color:#1a5c35;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap">+ Add</button>':'<button onclick="removeDebitOrder('+i+')" style="background:#fee2e2;border:none;color:#c62828;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">✕</button>';
    const sub=d.auto?'<div style="font-size:11px;color:var(--mu)">Tracked under debts</div>':'';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0faf4"><div><div style="font-size:13px;font-weight:600">'+d.name+badge+'</div>'+sub+'</div><div style="display:flex;align-items:center;gap:10px"><span style="font-size:13px;font-weight:700;color:#1a5c35">R'+Number(d.amount).toLocaleString('en-ZA')+'/mo</span>'+removeBtn+'</div></div>';
  }).join('');
}
function addDebitOrder(){
  const name=document.getElementById('do-name').value.trim();
  const amount=parseFloat(document.getElementById('do-amount').value)||0;
  if(!name||!amount){showToast('Enter name and amount');return;}
  debitOrders.push({name,amount});
  localStorage.setItem('rw_debit_orders',JSON.stringify(debitOrders));
  if(user?.id) sbPatch(`beta_testers?id=eq.${user.id}`,{debit_orders:debitOrders}).catch(()=>{});
  document.getElementById('do-name').value='';
  document.getElementById('do-amount').value='';
  renderDebitOrdersList();
  renderDash();
  showToast('✅ Debit order added');
}
function removeDebitOrder(i){
  debitOrders.splice(i,1);
  localStorage.setItem('rw_debit_orders',JSON.stringify(debitOrders));
  if(user?.id) sbPatch(`beta_testers?id=eq.${user.id}`,{debit_orders:debitOrders}).catch(()=>{});
  renderDebitOrdersList();
  renderDash();
  showToast('Removed');
}

// ── Debt PWA ──────────────────────────────────────────────────
async function loadDebtsPWA(){
  if(!user?.id)return;
  const inc = Number(user?.income_amount||0); // defined at function scope so all blocks can use it
  try{
    const loadedDebts=await sbG(`debts?tester_id=eq.${user.id}&order=balance.asc`);
    debts=loadedDebts||[]; // Update global

    // ── Auto-sync debt minimums into debitOrders so dashboard card shows correctly ──
    const currentDOs=JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
    let doChanged=false;
    debts.forEach(d=>{
      if(!Number(d.min_payment)||d.min_payment<=0) return;
      const alreadyIn=currentDOs.find(o=>o.name===d.name&&o.addedFromDebt);
      if(!alreadyIn){
        currentDOs.push({name:d.name, amount:Number(d.min_payment), addedFromDebt:true});
        doChanged=true;
      } else if(alreadyIn.amount!==Number(d.min_payment)){
        alreadyIn.amount=Number(d.min_payment);
        doChanged=true;
      }
    });
    // Remove stale debt debit orders (debt deleted)
    const debtNames=debts.map(d=>d.name);
    const filtered=currentDOs.filter(o=>!o.addedFromDebt||debtNames.includes(o.name));
    if(filtered.length!==currentDOs.length) doChanged=true;
    if(doChanged){
      localStorage.setItem('rw_debit_orders',JSON.stringify(filtered));
      debitOrders=filtered;
      if(user?.id) sbPatch(`beta_testers?id=eq.${user.id}`,{debit_orders:filtered}).catch(()=>{});
    } else {
      debitOrders=currentDOs;
    }
    const el=document.getElementById('debt-list-pwa');
    if(!debts?.length){
      el.innerHTML='<div style="text-align:center;padding:32px 0"><div style="font-size:32px;margin-bottom:8px">💳</div><div style="font-size:14px;font-weight:600;color:var(--t)">No debts added yet</div><div style="font-size:12px;color:var(--mu);margin-top:4px">Add your first debt to start your payoff plan</div></div>';
      document.getElementById('debt-score-card').style.display='none';
      document.getElementById('snowball-card').style.display='none';
      document.getElementById('debt-total-bar').style.display='none';
      return;
    }
    // ── TOTALS ─────────────────────────────────────────────────
    const totalOwed=debts.reduce((s,d)=>s+Number(d.balance||0),0);
    const totalMin=debts.reduce((s,d)=>s+Number(d.min_payment||0),0);
    const totalOrig=debts.reduce((s,d)=>s+Number(d.original_balance||d.balance||0),0);
    // ── DEBT SCORE — unified 5-component calculation (same as home screen) ──
    const incForScore = Number(user?.income_amount||0);
    const progress = totalOrig>0?Math.max(0,(totalOrig-totalOwed)/totalOrig):0;

    // Component 1: DTI ratio (30%)
    const dtiM = incForScore>0?totalOwed/incForScore:0;
    const dtiS = dtiM<=0?100:dtiM<=3?90:dtiM<=6?75:dtiM<=10?55:dtiM<=20?35:15;

    // Component 2: Payment burden (25%)
    const minPct2 = incForScore>0?(totalMin/incForScore)*100:0;
    const minS2 = minPct2<=0?100:minPct2<=10?95:minPct2<=20?75:minPct2<=30?55:minPct2<=40?35:15;

    // Component 3: Payoff progress (25%)
    const progS = Math.round(progress*100);
    const progressScore2 = progS===0?20:progS<=5?35:progS<=15?55:progS<=30?70:progS<=60?85:100;

    // Component 4: Number of debts (10%)
    const numS2 = debts.length===0?100:debts.length===1?90:debts.length===2?75:debts.length===3?55:debts.length<=5?35:15;

    // Component 5: Payment consistency — did they mark any payments? (10%)
    const hasPayments = debts.some(d=>d._lastPayment);
    const consistencyS = debts.length===0?100:hasPayments?85:50;

    const unifiedScore = Math.min(100,Math.max(5,Math.round(dtiS*0.30 + minS2*0.25 + progressScore2*0.25 + numS2*0.10 + consistencyS*0.10)));
    const scoreEl=document.getElementById('debt-tab-score');
    const scoreBar=document.getElementById('debt-tab-bar');
    const scoreBadge=document.getElementById('debt-tab-badge');
    const scoreSummary=document.getElementById('debt-tab-summary');
    const scoreCard=document.getElementById('debt-score-card');
    if(scoreEl)scoreEl.textContent=unifiedScore;
    if(scoreBar)scoreBar.style.width=unifiedScore+'%';
    if(scoreBadge){
      if(unifiedScore>=70){scoreBadge.textContent='🟢 Good standing';scoreBadge.style.background='#c8e6cf';scoreBadge.style.color='#1a5c35';}
      else if(unifiedScore>=45){scoreBadge.textContent='🟡 Improving';scoreBadge.style.background='#fff9c4';scoreBadge.style.color='#92400e';}
      else{scoreBadge.textContent='🔴 Needs attention';scoreBadge.style.background='#ffcdd2';scoreBadge.style.color='#c62828';}
    }
    if(scoreSummary)scoreSummary.textContent=`R${Math.round(totalOwed).toLocaleString('en-ZA')} total across ${debts.length} debt${debts.length!==1?'s':''}. ${progress>0?Math.round(progress*100)+'% paid off overall.':'Start paying to build your score.'}`;
    if(scoreCard)scoreCard.style.display='block';
    // Sync home screen debt score card to same value
    const dsNum2=document.getElementById('debt-score-num');
    const scoreColor2=unifiedScore>=70?'#1a7a4a':unifiedScore>=45?'#ba7517':'#a32d2d';
    if(dsNum2){dsNum2.textContent=unifiedScore;dsNum2.style.color=scoreColor2;}
    const dsBar2=document.getElementById('debt-score-bar');
    if(dsBar2){dsBar2.style.width=unifiedScore+'%';dsBar2.style.background=scoreColor2;}
    // ── TOTALS BAR ─────────────────────────────────────────────
    const totalBar=document.getElementById('debt-total-bar');
    const totalAmt=document.getElementById('debt-total-amt');
    const totalMinEl=document.getElementById('debt-total-min');
    if(totalBar)totalBar.style.display='flex';
    if(totalAmt)totalAmt.textContent='R'+Math.round(totalOwed).toLocaleString('en-ZA');
    if(totalMinEl)totalMinEl.textContent='R'+Math.round(totalMin).toLocaleString('en-ZA');
    // ── SNOWBALL STRATEGY ──────────────────────────────────────
    // Sort smallest balance first (snowball order)
    const sorted=[...debts].sort((a,b)=>Number(a.balance||0)-Number(b.balance||0));
    const snowballCard=document.getElementById('snowball-card');
    const snowballContent=document.getElementById('snowball-content');
    if(snowballCard&&snowballContent&&sorted.length>0){
      snowballCard.style.display='block';
      let html='';
      let cumulativeMonths=0;
      let rollingExtra=0;
      sorted.forEach((d,i)=>{
        const bal=Number(d.balance||0);
        const min=Number(d.min_payment||0)||Math.round(bal*0.05);
        const rate=Number(d.interest_rate||0)/100/12;
        const payment=min+rollingExtra;
        // Simulate payoff
        let b=bal, months=0;
        while(b>0.01&&months<360){
          b=b*(1+rate)-payment;
          if(b<0)b=0;
          months++;
        }
        cumulativeMonths+=months;
        rollingExtra+=min; // Roll this debt's min into next
        const isFirst=i===0;
        html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${i<sorted.length-1?'border-bottom:1px solid #fde68a':''}">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#92400e;display:flex;align-items:center;gap:6px">
              ${isFirst?'<span style="background:#f59e0b;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:20px">PAY FIRST</span>':'<span style="background:rgba(0,0,0,0.08);color:#92400e;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px">#'+(i+1)+'</span>'}
              ${d.name||d.category||'Debt'}
            </div>
            <div style="font-size:11px;color:#b45309;margin-top:3px">R${Math.round(bal).toLocaleString('en-ZA')} · min R${Math.round(min).toLocaleString('en-ZA')}/mo${cumulativeMonths>0?' · paid off in '+cumulativeMonths+' month'+(cumulativeMonths!==1?'s':''):''}${d.interest_rate>0?' · '+d.interest_rate+'% p.a.':''}</div>
          </div>
        </div>`;
      });
      snowballContent.innerHTML=html;
    }
    // ── DEBT LIST ──────────────────────────────────────────────
    el.innerHTML=debts.map((d,i)=>{
      const bal=Number(d.balance||0);
      const orig=Number(d.original_balance||bal);
      const pct=orig>0?Math.min(100,Math.round((orig-bal)/orig*100)):0;
      const isFirst=i===0;
      return`<div style="background:${isFirst?'#fff8e1':'var(--w)'};border-radius:14px;border:${isFirst?'1.5px solid #fbbf24':'1px solid #d1ead9'};padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              ${isFirst?'<span style="background:#f59e0b;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px">ATTACK FIRST</span>':(i===1?'<span style="background:#e0f2fe;color:#0369a1;font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px">UP NEXT</span>':'')}
              ${(()=>{const p=JSON.parse(localStorage.getItem('rw_acc_plan')||'null');return p&&p.attack_debt_id===d.id?'<span style="background:#1a7a4a;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px">🎯 +R'+Number(p.extra).toLocaleString("en-ZA")+'/mo plan</span>':''})()}
              <div style="font-size:14px;font-weight:700">${d.name||d.category||'Debt'}</div>
            </div>
            <div style="font-size:11px;color:var(--mu)">${d.category||''}${d.interest_rate>0?' · '+d.interest_rate+'% p.a.':''}${d.months_remaining>0?' · '+d.months_remaining+' months left':''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:900;color:#c62828">R${Math.round(bal).toLocaleString('en-ZA')}</div>
            <div style="font-size:11px;color:var(--mu)">min R${Number(d.min_payment||0).toLocaleString('en-ZA')}/mo</div>
          </div>
        </div>
        ${d.balloon_payment>0?`<div style="background:#fff3e0;border:1px solid #ffb74d;border-radius:8px;padding:7px 10px;margin-bottom:6px;font-size:11px;color:#e65100">⚠️ Balloon payment: R${Math.round(d.balloon_payment).toLocaleString('en-ZA')} due at end of term</div>`:''}
        ${d.property_value>0?`<div style="background:#e8f5e9;border-radius:8px;padding:7px 10px;margin-bottom:6px;font-size:11px;color:#1b5e20">🏠 Property value: R${Math.round(d.property_value).toLocaleString('en-ZA')} · Equity: R${Math.round(Math.max(0,d.property_value-bal)).toLocaleString('en-ZA')}</div>`:''}
        ${orig>bal?`<div style="height:4px;background:#e8f5ee;border-radius:3px;overflow:hidden;margin-bottom:4px"><div style="height:100%;background:#1a5c35;border-radius:3px;width:${pct}%"></div></div><div style="font-size:10px;color:#5a8a6a">${pct}% paid off</div>`:''}
        <div style="font-size:10px;color:#888;margin-top:4px" id="last-payment-${d.id}">Loading payment history...</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          ${(()=>{
            const _pNow=new Date();
            const _pKey=`rw_paid_${d.id}_${_pNow.getFullYear()}_${_pNow.getMonth()+1}`;
            const _pKeyPrev=`rw_paid_${d.id}_${_pNow.getMonth()===0?_pNow.getFullYear()-1:_pNow.getFullYear()}_${_pNow.getMonth()===0?12:_pNow.getMonth()}`;
            const _pVal=localStorage.getItem(_pKey)||localStorage.getItem(_pKeyPrev);
            if(_pVal&&_pVal.startsWith('paid:')){
              return `<button onclick="openPaymentSheet('${d.id}','${(d.name||'Debt').replace(/'/g,"\\'")}',${Number(d.min_payment||0)},${bal})" style="flex:2;padding:7px;background:#e8f5e9;color:#1a5c35;border:1px solid #c8e6c9;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">➕ Extra payment</button>`;
            }
            return `<button onclick="openPaymentSheet('${d.id}','${(d.name||'Debt').replace(/'/g,"\\'")}',${Number(d.min_payment||0)},${bal})" style="flex:2;padding:7px;background:#1a7a4a;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">💳 Mark payment</button>`;
          })()}
          <button onclick="deleteDebtPWA('${d.id}')" style="flex:1;padding:7px;background:#fee2e2;color:#c62828;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🗑</button>
          <button onclick="openEditDebtPWA('${d.id}',${bal})" style="flex:1;padding:7px;background:#f0faf4;color:#1a5c35;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">✏️</button>
        </div>
      </div>`;
    }).join('');

    // Load last payment info for each debt
    debts.forEach(d=>{ setTimeout(()=>loadLastPayment(d.id),100); });

    // ── PAYOFF ACCELERATOR ─────────────────────────────────────
    // Use real disposable income (after all commitments) not raw income
    // Calculate real disposable using freshly loaded debts (not global which may be stale)
    // Store disposable income for accelerator (must be inside try where inc is defined)
    const freshDebtMin = debts.reduce((s,d)=>s+Number(d.min_payment||0),0);
    const storedDOs2 = JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
    const manualDOs2 = storedDOs2.filter(d=>!d.addedFromDebt);
    const doTotal2 = manualDOs2.reduce((s,d)=>s+Number(d.amount||0),0);
    // Check Supabase monthly_needs first (authoritative), fall back to localStorage
    let needsTotal2 = 0;
    const dbN = user?.monthly_needs;
    if(dbN?.preset && Object.keys(dbN.preset).length > 0){
      needsTotal2 = Object.values(dbN.preset).reduce((s,v)=>s+Number(v||0),0);
      if(dbN.custom) needsTotal2 += dbN.custom.reduce((s,v)=>s+Number(v.amount||0),0);
      // Sync to localStorage so getSmartWeeklyBudget also uses correct value
      localStorage.setItem('rw_monthly_needs', JSON.stringify(dbN.preset));
    } else {
      const savedNeeds2 = JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
      const customNeeds2 = JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
      needsTotal2 = Object.values(savedNeeds2).reduce((s,v)=>s+Number(v),0) + customNeeds2.reduce((s,n)=>s+Number(n.amount||0),0);
    }
    const accDisposable = Math.max(0, Number(inc) - freshDebtMin - doTotal2 - needsTotal2);
    window._pendingAccInc = accDisposable > 0 ? accDisposable : Number(inc); // pass to outer scope

  }catch(e){
    console.error('Debt render error:', e);
    // Only show error if debt list is actually empty — don't wipe cards that loaded fine
    const listEl = document.getElementById('debt-list-pwa');
    if(listEl && !listEl.innerHTML.trim()) {
      listEl.innerHTML='<div style="color:var(--mu);font-size:13px;text-align:center;padding:20px">Could not load debts</div>';
    }
  }

  // Accelerator runs OUTSIDE try/catch — uses window._pendingAccInc set inside try
  try {
    const accDebts = (typeof debts !== 'undefined' && Array.isArray(debts)) ? debts : [];
    if(accDebts.length > 0) {
      const accOwed = accDebts.reduce((s,d)=>s+Number(d.balance||0),0);
      const accMin = accDebts.reduce((s,d)=>s+Number(d.min_payment||0),0);
      // Use value calculated inside try/catch where inc was in scope
      const accInc2 = window._pendingAccInc > 0 ? window._pendingAccInc : Number(user?.income_amount||0);
      renderPayoffAccelerator(accDebts, accOwed, accMin, accInc2);
    }
  } catch(e2) { console.error('Accelerator error:', e2); }
}

function renderPayoffAccelerator(debts, totalOwed, totalMin, inc){

  const timelineEl=document.getElementById('debt-free-timeline');
  const accEl=document.getElementById('payoff-accelerator');
  const scenEl=document.getElementById('accelerator-scenarios');
  const splitEl=document.getElementById('split-strategy-text');
  const bondEl=document.getElementById('bond-score-debt-tab');
  if(!timelineEl||!accEl||!scenEl)return;
  if(!debts?.length){timelineEl.style.display='none';accEl.style.display='none';return;}

  // Amortization helpers
  function calcMonths(balance,minPay,extra,annualRate){
    if(balance<=0)return 0;
    const pay=minPay+extra;
    if(pay<=0)return 600;
    const r=annualRate/100/12;
    let bal=balance,m=0;
    while(bal>0.01&&m<600){bal=bal*(1+r)-pay;if(bal<0)bal=0;m++;}
    return m;
  }
  function calcInterestTotal(balance,minPay,extra,annualRate){
    if(balance<=0||annualRate<=0)return 0;
    const pay=minPay+extra;const r=annualRate/100/12;
    let bal=balance,total=0,m=0;
    while(bal>0.01&&m<600){const i=bal*r;total+=i;bal=bal+i-pay;if(bal<0)bal=0;m++;}
    return Math.round(total);
  }
  
// ── Module-level snowball helpers (moved from inside functions to avoid duplicates) ──
function snowballMonths(debtList,extra){
  const sorted=[...debtList].sort((a,b)=>Number(a.balance)-Number(b.balance));
  let roll=extra,total=0;
  for(const d of sorted){
    const bal=Number(d.balance||0);
    const min=Math.max(Number(d.min_payment||0),50);
    const r=Number(d.interest_rate||0)/100/12;
    let b=bal,pay=min+roll,m=0;
    while(b>0.01&&m<600){b=b*(1+r)-pay;if(b<0)b=0;m++;}
    total+=m;roll+=min;
  }
  return total;
}
function snowballInterest(debtList,extra){
  return debtList.reduce((s,d)=>{
    const bal=Number(d.balance||0);const min=Math.max(Number(d.min_payment||0),50);
    const rate=Number(d.interest_rate||0)||20;
    const r=rate/100/12;
    if(bal<=0)return s;
    const pay=min+extra;let b=bal,total=0,m=0;
    while(b>0.01&&m<600){const i=b*r;total+=i;b=b+i-pay;if(b<0)b=0;m++;}
    return s+Math.round(total);
  },0);
}

function renderPayoffAccelerator(debts, totalOwed, totalMin, inc){

  const timelineEl=document.getElementById('debt-free-timeline');
  const accEl=document.getElementById('payoff-accelerator');
  const scenEl=document.getElementById('accelerator-scenarios');
  const splitEl=document.getElementById('split-strategy-text');
  const bondEl=document.getElementById('bond-score-debt-tab');
  if(!timelineEl||!accEl||!scenEl)return;
  if(!debts?.length){timelineEl.style.display='none';accEl.style.display='none';return;}

  // Amortization helpers
  function calcMonths(balance,minPay,extra,annualRate){
    if(balance<=0)return 0;
    const pay=minPay+extra;
    if(pay<=0)return 600;
    const r=annualRate/100/12;
    let bal=balance,m=0;
    while(bal>0.01&&m<600){bal=bal*(1+r)-pay;if(bal<0)bal=0;m++;}
    return m;
  }
  function calcInterestTotal(balance,minPay,extra,annualRate){
    if(balance<=0||annualRate<=0)return 0;
    const pay=minPay+extra;const r=annualRate/100/12;
    let bal=balance,total=0,m=0;
    while(bal>0.01&&m<600){const i=bal*r;total+=i;bal=bal+i-pay;if(bal<0)bal=0;m++;}
    return Math.round(total);
  }
  

  // Split debts: asset-backed vs unsecured
  const ASSET_CATS=['Vehicle','vehicle','Bond/Home loan','bond','home loan','mortgage'];
  const assetDebts=debts.filter(d=>ASSET_CATS.some(c=>(d.category||'').toLowerCase().includes(c.toLowerCase())));
  const storeDebts=debts.filter(d=>!ASSET_CATS.some(c=>(d.category||'').toLowerCase().includes(c.toLowerCase())));
  const storeTotal=storeDebts.reduce((s,d)=>s+Number(d.balance||0),0);
  const assetTotal=assetDebts.reduce((s,d)=>s+Number(d.balance||0),0);
  const storeMin=storeDebts.reduce((s,d)=>s+Number(d.min_payment||0),0);
  const storeMonthsMin=storeDebts.length?snowballMonths(storeDebts,0):0;
  const totalMonthsMin=snowballMonths(debts,0);

  // Debt free timeline
  timelineEl.style.display='block';
  const freeMonthsEl=document.getElementById('debt-free-months');
  const freeLabelEl=document.getElementById('debt-free-label');
  if(freeMonthsEl){
    freeMonthsEl.textContent=totalMonthsMin>60?Math.round(totalMonthsMin/12)+' years':totalMonthsMin+' months';
    const freeDate=new Date();
    freeDate.setMonth(freeDate.getMonth()+totalMonthsMin);
    const dateEl=document.getElementById('debt-free-date');
    if(dateEl) dateEl.textContent='Debt free: '+freeDate.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
  }
  if(freeLabelEl)freeLabelEl.textContent='paying only minimums (R'+totalMin.toLocaleString('en-ZA')+'/mo)';

  accEl.style.display='block';

  // inc is already disposable (after debts+needs subtracted before call)
  const freePerMonth=Math.max(0,inc);
  const storeMonthsStr=m=>{
    if(m<=0) return 'Already paid';
    if(m<12) return m+' month'+(m!==1?'s':'');
    const yrs=Math.floor(m/12), mos=m%12;
    return yrs+' year'+(yrs!==1?'s':'')+(mos?' '+mos+' month'+(mos!==1?'s':''):'');
  };

  // Build the new smart accelerator HTML
  window._accDebts = debts; // store globally so buttons can reference without JSON.stringify
  window._accFreePerMonth = Math.max(0,inc); // inc is already disposable (after debts+needs), store directly
  scenEl.innerHTML=`
    ${storeDebts.length>0&&assetDebts.length>0?`
    <div style="background:#f7f6f2;border-radius:12px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Your debt — two different pictures</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e8e6de">
        <div>
          <div style="font-size:13px;font-weight:700;color:#2c2c2a">Store debts (${storeDebts.map(d=>d.name||d.category).join(', ')})</div>
          <div style="font-size:11px;color:#888;margin-top:2px">R${Math.round(storeTotal).toLocaleString('en-ZA')} · R${storeMin.toLocaleString('en-ZA')}/mo minimums</div>
          <div style="height:4px;background:#e8e6de;border-radius:2px;margin-top:5px;width:160px;overflow:hidden"><div style="height:100%;background:#1a7a4a;border-radius:2px;width:${Math.min(100,Math.round(storeTotal/totalOwed*100))}%"></div></div>
        </div>
        <span style="background:#eaf3de;color:#1a5c35;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">${storeMonthsStr(storeMonthsMin)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0">
        <div>
          <div style="font-size:13px;font-weight:700;color:#2c2c2a">${assetDebts.map(d=>d.name||d.category).join(', ')}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">R${Math.round(assetTotal).toLocaleString('en-ZA')} · Asset-backed debt</div>
          <div style="height:4px;background:#e8e6de;border-radius:2px;margin-top:5px;width:160px;overflow:hidden"><div style="height:100%;background:#a32d2d;border-radius:2px;width:${Math.min(100,Math.round(assetTotal/totalOwed*100))}%"></div></div>
        </div>
        <span style="background:#fdecea;color:#a32d2d;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Long-term</span>
      </div>
      <div style="font-size:11px;color:#888;line-height:1.5;margin-top:8px;padding-top:8px;border-top:1px solid #e8e6de">Your store debts are gone in ${storeMonthsStr(storeMonthsMin)} at minimums. The car loan creates the long timeline — it's asset-backed, not a crisis. Focus extra payments on store debts first.</div>
    </div>`:``}

    <div style="margin-bottom:14px">
      <div style="font-size:12px;color:#888;margin-bottom:10px">You have <strong style="color:#1a7a4a">R${freePerMonth.toLocaleString('en-ZA')}/mo</strong> free after all commitments. How much extra to put towards debt?</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <input type="range" id="acc-slider" min="0" max="${Math.min(freePerMonth,2000)}" value="${Math.round(freePerMonth*0.12)}" step="50"
          oninput="(function(v){const ci=document.getElementById('acc-custom-input');if(ci)ci.value=Math.round(v);updateAccelerator(v,window._accDebts)})(this.value)"
          style="flex:1;height:4px;border-radius:2px;accent-color:#1a7a4a">
        <span style="font-size:14px;font-weight:700;color:#1a7a4a;min-width:60px;text-align:right" id="acc-slider-val">R${Math.round(freePerMonth*0.12).toLocaleString('en-ZA')}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:12px;color:#888">Or type an amount:</span>
        <div style="display:flex;align-items:center;background:#fff;border:1px solid #d1ead9;border-radius:8px;padding:4px 10px;gap:2px">
          <span style="font-size:13px;color:#1a7a4a;font-weight:700">R</span>
          <input type="number" id="acc-custom-input" min="0" max="${Math.min(freePerMonth,2000)}" value="${Math.round(freePerMonth*0.12)}"
            style="width:65px;border:none;outline:none;font-size:13px;font-weight:700;color:#1a7a4a;background:transparent"
            oninput="(function(v){const s=document.getElementById('acc-slider');const cap=Math.min(Math.max(0,parseInt(v)||0),${Math.min(freePerMonth,2000)});if(s)s.value=cap;updateAccelerator(cap,window._accDebts)})(this.value)"
            placeholder="0">
        </div>
        <span style="font-size:11px;color:#aaa">/mo</span>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:14px">
        <button onclick="setAccPct(0.10)" id="acc-btn-10" style="flex:1;padding:8px 4px;background:#f7f6f2;border:1px solid #e8e6de;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:#5f5e5a">10%<br>R${Math.round(freePerMonth*0.10).toLocaleString('en-ZA')}</button>
        <button onclick="setAccPct(0.25)" id="acc-btn-25" style="flex:1;padding:8px 4px;background:#f7f6f2;border:1px solid #e8e6de;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:#5f5e5a">25%<br>R${Math.round(freePerMonth*0.25).toLocaleString('en-ZA')}</button>
        <button onclick="setAccPct(0.50)" id="acc-btn-50" style="flex:1;padding:8px 4px;background:#f7f6f2;border:1px solid #e8e6de;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:#5f5e5a">50%<br>R${Math.round(freePerMonth*0.50).toLocaleString('en-ZA')}</button>
      </div>
      <div id="acc-result" style="background:#f0faf4;border-radius:12px;padding:14px;border:1px solid #d1ead9">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div><div style="font-size:12px;color:#5a8a6a;margin-bottom:2px">Store debts clear in</div><div style="font-size:22px;font-weight:900;color:#1a5c35" id="acc-store-result">—</div></div>
          <div style="text-align:right"><div style="font-size:12px;color:#5a8a6a;margin-bottom:2px">Interest saved</div><div style="font-size:22px;font-weight:900;color:#1a5c35" id="acc-int-saved">—</div></div>
        </div>
        <div style="font-size:12px;color:#5a8a6a;line-height:1.6" id="acc-detail">—</div>
      </div>
    </div>

    <div style="background:#eaf3de;border-radius:12px;padding:14px;border:1px solid #a5d6a7">
      <div style="font-size:11px;color:#1a5c35;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Recommended: snowball + roll strategy</div>
      <div style="font-size:12px;color:#1a5c35;line-height:1.6" id="snowball-recommendation">Pay extra on your smallest debt first. When it's gone, roll that payment onto the next one. Each debt you clear frees up more money for the next.</div>
      <div id="acc-commit-section" style="margin-top:12px;display:none">
        <div style="font-size:11px;color:#27500a;background:#fff;border-radius:8px;padding:10px;margin-bottom:10px;line-height:1.6" id="acc-commit-explain"></div>
        <button onclick="commitToAcceleratorPlan()" id="acc-commit-btn" style="width:100%;padding:12px;background:#1a7a4a;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">✅ Commit to this plan</button>
        <div id="acc-committed-badge" style="display:none;text-align:center;padding:10px;font-size:12px;color:#1a5c35;font-weight:700">🎯 You're on this plan — committed!</div>
      </div>
    </div>
  `;

  // Initialize the accelerator display
  const initExtra=Math.round(freePerMonth*0.12);
  updateAccelerator(initExtra,debts);

  // Split strategy
  const spare=Math.max(0,Math.round(freePerMonth*0.15));
  if(splitEl)splitEl.textContent=`Pay R${Math.round(spare/2).toLocaleString('en-ZA')} extra towards debt AND save R${Math.round(spare/2).toLocaleString('en-ZA')} as a buffer — every month. If something goes wrong, your savings cover the debt. You finish debt faster AND stay protected.`;

  if(bondEl){
    const dti=inc>0?(totalMin/inc*100):0;
    let score=50;
    if(inc>=20000)score+=15;else if(inc>=15000)score+=10;else if(inc>=10000)score+=5;
    if(dti<20)score+=15;else if(dti<30)score+=10;else if(dti<40)score+=5;else score-=10;
    score=Math.max(5,Math.min(100,score));
    bondEl.textContent=score;
  }
}

function setAccPct(pct){
  const fpm = window._accFreePerMonth || 0;
  const val = Math.round(fpm * pct);
  const slider = document.getElementById('acc-slider');
  if(slider){ slider.value = val; }
  // Clear committed state when changing amount
  const savedPlan = JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
  if(savedPlan && savedPlan.extra !== val){
    const badge = document.getElementById('acc-committed-badge');
    const btn = document.getElementById('acc-commit-btn');
    if(badge) badge.style.display='none';
    if(btn) btn.style.display='block';
  }
  updateAccelerator(val, window._accDebts);
  // Highlight active button
  ['acc-btn-10','acc-btn-25','acc-btn-50'].forEach(id=>{
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.style.background = '#f7f6f2';
    btn.style.border = '1px solid #e8e6de';
    btn.style.color = '#5f5e5a';
  });
  const pctMap = {0.10:'acc-btn-10', 0.25:'acc-btn-25', 0.50:'acc-btn-50'};
  const activeBtn = document.getElementById(pctMap[pct]);
  if(activeBtn){
    activeBtn.style.background = '#eaf3de';
    activeBtn.style.border = '1px solid #a5d6a7';
    activeBtn.style.color = '#1a5c35';
  }
}

function updateAccelerator(extra,debts){
  debts = debts || window._accDebts || [];
  extra=Number(extra)||0;
  const sliderVal=document.getElementById('acc-slider-val');
  if(sliderVal) sliderVal.textContent='R'+Math.round(extra).toLocaleString('en-ZA');

  const ASSET_CATS=['Vehicle','vehicle','Bond/Home loan','bond','home loan','mortgage'];
  const storeDebts=(debts||[]).filter(d=>!ASSET_CATS.some(c=>(d.category||'').toLowerCase().includes(c.toLowerCase())));
  const storeMin=storeDebts.reduce((s,d)=>s+Number(d.min_payment||0),0);
  const totalMin=(debts||[]).reduce((s,d)=>s+Number(d.min_payment||0),0);
  const inc=Number(window.user?.income_amount||0);
  // Use actual spendable (after debt minimums AND monthly needs) so slider never goes negative
  // Use stored freePerMonth from renderPayoffAccelerator — don't recalculate from localStorage
  // This ensures APK users without localStorage still get correct value
  const freePerMonth = window._accFreePerMonth > 0 ? window._accFreePerMonth : (()=>{
    const needsData=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
    const customNeedsAcc=JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
    const needsTotal=Object.values(needsData).reduce((s,v)=>s+Number(v||0),0)+customNeedsAcc.reduce((s,v)=>s+Number(v.amount||0),0);
    return Math.max(0,inc-totalMin-needsTotal);
  })();

  

  const storeMonths=storeDebts.length?snowballMonths(storeDebts,extra):0;
  const storeMonthsBase=storeDebts.length?snowballMonths(storeDebts,0):0;
  const intBase=snowballInterest(storeDebts,0);
  const intNew=snowballInterest(storeDebts,extra);
  const intSaved=Math.max(0,intBase-intNew);
  const monthsSaved=Math.max(0,storeMonthsBase-storeMonths);

  const fmt=m=>{
    if(m<=0) return 'Already paid';
    if(m<12) return m+' month'+(m!==1?'s':'');
    const yrs=Math.floor(m/12), mos=m%12;
    return yrs+' year'+(yrs!==1?'s':'')+(mos?' '+mos+' month'+(mos!==1?'s':''):'');
  };
  const storeEl=document.getElementById('acc-store-result');
  const intEl=document.getElementById('acc-int-saved');
  const detailEl=document.getElementById('acc-detail');
  const recEl=document.getElementById('snowball-recommendation');

  if(storeEl) storeEl.textContent=storeDebts.length?fmt(storeMonths):'No store debts';
  if(intEl) intEl.textContent='R'+intSaved.toLocaleString('en-ZA');

  const pct=freePerMonth>0?Math.round(extra/freePerMonth*100):0;
  let detail='',rec='';
  if(extra===0){
    detail=`No extra payment — store debts take ${fmt(storeMonthsBase)} at minimums only.`;
    rec=`Pay extra on your smallest debt first. When it's gone, roll that payment onto the next. Each debt cleared frees up more money.`;
  } else if(pct<=15){
    const leftover1=freePerMonth-extra;
    detail=`R${Math.round(extra).toLocaleString('en-ZA')} extra/mo (${pct}% of your free money). Manageable — store debts done ${monthsSaved} months sooner.${leftover1>0?` You still have R${Math.round(leftover1).toLocaleString('en-ZA')}/mo for living.`:' ⚠️ This uses most of your free money — consider a lower amount.'}` ;
    rec=`Put R${Math.round(extra).toLocaleString('en-ZA')} extra onto ${storeDebts[0]?.name||'your smallest debt'} first. Once paid off, roll that payment onto the next debt automatically.`;
  } else if(pct<=30){
    const leftover2=freePerMonth-extra;
    detail=`R${Math.round(extra).toLocaleString('en-ZA')} extra/mo (${pct}% of free money). Strong pace — store debts gone ${monthsSaved} months sooner, saves R${intSaved.toLocaleString('en-ZA')} in interest.${leftover2>0?` Leaves R${Math.round(leftover2).toLocaleString('en-ZA')}/mo for other expenses.`:' ⚠️ Adjust slider down if you need breathing room.'}`;
    rec=`Good balance between aggression and safety. Attack ${storeDebts[0]?.name||'smallest debt'} with R${Math.round(extra).toLocaleString('en-ZA')} extra. Roll when done.`;
  } else if(pct<=60){
    detail=`R${Math.round(extra).toLocaleString('en-ZA')} extra/mo (${pct}% of free money). Aggressive — store debts eliminated fast, saves R${intSaved.toLocaleString('en-ZA')} interest. Keep an emergency buffer of at least R1,000.`;
    rec=`Aggressive snowball — ${storeDebts[0]?.name||'smallest debt'} first with R${Math.round(extra).toLocaleString('en-ZA')} extra. You'll be store-debt free in ${fmt(storeMonths)}.`;
  } else {
    detail=`R${Math.round(extra).toLocaleString('en-ZA')} extra/mo (${pct}% of free money). Maximum attack — only R${Math.max(0,Math.round(freePerMonth-extra)).toLocaleString('en-ZA')}/mo left for other spending.${freePerMonth-extra<0?' ⚠️ This exceeds your free money — only do this if you have other income sources.':''} Only sustainable if you have no unexpected expenses.`;
    rec=`Maximum attack mode. Every spare rand goes to debt. Make sure you have at least R500 emergency buffer before committing to this.`;
  }

  if(detailEl) detailEl.textContent=detail;
  if(recEl) recEl.textContent=rec;

  // Show commit section when extra > 0
  const commitSection = document.getElementById('acc-commit-section');
  const commitExplain = document.getElementById('acc-commit-explain');
  const committedBadge = document.getElementById('acc-committed-badge');
  const commitBtn = document.getElementById('acc-commit-btn');

  if(commitSection && extra > 0 && storeDebts.length > 0){
    commitSection.style.display = 'block';
    // Check if already committed to this amount
    const savedPlan = JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
    const isCommitted = savedPlan && savedPlan.extra === Number(extra);
    if(committedBadge) committedBadge.style.display = isCommitted ? 'block' : 'none';
    if(commitBtn) commitBtn.style.display = isCommitted ? 'none' : 'block';

    // Plain English snowball explanation
    const attackDebt = storeDebts[0];
    const otherDebts = storeDebts.slice(1);
    let explain = `Put R${Math.round(extra).toLocaleString('en-ZA')} extra onto ${attackDebt?.name||'MTN'} every month.`;
    explain += ` Their minimum is R${Number(attackDebt?.min_payment||0).toLocaleString('en-ZA')}/mo — you'll pay R${(Number(attackDebt?.min_payment||0)+Number(extra)).toLocaleString('en-ZA')}/mo total.`;
    if(otherDebts.length > 0) explain += ` ${otherDebts.map(d=>d.name).join(' and ')} get minimums only for now.`;
    explain += ` Once ${attackDebt?.name||'MTN'} is paid off, roll that full R${(Number(attackDebt?.min_payment||0)+Number(extra)).toLocaleString('en-ZA')} onto the next debt.`;
    if(commitExplain) commitExplain.textContent = explain;
  } else if(commitSection) {
    commitSection.style.display = 'none';
  }
}


async function commitToAcceleratorPlan(){
  const slider = document.getElementById('acc-slider');
  const extra = Number(slider?.value || 0);
  if(!extra || !user?.id) return;

  const attackDebt = (window._accDebts||[]).filter(d=>{
    const ASSET=['Vehicle','vehicle','Bond','bond','mortgage'];
    return !ASSET.some(c=>(d.category||'').toLowerCase().includes(c.toLowerCase()));
  })[0];

  // Work out next payday label
  const freq = user.income_freq||'Monthly';
  const now = new Date();
  let paydayLabel = 'your next payday';
  if(freq==='Weekly'){
    const next = new Date(now);
    next.setDate(now.getDate() + (5 - now.getDay() + 7) % 7 || 7); // next Friday
    paydayLabel = 'Friday ' + next.toLocaleDateString('en-ZA',{day:'numeric',month:'long'});
  } else if(freq==='Monthly'){
    const next = new Date(now.getFullYear(), now.getMonth()+1, 25);
    paydayLabel = '25 ' + next.toLocaleDateString('en-ZA',{month:'long'});
  }

  const plan = {
    extra,
    attack_debt_id: attackDebt?.id,
    attack_debt_name: attackDebt?.name,
    committed_at: new Date().toISOString(),
    payday_label: paydayLabel
  };

  // Save locally
  localStorage.setItem('rw_acc_plan', JSON.stringify(plan));

  // Save to Supabase
  try {
    await fetch(`${SB}/rest/v1/beta_testers?id=eq.${user.id}`,{
      method:'PATCH',
      headers:{...getH(),'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({ accelerator_plan: plan })
    });
  } catch(e){ console.warn('Could not save plan to Supabase:', e); }

  // Update badge on debt tab
  const commitBtn = document.getElementById('acc-commit-btn');
  const committedBadge = document.getElementById('acc-committed-badge');
  if(commitBtn) commitBtn.style.display = 'none';
  if(committedBadge) committedBadge.style.display = 'block';

  // Schedule payday push reminder
  schedulePushNudges(plan);

  // Show success bottom sheet
  showCommitSuccessSheet(plan, attackDebt);
}

function showCommitSuccessSheet(plan, attackDebt){
  // Remove existing if any
  const existing = document.getElementById('commit-success-sheet');
  if(existing) existing.remove();

  const extra = Number(plan.extra||0);
  const minPay = Number(attackDebt?.min_payment||0);
  const totalPay = extra + minPay;
  const debtName = attackDebt?.name || 'your debt';
  const paydayLabel = plan.payday_label || 'your next payday';

  const sheet = document.createElement('div');
  sheet.id = 'commit-success-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;background:rgba(0,0,0,0.5)';
  sheet.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:28px 20px 36px;width:100%;max-width:480px;margin:0 auto;animation:slideUp .3s ease">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:8px">🎯</div>
        <div style="font-size:20px;font-weight:900;color:#1a5c35">You're committed!</div>
        <div style="font-size:13px;color:#888;margin-top:4px">Plan saved — here's exactly what to do</div>
      </div>

      <div style="background:#f0faf4;border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid #d1ead9">
        <div style="font-size:11px;font-weight:700;color:#5a8a6a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Your action on ${paydayLabel}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;color:#333">Pay to ${debtName}</span>
          <span style="font-size:16px;font-weight:900;color:#1a5c35">R${totalPay.toLocaleString('en-ZA')}</span>
        </div>
        <div style="font-size:11px;color:#888;line-height:1.6">
          Minimum R${minPay.toLocaleString('en-ZA')} + R${extra.toLocaleString('en-ZA')} extra = <strong>R${totalPay.toLocaleString('en-ZA')} total</strong>.<br>
          Once ${debtName} is paid off, roll the full R${totalPay.toLocaleString('en-ZA')} onto the next debt.
        </div>
      </div>

      <div style="background:#fffbeb;border-radius:14px;padding:14px;margin-bottom:20px;border:1px solid #fde68a">
        <div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px">💡 How the snowball works</div>
        <div style="font-size:12px;color:#78350f;line-height:1.6">Each month you pay extra, the debt shrinks faster. When it's gone, you roll that full payment onto the next debt — making it disappear even faster. The momentum builds.</div>
      </div>

      <button onclick="document.getElementById('commit-success-sheet').remove()" 
        style="width:100%;padding:14px;background:#1a7a4a;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer">
        Got it — I'll do it on ${paydayLabel} ✓
      </button>
      <button onclick="document.getElementById('commit-success-sheet').remove()"
        style="width:100%;padding:10px;background:none;border:none;font-size:13px;color:#aaa;cursor:pointer;margin-top:6px">
        Close
      </button>
    </div>
  `;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', e=>{ if(e.target===sheet) sheet.remove(); });
}

function schedulePushNudges(plan){
  if(!isPushEnabled()) return;
  if(!plan) plan = JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
  if(!plan) return;

  const extra = Number(plan.extra||0);
  const debtName = plan.attack_debt_name || 'your debt';
  const paydayLabel = plan.payday_label || 'your next payday';

  // Use the SW to schedule a local notification at next payday
  // Since web push requires a server, we use a setTimeout-based local notification
  // This fires while the app is open — for background push, sw.js handles it
  const now = new Date();
  const freq = user?.income_freq || 'Monthly';

  let msUntilPayday = 0;
  if(freq === 'Weekly'){
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    msUntilPayday = daysUntilFriday * 24 * 60 * 60 * 1000;
  } else {
    // Monthly — target 25th
    const next25 = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 25 ? 1 : 0), 25, 9, 0, 0);
    msUntilPayday = next25 - now;
  }

  // Store the nudge config in localStorage so sw.js can pick it up
  const nudgeConfig = {
    title: '💰 Payday reminder — debt plan',
    body: `Pay R${(extra + Number(plan.min_payment||0)).toLocaleString('en-ZA')} to ${debtName} today. You committed to this plan!`,
    scheduledFor: new Date(now.getTime() + msUntilPayday).toISOString(),
    tag: 'rw_payday_debt_nudge'
  };
  localStorage.setItem('rw_payday_nudge', JSON.stringify(nudgeConfig));

  // In-app reminder: show a toast on payday if app is open
  if(msUntilPayday > 0 && msUntilPayday < 7 * 24 * 60 * 60 * 1000){
    setTimeout(()=>{
      showToast(`💰 Payday! Remember to pay R${extra.toLocaleString('en-ZA')} extra to ${debtName} today.`, 8000);
    }, msUntilPayday);
  }
}

async function deleteDebtPWA(id){
  if(!window._confirmDebt) { showToast('Tap remove again to confirm'); window._confirmDebt=setTimeout(()=>{window._confirmDebt=null;},3000); return; } window._confirmDebt=null;
  try{
    await fetch(`${SB}/rest/v1/debts?id=eq.${id}`,{method:'DELETE',headers:{...H,'Prefer':'return=minimal'}});
    loadDebtsPWA();showToast('Debt removed');
  }catch(e){showToast('Could not remove. Try again.');}
}
async function openEditDebtPWA(id,currentBal){
  const newBal=prompt(`Update balance (currently R${Math.round(currentBal).toLocaleString('en-ZA')}):`);
  if(newBal===null)return;
  const val=parseFloat(newBal);
  if(isNaN(val)||val<0){showToast('Enter a valid amount');return;}
  try{
    await fetch(`${SB}/rest/v1/debts?id=eq.${id}`,{method:'PATCH',headers:{...H,'Prefer':'return=minimal'},body:JSON.stringify({balance:val})});
    loadDebtsPWA();showToast('✅ Balance updated');
  }catch(e){showToast('Could not update. Try again.');}
}

function openAddDebtPWA(){
  document.getElementById('add-debt-sheet').classList.add('open');
  document.getElementById('add-debt-ov').classList.add('open');
  // Reset to standard view
  document.getElementById('debt-cat').value='Personal loan';
  onDebtCatChange();
}
function closeAddDebtPWA(){
  document.getElementById('add-debt-sheet').classList.remove('open');
  document.getElementById('add-debt-ov').classList.remove('open');
}

function onDebtCatChange(){
  const cat=document.getElementById('debt-cat').value;
  const isMash=cat==='Mashonisa';
  const isVehicle=cat==='Vehicle';
  const isBond=cat==='Bond/Home loan';
  document.getElementById('debt-standard-fields').style.display=isMash?'none':'block';
  document.getElementById('debt-mashonisa-fields').style.display=isMash?'block':'none';
  document.getElementById('debt-vehicle-fields').style.display=isVehicle?'block':'none';
  document.getElementById('debt-bond-fields').style.display=isBond?'block':'none';
  document.getElementById('debt-sheet-title').textContent=isMash?'Mashonisa loan — real cost':isBond?'Add a bond / home loan':isVehicle?'Add vehicle finance':'Add a debt';
  if(isMash) calcMashonisa();
}

// ── Vehicle Finance Calculator ────────────────────────────────
let _vehMode = 'existing';

function setVehicleMode(mode){
  _vehMode = mode;
  document.getElementById('veh-existing-fields').style.display = mode==='existing'?'block':'none';
  document.getElementById('veh-new-fields').style.display = mode==='new'?'block':'none';
  const btnEx = document.getElementById('veh-mode-existing');
  const btnNew = document.getElementById('veh-mode-new');
  if(btnEx){ btnEx.style.background=mode==='existing'?'#1a7a4a':'#fff'; btnEx.style.color=mode==='existing'?'#fff':'#555'; btnEx.style.borderColor=mode==='existing'?'#1a7a4a':'#e8e6de'; }
  if(btnNew){ btnNew.style.background=mode==='new'?'#1a7a4a':'#fff'; btnNew.style.color=mode==='new'?'#fff':'#555'; btnNew.style.borderColor=mode==='new'?'#1a7a4a':'#e8e6de'; }
  if(mode==='new') calcVehicle();
}

function setVehicleTerm(months){
  document.getElementById('veh-term').value = months;
  document.querySelectorAll('.veh-term-btn').forEach(b=>{
    const active = b.textContent.includes(months/12);
    b.style.background = active?'#1a7a4a':'#fff';
    b.style.color = active?'#fff':'#555';
    b.style.borderColor = active?'#1a7a4a':'#e8e6de';
    b.style.fontWeight = active?'700':'600';
  });
  calcVehicle();
}

function calcVehicle(){
  const price = parseFloat(document.getElementById('veh-price')?.value)||0;
  const deposit = parseFloat(document.getElementById('veh-deposit')?.value)||0;
  const rate = parseFloat(document.getElementById('veh-rate')?.value)||15;
  const term = parseInt(document.getElementById('veh-term')?.value)||60;
  const balloon = parseFloat(document.getElementById('veh-balloon-new')?.value)||0;
  const result = document.getElementById('veh-calc-result');

  if(!price || price < 1000){ if(result) result.style.display='none'; return; }

  const financed = price - deposit;
  const monthlyRate = rate / 100 / 12;

  // Calculate monthly payment using amortization formula
  // With balloon: treat balloon as future value
  let monthly;
  if(balloon > 0 && balloon < financed){
    // PMT formula with future value (balloon)
    if(monthlyRate === 0){
      monthly = (financed - balloon) / term;
    } else {
      monthly = (financed * monthlyRate - balloon * monthlyRate / Math.pow(1+monthlyRate, term)) / (1 - Math.pow(1+monthlyRate, -term));
    }
  } else {
    // Standard PMT formula
    if(monthlyRate === 0){
      monthly = financed / term;
    } else {
      monthly = financed * monthlyRate / (1 - Math.pow(1+monthlyRate, -term));
    }
  }

  monthly = Math.round(monthly);
  const totalPaid = (monthly * term) + balloon;
  const totalInterest = totalPaid - financed;
  const totalCost = price - deposit + totalInterest; // what you actually pay total

  // Without balloon comparison
  let monthlyNoBalloon = 0;
  if(balloon > 0){
    if(monthlyRate === 0){
      monthlyNoBalloon = financed / term;
    } else {
      monthlyNoBalloon = financed * monthlyRate / (1 - Math.pow(1+monthlyRate, -term));
    }
    monthlyNoBalloon = Math.round(monthlyNoBalloon);
  }

  // Update display
  const fmt = n => 'R'+Math.round(n).toLocaleString('en-ZA');
  document.getElementById('veh-monthly').textContent = fmt(monthly)+'/mo';
  document.getElementById('veh-financed').textContent = fmt(financed);
  document.getElementById('veh-interest').textContent = fmt(totalInterest);
  document.getElementById('veh-total').textContent = fmt(totalCost);

  // Balloon warning
  const balloonWarn = document.getElementById('veh-balloon-warning');
  const balloonMsg = document.getElementById('veh-balloon-msg');
  if(balloon > 0 && balloonWarn && balloonMsg){
    const balloonDate = new Date();
    balloonDate.setMonth(balloonDate.getMonth() + term);
    const balloonDateStr = balloonDate.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
    balloonMsg.innerHTML = `Your balloon payment of <strong>${fmt(balloon)}</strong> is due in <strong>${balloonDateStr}</strong>. You need to have this money available — either save for it now or refinance before then. Your monthly payment is <strong>${fmt(monthly)}</strong> lower than without the balloon, but your total cost is <strong>${fmt((monthly*term+balloon) - (monthlyNoBalloon*term))}</strong> more.`;
    balloonWarn.style.display = 'block';
  } else if(balloonWarn){
    balloonWarn.style.display = 'none';
  }

  // No-balloon comparison
  const compareEl = document.getElementById('veh-no-balloon-compare');
  const compareMsg = document.getElementById('veh-compare-msg');
  if(balloon > 0 && compareEl && compareMsg){
    compareMsg.innerHTML = `💡 Without the balloon, your monthly would be <strong>${fmt(monthlyNoBalloon)}/mo</strong> (+${fmt(monthlyNoBalloon-monthly)}/mo more) but you'd save <strong>${fmt((monthly*term+balloon)-(monthlyNoBalloon*term))}</strong> in total cost and owe nothing at the end.`;
    compareEl.style.display = 'block';
  } else if(compareEl){
    compareEl.style.display = 'none';
  }

  if(result) result.style.display = 'block';

  // Store for "Use these numbers" button
  window._vehCalcResult = { balance: financed, minPayment: monthly, rate, monthsRemaining: term, balloon, vehicleValue: parseFloat(document.getElementById('veh-current-value')?.value)||0 };
}

function applyVehicleCalc(){
  if(!window._vehCalcResult) return;
  const r = window._vehCalcResult;
  const balEl = document.getElementById('debt-balance');
  const minEl = document.getElementById('debt-min');
  const rateEl = document.getElementById('debt-rate');
  const monthsEl = document.getElementById('debt-months-remaining');
  const balloonEl = document.getElementById('debt-balloon');
  if(balEl) balEl.value = r.balance;
  if(minEl) minEl.value = r.minPayment;
  if(rateEl) rateEl.value = r.rate;
  if(monthsEl) monthsEl.value = r.monthsRemaining;
  if(balloonEl) balloonEl.value = r.balloon||'';
  // Switch back to existing mode to show the filled fields
  setVehicleMode('existing');
  showToast('✅ Numbers applied — review and save your debt');
}

function calcMashonisa(){
  const borrowed=parseFloat(document.getElementById('mash-borrowed')?.value)||0;
  const ratePerHundred=parseFloat(document.getElementById('mash-rate')?.value)||30;
  const days=parseInt(document.getElementById('mash-days')?.value)||30;
  if(!borrowed){
    document.getElementById('mash-breakdown').style.display='none';
    document.getElementById('mash-escape').style.display='none';
    return;
  }
  const interest=Math.round(borrowed*(ratePerHundred/100));
  const total=borrowed+interest;
  const annualRate=Math.round((ratePerHundred/100)*(365/days)*100);
  const dueDate=new Date(Date.now()+days*86400000).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  // Bank comparison — 20% annual = ~1.67% per month
  const bankMonthlyRate=0.20/12;
  const bankMonths=Math.ceil(days/30);
  const bankInterest=Math.round(borrowed*bankMonthlyRate*bankMonths);
  const overpay=interest-bankInterest;

  // Update breakdown
  document.getElementById('mash-principal').textContent='R'+borrowed.toLocaleString('en-ZA');
  document.getElementById('mash-interest-amt').textContent='R'+interest.toLocaleString('en-ZA');
  document.getElementById('mash-total').textContent='R'+total.toLocaleString('en-ZA');
  document.getElementById('mash-due').textContent=dueDate;
  document.getElementById('mash-annual').textContent=annualRate+'% per year';
  document.getElementById('mash-comp-amt').textContent=borrowed.toLocaleString('en-ZA');
  document.getElementById('mash-bank-interest').textContent='R'+bankInterest.toLocaleString('en-ZA')+' interest';
  document.getElementById('mash-overpay').textContent=`You're paying R${overpay.toLocaleString('en-ZA')} MORE than a bank would charge`;
  document.getElementById('mash-breakdown').style.display='block';

  // Escape plan
  const inc=Number(user?.income_amount||0);
  const weeklyInc=Math.round(inc/4);
  let escapeText='';
  if(total<=weeklyInc){
    escapeText=`✅ Good news — R${total.toLocaleString('en-ZA')} is less than your weekly budget. Pay it all on your next payday and you're free. Do NOT roll it over.`;
  } else if(total<=inc*0.3){
    escapeText=`⚠️ R${total.toLocaleString('en-ZA')} is ${Math.round(total/inc*100)}% of your monthly income. Prioritise paying this first on payday — before any other spending. Ask family for help with the shortfall if needed rather than rolling over.`;
  } else {
    escapeText=`🚨 R${total.toLocaleString('en-ZA')} is ${Math.round(total/inc*100)}% of your monthly income — this is a serious burden. Do NOT roll it over (the debt will grow fast). Options: ask family to lend you the money, apply for a small bank loan at 20% interest (much cheaper), or negotiate directly with the Mashonisa for more time.`;
  }
  document.getElementById('mash-escape-text').textContent=escapeText;
  document.getElementById('mash-escape').style.display='block';

  // Pre-fill hidden save fields
  const nameEl=document.getElementById('debt-name');
  const balEl=document.getElementById('debt-balance');
  const minEl=document.getElementById('debt-min');
  if(nameEl) nameEl.value='Mashonisa loan';
  if(balEl) balEl.value=total; // save total owed (principal + interest)
  if(minEl) minEl.value=total; // full amount due — no monthly instalments
}
async function saveDebtPWA(){
  const name=document.getElementById('debt-name').value.trim();
  const balance=parseFloat(document.getElementById('debt-balance').value)||0;
  const minPay=parseFloat(document.getElementById('debt-min').value)||0;
  const rate=parseFloat(document.getElementById('debt-rate')?.value)||0;
  const cat=document.getElementById('debt-cat').value;
  if(!name||!balance){showToast('Enter debt name and balance');return;}

  // Vehicle-specific fields
  const monthsRemaining=parseInt(document.getElementById('debt-months-remaining')?.value)||null;
  const balloon=parseFloat(document.getElementById('debt-balloon')?.value)||null;
  // Bond-specific fields
  const bondMonths=parseInt(document.getElementById('debt-bond-months')?.value)||null;
  const propertyValue=parseFloat(document.getElementById('debt-property-value')?.value)||null;

  const finalMonths = monthsRemaining||bondMonths||null;

  const btn=document.getElementById('debt-save-btn');
  btn.disabled=true;btn.textContent='Saving...';
  try{
    await sbP('debts',{
      tester_id:user.id,name,category:cat,balance,
      min_payment:minPay,original_balance:balance,
      interest_rate:rate||null,
      months_remaining:finalMonths,
      balloon_payment:balloon||null,
      property_value:propertyValue||null,
      vehicle_value:window._vehCalcResult?.vehicleValue||null
    });
    closeAddDebtPWA();loadDebtsPWA();showToast('✅ Debt added');
    ['debt-name','debt-balance','debt-min','debt-rate','debt-months-remaining','debt-balloon','debt-bond-months','debt-property-value'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
  }catch(e){showToast('Could not save. Try again.');}
  btn.disabled=false;btn.textContent='Save debt';
}

// ── Goals PWA ─────────────────────────────────────────────────
// ── SAVINGS GOALS — missing functions ────────────────────────
function openAddGoalPWA(){
  // Clear form — with null checks
  const targetEl = document.getElementById('goal-target');
  if(targetEl) targetEl.value='';
  const dateEl = document.getElementById('goal-date');
  if(dateEl) dateEl.value='';
  const savedEl = document.getElementById('goal-saved');
  if(savedEl) savedEl.value='0';
  const hintEl = document.getElementById('goal-monthly-hint');
  if(hintEl) hintEl.textContent='';
  // Reset chips — first chip active by default
  document.querySelectorAll('.goal-chip').forEach((c,i)=>c.classList.toggle('act',i===0));
  const sheet = document.getElementById('add-goal-sheet');
  if(sheet) sheet.classList.add('open');
  const ov = document.getElementById('add-goal-ov');
  if(ov) ov.classList.add('open');
}

function closeAddGoalPWA(){
  const sheet = document.getElementById('add-goal-sheet');
  if(sheet) sheet.classList.remove('open');
  const ov = document.getElementById('add-goal-ov');
  if(ov) ov.classList.remove('open');
}

function selectGoalChip(el, emoji, name){
  document.querySelectorAll('.goal-chip').forEach(c=>c.classList.remove('act'));
  el.classList.add('act');
  el._emoji = emoji;
  el._name = name;
}

function calcGoalMonthly(){
  const target = parseFloat(document.getElementById('goal-target').value)||0;
  const saved  = parseFloat(document.getElementById('goal-saved').value)||0;
  const dateVal = document.getElementById('goal-date').value;
  const calcBox = document.getElementById('goal-calc-result');
  const calcAmt = document.getElementById('goal-calc-amount');
  const calcDesc = document.getElementById('goal-calc-desc');
  const hint = document.getElementById('goal-monthly-hint');
  if(calcBox && target>0 && dateVal){
    const months = Math.max(1, Math.round((new Date(dateVal)-new Date())/(1000*60*60*24*30)));
    const needed = Math.ceil(Math.max(0, target-saved)/months);
    calcBox.style.display='block';
    if(calcAmt) calcAmt.textContent = needed>0 ? `R${needed.toLocaleString('en-ZA')}/month` : 'Already there!';
    if(calcDesc) calcDesc.textContent = needed>0 ? `to reach R${target.toLocaleString('en-ZA')} by ${new Date(dateVal+'-01').toLocaleDateString('en-ZA',{month:'short',year:'numeric'})}` : '🎉 Already at or above target!';
  } else if(calcBox){
    calcBox.style.display='none';
  }
  if(hint) hint.textContent='';
}

async function saveGoalPWA(){
  if(!user?.id){ showToast('Not logged in'); return; }

  // Get selected chip for emoji
  const activeChip = document.querySelector('.goal-chip.act');
  const emoji = activeChip?._emoji || activeChip?.textContent?.trim().split(' ')[0] || '🎯';

  // Use goal-name field (exists in HTML)
  const nameField = document.getElementById('goal-name');
  const name = (nameField?.value?.trim()) ||
    activeChip?._name ||
    activeChip?.textContent?.trim().replace(/^\S+\s*/,'') ||
    'My goal';

  const target   = parseFloat(document.getElementById('goal-target').value)||0;
  const saved    = parseFloat(document.getElementById('goal-saved').value)||0;
  const dateVal  = document.getElementById('goal-date').value;
  const nickname = document.getElementById('goal-nickname')?.value?.trim()||null;

  if(!target||target<=0){ showToast('Enter a target amount'); return; }

  const btn = document.getElementById('goal-save-btn');
  if(btn){ btn.disabled=true; btn.textContent='Saving...'; }

  try{
    const months = dateVal ? Math.max(1,Math.round((new Date(dateVal+'-01')-new Date())/(1000*60*60*24*30))) : 0;
    const monthly = months>0 ? Math.ceil(Math.max(0,target-saved)/months) : 0;

    const payload = {
      tester_id: user.id,
      name, emoji, target, saved,
      monthly_contribution: monthly,
    };
    if(dateVal) payload.target_date = dateVal+'-01';
    if(nickname) payload.account_nickname = nickname;

    const r = await fetch(`${SB}/rest/v1/savings_goals`,{
      method:'POST',
      headers:{...H,'Prefer':'return=minimal'},
      body:JSON.stringify(payload)
    });
    if(!r.ok){ const t=await r.text(); throw new Error(t); }

    closeAddGoalPWA();
    showToast('✅ Goal saved!');
    await loadGoalsPWA();

  }catch(e){
    showToast('Could not save: '+e.message);
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='Save goal'; }
  }
}

// ── SAVINGS GOAL FUNCTIONS ───────────────────────────────────








async function loadGoalsPWA(){
  if(!user?.id)return;
  try{
    const goals=await sbG(`savings_goals?tester_id=eq.${user.id}&order=created_at.desc`);

    // ── ALWAYS update dashboard home card (works from any tab) ──
    const amtEl=document.getElementById('stat-goal-amt');
    const labelEl=document.getElementById('stat-goal-label');
    if(goals?.length){
      const g=goals[0];
      const saved=Number(g.saved||0),target=Number(g.target||0);
      const pct=target>0?Math.min(100,Math.round(saved/target*100)):0;
      if(amtEl) amtEl.textContent='R'+saved.toLocaleString('en-ZA');
      if(labelEl) labelEl.textContent=(g.emoji||'🎯')+' '+(g.name||'Goal')+' · '+pct+'%';
    } else {
      if(amtEl) amtEl.textContent='—';
      if(labelEl) labelEl.textContent='tap to add a goal';
    }

    // ── Update Grow tab list (only if element exists) ──
    const el=document.getElementById('goals-list-pwa');
    if(!el) return; // not on grow tab — home card already updated above

    if(!goals?.length){
      el.innerHTML='<div style="text-align:center;padding:32px 0"><div style="font-size:32px;margin-bottom:8px">🌱</div><div style="font-size:14px;font-weight:600;color:var(--t)">No savings goals yet</div><div style="font-size:12px;color:var(--mu);margin-top:4px">Add your first goal to start growing</div></div>';
      return;
    }

    // Free plan: update + Add button if already has 1 goal
    const {isPro}=getTier();
    const choseFree=localStorage.getItem('rw_chose_free')==='1';
    const addGoalBtn=document.querySelector('[onclick="openAddGoalPWA()"]');
    if(addGoalBtn){
      if((!isPro||choseFree)&&goals.length>=1){
        addGoalBtn.textContent='🔒 Upgrade to add more goals';
        addGoalBtn.style.background='rgba(74,222,128,.15)';
        addGoalBtn.style.color='#1a5c35';
        addGoalBtn.style.border='1px solid rgba(74,222,128,.3)';
        addGoalBtn.onclick=()=>showUpgradeWall(false);
      } else {
        addGoalBtn.textContent='+ Add a savings goal';
        addGoalBtn.style.background='var(--g)';
        addGoalBtn.style.color='#fff';
        addGoalBtn.style.border='none';
        addGoalBtn.onclick=openAddGoalPWA;
      }
    }

    el.innerHTML=goals.map(g=>{
      const savedAmt=Number(g.saved||0),targetAmt=Number(g.target||0);
      const pct=targetAmt>0?Math.min(100,Math.round(savedAmt/targetAmt*100)):0;
      const barCol=pct>=100?'#1a7a4a':pct>=50?'#639922':'#1a7a4a';
      let monthlyInfo='';
      if(g.target_date&&targetAmt>savedAmt){
        const months=Math.max(1,Math.round((new Date(g.target_date)-new Date())/(1000*60*60*24*30)));
        const needed=Math.ceil((targetAmt-savedAmt)/months);
        monthlyInfo=`<div style="font-size:11px;color:var(--g);margin-top:4px">💡 Save R${needed.toLocaleString('en-ZA')}/mo to reach goal by ${new Date(g.target_date).toLocaleDateString('en-ZA',{month:'short',year:'numeric'})}</div>`;
      }
      const nickname=g.account_nickname?`<div style="font-size:11px;color:var(--mu);margin-top:2px">🏦 ${g.account_nickname}</div>`:'';
      return `<div style="background:var(--w);border-radius:14px;border:.5px solid var(--bd);padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="flex:1"><div style="font-size:14px;font-weight:700">${g.emoji||'🎯'} ${g.name}</div>${g.target_date?`<div style="font-size:11px;color:var(--mu);margin-top:1px">Target: ${new Date(g.target_date).toLocaleDateString('en-ZA',{month:'short',year:'numeric'})}</div>`:''}${nickname}</div>
          <div style="font-size:14px;font-weight:800;color:${pct>=100?'var(--g)':'var(--t)'};margin-left:8px">${pct}%</div>
        </div>
        <div style="background:#e8f5e9;border-radius:6px;height:8px;overflow:hidden;margin-bottom:8px">
          <div style="background:${barCol};height:100%;width:${pct}%;border-radius:6px;transition:width .4s ease"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--mu);margin-bottom:10px">
          <span>R${savedAmt.toLocaleString('en-ZA')} saved</span>
          <span>R${targetAmt.toLocaleString('en-ZA')} goal</span>
        </div>
        ${monthlyInfo}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="openContribSheet('${g.id}','${g.name}',${targetAmt},${savedAmt},${g.monthly_contribution||0})" style="flex:1;background:var(--g);color:#fff;border:none;border-radius:10px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">+ Log contribution</button>
          <button onclick="deleteGoalPWA('${g.id}')" style="background:#fee2e2;color:#c62828;border:none;border-radius:10px;padding:10px 14px;font-size:13px;cursor:pointer">🗑</button>
        </div>
      </div>`;
    }).join('');
  }catch(e){console.warn('loadGoalsPWA error:',e);}
}

function openContribSheet(id,name,target,saved,monthly){
  document.getElementById('contrib-goal-id').value=id;
  document.getElementById('contrib-title').textContent=`Log contribution — ${name}`;
  document.getElementById('contrib-amount').value='';
  const remaining=Math.max(0,target-saved);
  document.getElementById('contrib-desc').textContent=`You have saved R${Number(saved).toLocaleString('en-ZA')} of R${Number(target).toLocaleString('en-ZA')}. Log how much you saved — a bank transfer, cash set aside, anything counts.`;
  document.getElementById('contrib-suggestion').textContent=monthly?`💡 Your plan: R${Number(monthly).toLocaleString('en-ZA')}/mo. R${remaining.toLocaleString('en-ZA')} still to go.`:`R${remaining.toLocaleString('en-ZA')} remaining to reach your goal.`;
  document.getElementById('contrib-sheet').classList.add('open');
  document.getElementById('contrib-ov').classList.add('open');
}
function closeContribSheet(){
  document.getElementById('contrib-sheet').classList.remove('open');
  document.getElementById('contrib-ov').classList.remove('open');
}
async function saveContribution(){
  const id=document.getElementById('contrib-goal-id').value;
  const amount=parseFloat(document.getElementById('contrib-amount').value)||0;
  if(!amount||amount<=0){showToast('Enter an amount');return;}
  try{
    const goals=await sbG(`savings_goals?id=eq.${id}&limit=1`);
    const current=Number(goals?.[0]?.saved||0);
    const newSaved=current+amount;
    await fetch(`${SB}/rest/v1/savings_goals?id=eq.${id}`,{method:'PATCH',headers:{...getH(),'Prefer':'return=minimal'},body:JSON.stringify({saved:newSaved})});
    closeContribSheet();loadGoalsPWA();
    const target=Number(goals?.[0]?.target||0);
    const pct=target>0?Math.round(newSaved/target*100):0;
    showToast(`✅ R${amount.toLocaleString('en-ZA')} logged — ${pct}% reached!`);
    if(pct>=100)setTimeout(()=>showToast('🎉 Goal complete! You did it!'),1200);
    else if(pct>=75)setTimeout(()=>showToast('🔥 75% there — almost!'),1200);
    else if(pct>=50)setTimeout(()=>showToast('⭐ Halfway there — keep going!'),1200);
  }catch(e){showToast('Could not save contribution. Try again.');}
}
async function deleteGoalPWA(id){
  if(!window._confirmGoal) { showToast('Tap delete again to confirm'); window._confirmGoal=setTimeout(()=>{window._confirmGoal=null;},3000); return; } window._confirmGoal=null;
  try{
    await fetch(`${SB}/rest/v1/savings_goals?id=eq.${id}`,{method:'DELETE',headers:getH()});
    loadGoalsPWA();showToast('Goal deleted');
  }catch{showToast('⚠️ Could not delete goal');}
}


// ── Utils ─────────────────────────────────────────────────────
function showToast(msg,dur=2500){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}
function shareApp(){
  const code=user?.referral_code||'';
  const refUrl=code?`https://myrandwise.co.za/refer.html?ref=${code}`:'https://myrandwise.co.za';
  const tx=`Hey! I'm using MyRandWise — a free money app built for South Africans 🇿🇦\n\nTracks spending, debt and savings in rands. Try it free for 14 days:\n${refUrl}`;
  if(navigator.share)navigator.share({title:'MyRandWise',text:tx,url:refUrl});
  else window.open('https://wa.me/?text='+encodeURIComponent(tx));
}
function doSignOut(){
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px';
  d.innerHTML=`<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:320px;width:100%;text-align:center">
    <div style="font-size:32px;margin-bottom:12px">👋</div>
    <div style="font-size:18px;font-weight:800;color:#111;margin-bottom:8px">Sign out?</div>
    <div style="font-size:13px;color:#666;margin-bottom:20px">Your data is safely stored and will be here when you come back.</div>
    <button onclick="confirmSignOut(this)" style="width:100%;background:#c0392b;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px">Sign out</button>
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:#f5f5f0;color:#666;border:none;border-radius:12px;padding:12px;font-size:13px;cursor:pointer">Cancel</button>
  </div>`;
  document.body.appendChild(d);
}

function confirmSignOut(btn){
  // Remove the confirm dialog first
  btn.closest('[style*=fixed]').remove();
  // Clear all auth + cached data from BOTH localStorage and sessionStorage
  ['rw_user','rw_token','rw_refresh','rw_nudge_dismissed','rw_nudge_cache',
   'rw_nudge_date','rw_nudge_week','rw_intro_seen','rw_pending_auth'].forEach(k=>{
     localStorage.removeItem(k);
     sessionStorage.removeItem(k);
   });
  user=null; expenses=[]; debts=[];
  // Force full page reload to clear all DOM state and cached variables
  window.location.href = window.location.pathname + '?signed_out=1';
}

// ══ SPENDING INSIGHTS ═══════════════════════════════════════
function renderInsights(){
  const el = document.getElementById('insights-list');
  const section = document.getElementById('insights-section');
  if(!el || !expenses.length){ if(section) section.style.display='none'; return; }

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMe = expenses.filter(e => new Date(e.logged_at||e.created_at) >= thisMonth);
  const lastMe = expenses.filter(e => {
    const d = new Date(e.logged_at||e.created_at);
    return d >= lastMonth && d <= lastMonthEnd;
  });

  const sumCat = (exps, cat) => exps.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount||0),0);
  const totalThis = thisMe.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalLast = lastMe.reduce((s,e)=>s+Number(e.amount||0),0);
  const inc = Number(user?.income_amount||0);
  const payDay = user?.pay_day || 25;
  const daysLeft = payDay > now.getDate() ? payDay - now.getDate() : (payDay + 30 - now.getDate());

  const insights = [];

  // Category comparisons vs last month
  const cats = [...new Set([...thisMe, ...lastMe].map(e=>e.category))];
  cats.forEach(cat => {
    const t = sumCat(thisMe, cat);
    const l = sumCat(lastMe, cat);
    if(l > 0 && t > 0){
      const pct = Math.round(((t-l)/l)*100);
      const emoji = thisMe.find(e=>e.category===cat)?.emoji || '📦';
      if(pct >= 30){
        insights.push({
          color:'#fff3e0', border:'#ffb74d', icon: emoji,
          text: `${cat} up ${pct}% vs last month`,
          sub: `R${Math.round(t).toLocaleString('en-ZA')} this month vs R${Math.round(l).toLocaleString('en-ZA')} last month`,
          type:'warn'
        });
      } else if(pct <= -20){
        insights.push({
          color:'#f0faf4', border:'#b5dfa8', icon: emoji,
          text: `${cat} down ${Math.abs(pct)}% — well done!`,
          sub: `Saved R${Math.round(l-t).toLocaleString('en-ZA')} vs last month`,
          type:'good'
        });
      }
    }
  });

  // Payday countdown with budget remaining
  if(inc > 0 && totalThis > 0){
    const remaining = inc - totalThis;
    const dailyBudget = daysLeft > 0 ? Math.round(remaining/daysLeft) : 0;
    if(remaining > 0 && daysLeft > 0){
      insights.push({
        color:'#e8f5e9', border:'#81c784', icon:'📅',
        text: `${daysLeft} days until payday`,
        sub: `R${Math.round(remaining).toLocaleString('en-ZA')} left · R${dailyBudget.toLocaleString('en-ZA')}/day to stay on budget`,
        type:'info'
      });
    } else if(remaining < 0){
      insights.push({
        color:'#ffebee', border:'#ef9a9a', icon:'⚠️',
        text: `Over budget by R${Math.round(Math.abs(remaining)).toLocaleString('en-ZA')}`,
        sub: `You've spent more than your income this month`,
        type:'danger'
      });
    }
  }

  // Top spending category this month
  if(thisMe.length >= 5){
    const catTotals = {};
    thisMe.forEach(e=>{ catTotals[e.category]=(catTotals[e.category]||0)+Number(e.amount||0); });
    const top = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    if(top && inc > 0){
      const pct = Math.round((top[1]/totalThis)*100);
      const emoji = thisMe.find(e=>e.category===top[0])?.emoji||'📦';
      if(pct >= 30){
        insights.push({
          color:'#f3e5f5', border:'#ce93d8', icon: emoji,
          text: `${top[0]} is your biggest spend`,
          sub: `${pct}% of your total spending this month — R${Math.round(top[1]).toLocaleString('en-ZA')}`,
          type:'info'
        });
      }
    }
  }

  // No expenses logged recently
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();
  const recent = expenses.filter(e=>{
    const d = new Date(e.logged_at||e.created_at).toDateString();
    return d===today||d===yesterday;
  });
  if(!recent.length && thisMe.length > 0){
    insights.push({
      color:'#e3f2fd', border:'#90caf9', icon:'📝',
      text: `Nothing logged recently`,
      sub: `Don't forget to log today's expenses`,
      type:'info'
    });
  }

  if(!insights.length){ if(section) section.style.display='none'; return; }
  if(section) section.style.display='block';

  el.innerHTML = insights.slice(0,3).map(i=>`
    <div style="background:${i.color};border:1px solid ${i.border};border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:22px;flex-shrink:0;margin-top:1px">${i.icon}</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px">${i.text}</div>
        <div style="font-size:11px;color:#555;line-height:1.5">${i.sub}</div>
      </div>
    </div>
  `).join('');
}

// ══ PUSH NOTIFICATIONS ══════════════════════════════════════
const PUSH_KEY = 'rw_push_enabled';

async function requestPushPermission(){
  if(!('Notification' in window)||!('serviceWorker' in navigator)){
    showToast('Push notifications not supported on this device');
    return false;
  }
  if(Notification.permission==='denied'){
    showToast('Notifications blocked — enable in browser settings');
    return false;
  }
  const permission = await Notification.requestPermission();
  if(permission!=='granted'){
    showToast('Notifications not enabled');
    return false;
  }
  try{
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    if(user?.id){
      await sbPatch(`beta_testers?id=eq.${user.id}`,{
        push_subscription: JSON.stringify(sub)
      }).catch(()=>{});
    }
    localStorage.setItem('rw_push_subscribed','1');
    localStorage.setItem(PUSH_KEY,'1');
    showToast('🔔 Push notifications enabled');
    return true;
  }catch(e){
    console.warn('Push subscription failed:',e.name, e.message);
    // Fallback - still enable local notifications even if VAPID fails
    localStorage.setItem(PUSH_KEY,'1');
    showToast('✅ Notifications enabled');
    return true;
  }
}

async function enablePushNotifications(){
  const granted = await requestPushPermission();
  if(!granted) return;
  localStorage.setItem(PUSH_KEY, '1');
  showToast('✅ Notifications enabled');
  updatePushToggle(true);
  // Schedule first nudge
  schedulePushNudges();
}

function disablePushNotifications(){
  localStorage.removeItem(PUSH_KEY);
  showToast('Notifications disabled');
  updatePushToggle(false);
}

function isPushEnabled(){
  return localStorage.getItem(PUSH_KEY) === '1' && Notification.permission === 'granted';
}

function updatePushToggle(enabled){
  const toggle = document.getElementById('push-toggle');
  const track = document.getElementById('push-toggle-track');
  const thumb = document.getElementById('push-toggle-thumb');
  if(toggle) toggle.checked = enabled;
  if(track) track.style.background = enabled ? '#1a5c35' : '#ccc';
  if(thumb) thumb.style.transform = enabled ? 'translateX(20px)' : 'translateX(0)';
}

function togglePushNotifications(enabled){
  if(enabled) enablePushNotifications();
  else disablePushNotifications();
}

