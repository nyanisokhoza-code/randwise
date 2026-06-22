// ── Dashboard ─────────────────────────────────────────────────
async function openDash(){
  show('main');
  startLockTimer();
  // Reset scroll to top
  setTimeout(()=>{
    const dc=document.getElementById('dash-main-content');
    if(dc){ dc.scrollTop=0; dc.scrollTo(0,0); }
    const tp=document.getElementById('tp-home');
    if(tp) tp.scrollTop=0;
  },100);
  // Load both expenses and debts before rendering so smart budget is accurate
  await Promise.all([
    loadExp().catch(()=>{expenses=[];}),
    sbG(`debts?tester_id=eq.${user?.id}&order=balance.asc`).then(d=>{debts=d||[];}).catch(()=>{debts=[];})
  ]);
  renderDash();
  // Nudge user if breakdown incomplete — runs after data loads
  setTimeout(()=>{ if(typeof nudgeIncompleteBreakdown==='function') nudgeIncompleteBreakdown(); }, 2000);
}
async function loadExp(){
  if(!user?.id)return;
  try{const d=await sbG(`expenses?tester_id=eq.${user.id}&order=logged_at.desc&limit=200`);expenses=Array.isArray(d)?d:[];}catch{expenses=[];}
}
// ══ STOKVEL TRACKER ══════════════════════════════════════════
const STOKVEL_KEY = 'rw_stokvels';

function getStokvels(){ return JSON.parse(localStorage.getItem(STOKVEL_KEY)||'[]'); }
function saveStokvels(arr){ localStorage.setItem(STOKVEL_KEY, JSON.stringify(arr)); }

function openAddStokvel(){
  // Premium gate
  const tier = getTier();
  if(tier==='free'){
    showToast('🔒 Stokvel tracker is a Premium feature — upgrade to unlock');
    return;
  }
  document.getElementById('stokvel-sheet').classList.add('open');
  document.getElementById('stokvel-ov').classList.add('open');
  // Pre-select current month
  const sel = document.getElementById('stk-start-month');
  if(sel) sel.value = new Date().getMonth()+1;
  // Live preview
  ['stk-name','stk-members','stk-contribution','stk-start-month'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('input', updateStokvelPreview);
    if(el) el.addEventListener('change', updateStokvelPreview);
  });
}

function updateStokvelPreview(){
  const members = parseInt(document.getElementById('stk-members')?.value||0);
  const contribution = parseFloat(document.getElementById('stk-contribution')?.value||0);
  const preview = document.getElementById('stk-preview');
  const previewText = document.getElementById('stk-preview-text');
  if(members>1 && contribution>0 && preview && previewText){
    const pot = members * contribution;
    preview.style.display='block';
    previewText.textContent = `${members} members × R${contribution.toLocaleString('en-ZA')}/mo = R${pot.toLocaleString('en-ZA')} pot per month. Each member receives R${pot.toLocaleString('en-ZA')} once a year.`;
  } else if(preview){
    preview.style.display='none';
  }
}

function closeAddStokvel(){
  document.getElementById('stokvel-sheet').classList.remove('open');
  document.getElementById('stokvel-ov').classList.remove('open');
}

function saveStokvel(){
  const name = document.getElementById('stk-name')?.value?.trim();
  const members = parseInt(document.getElementById('stk-members')?.value||0);
  const contribution = parseFloat(document.getElementById('stk-contribution')?.value||0);
  const startMonth = parseInt(document.getElementById('stk-start-month')?.value||1);
  const namesRaw = document.getElementById('stk-member-names')?.value?.trim();

  if(!name){ showToast('Enter a stokvel name'); return; }
  if(members<2){ showToast('A stokvel needs at least 2 members'); return; }
  if(contribution<=0){ showToast('Enter the monthly contribution amount'); return; }

  const memberNames = namesRaw ? namesRaw.split('\n').map(n=>n.trim()).filter(Boolean) : [];
  // Pad with generic names if needed
  const allMembers = Array.from({length:members}, (_,i)=>memberNames[i]||`Member ${i+1}`);

  const stokvel = {
    id: 'stk-'+Date.now(),
    name,
    members: allMembers,
    contribution,
    startMonth,
    created: new Date().toISOString(),
    payments: {}, // {year-month: [memberIndex, ...]}
    payoutHistory: [] // [{month, year, recipient, amount}]
  };

  const stokvels = getStokvels();
  stokvels.push(stokvel);
  saveStokvels(stokvels);
  closeAddStokvel();
  loadStokvelList();
  showToast('✅ Stokvel created!');
}

function loadStokvelList(){
  const el = document.getElementById('stokvel-list');
  if(!el) return;
  const stokvels = getStokvels();

  if(!stokvels.length){
    el.innerHTML=`<div style="text-align:center;padding:20px;background:#f0faf4;border-radius:14px;border:1px dashed #d1ead9">
      <div style="font-size:28px;margin-bottom:8px">🤝</div>
      <div style="font-size:13px;font-weight:700;color:var(--t)">No stokvels yet</div>
      <div style="font-size:12px;color:var(--mu);margin-top:4px">Track your savings group here</div>
    </div>`;
    return;
  }

  const now = new Date();
  el.innerHTML = stokvels.map(s=>{
    const pot = s.members.length * s.contribution;
    const monthKey = `${now.getFullYear()}-${now.getMonth()+1}`;
    const paidThisMonth = (s.payments[monthKey]||[]).length;
    const totalMembers = s.members.length;
    const allPaid = paidThisMonth >= totalMembers;

    // Whose turn is it this month?
    const monthsFromStart = (now.getFullYear()*12 + now.getMonth()) - (new Date(s.created).getFullYear()*12 + s.startMonth - 1);
    const recipientIdx = ((monthsFromStart % totalMembers) + totalMembers) % totalMembers;
    const recipient = s.members[recipientIdx];

    return`<div style="background:var(--w);border-radius:14px;border:1px solid #d1ead9;padding:14px 16px;margin-bottom:10px;cursor:pointer" onclick="openStokvelDetail('${s.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--t)">🤝 ${s.name}</div>
          <div style="font-size:11px;color:var(--mu);margin-top:2px">${totalMembers} members · R${s.contribution.toLocaleString('en-ZA')}/mo each</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:900;color:#1a5c35">R${pot.toLocaleString('en-ZA')}</div>
          <div style="font-size:10px;color:var(--mu)">monthly pot</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f0faf4;border-radius:10px;padding:8px 12px;margin-bottom:8px">
        <div style="font-size:11px;color:#1a5c35;font-weight:600">🎯 This month: ${recipient}'s payout</div>
        <div style="font-size:11px;font-weight:700;color:#1a5c35">R${pot.toLocaleString('en-ZA')}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:11px;color:var(--mu)">${paidThisMonth}/${totalMembers} paid this month</div>
        <div style="font-size:11px;font-weight:700;color:${allPaid?'#1a5c35':'#f57f17'}">${allPaid?'✅ All paid':'⏳ Pending'}</div>
      </div>
      <!-- Payment dots -->
      <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">
        ${s.members.map((_,i)=>{
          const paid=(s.payments[monthKey]||[]).includes(i);
          return`<div style="width:8px;height:8px;border-radius:50%;background:${paid?'#1a5c35':'#d1ead9'}"></div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function openStokvelDetail(id){
  const stokvels = getStokvels();
  const s = stokvels.find(x=>x.id===id);
  if(!s) return;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()+1}`;
  const pot = s.members.length * s.contribution;
  const monthsFromStart = (now.getFullYear()*12 + now.getMonth()) - (new Date(s.created).getFullYear()*12 + s.startMonth - 1);
  const recipientIdx = ((monthsFromStart % s.members.length) + s.members.length) % s.members.length;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  document.getElementById('stokvel-detail-title').textContent = s.name;

  const content = document.getElementById('stokvel-detail-content');
  content.innerHTML = `
    <!-- Pot info -->
    <div style="background:linear-gradient(135deg,#0d1f14,#1a5c35);border-radius:16px;padding:16px;margin-bottom:16px;text-align:center">
      <div style="font-size:11px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Monthly pot</div>
      <div style="font-size:32px;font-weight:900;color:#4ade80">R${pot.toLocaleString('en-ZA')}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px">${s.members.length} members × R${s.contribution.toLocaleString('en-ZA')}</div>
    </div>

    <!-- This month's payout -->
    <div style="background:#f0faf4;border-radius:12px;padding:12px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:11px;color:#5a8a6a;font-weight:700;text-transform:uppercase;letter-spacing:.5px">This month's payout</div>
        <div style="font-size:16px;font-weight:800;color:#1a5c35;margin-top:2px">🎉 ${s.members[recipientIdx]}</div>
      </div>
      <div style="font-size:18px;font-weight:900;color:#1a5c35">R${pot.toLocaleString('en-ZA')}</div>
    </div>

    <!-- Members + payment tracking -->
    <div style="font-size:13px;font-weight:700;margin-bottom:10px">Mark who has paid this month</div>
    <div id="stokvel-members-list">
      ${s.members.map((name,i)=>{
        const paid = (s.payments[monthKey]||[]).includes(i);
        const isRecipient = i === recipientIdx;
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${paid?'#1a5c35':'#e8f5ee'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${paid?'#fff':'#1a5c35'}">${name[0].toUpperCase()}</div>
            <div>
              <div style="font-size:13px;font-weight:600">${name}${isRecipient?' 🎯':''}</div>
              <div style="font-size:10px;color:var(--mu)">${isRecipient?'Receives pot this month':''}</div>
            </div>
          </div>
          <button onclick="toggleStokvelPayment('${id}',${i})" style="background:${paid?'#1a5c35':'#f0faf4'};color:${paid?'#fff':'#1a5c35'};border:1px solid ${paid?'#1a5c35':'#d1ead9'};border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">
            ${paid?'✅ Paid':'Mark paid'}
          </button>
        </div>`;
      }).join('')}
    </div>

    <!-- Payout schedule -->
    <div style="margin-top:20px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">Payout schedule</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${s.members.map((name,i)=>{
          const payoutMonthIdx = (s.startMonth - 1 + i) % 12;
          const isPast = i < (monthsFromStart % s.members.length);
          const isCurrent = i === recipientIdx;
          return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${isCurrent?'#f0faf4':isPast?'#fafafa':'var(--w)'};border-radius:10px;border:1px solid ${isCurrent?'#d1ead9':'#f0f0f0'}">
            <div style="font-size:12px;font-weight:${isCurrent?'700':'400'};color:${isCurrent?'#1a5c35':isPast?'#aaa':'var(--t)'}">${name}</div>
            <div style="font-size:11px;color:${isCurrent?'#1a5c35':isPast?'#aaa':'var(--mu)'}">${monthNames[payoutMonthIdx]} ${isCurrent?'← now':isPast?'✓':''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Share + Delete -->
    <button onclick="shareStokvelCard('${id}')" style="width:100%;background:#1a5c35;color:#fff;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px">📸 Share progress card</button>
    <button onclick="deleteStokvel('${id}')" style="width:100%;background:var(--rl);color:var(--r);border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer">Delete stokvel</button>
  `;

  document.getElementById('stokvel-detail-sheet').classList.add('open');
  document.getElementById('stokvel-detail-ov').classList.add('open');
}

function closeStokvelDetail(){
  document.getElementById('stokvel-detail-sheet').classList.remove('open');
  document.getElementById('stokvel-detail-ov').classList.remove('open');
}

function toggleStokvelPayment(id, memberIdx){
  const stokvels = getStokvels();
  const s = stokvels.find(x=>x.id===id);
  if(!s) return;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()+1}`;
  if(!s.payments[monthKey]) s.payments[monthKey]=[];
  const paid = s.payments[monthKey].includes(memberIdx);
  if(paid){
    s.payments[monthKey] = s.payments[monthKey].filter(i=>i!==memberIdx);
  } else {
    s.payments[monthKey].push(memberIdx);
    if(s.payments[monthKey].length === s.members.length){
      showToast('🎉 All members paid this month!');
    }
  }
  saveStokvels(stokvels);
  loadStokvelList();
  openStokvelDetail(id); // Refresh detail view
}

function deleteStokvel(id){
  if(!window._confirmDelete) { showToast('Tap delete again to confirm'); window._confirmDelete=setTimeout(()=>{window._confirmDelete=null;},3000); return; } window._confirmDelete=null;
  const stokvels = getStokvels().filter(s=>s.id!==id);
  saveStokvels(stokvels);
  closeStokvelDetail();
  loadStokvelList();
  showToast('Stokvel deleted');
}

function shareStokvelCard(id){
  const stokvels = getStokvels();
  const s = stokvels.find(x=>x.id===id);
  if(!s) return;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()+1}`;
  const paidCount = (s.payments[monthKey]||[]).length;
  const pot = s.members.length * s.contribution;
  window._shareCardData = {
    cardHeadline: `Our stokvel pot is R${pot.toLocaleString('en-ZA')} this month 🤝`,
    cardBody: `${paidCount}/${s.members.length} members paid. ${s.name} — tracking with MyRandWise. 🇿🇦`
  };
  closeStokvelDetail();
  generateShareCard();
}

// ══ SMART WEEKLY BUDGET ══════════════════════════════════════
// Returns disposable weekly budget = (income − fixed commitments) ÷ 4
function getSmartWeeklyBudget(){
  const inc = Number(user?.income_amount||0);
  if(inc<=0) return {wb:0, disposable:0, fixed:0, breakdown:[]};
  // Don't show any weekly budget until salary is confirmed — prevents wrong numbers before debts load
  const _gn=new Date();
  const _gSalKey=`rw_salary_confirmed_${_gn.getFullYear()}_${_gn.getMonth()+1}`;
  if(!(localStorage.getItem(_gSalKey)||'').startsWith('confirmed:')) return {wb:0, disposable:0, fixed:0, breakdown:[]};

  const breakdown = [];

  // Only manually added debit orders (NOT ones added from debt - those would double count)
  const storedDOs = JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
  const manualDOs = storedDOs.filter(d=>!d.addedFromDebt);
  const doTotal = manualDOs.reduce((s,d)=>s+Number(d.amount||0),0);
  if(doTotal>0) breakdown.push({label:'Debit orders', amount:doTotal});

  // Debt minimum payments from Supabase debts table (single source of truth)
  const debtList = (typeof debts!=='undefined'&&Array.isArray(debts))?debts:[];
  const debtMin = debtList.reduce((s,d)=>s+Number(d.min_payment||0),0);
  if(debtMin>0) breakdown.push({label:'Debt minimums', amount:debtMin});

  // Monthly needs (user-entered preset + custom)
  const savedNeeds = JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
  const customNeedsData = JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
  const needsPresetTotal = Object.values(savedNeeds).reduce((s,v)=>s+Number(v),0);
  const needsCustomTotal = customNeedsData.reduce((s,n)=>s+Number(n.amount||0),0);
  const needsTotal = needsPresetTotal + needsCustomTotal;
  // Include needs if user has confirmed them this month
  const _needsNow=new Date();
  const _needsKey=`rw_needs_confirmed_${_needsNow.getFullYear()}_${_needsNow.getMonth()+1}`;
  const _needsConfirmed=(localStorage.getItem(_needsKey)||'').startsWith('confirmed:');
  if(needsTotal > 0 && _needsConfirmed){
    breakdown.push({label:'Monthly needs', amount:needsTotal});
  } else if(needsTotal > 0 && !_needsConfirmed){
    // Needs entered but not confirmed yet — still include so breakdown shows pending state
    breakdown.push({label:'Monthly needs', amount:needsTotal});
  }

  // NOTE: Recurring expenses are intentionally NOT included here
  // They overlap with monthly needs (e.g. Electricity is both a recurring expense AND a monthly need)
  // Including both would double-count and show wrong budget numbers

  const fixed = doTotal + debtMin + needsTotal;
  const disposable = Math.max(0, inc - fixed);
  const wb = Math.round(disposable/4);

  return {wb, disposable, fixed, breakdown, inc};
}

async function renderDash(){
  if(!user)return;
  // Always reset to monthly front on render
  const _hFront=document.getElementById('hero-front');
  const _hBack=document.getElementById('hero-week-back');
  if(_hFront){ _hFront.style.display='flex'; _hFront.style.opacity='1'; }
  if(_hBack){ _hBack.style.display='none'; }
  _heroFlipState='front';
  clearTimeout(_heroFlipTimer);
  // Force scroll to top - multiple attempts to ensure it works
  const forceTop=()=>{
    const el=document.getElementById('dash-main-content');
    if(el){el.scrollTop=0;el.scrollTo({top:0,behavior:'instant'});}
  };
  forceTop();
  setTimeout(forceTop,50);
  setTimeout(forceTop,200);
  setTimeout(forceTop,500);
  applyTierTheme();
  setTimeout(loadAINudge, 1500);
  setTimeout(renderInsights, 300);
  setTimeout(checkDebtIntervention, 2000);
  setTimeout(maybeShowAbout, 1200);
  setTimeout(maybeShowCheckin, 4000);
  setTimeout(maybeShowPushPrompt, 8000);
  setTimeout(maybeShowSalaryConfirm, 3000);
  setTimeout(maybeShowIncomeCheckin, 10000);
  setTimeout(maybeShowNeedsCheckin, 12000);
  checkAppRating();
  setTimeout(initReferralCard, 500);
  scheduleCoinAnim(); // Start coin idle animation sequence
  const inc=Number(user.income_amount||0),name=user.name||'there',init=name[0]?.toUpperCase()||'U';
  const h=new Date().getHours(),gr=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const now=new Date();
  const dayName=now.toLocaleDateString('en-ZA',{weekday:'long'});
  const dateStr=now.toLocaleDateString('en-ZA',{day:'numeric',month:'long'});
  const set=(id,val,prop='textContent')=>{const el=document.getElementById(id);if(el)el[prop]=val;};

  // ── Income display — account for pay frequency ──────────────
  const freq = user.income_freq || 'Monthly';
  // income_amount is always stored as monthly equivalent
  // Show the actual amount the user earns per their pay cycle
  const displayInc = freq==='Weekly' ? Math.round(inc/4) :
                     freq==='Daily'  ? Math.round(inc/22) : inc;
  const incLabel = freq==='Weekly' ? 'WEEKLY INCOME' :
                   freq==='Daily'  ? 'DAILY INCOME' : 'SALARY RECEIVED';
  const incFreqLabel = freq==='Weekly' ? '/week' :
                       freq==='Daily'  ? '/day' : '/month';

  // New header elements
  set('dg-small',gr);
  set('dg-name',name.split(' ')[0]+' 👋');
  set('ds',`${dayName}, ${dateStr}`);
  set('av',init);
  set('hdr-income','R'+displayInc.toLocaleString('en-ZA'));
  // Update the "SALARY RECEIVED" label if element exists
  const incLabelEl=document.getElementById('hdr-income-label');
  if(incLabelEl)incLabelEl.textContent=incLabel;
  // Profile tab
  set('pav',init);
  set('pname',name);
  set('pstage',(user.life_stage_emoji||'')+' '+(user.life_stage||'—'));
  set('pinc',`R${displayInc.toLocaleString('en-ZA')}${incFreqLabel}`);

  // ── INCOME GATE ──────────────────────────────────────────────
  const gate=document.getElementById('income-gate');
  const mainContent=document.getElementById('dash-main-content');
  if(inc===0){
    if(gate)gate.style.display='flex';
    if(mainContent)mainContent.style.display='none';
    return;
  } else {
    if(gate)gate.style.display='none';
    if(mainContent){mainContent.style.display='block';mainContent.style.flex='1';}
  }
  set('ptier',user.tier||'free');
  set('pref',user.referral_code||'—');
  set('pemail',user.email||'—');
  const phoneEl=document.getElementById('pphone');
  if(phoneEl){phoneEl.textContent=user.phone||'Add number +';phoneEl.style.color=user.phone?'var(--mu)':'var(--g)';}
  set('psince',user.created_at?new Date(user.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'—');

  if((user.tier||'free')==='free'&&user.created_at){
    const days=Math.floor((Date.now()-new Date(user.created_at).getTime())/86400000),left=Math.max(0,14-days);
    if(left>0){
      const tb=document.getElementById('trial');if(tb)tb.style.display='flex';
      const trialT=document.getElementById('trial-t');
      const trialBanner=document.getElementById('trial');
      if(trialT){
        if(left<=3){
          trialT.textContent=`⚠️ ${left} day${left!==1?'s':''} left — expires soon!`;
          if(trialBanner){trialBanner.style.background='#ffebee';trialBanner.style.borderBottom='.5px solid #ffcdd2';}
          if(trialT)trialT.style.color='#c62828';
          const trialC=document.getElementById('trial-c');
          if(trialC)trialC.style.color='#c62828';
        } else if(left<=5){
          trialT.textContent=`🕐 ${left} days left — upgrade soon`;
          if(trialBanner){trialBanner.style.background='#fffde7';trialBanner.style.borderBottom='.5px solid #fff176';}
          if(trialT)trialT.style.color='#f57f17';
          const trialC=document.getElementById('trial-c');
          if(trialC)trialC.style.color='#f57f17';
        } else {
          trialT.textContent=`🎁 ${left} day${left!==1?'s':''} left in your free trial`;
          if(trialBanner){trialBanner.style.background='';trialBanner.style.borderBottom='';}
          if(trialT)trialT.style.color='';
        }
      }
      const trialC=document.getElementById('trial-c');
      if(trialC)trialC.onclick=()=>showUpgradeWall(false);
    } else {
      // Only hard-block if user hasn't explicitly chosen the free plan
      const choseFree = localStorage.getItem('rw_chose_free')==='1';
      if(!choseFree){
        showUpgradeWall(true);
        return;
      }
      // Free plan user — show soft banner, don't block
      const tb=document.getElementById('trial');
      if(tb){
        tb.style.display='flex';
        tb.style.background='#f3e5f5';
        tb.style.borderBottom='.5px solid #ce93d8';
      }
      const trialT=document.getElementById('trial-t');
      const trialC2=document.getElementById('trial-c');
      if(trialT){trialT.textContent='🔓 Free plan — tap to unlock Pro features';trialT.style.color='#6a1b9a';}
      if(trialC2){trialC2.textContent='Upgrade →';trialC2.style.color='#6a1b9a';trialC2.onclick=()=>showUpgradeWall(false);}
    }
  }

  const ms=new Date(now.getFullYear(),now.getMonth(),1);
  const me=expenses.filter(e=>new Date(e.logged_at||e.created_at)>=ms);
  const spent=me.reduce((s,e)=>s+Number(e.amount),0);
  const {wb,disposable,fixed,breakdown:budgetBreakdown}=getSmartWeeklyBudget();
  // sp = confirmed disposable — only subtract what user has actually confirmed this cycle
  const _spNow=new Date();
  const _spY=_spNow.getFullYear(),_spM=_spNow.getMonth()+1;
  const _spSal=(localStorage.getItem(`rw_salary_confirmed_${_spY}_${_spM}`)||'').startsWith('confirmed:');
  const _spDebtDone=localStorage.getItem(`rw_payday_checkin_${_spY}_${_spM}`)==='done';
  const _spNeeds=(localStorage.getItem(`rw_needs_confirmed_${_spY}_${_spM}`)||'').startsWith('confirmed:');
  let sp=0;
  if(_spSal){
    // Start with income
    sp=inc;
    // Determine pay cycle month — payday 25th means cycle starts 25th of prev month
    // So on 28 April, cycle started 25 April → check April keys
    // But check-in may have saved under prevMonth if payday just passed
    const _payDay=Number(user?.pay_day||25);
    const _cycleMonth=_spNow.getDate()>=_payDay?_spM:(_spM===1?12:_spM-1);
    const _cycleYear=_spM===1&&_cycleMonth===12?_spY-1:_spY;
    // Also check prev month in case check-in ran before payday
    const _prevM=_cycleMonth===1?12:_cycleMonth-1;
    const _prevY=_cycleMonth===1?_cycleYear-1:_cycleYear;
    // Use individual debt confirmation keys — check both cycle month and prev month
    let _confirmedDebtTotal=0;
    if(debts&&debts.length){
      debts.forEach(d=>{
        // Check current cycle month first, then prev month
        const _pKey1=`rw_paid_${d.id}_${_cycleYear}_${_cycleMonth}`;
        const _pKey2=`rw_paid_${d.id}_${_prevY}_${_prevM}`;
        const _pVal=localStorage.getItem(_pKey1)||localStorage.getItem(_pKey2);
        if(_pVal&&_pVal.startsWith('paid:')){
          const _pAmt=Number(_pVal.split(':')[1])||Number(d.min_payment||0);
          _confirmedDebtTotal+=_pAmt;
        }
      });
    }
    sp=Math.max(0,sp-_confirmedDebtTotal);
    // Subtract monthly needs only if confirmed
    if(_spNeeds){
      const _needs=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
      const _custom=JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
      const _needsTotal=Object.values(_needs).reduce((s,v)=>s+Number(v),0)+_custom.reduce((s,n)=>s+Number(n.amount||0),0);
      sp=Math.max(0,sp-_needsTotal);
    }
    // Subtract accelerator plan extra payment only if user committed to it
    const _accPlan=JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
    if(_accPlan&&_accPlan.extra>0&&_accPlan.committed_at) sp=Math.max(0,sp-Number(_accPlan.extra));
  }
  const sc=sp<inc*.1?'#a32d2d':sp<inc*.25?'#ba7517':'#1a7a4a';
  const weekStart=new Date(now);weekStart.setDate(now.getDate()-((now.getDay()+6)%7));weekStart.setHours(0,0,0,0);

  // ── DAILY BUDGET ───────────────────────────────────────────
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysLeft=Math.max(1,daysInMonth-now.getDate()+1);
  const dailyBudget=sp>0?Math.round(sp/daysLeft):0;
  const dailyColor=dailyBudget<200?'#a32d2d':dailyBudget<500?'#ba7517':'#1a7a4a';
  const dailyEl=document.getElementById('daily-budget-amt');
  if(dailyEl){dailyEl.textContent='R'+dailyBudget.toLocaleString('en-ZA');dailyEl.style.color=dailyColor;}
  set('daily-budget-sub',`for today · ${daysLeft} day${daysLeft!==1?'s':''} left this month`);
  // Week budget remaining
  const thisWeekSpent=me.filter(e=>new Date(e.logged_at||e.created_at)>=weekStart).reduce((s,e)=>s+Number(e.amount),0);
  const weekLeft=Math.max(0,wb-thisWeekSpent);
  set('daily-week-budget','R'+weekLeft.toLocaleString('en-ZA'));
  set('daily-week-left',`of R${wb.toLocaleString('en-ZA')} left this week`);

  // ── PAYDAY BANNER ──────────────────────────────────────────
  const payDay=Number(user.pay_day||25);
  const daysInMonthForPayday=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysToPayday=payDay>now.getDate()?payDay-now.getDate():daysInMonthForPayday-now.getDate()+payDay;
  const paydayBanner=document.getElementById('payday-banner');
  if(paydayBanner){
    if(daysToPayday<=5){
      paydayBanner.style.display='flex';
      set('payday-label',daysToPayday===0?'Payday today! 🎉':'Salary expected');
      set('payday-text',daysToPayday===0?`R${inc.toLocaleString('en-ZA')} coming in!`:daysToPayday===1?'Tomorrow!':` In ${daysToPayday} days`);
      set('payday-after',`After commitments: R${Math.max(0,inc-spent).toLocaleString('en-ZA')} yours`);
    } else {
      paydayBanner.style.display='none';
    }
  }

  // ── WEEK NUMBER ────────────────────────────────────────────
  const weekOfMonth=Math.ceil(now.getDate()/7);
  set('week-num-label',`Week ${weekOfMonth} of 4`);

  // ── DAILY SPEND DOTS ───────────────────────────────────────
  const DAYS=['M','T','W','T','F','Sa','Su'];
  const dailySpends=Array(7).fill(0);
  me.forEach(e=>{
    const d=new Date(e.logged_at||e.created_at);
    const dayIdx=(d.getDay()+6)%7;
    const dayDate=new Date(weekStart);dayDate.setDate(weekStart.getDate()+dayIdx);
    if(d>=weekStart)dailySpends[dayIdx]+=Number(e.amount);
  });
  const todayIdx=(now.getDay()+6)%7;
  const maxSpend=Math.max(...dailySpends,1);
  const dailyDotsEl=document.getElementById('daily-dots');
  if(dailyDotsEl){
    const dailyLimit=wb>0?wb/7:inc/30;
    dailyDotsEl.innerHTML=DAYS.map((d,i)=>{ 
      const amt=dailySpends[i];
      const isToday=i===todayIdx;
      const isFuture=i>todayIdx;
      const over=amt>dailyLimit&&amt>0;
      const nearLimit=amt>dailyLimit*0.8&&amt<=dailyLimit&&amt>0;
      const hasSpend=amt>0&&!isFuture;
      // Traffic light: red=over, amber=near limit (80-100%), green=under, pale=empty/future
      const dotBg=isFuture||amt===0?'#c8e6cf':over?'#c62828':nearLimit?'#e8a000':'#2e7d32';
      const dayColor=isToday?'#1a5c35':'#5a8a6a';
      const dayWeight=isToday?'700':'600';
      let label='';
      if(hasSpend){
        if(amt>=10000)label=Math.round(amt/1000)+'k';
        else if(amt>=1000)label='R'+(amt/1000).toFixed(1)+'k';
        else if(amt>=100)label='R'+Math.round(amt);
        else label='R'+Math.round(amt);
      }
      const fSize=amt>=1000?'7px':amt>=100?'8px':'10px';
      const todayRing=isToday&&hasSpend?`box-shadow:0 0 0 2.5px ${over?'#c62828':nearLimit?'#e8a000':'#1a5c35'},0 0 0 4px ${over?'#ffcdd2':nearLimit?'#fff9c4':'#c8e6cf'};`:'';
      return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:34px;height:34px;border-radius:50%;background:${dotBg};display:flex;align-items:center;justify-content:center;${todayRing}flex-shrink:0">
          ${hasSpend?`<span style="font-size:${fSize};color:#fff;font-weight:700;line-height:1;text-align:center;white-space:nowrap">${label}</span>`:`<span style="font-size:11px;color:${isFuture?'#8fbc8f':'#aaa'};font-weight:400">—</span>`}
        </div>
        <div style="font-size:10px;color:${dayColor};font-weight:${dayWeight}">${d}</div>
      </div>`;
    }).join('');
  }

  // ── SAVINGS GOAL ON HOME ───────────────────────────────────
  try{
    const goals=await sbG(`savings_goals?tester_id=eq.${user.id}&order=created_at.desc&limit=1`);
    const sghCard=document.getElementById('savings-goal-home');
    if(goals?.length&&sghCard){
      const g=goals[0];
      const savedAmt=Number(g.saved||0),targetAmt=Number(g.target||0);
      const pct=targetAmt>0?Math.min(100,Math.round(savedAmt/targetAmt*100)):0;
      const left=Math.max(0,targetAmt-savedAmt);
      sghCard.style.display='block';
      set('sgh-name',(g.emoji||'🎯')+' '+g.name);
      set('sgh-pct',pct+'%');
      set('sgh-saved','R'+savedAmt.toLocaleString('en-ZA')+' saved');
      set('sgh-left','R'+left.toLocaleString('en-ZA')+' to go');
      const bar=document.getElementById('sgh-bar');if(bar)bar.style.width=pct+'%';
    } else if(sghCard){
      sghCard.style.display='none';
    }

    // ── NET WORTH CARD ─────────────────────────────────────
    try{
      const allGoals=await sbG(`savings_goals?tester_id=eq.${user.id}&select=saved`);
      const allDebts=await sbG(`debts?tester_id=eq.${user.id}&select=balance,category,vehicle_value,property_value`);
      const totalSavings=(allGoals||[]).reduce((s,g)=>s+Number(g.saved||0),0);
      const totalDebt=(allDebts||[]).reduce((s,d)=>s+Number(d.balance||0),0);
      // Add vehicle values and property equity as assets
      const totalVehicleValue=(allDebts||[]).filter(d=>d.category==='Vehicle'||d.category==='vehicle').reduce((s,d)=>s+Number(d.vehicle_value||0),0);
      const totalPropertyValue=(allDebts||[]).filter(d=>d.category==='Bond/Home loan'||d.category==='bond').reduce((s,d)=>s+Number(d.property_value||0),0);
      const totalAssets=totalSavings+totalVehicleValue+totalPropertyValue;
      const netWorth=totalAssets-totalDebt;
      const nwEl=document.getElementById('net-worth-amt');
      const nwCard=document.getElementById('net-worth-card');
      if(nwEl){
        nwEl.textContent=(netWorth<0?'-':'')+'R'+Math.abs(Math.round(netWorth)).toLocaleString('en-ZA');
        nwEl.style.color=netWorth>=0?'#1a5c35':'#c62828';
      }
      set('nw-savings','R'+Math.round(totalAssets).toLocaleString('en-ZA'));
      set('nw-debt','R'+Math.round(totalDebt).toLocaleString('en-ZA'));
      // Update labels
      const savLabel=document.getElementById('nw-savings-label');
      if(savLabel) savLabel.textContent=totalVehicleValue>0||totalPropertyValue>0?'Assets':'Savings';
      const sub=document.getElementById('net-worth-sub');
      if(sub) sub.textContent=netWorth>=0?'↑ Growing — keep it up':'↓ Debt exceeds assets — focus on debt';
      if(nwCard) nwCard.style.display=(totalAssets>0||totalDebt>0)?'block':'none';
    }catch{}
  }catch(e){console.warn('Savings goal home card error:',e);}

  // ── SMART ROLLOVER NUDGE ───────────────────────────────────
  const rolloverEl=document.getElementById('rollover-nudge');
  const rolloverText=document.getElementById('rollover-text');
  if(rolloverEl&&rolloverText){
    const weekSpent=me.filter(e=>new Date(e.logged_at||e.created_at)>=weekStart).reduce((s,e)=>s+Number(e.amount),0);
    const weekRemaining=Math.max(0,wb-weekSpent);
    const daysLeftInWeek=Math.max(1,7-todayIdx);
    if(weekRemaining>0&&todayIdx>=4){// Thursday onwards
      rolloverEl.style.display='block';
      rolloverText.textContent=`Save R${Math.round(weekRemaining/2).toLocaleString('en-ZA')} by Sunday to roll over to next week's budget. You have R${weekRemaining.toLocaleString('en-ZA')} left this week.`;
    } else if(spent>inc*0.9){
      rolloverEl.style.display='block';
      rolloverText.textContent=`You've used ${Math.round(spent/inc*100)}% of your monthly income. Tap + before spending anything to track it.`;
    } else {
      rolloverEl.style.display='none';
    }
  }

  // ── DEBT SCORE — transparent 4-component calculation ──────
  const debtListForScore=(typeof debts!=='undefined'&&Array.isArray(debts))?debts:[];
  const totalDebtForScore=debtListForScore.reduce((s,d)=>s+Number(d.balance||0),0);
  const totalMinPayments=debtListForScore.reduce((s,d)=>s+Number(d.min_payment||0),0);
  const numDebts=debtListForScore.length;

  // Component 1: Debt-to-income ratio (40% weight)
  // Good: debt < 3x income. Bad: debt > 10x income
  const dtiMonths=inc>0?totalDebtForScore/inc:0;
  const dtiScore=dtiMonths<=0?100:dtiMonths<=3?90:dtiMonths<=6?75:dtiMonths<=10?55:dtiMonths<=20?35:15;
  const dtiLabel=dtiMonths<=3?'Excellent':dtiMonths<=6?'Good':dtiMonths<=10?'Fair':dtiMonths<=20?'High':'Very high';

  // Component 2: Minimum payments vs income (30% weight)
  // Good: min payments < 20% of income. Bad: > 40%
  const minPctOfIncome=inc>0?(totalMinPayments/inc)*100:0;
  const minScore=minPctOfIncome<=0?100:minPctOfIncome<=10?95:minPctOfIncome<=20?75:minPctOfIncome<=30?55:minPctOfIncome<=40?35:15;
  const minLabel=minPctOfIncome<=10?'Excellent':minPctOfIncome<=20?'Good':minPctOfIncome<=30?'Fair':minPctOfIncome<=40?'High':'Critical';

  // Component 3: Number of debts (20% weight)
  const numScore=numDebts===0?100:numDebts===1?90:numDebts===2?75:numDebts===3?55:numDebts<=5?35:15;
  const numLabel=numDebts===0?'Debt free':numDebts===1?'Excellent':numDebts===2?'Good':numDebts===3?'Fair':numDebts<=5?'High':'Critical';

  // Component 4: Payoff progress (10% weight)
  // Based on whether debts are being reduced vs just paying minimums
  const hasExtraPayments=debtListForScore.some(d=>Number(d.extra_payment||0)>0);
  const progressScore=numDebts===0?100:hasExtraPayments?80:60;
  const progressLabel=numDebts===0?'Debt free':hasExtraPayments?'Actively paying':'Minimums only';

  // Weighted total
  const rawScore=Math.round(dtiScore*0.4 + minScore*0.3 + numScore*0.2 + progressScore*0.1);
  const debtScore=Math.min(100,Math.max(0,rawScore));
  const scoreColor=debtScore>=70?'var(--g)':debtScore>=40?'var(--a)':'var(--r)';
  const scoreLabel=debtScore>=70?'💚 Good standing':debtScore>=40?'🟡 Getting there':'🔴 Needs attention';

  const dsNum=document.getElementById('debt-score-num');
  if(dsNum){dsNum.textContent=debtScore;dsNum.style.color=scoreColor;}
  const dsBar=document.getElementById('debt-score-bar');
  if(dsBar){dsBar.style.width=debtScore+'%';dsBar.style.background=scoreColor.replace('var(--g)','#1a7a4a').replace('var(--a)','#ba7517').replace('var(--r)','#a32d2d');}
  set('debt-score-label',scoreLabel);

  // Store breakdown for the ⓘ tooltip
  // Calculate real payoff time in months (for plain English display)
  let payoffMonths = 0;
  if(totalDebtForScore > 0 && totalMinPayments > 0){
    // Simple simulation of payoff at minimum payments
    let remaining = totalDebtForScore;
    let months = 0;
    const avgRate = debtListForScore.length > 0
      ? debtListForScore.reduce((s,d)=>s+Number(d.interest_rate||0),0)/debtListForScore.length/100/12
      : 0;
    while(remaining > 0 && months < 600){
      remaining = remaining*(1+avgRate) - totalMinPayments;
      months++;
      if(remaining < 0) remaining = 0;
    }
    payoffMonths = months;
  }
  const payoffYears = Math.floor(payoffMonths/12);
  const payoffRemMonths = payoffMonths%12;
  const payoffStr = payoffMonths<=0?'No debt':
    payoffYears>0?(payoffYears+' year'+(payoffYears!==1?'s':'')+
    (payoffRemMonths>0?' '+payoffRemMonths+' month'+(payoffRemMonths!==1?'s':''):'')):
    (payoffMonths+' month'+(payoffMonths!==1?'s':''));

  window._debtScoreBreakdown={dtiScore,dtiLabel,dtiMonths:Math.round(dtiMonths*10)/10,minScore,minLabel,minPct:Math.round(minPctOfIncome),numScore,numLabel,numDebts,progressScore,progressLabel,total:debtScore,payoffMonths,payoffStr,totalMinPayments};

  // Color the debt score card
  const dsCard=document.getElementById('stat-debt-card');
  if(dsCard){
    if(debtScore<40){dsCard.style.background='#fff5f5';dsCard.style.borderColor='#ffcdd2';}
    else if(debtScore<70){dsCard.style.background='#fffde7';dsCard.style.borderColor='#fff176';}
    else{dsCard.style.background='';dsCard.style.borderColor='';}
  }

  // Check for debt payoff celebration
  checkDebtPayoffCelebration();

  // ── Committed accelerator plan badge on home tab ──
  const _accPlanBadge = JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
  const accBadgeEl = document.getElementById('acc-plan-home-badge');
  if(accBadgeEl){
    if(_accPlanBadge && _accPlanBadge.extra > 0 && _accPlanBadge.committed_at){
      const _extra = Number(_accPlanBadge.extra);
      const _dname = _accPlanBadge.attack_debt_name || 'your debt';
      const _payday = _accPlanBadge.payday_label || 'next payday';
      accBadgeEl.style.display = 'flex';
      accBadgeEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex:1">
          <span style="font-size:22px">🎯</span>
          <div>
            <div style="font-size:12px;font-weight:800;color:#1a5c35">Debt plan active</div>
            <div style="font-size:11px;color:#5a8a6a">Pay R${_extra.toLocaleString('en-ZA')} extra to ${_dname} on ${_payday}</div>
          </div>
        </div>
        <button onclick="switchTab('debt')" style="background:#1a7a4a;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer">View →</button>
      `;
    } else {
      accBadgeEl.style.display = 'none';
    }
  }

  // ── DEBIT ORDERS — manual DOs + debt minimums (no double counting) ──
  const storedDOsForCard=JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
  // Use global debitOrders if populated (restored from Supabase), else use localStorage
  const allDOsForCard=(debitOrders&&debitOrders.length>0)?debitOrders:storedDOsForCard;
  const manualDOsForCard=allDOsForCard.filter(d=>!d.addedFromDebt);
  const manualDOTotal=manualDOsForCard.reduce((s,d)=>s+Number(d.amount||0),0);
  const debtListForCard=(typeof debts!=='undefined'&&Array.isArray(debts))?debts:[];
  const debtMinForCard=debtListForCard.reduce((s,d)=>s+Number(d.min_payment||0),0);
  const debitTotal=manualDOTotal+debtMinForCard;
  const debitCount=manualDOsForCard.length+debtListForCard.filter(d=>Number(d.min_payment||0)>0).length;
  const debits=[]; // keep for backward compat
  set('debit-count','R'+debitTotal.toLocaleString('en-ZA'));
  set('debit-sub',`${debitCount} commitment${debitCount!==1?'s':''} this month`);
  // Warn if payday is in next 5 days and debits are coming
  const today=now.getDate();
  // payDay already declared above
  const debitWarnEl=document.getElementById('debit-warning-text');
  if(debitWarnEl){
    if(daysToPayday<=3)debitWarnEl.textContent=`⚠️ Payday in ${daysToPayday} day${daysToPayday!==1?'s':''}`;
    else if(debitTotal>inc*0.4)debitWarnEl.textContent='⚠️ >40% of income on commitments';
    else debitWarnEl.textContent='✅ On track';
  }

  // ── MINI RING in header ────────────────────────────────────
  // Ring = salary fuel gauge. Starts full. Depletes as commitments confirmed.
  // Empty ring = fully committed/spent. Full ring = untouched salary.
  const _cn=new Date();
  const _cSal=(localStorage.getItem(`rw_salary_confirmed_${_cn.getFullYear()}_${_cn.getMonth()+1}`)||'').startsWith('confirmed:');
  const _cAll=_cSal
    && localStorage.getItem(`rw_payday_checkin_${_cn.getFullYear()}_${_cn.getMonth()+1}`)==='done'
    && (localStorage.getItem(`rw_needs_confirmed_${_cn.getFullYear()}_${_cn.getMonth()+1}`)||'').startsWith('confirmed:');
  const circ=2*Math.PI*29;
  const rarcEl=document.getElementById('rarc');
  const ramtEl=document.getElementById('ramt');
  const ringSvg=document.getElementById('ring-svg');

  if(!_cSal || inc<=0){
    // Nothing confirmed — ring hidden, show dash
    if(ringSvg) ringSvg.style.opacity='0';
    if(ramtEl) ramtEl.textContent='—';
    updateHeroWeekPanel(0, wb);
  } else {
    // Salary confirmed — ring fills as commitments are confirmed
    const _ringCommitted = Math.min(inc - Math.max(0, sp), inc);
    const _ringPct = inc > 0 ? Math.min(_ringCommitted / inc, 1) : 0;
    const _ringFill = circ * _ringPct;
    const _ringRemaining = Math.max(0, sp);

    if(rarcEl){
      rarcEl.setAttribute('stroke-dasharray', _ringPct > 0 ? `${_ringFill} ${circ}` : `0 ${circ}`);
      rarcEl.style.opacity = _ringPct > 0 ? '1' : '0.3';
      const _ringColor = _ringPct < 0.5 ? '#4ade80' : _ringPct < 0.8 ? '#fbbf24' : '#f87171';
      rarcEl.setAttribute('stroke', _ringColor);
    }
    const rtrackEl2=document.getElementById('rtrack');
    if(rtrackEl2) rtrackEl2.style.opacity='0.15';
    if(ringSvg) ringSvg.style.opacity='1';
    if(ramtEl) ramtEl.textContent = _ringRemaining>=1000 ? 'R'+Math.round(_ringRemaining/1000)+'k' : 'R'+_ringRemaining.toLocaleString('en-ZA');
    updateHeroWeekPanel(sp, wb);
  }
  // After commitments = spendable
  const afterEl=document.getElementById('hdr-after');
  const afterRow=document.getElementById('hdr-after-row');
  if(afterEl&&afterRow){
    const _an=new Date();
    const _sSal=(localStorage.getItem(`rw_salary_confirmed_${_an.getFullYear()}_${_an.getMonth()+1}`)||'').startsWith('confirmed:');
    const _c3=_sSal
      && localStorage.getItem(`rw_payday_checkin_${_an.getFullYear()}_${_an.getMonth()+1}`)==='done'
      && (localStorage.getItem(`rw_needs_confirmed_${_an.getFullYear()}_${_an.getMonth()+1}`)||'').startsWith('confirmed:');
    const msgEl=document.getElementById('hdr-after-msg');
    if(_c3 && sp>0){
      // All 3 confirmed — show real number, hide message
      afterEl.innerHTML='R'+sp.toLocaleString('en-ZA')+' <span style="font-size:10px;font-weight:400;color:rgba(255,255,255,.45)">yours</span>';
      if(msgEl) msgEl.style.display='none';
    } else if(_sSal && sp>0){
      // Salary confirmed, rest pending — show est.
      afterEl.innerHTML='R'+sp.toLocaleString('en-ZA')+' <span style="font-size:10px;font-weight:400;color:rgba(255,255,255,.45)">est.</span>';
      if(msgEl){ msgEl.textContent='Confirm debt & needs to unlock exact number'; msgEl.style.display='block'; }
    } else {
      // Nothing confirmed — show R0 with prompt
      afterEl.innerHTML='R0 <span style="font-size:10px;font-weight:400;color:rgba(255,255,255,.45)">yours</span>';
      if(msgEl){ msgEl.textContent='Tap breakdown below to confirm'; msgEl.style.display='block'; }
    }
  }

  // ── 2×2 STAT CARDS ─────────────────────────────────────────
  // This week spending — red if over budget
  const weekSpentAmt=me.filter(e=>new Date(e.logged_at||e.created_at)>=weekStart).reduce((s,e)=>s+Number(e.amount),0);
  const overBudget = wb > 0 && weekSpentAmt > wb;
  const weekEl = document.getElementById('stat-week-spent');
  if(weekEl){
    // Show remaining budget (not spent) — clearer for users
    const weekRemaining = Math.max(0, wb - weekSpentAmt);
    weekEl.textContent = 'R'+weekRemaining.toLocaleString('en-ZA');
    weekEl.style.color = overBudget ? '#c62828' : '#1a5c35';
  }
  const weekCard = document.getElementById('week-stat-card');
  if(weekCard){
    weekCard.style.background = overBudget ? '#fff5f5' : '';
    weekCard.style.borderColor = overBudget ? '#ffcdd2' : '';
  }
  const weekLabelEl = document.getElementById('stat-week-label');
  if(weekLabelEl){
    const weekRemaining2 = Math.max(0, wb - weekSpentAmt);
    weekLabelEl.textContent = overBudget
      ? `⚠️ R${Math.round(weekSpentAmt-wb).toLocaleString('en-ZA')} over budget`
      : weekSpentAmt===0
        ? `Week ${weekOfMonth} of 4 · R${wb.toLocaleString('en-ZA')}/wk available`
        : `Week ${weekOfMonth} of 4 · R${weekRemaining2.toLocaleString('en-ZA')} left`;
    weekLabelEl.style.color = overBudget ? '#c62828' : '';
  }
  set('week-num-label',`Week ${weekOfMonth} of 4`);

  // ── BUDGET BREAKDOWN CARD (Pro only, all 3 confirmed) ──────
  const bbCard = document.getElementById('budget-breakdown-card');
  const {isPro:bbIsPro} = getTier();
  // Update breakdown header icon for needs — show checkmark if confirmed this month
  const _bbNow=new Date();
  const _bbNeedsKey=`rw_needs_confirmed_${_bbNow.getFullYear()}_${_bbNow.getMonth()+1}`;
  const _bbNeedsConfirmed=(localStorage.getItem(_bbNeedsKey)||'').startsWith('confirmed:');
  const _bbNeedsIcon=document.getElementById('bb-needs-icon');
  if(_bbNeedsIcon) _bbNeedsIcon.textContent=_bbNeedsConfirmed?'✅':'⏳';
  const _bn=new Date();
  const _bSalary=(localStorage.getItem(`rw_salary_confirmed_${_bn.getFullYear()}_${_bn.getMonth()+1}`)||'').startsWith('confirmed:');
  const _bDebts=localStorage.getItem(`rw_payday_checkin_${_bn.getFullYear()}_${_bn.getMonth()+1}`)==='done';
  const _bNeeds=(localStorage.getItem(`rw_needs_confirmed_${_bn.getFullYear()}_${_bn.getMonth()+1}`)||'').startsWith('confirmed:');
  const _bCount=[_bSalary,_bDebts,_bNeeds].filter(Boolean).length;
  const _bAll=_bSalary&&_bDebts&&_bNeeds&&debts&&debts.length>0;
  const _bHasNeeds=(()=>{try{const n=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');return Object.values(n).some(v=>Number(v)>0);}catch{return false;}})();
  if(bbCard && bbIsPro){
    bbCard.style.display='block';
    // Pulse when incomplete — calm when done
    if(!_bAll){
      bbCard.style.animation='bbPulse 2.5s ease-in-out infinite';
      bbCard.style.border='1.5px solid #a8d96e';
    } else {
      bbCard.style.animation='none';
      bbCard.style.border='1px solid #d1ead9';
    }
    if(!_bAll){
      // Build live breakdown with confirmed/pending lines
      document.getElementById('bb-weekly').textContent=wb>0?'R'+wb.toLocaleString('en-ZA')+'/wk free':'— /wk';
      document.getElementById('bb-disposable').textContent='—';
      const _bRows=document.getElementById('bb-rows');
      if(_bRows){
        let _bHtml='';
        // Salary line
        const _bbFreq=user?.income_freq||'Monthly';
        const _bbDiv=_bbFreq==='Weekly'?4:_bbFreq==='Daily'?22:1;
        const _bbDisplayInc=Math.round(Number(user?.income_amount||0)/_bbDiv);
        const _bbIncLabel=_bbFreq==='Weekly'?'Weekly income':_bbFreq==='Daily'?'Daily income':'Monthly income';
        const _bbPeriod=_bbFreq==='Weekly'?'/wk':_bbFreq==='Daily'?'/day':'/mo';
        _bHtml+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8f5ee"><span style="font-size:12px;color:#2c2c2a">${_bbIncLabel}</span><span style="font-size:12px;font-weight:700;color:${_bSalary?'#1a5c35':'#aaa'}">${_bSalary?'R'+_bbDisplayInc.toLocaleString('en-ZA')+_bbPeriod:'—'}</span></div>`;
        // Debt lines — show each confirmed debt
        if(debts&&debts.length){
          const _bNow=new Date();
          const _bPM=_bNow.getMonth()===0?12:_bNow.getMonth();
          const _bPY=_bNow.getMonth()===0?_bNow.getFullYear()-1:_bNow.getFullYear();
          debts.forEach(dd=>{
            const _dKey1=`rw_paid_${dd.id}_${_bNow.getFullYear()}_${_bNow.getMonth()+1}`;
            const _dKey2=`rw_paid_${dd.id}_${_bPY}_${_bPM}`;
            const _dVal=localStorage.getItem(_dKey1)||localStorage.getItem(_dKey2);
            const _dPaid=_dVal&&_dVal.startsWith('paid:');
            const _dMissed=_dVal==='missed';
            const _dAmt=_dPaid?Number(_dVal.split(':')[1])||Number(dd.min_payment||0):Number(dd.min_payment||0);
            _bHtml+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8f5ee"><span style="font-size:12px;color:${_dPaid?'#2c2c2a':_dMissed?'#c62828':'#aaa'}">${_dPaid?'✅':_dMissed?'❌':'⏳'} ${dd.name||'Debt'}</span><span style="font-size:12px;font-weight:700;color:${_dPaid?'#c62828':_dMissed?'#888':'#aaa'}">${_dPaid?'−R'+_dAmt.toLocaleString('en-ZA'):_dMissed?'missed':'pending'}</span></div>`;
          });
        }
        // Accelerator plan line
        const _bAcc=JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
        if(_bAcc&&_bAcc.extra>0&&_bAcc.committed_at) _bHtml+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8f5ee"><span style="font-size:12px;color:#1a5c35">🎯 Extra (plan)</span><span style="font-size:12px;font-weight:700;color:#c62828">−R${Number(_bAcc.extra).toLocaleString('en-ZA')}</span></div>`;
        // Monthly needs line
        const _bbNeedsNow=new Date();
        const _bbNeedsConfKey=`rw_needs_confirmed_${_bbNeedsNow.getFullYear()}_${_bbNeedsNow.getMonth()+1}`;
        const _bbNeedsConf=(localStorage.getItem(_bbNeedsConfKey)||'').startsWith('confirmed:');
        const _bbNeedsIcon=_bbNeedsConf?'✅':'⏳';
        const _bbNeedsAmt=Object.values(JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}')).reduce((s,v)=>s+Number(v),0);
        const _bbNeedsDisplay=_bbNeedsAmt>0?'−R'+Math.round(_bbNeedsAmt/_bbDiv).toLocaleString('en-ZA')+_bbPeriod:'pending';
        _bHtml+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8f5ee"><span style="font-size:12px;color:${_bNeeds?'#2c2c2a':'#aaa'}">${_bbNeedsIcon} Monthly needs</span><span style="font-size:12px;font-weight:700;color:${_bNeeds?'#c62828':'#aaa'}">${_bNeeds?_bbNeedsDisplay:'pending'}</span></div>`;
        // Tap prompt
        if(_bCount<3) _bHtml+=`<div style="font-size:11px;color:#5a8a6a;text-align:center;margin-top:8px;cursor:pointer" onclick="handleBreakdownTap()">${_bCount} of 3 confirmed — tap to continue →</div>`;
        _bRows.innerHTML=_bHtml;
      }
    } else if(budgetBreakdown&&budgetBreakdown.length>0){
    // All 3 confirmed — show real confirmed numbers using sp (confirmed disposable)
    const spWk = sp>0 ? Math.round(sp/4) : 0;
    document.getElementById('bb-weekly').textContent = spWk>0 ? 'R'+spWk.toLocaleString('en-ZA')+'/wk free' : '— /wk';
    // Show disposable in user's pay cycle (weekly/daily/monthly)
    const _dispFreq=user?.income_freq||'Monthly';
    const _dispDiv=_dispFreq==='Weekly'?4:_dispFreq==='Daily'?22:1;
    const _dispAmt=sp>0?Math.round(sp/_dispDiv):0;
    const _dispPeriod=_dispFreq==='Weekly'?'/wk':_dispFreq==='Daily'?'/day':'/mo';
    document.getElementById('bb-disposable').textContent = _dispAmt>0 ? 'R'+_dispAmt.toLocaleString('en-ZA')+_dispPeriod : '—';
    const rows = document.getElementById('bb-rows');
    if(rows){
      rows.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0">
          <span style="color:#5a8a6a">${freq==='Weekly'?'Weekly income':freq==='Daily'?'Daily income':'Monthly income'}</span>
          <span style="color:#1a1a1a;font-weight:600">R${displayInc.toLocaleString('en-ZA')}</span>
        </div>
        ${budgetBreakdown.map(b=>`
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0">
          <span style="color:#5a8a6a">− ${b.label}</span>
          <span style="color:#c62828;font-weight:600">−R${Math.round(b.amount/(freq==='Weekly'?4:freq==='Daily'?22:1)).toLocaleString('en-ZA')}${freq==='Weekly'?'/wk':freq==='Daily'?'/day':'/mo'}</span>
        </div>`).join('')}
      `;
    }
    }
  } else if(bbCard){
    bbCard.style.display='none';
  }

  // Debit orders — combine expense-based + locally stored debit orders
  // debitTotal already includes stored DOs + debt minimums from above
  set('stat-debits','R'+debitTotal.toLocaleString('en-ZA'));
  const combinedDebitCount=debitCount;
  const daysToP=Number(user.pay_day||25)>now.getDate()?Number(user.pay_day||25)-now.getDate():new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()+Number(user.pay_day||25);
  set('stat-debit-label',debitCount+` commitment${debitCount!==1?'s':''}${daysToP<=3?' · ⚠️ Payday in '+daysToP+'d':''}`);

  // Update profile display
  const pdDisplay=document.getElementById('ppayday');
  if(pdDisplay){const pd=Number(user.pay_day||25);pdDisplay.textContent=pd+(pd===1?'st':pd===2?'nd':pd===3?'rd':'th');}
  const verEl=document.getElementById('p-version');
  if(verEl)verEl.textContent='Version '+APP_VERSION;

  // ── EXPENSES LIST ────────────────────────────────────────────
  const el=document.getElementById('exp-list');
  if(!expenses.length){el.innerHTML='<div class="empty"><div class="empty-e">➕</div><div class="empty-t">No transactions yet</div><div class="empty-s">Tap + to log your first</div></div>';return;}
  const cm=CATS.reduce((m,c)=>{m[c.id]=c;return m;},{});
  const _tn=new Date();const _tt=_tn.toDateString();const _ty=new Date(_tn-86400000).toDateString();
  let _tl='';let _th='';
  expenses.slice(0,20).forEach(e=>{
    const _td=new Date(e.logged_at||e.created_at);const _tds=_td.toDateString();
    const _tmk=`${_td.getFullYear()}-${_td.getMonth()}`;const _cnmk=`${_tn.getFullYear()}-${_tn.getMonth()}`;
    let _tlb=_tds===_tt?'Today':_tds===_ty?'Yesterday':_tmk===_cnmk?_td.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'short'}):_td.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
    if(_tlb!==_tl){_th+=`<div style="font-size:10px;font-weight:700;color:#5a8a6a;text-transform:uppercase;letter-spacing:.6px;padding:10px 14px 4px;background:#f7faf5">${_tlb}</div>`;_tl=_tlb;}
    const c=cm[e.category_id]||{e:'📦',c:'#5f5e5a'};
    _th+=`<div class="exp-row"><div class="exp-ico" style="background:${c.c}20">${e.emoji||c.e}</div><div style="flex:1"><div class="exp-n">${e.category}</div>${e.note?`<div class="exp-nt">${e.note}</div>`:''}</div><div class="exp-amt">-R${Number(e.amount).toLocaleString('en-ZA')}</div><button class="exp-del" onclick="editExp('${e.id}')" style="font-size:13px;color:var(--g)">✏️</button><button class="exp-del" onclick="delExp('${e.id}')">×</button></div>`;
  });
  el.innerHTML=_th;
}

