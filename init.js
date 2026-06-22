// ── INIT: intro tour, tab bar, final setup ─────────────────────
// App intro overlay, interactive product tour steps,
// tab bar height calculation, recent transactions toggle.
// ══ INTRO + TOUR LOGIC ════════════════════════════════════════
const TOUR_STEPS=[
  {title:"Your money ring 💚",body:"This circle shows how much you have left to spend this month. Green means you're doing well. Red means slow down.",target:'ring-card'},
  {title:"Log an expense ➕",body:"Tap the green + button anytime to record what you spent. Pick a category, enter the amount — done in 5 seconds.",target:'fab'},
  {title:"Your weekly snapshot 📊",body:"Each bar is one week. Tap any bar to see exactly what you spent that week. Stay under the line and you're winning.",target:'wk-snap'},
  {title:"Explore your tabs 🗂️",body:"Debt tracks what you owe and builds your payoff plan. Grow sets your savings goals. Profile manages your account.",target:'tab-bar'}
];

function showIntro(){
  const tier=user?.tier||'free';
  const cta=document.getElementById('intro-cta-btn');
  // Show/hide "You" badge based on tier
  const youFree=document.getElementById('you-badge-free');
  const youPro=document.getElementById('you-badge-pro');
  if(tier==='premium'||tier==='pro'){
    if(youFree)youFree.style.display='none';
    if(youPro)youPro.style.display='block';
    cta.textContent=tier==='premium'?'Enter MyRandWise 👑':'Open my dashboard →';
  } else {
    // Free/trial user — on trial so they have Pro temporarily, show "You" on Pro with trial note
    if(youFree)youFree.style.display='none';
    if(youPro){youPro.style.display='block';youPro.textContent='You (trial) ✦';}
    const days=user?.created_at?Math.max(0,14-Math.floor((Date.now()-new Date(user.created_at).getTime())/86400000)):14;
    // Update the days text
    const daysEl=document.querySelector('#rw-intro div[style*="14 days"]');
    if(daysEl)daysEl.textContent=`${days} day${days!==1?'s':''} of full Pro access — free`;
    cta.textContent="Let's go 🚀";
  }
  document.getElementById('rw-intro').classList.add('show');
}

function closeIntroStartTour(){
  document.getElementById('rw-intro').classList.remove('show');
  // Only show tour on mobile — desktop layout is different
  if(window.innerWidth <= 768){
    setTimeout(startTour,300);
  }
}

// ── Tour ─────────────────────────────────────────────────────
let tourStep=0;
function startTour(){
  const key='rw_tour_'+( user?.id||'x');
  const seen=parseInt(localStorage.getItem(key)||'0');
  const totalUsers=parseInt(localStorage.getItem('rw_total_users')||'0');
  const maxShows=totalUsers<20?2:1;
  if(seen>=maxShows)return;
  localStorage.setItem(key,seen+1);
  tourStep=0;
  document.getElementById('tour-mask').classList.add('show');
  renderTourStep();
}

function getTargetRect(targetId){
  let el=document.querySelector('.'+targetId)||document.getElementById(targetId);
  if(!el)return null;
  return el.getBoundingClientRect();
}

function renderTourStep(){
  const s=TOUR_STEPS[tourStep];
  document.getElementById('t-num').textContent=tourStep+1;
  document.getElementById('t-title').textContent=s.title;
  document.getElementById('t-body').textContent=s.body;
  document.getElementById('t-next').textContent=tourStep===TOUR_STEPS.length-1?'Done ✓':'Next →';
  const dots=document.getElementById('t-dots');
  dots.innerHTML=TOUR_STEPS.map((_,i)=>`<div class="tour-dot${i===tourStep?' on':''}"></div>`).join('');
  const r=getTargetRect(s.target);
  if(!r){endTour();return;}
  const pad=10;
  const top=r.top-pad,left=r.left-pad,w=r.width+pad*2,h=r.height+pad*2;
  document.getElementById('tour-top').style.cssText=`top:0;left:0;right:0;height:${top}px`;
  document.getElementById('tour-bot').style.cssText=`top:${top+h}px;left:0;right:0;bottom:0`;
  document.getElementById('tour-left').style.cssText=`top:${top}px;left:0;width:${left}px;height:${h}px`;
  document.getElementById('tour-right').style.cssText=`top:${top}px;left:${left+w}px;right:0;height:${h}px`;
  document.getElementById('tour-border').style.cssText=`top:${top}px;left:${left}px;width:${w}px;height:${h}px;border:2.5px solid #4ade80;border-radius:14px;position:absolute`;
  const card=document.getElementById('tour-card');
  const cardH=180,spacing=16;
  const showAbove=top+h+cardH+spacing>window.innerHeight;
  card.style.cssText=`position:absolute;left:50%;transform:translateX(-50%);background:#fff;border-radius:18px;padding:18px 20px;width:min(300px,90vw);pointer-events:all;top:${showAbove?top-cardH-spacing:top+h+spacing}px`;
}

function tourNext(){
  tourStep++;
  if(tourStep>=TOUR_STEPS.length){endTour();return;}
  renderTourStep();
}

function endTour(){
  document.getElementById('tour-mask').classList.remove('show');
  document.getElementById('tour-mask').style.display='none';
}

// ══ BANK STATEMENT PARSER ════════════════════════════════════════
let selectedBank = 'Capitec';
let parsedTransactions = [];

const BANK_TIPS = {
  'Capitec': '1. Open the Capitec app\n2. Tap Transact → History\n3. Tap the download icon → Select date range → PDF\n4. Save to your phone and upload here',
  'FNB': '1. Open the FNB app\n2. Go to Accounts → Statements\n3. Select the month → Download PDF\n4. Upload the downloaded file here',
  'ABSA': '1. Log into ABSA Online or app\n2. Go to Statements → Request statement\n3. Select PDF format and date range\n4. Download and upload here',
  'Standard Bank': '1. Open the Standard Bank app\n2. Tap Accounts → View statement\n3. Choose the month → Export as PDF\n4. Upload the file here',
  'Nedbank': '1. Log into the Nedbank Money app\n2. Go to Accounts → Statements\n3. Select period → Download PDF\n4. Upload the file here'
};

const EXPENSE_CATEGORIES = [
  'Groceries','Transport','Airtime & Data','Eating out','Entertainment',
  'Utilities','Medical','Clothing','Education','Fuel','Insurance',
  'Loan payment','Rent','Savings transfer','Other'
];

const CAT_ICONS = {
  'Groceries':'🛒','Transport':'🚌','Airtime & Data':'📱','Eating out':'🍽️',
  'Entertainment':'🎬','Utilities':'💡','Medical':'💊','Clothing':'👗',
  'Education':'📚','Fuel':'⛽','Insurance':'🛡️','Loan payment':'💳',
  'Rent':'🏠','Savings transfer':'🌱','Other':'📌'
};

function initImportTab() {
  // Check tier — only show for trial/pro/premium
  const tier = user?.tier || 'free';
  const createdAt = user?.created_at;
  let hasAccess = (tier === 'pro' || tier === 'premium');
  if (!hasAccess && createdAt) {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    if (days < 14) hasAccess = true; // still in trial
  }

  document.getElementById('import-lock-banner').style.display = hasAccess ? 'none' : 'block';
  document.getElementById('import-main').style.display = hasAccess ? 'block' : 'none';
  document.getElementById('import-tips').style.display = hasAccess ? 'block' : 'none';

  if (!hasAccess) return;

  // Populate month selector
  const sel = document.getElementById('import-month');
  if (sel && !sel.options.length) {
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = label;
      sel.appendChild(opt);
    }
  }

  // Set tips
  updateBankTips();
}

function selectBank(bank) {
  selectedBank = bank;
  document.querySelectorAll('.bank-btn').forEach(b => b.classList.remove('act'));
  const id = 'bank-' + bank.toLowerCase().replace(' bank','').replace(' ','');
  const btn = document.getElementById(id) || document.getElementById('bank-' + bank.toLowerCase().split(' ')[0].toLowerCase());
  if (btn) btn.classList.add('act');
  updateBankTips();
}

function updateBankTips() {
  const el = document.getElementById('bank-tips-text');
  if (!el) return;
  const tips = BANK_TIPS[selectedBank] || '';
  el.innerHTML = tips.split('\n').map(l => `<div style="padding:2px 0">${l}</div>`).join('');
}

function triggerFileInput() {
  if(user?.tier!=='premium'&&user?.tier!=='pro'){
    openPremiumSheet('bank');
    return;
  }
  document.getElementById('pdf-file-input').click();
}

async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('⚠️ Please upload a PDF file');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️ File too large — please upload one month at a time (max 5MB)');
    return;
  }

  // Show processing state
  document.getElementById('upload-zone').style.display = 'none';
  document.getElementById('import-processing').style.display = 'block';
  document.getElementById('import-results').style.display = 'none';
  document.getElementById('import-tips').style.display = 'none';

  try {
    document.getElementById('import-status-text').textContent = 'Reading your PDF...';

    // Convert PDF to base64
    const base64 = await fileToBase64(file);

    document.getElementById('import-status-text').textContent = 'AI is reading your transactions...';

    const month = document.getElementById('import-month')?.value || '';
    const monthLabel = document.getElementById('import-month')?.selectedOptions[0]?.textContent || '';

    // Call Claude API with the PDF
    const result = await parseStatementWithClaude(base64, selectedBank, monthLabel);

    if (!result || !result.transactions || !result.transactions.length) {
      throw new Error('No transactions found in this statement');
    }

    parsedTransactions = result.transactions;
    showImportResults(result);

  } catch (err) {
    document.getElementById('upload-zone').style.display = 'block';
    document.getElementById('import-processing').style.display = 'none';
    document.getElementById('import-tips').style.display = 'block';
    const msg = err.message || 'Could not read statement — try another file';
    // Show friendly specific messages
    if(msg.includes('429') || msg.includes('Daily limit') || msg.includes('limit reached')){
      showToast('⏳ Daily AI limit reached — try again after 2am SA time');
    } else if(msg.includes('No transactions')){
      showToast('⚠️ No transactions found — make sure it\'s a bank statement PDF');
    } else if(msg.includes('too large') || msg.includes('5MB')){
      showToast('⚠️ File too large — use a single month statement');
    } else {
      showToast('⚠️ ' + msg);
    }
  }

  // Reset file input so same file can be re-uploaded
  event.target.value = '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

async function parseStatementWithClaude(base64Pdf, bank, monthLabel) {
  const prompt = `You are a South African bank statement parser for the MyRandWise personal finance app.

Analyse this ${bank} bank statement PDF for ${monthLabel}.

Extract ALL debit/expense transactions (money going OUT — purchases, payments, fees, withdrawals).
EXCLUDE: salary/income credits, internal transfers between own accounts, opening/closing balances.

For each transaction, assign one of these EXACT categories:
Groceries, Transport, Airtime & Data, Eating out, Entertainment, Utilities, Medical, Clothing, Education, Fuel, Insurance, Loan payment, Rent, Savings transfer, Other

South African context clues:
- CHECKERS, SHOPRITE, PICK N PAY, WOOLWORTHS FOOD, SPAR → Groceries
- UBER, BOLT, METROBUS, PRASA, PUTCO, GAUTRAIN → Transport
- VODACOM, MTN, TELKOM, CELL C, RAIN → Airtime & Data
- KFC, MCDONALDS, STEERS, NANDOS, OCEAN BASKET → Eating out
- NETFLIX, SHOWMAX, DSTV, CINEMAS → Entertainment
- ESKOM, CITY POWER, MUNICIPALITIES, WATER → Utilities
- CLICKS, DISCHEM, PHARMACY, HOSPITAL → Medical
- MR PRICE, TFG, EDGARS, TOTALSPORTS → Clothing
- SCHOOL, UNIVERSITY, UNISA, VARSITY → Education
- ENGEN, SHELL, SASOL, BP, TOTAL → Fuel
- DISCOVERY, OUTSURANCE, SANTAM → Insurance
- LOAN, INSTALMENT, FIN CHARGE → Loan payment
- RENT, LANDLORD → Rent

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "bank": "${bank}",
  "month": "${monthLabel}",
  "transactions": [
    {
      "date": "2024-03-15",
      "description": "SHOPRITE BRACKENFELL",
      "amount": 342.50,
      "category": "Groceries",
      "note": "Shoprite"
    }
  ],
  "total_spent": 4850.00,
  "transaction_count": 23
}`;

  // Route through Supabase Edge Function to keep API key server-side
  const EDGE_URL = `${SB}/functions/v1/parse-statement`;
  const response = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': AK, 'Authorization': 'Bearer '+AK },
    body: JSON.stringify({
      pdf: base64Pdf,
      prompt: prompt
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'AI service error — try again');
  }

  const data = await response.json();
  // Edge Function returns parsed result directly
  if(data.transactions) return data;

  // Fallback: handle raw Anthropic response if ever called directly
  const rawText = (data.content || []).map(c => c.text || '').join('');
  const clean = rawText.replace(/```json|```/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(clean); }
  catch { throw new Error('Could not read the statement format — try a different month'); }
  return parsed;
}

function showImportResults(result) {
  document.getElementById('import-processing').style.display = 'none';
  document.getElementById('import-results').style.display = 'block';

  const count = result.transactions.length;
  const total = result.total_spent || result.transactions.reduce((s, t) => s + t.amount, 0);

  document.getElementById('import-summary-text').textContent = `${count} transaction${count !== 1 ? 's' : ''} found`;
  document.getElementById('import-total-text').textContent = `R${total.toLocaleString('en-ZA', {minimumFractionDigits:2,maximumFractionDigits:2})} total spending`;

  // Category breakdown
  const cats = {};
  result.transactions.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  document.getElementById('import-cats').innerHTML = `
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--m)">By category</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${sortedCats.map(([cat, amt]) => `
        <div style="background:var(--gl);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--gd);display:flex;align-items:center;gap:5px">
          ${CAT_ICONS[cat]||'📌'} ${cat} <span style="color:var(--g)">R${Math.round(amt).toLocaleString('en-ZA')}</span>
        </div>`).join('')}
    </div>`;

  // Transaction list
  document.getElementById('import-txn-list').innerHTML = result.transactions.map((t, i) => `
    <div style="background:var(--w);border-radius:12px;border:.5px solid var(--bd);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="font-size:20px;flex-shrink:0">${CAT_ICONS[t.category]||'📌'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.note || t.description}</div>
        <div style="font-size:11px;color:var(--mu);margin-top:1px">${t.category} · ${t.date}</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--r);flex-shrink:0">−R${t.amount.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <button onclick="removeParsedTxn(${i})" style="background:none;border:none;color:var(--h);font-size:16px;cursor:pointer;flex-shrink:0;padding:2px 4px">✕</button>
    </div>`).join('');
}

function removeParsedTxn(index) {
  parsedTransactions.splice(index, 1);
  if (!parsedTransactions.length) { clearImport(); return; }
  const total = parsedTransactions.reduce((s, t) => s + t.amount, 0);
  showImportResults({ transactions: parsedTransactions, total_spent: total });
}

async function confirmImport() {
  if (!parsedTransactions.length) return;
  const btn = document.getElementById('import-confirm-btn');
  btn.textContent = 'Importing...';
  btn.disabled = true;

  const month = document.getElementById('import-month')?.value || '';
  let successCount = 0, failCount = 0;

  for (const t of parsedTransactions) {
    try {
      await sbP('expenses', {
        tester_id: user.id,
        category: t.category,
        amount: t.amount,
        note: t.note || t.description,
        date: t.date || new Date().toISOString().split('T')[0],
        source: 'bank_import',
        bank: selectedBank
      });
      successCount++;
    } catch { failCount++; }
  }

  btn.textContent = '✅ Import all transactions';
  btn.disabled = false;

  if (successCount > 0) {
    showToast(`✅ ${successCount} transaction${successCount!==1?'s':''} imported!`);
    // Show green dot badge on import tab
    const badge = document.getElementById('import-badge');
    if (badge) badge.style.display = 'block';
    // Refresh dashboard in background
    try { await Promise.all([loadExp().catch(()=>{}), sbG(`debts?tester_id=eq.${user?.id}&order=balance.asc`).then(d=>{debts=d||[];}).catch(()=>{})]); renderDash(); } catch {}
    clearImport();
    // Switch to home to show updated dashboard
    setTimeout(() => switchTab('home'), 800);
  }
  if (failCount > 0) showToast(`⚠️ ${failCount} transactions could not be saved`);
}

function clearImport() {
  parsedTransactions = [];
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('import-processing').style.display = 'none';
  document.getElementById('import-results').style.display = 'none';
  document.getElementById('import-tips').style.display = 'block';
  document.getElementById('import-badge').style.display = 'none';
}

// ── Upload zone drag-over highlight ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor='var(--g)'; zone.style.background='var(--gl)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor='var(--bd)'; zone.style.background='var(--bg)'; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor='var(--bd)'; zone.style.background='var(--bg)';
    const file = e.dataTransfer.files[0];
    if (file) { const input = document.getElementById('pdf-file-input'); const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; handlePdfUpload({target:input}); }
  });
});




// ── Password Reset Handler ─────────────────────────────────────
function checkResetToken(){
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace('#',''));
  const token = params.get('access_token');
  const type = params.get('type');
  if(token && type==='recovery'){
    localStorage.setItem('rw_reset_token', token);
    history.replaceState(null, '', window.location.pathname);
    show('reset-screen');
    return true;
  }
  return false;
}
async function doResetPassword(){
  const pass = document.getElementById('rp-pass').value;
  const pass2 = document.getElementById('rp-pass2').value;
  const errEl = document.getElementById('rp-err');
  errEl.style.display='none';
  if(pass.length < 6){errEl.style.display='block';errEl.textContent='Password must be at least 6 characters';return;}
  if(pass !== pass2){errEl.style.display='block';errEl.textContent='Passwords do not match';return;}
  const btn = document.getElementById('rp-btn');
  btn.disabled=true; btn.textContent='Saving...';
  const token = localStorage.getItem('rw_reset_token');
  if(!token){errEl.style.display='block';errEl.textContent='Reset link expired. Please request a new one.';btn.disabled=false;btn.textContent='Set new password →';return;}
  try{
    const res = await fetch(`${SB}/auth/v1/user`,{
      method:'PUT',
      headers:{'apikey':AK,'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({password:pass})
    });
    const data = await res.json();
    if(data.error){throw new Error(data.error.message||'Failed to update password');}
    localStorage.removeItem('rw_reset_token');
    showToast('✅ Password updated! Sign in with your new password.');
    show('login');
  }catch(e){
    errEl.style.display='block';
    errEl.textContent = e.message.includes('expired')||e.message.includes('invalid')
      ? 'Reset link expired. Request a new one from the login page.'
      : 'Failed to update password. Please try again.';
    btn.disabled=false; btn.textContent='Set new password →';
  }
}

// ══ SEE ALL TRANSACTIONS ════════════════════════════════════════
let saFilter = 'all';

function openSeeAll(){
  const screen = document.getElementById('see-all-screen');
  screen.style.display = 'flex';
  document.getElementById('sa-search').value = '';
  saFilter = 'all';
  renderSeeAllFilters();
  renderSeeAll();
}

function closeSeeAll(){
  document.getElementById('see-all-screen').style.display = 'none';
}

// ── Custom Categories ─────────────────────────────────────────
function openCustomCatSheet(){
  const ov=document.getElementById('custom-cat-overlay');
  if(ov){ ov.style.display='flex'; }
  setTimeout(()=>{ document.getElementById('cc-name')?.focus(); },200);
}
function closeCustomCatSheet(){
  const ov=document.getElementById('custom-cat-overlay');
  if(ov) ov.style.display='none';
  document.getElementById('cc-name').value='';
  document.getElementById('cc-emoji').value='';
}
function saveCustomCat(){
  const name=document.getElementById('cc-name').value.trim();
  const emoji=document.getElementById('cc-emoji').value.trim()||'📦';
  if(!name){ showToast('⚠️ Enter a category name'); return; }

  // Prevent duplicate names
  const exists=CATS.find(c=>c.l.toLowerCase()===name.toLowerCase());
  if(exists){ showToast('⚠️ That category already exists'); return; }

  // Disable save button immediately to prevent double-tap
  const btn=event?.target;
  if(btn){ btn.disabled=true; btn.textContent='Adding...'; }

  const id='custom_'+name.toLowerCase().replace(/\s+/g,'_');
  const newCat={id,e:emoji,l:name,c:'#5f5e5a',custom:true};

  // Only add to CATS if not already there (prevent duplication on re-render)
  if(!CATS.find(x=>x.id===id)) CATS.push(newCat);

  // Save to localStorage — deduplicate before saving
  const saved=JSON.parse(localStorage.getItem('rw_custom_cats')||'[]');
  const deduped=saved.filter(c=>c.id!==id); // remove any existing with same id
  deduped.push(newCat);
  localStorage.setItem('rw_custom_cats',JSON.stringify(deduped));

  closeCustomCatSheet();

  // Re-open expense sheet to show new category
  setTimeout(()=>{
    openExpSheet();
    setTimeout(()=>{
      const el=document.querySelector(`[data-id="${id}"]`);
      if(el) selectCat(el);
    },100);
  },50);

  showToast(`✅ "${name}" added`);
}

function loadCustomCats(){
  const saved=JSON.parse(localStorage.getItem('rw_custom_cats')||'[]');
  // Deduplicate by both id AND name (catches old Date.now() id duplicates)
  const seen=new Set();
  const seenNames=new Set();
  const deduped=saved.filter(c=>{
    const nameKey=c.l?.toLowerCase();
    if(seen.has(c.id)||seenNames.has(nameKey)) return false;
    seen.add(c.id); seenNames.add(nameKey); return true;
  });
  if(deduped.length!==saved.length){
    localStorage.setItem('rw_custom_cats',JSON.stringify(deduped));
  }
  deduped.forEach(c=>{
    if(!CATS.find(x=>x.id===c.id||x.l?.toLowerCase()===c.l?.toLowerCase())) CATS.push(c);
  });
}

// ── Monthly Summary ───────────────────────────────────────────
function openMonthlySummary(){
  const now=new Date();
  const year=now.getFullYear();
  const month=now.getMonth();
  const monthName=now.toLocaleString('en-ZA',{month:'long'});
  const daysInMonth=new Date(year,month+1,0).getDate();

  // Filter this month's expenses
  const monthStart=new Date(year,month,1);
  const monthEnd=new Date(year,month,daysInMonth,23,59,59);
  const monthExp=expenses.filter(e=>{
    const d=new Date(e.logged_at||e.created_at);
    return d>=monthStart&&d<=monthEnd;
  });
  const totalSpent=monthExp.reduce((s,e)=>s+Number(e.amount||0),0);

  // Category breakdown
  const cats={};
  monthExp.forEach(e=>{const c=e.category||'Other';cats[c]=(cats[c]||0)+Number(e.amount||0);});
  const topCats=Object.entries(cats).sort((a,b)=>b[1]-a[1]);

  // Budget info
  const {wb,disposable}=getSmartWeeklyBudget();
  const monthlyBudget=disposable;
  const budgetUsed=monthlyBudget>0?Math.round(totalSpent/monthlyBudget*100):0;
  const saved=Math.max(0,monthlyBudget-totalSpent);
  const over=Math.max(0,totalSpent-monthlyBudget);

  // Debt payments this month (minimums × 1)
  const totalDebtPayments=debts.reduce((s,d)=>s+Number(d.min_payment||0),0);

  // Week breakdown
  const weekTotals=[1,2,3,4].map(w=>{
    const wStart=new Date(year,month,(w-1)*7+1,0,0,0);
    const wEnd=new Date(year,month,Math.min(w*7,daysInMonth),23,59,59);
    return monthExp.filter(e=>{const d=new Date(e.logged_at||e.created_at);return d>=wStart&&d<=wEnd;}).reduce((s,e)=>s+Number(e.amount||0),0);
  });

  // Grade
  let grade,gradeColor,gradeMsg;
  if(budgetUsed<=80){grade='A';gradeColor='#1a7a4a';gradeMsg='Excellent — you stayed well within budget';}
  else if(budgetUsed<=100){grade='B';gradeColor='#639922';gradeMsg='Good — tight but you made it work';}
  else if(budgetUsed<=120){grade='C';gradeColor='#ba7517';gradeMsg='Watch out — slightly over budget';}
  else{grade='D';gradeColor='#a32d2d';gradeMsg='Over budget — let\'s plan better next month';}

  document.getElementById('ms-title').textContent=`${monthName} summary 📊`;
  document.getElementById('ms-subtitle').textContent=`${now.getDate()} of ${daysInMonth} days tracked`;

  document.getElementById('ms-body').innerHTML=`
    <!-- Grade card -->
    <div style="background:${gradeColor};border-radius:16px;padding:20px;text-align:center;margin-bottom:16px;color:#fff">
      <div style="font-size:48px;font-weight:900;line-height:1">${grade}</div>
      <div style="font-size:13px;opacity:.85;margin-top:6px">${gradeMsg}</div>
    </div>

    <!-- Key numbers -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:#f7f6f2;border-radius:14px;padding:14px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:#a32d2d">R${Math.round(totalSpent).toLocaleString('en-ZA')}</div>
        <div style="font-size:11px;color:#888;margin-top:3px">Total spent</div>
      </div>
      <div style="background:#f7f6f2;border-radius:14px;padding:14px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:${saved>0?'#1a7a4a':'#a32d2d'}">${saved>0?'R'+Math.round(saved).toLocaleString('en-ZA'):'-R'+Math.round(over).toLocaleString('en-ZA')}</div>
        <div style="font-size:11px;color:#888;margin-top:3px">${saved>0?'Saved':'Overspent'}</div>
      </div>
      <div style="background:#f7f6f2;border-radius:14px;padding:14px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:#534ab7">R${Math.round(totalDebtPayments).toLocaleString('en-ZA')}</div>
        <div style="font-size:11px;color:#888;margin-top:3px">Debt payments</div>
      </div>
      <div style="background:#f7f6f2;border-radius:14px;padding:14px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:#2c2c2a">${monthExp.length}</div>
        <div style="font-size:11px;color:#888;margin-top:3px">Transactions</div>
      </div>
    </div>

    <!-- Week by week -->
    <div style="background:#f7f6f2;border-radius:14px;padding:14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Week by week</div>
      ${weekTotals.map((amt,i)=>{
        const pct=wb>0?Math.min(100,Math.round(amt/wb*100)):0;
        const isOver=amt>wb&&wb>0;
        return`<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <div style="font-size:12px;color:#555">Week ${i+1}</div>
            <div style="font-size:12px;font-weight:700;color:${isOver?'#a32d2d':'#1a7a4a'}">R${Math.round(amt).toLocaleString('en-ZA')}${isOver?' ⚠️':''}</div>
          </div>
          <div style="height:5px;background:#e0e0e0;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${isOver?'#a32d2d':'#1a7a4a'};border-radius:3px"></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Top spending categories -->
    ${topCats.length?`
    <div style="background:#f7f6f2;border-radius:14px;padding:14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Top spending</div>
      ${topCats.slice(0,5).map(([cat,amt])=>{
        const pct=totalSpent>0?Math.round(amt/totalSpent*100):0;
        return`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="font-size:13px;flex:1;color:#2c2c2a;font-weight:600">${cat}</div>
          <div style="font-size:12px;font-weight:700;color:#a32d2d">R${Math.round(amt).toLocaleString('en-ZA')}</div>
          <div style="font-size:11px;color:#888;width:30px;text-align:right">${pct}%</div>
        </div>`;
      }).join('')}
    </div>`:''}

    <!-- Next month tip -->
    <div style="background:#eaf3de;border-radius:14px;padding:14px;margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:#1a5c35;margin-bottom:4px">💡 For next month</div>
      <div style="font-size:13px;color:#2d5a1e;line-height:1.5">
        ${over>0?`You overspent by R${Math.round(over).toLocaleString('en-ZA')}. Try logging every expense the day you spend — it takes 20 seconds and makes a real difference.`
        :topCats.length?`Your biggest spend was ${topCats[0][0]} at R${Math.round(topCats[0][1]).toLocaleString('en-ZA')}. Can you reduce it by 10% next month? That's R${Math.round(topCats[0][1]*0.1).toLocaleString('en-ZA')} back in your pocket.`
        :'Keep logging every day — the more data, the more accurate your budget becomes.'}
      </div>
    </div>
    <button onclick="closeMonthlySummary()" style="width:100%;padding:16px;background:#1a7a4a;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:8px">Got it ✓</button>
  `;

  const ov=document.getElementById('monthly-summary-overlay');
  if(ov){ ov.style.display='flex'; ov.scrollTop=0; }
}
function closeMonthlySummary(){
  const ov=document.getElementById('monthly-summary-overlay');
  if(ov) ov.style.display='none';
}


// ── Premium Upgrade Sheet ─────────────────────────────────────
function openPremiumSheet(feature){
  const ov = document.getElementById('premium-upgrade-overlay');
  const headline = document.getElementById('prem-headline');
  const subline = document.getElementById('prem-subline');
  const statBox = document.getElementById('prem-stat-box');
  const statText = document.getElementById('prem-stat-stat-text');

  // Personalise based on which feature triggered it
  const totalDebt = (debts||[]).reduce((s,d)=>s+Number(d.balance||0),0);
  const totalMin = (debts||[]).reduce((s,d)=>s+Number(d.min_payment||0),0);
  const numDebts = (debts||[]).length;
  const expCount = (expenses||[]).length;
  const inc = Number(user?.income_amount||0);

  // Calculate rough payoff months
  let payoffMonths = 0;
  if(totalDebt>0&&totalMin>0){
    let rem=totalDebt; let m=0;
    const avgRate=(debts||[]).length>0?(debts||[]).reduce((s,d)=>s+Number(d.interest_rate||0),0)/(debts||[]).length/100/12:0;
    while(rem>0&&m<600){rem=rem*(1+avgRate)-totalMin;m++;if(rem<0)rem=0;}
    payoffMonths=m;
  }
  const payoffYears=Math.floor(payoffMonths/12);
  const payoffMo=payoffMonths%12;
  const payoffStr=payoffYears>0?payoffYears+'y '+(payoffMo>0?payoffMo+'mo':''):payoffMonths+'mo';

  // Extra payment savings estimate
  const extraPay=Math.round(totalMin*0.1)||500;
  let payoffMonthsExtra=0;
  if(totalDebt>0&&(totalMin+extraPay)>0){
    let rem=totalDebt;let m=0;
    const avgRate=(debts||[]).length>0?(debts||[]).reduce((s,d)=>s+Number(d.interest_rate||0),0)/(debts||[]).length/100/12:0;
    while(rem>0&&m<600){rem=rem*(1+avgRate)-(totalMin+extraPay);m++;if(rem<0)rem=0;}
    payoffMonthsExtra=m;
  }
  const monthsSaved=payoffMonths-payoffMonthsExtra;

  const statEl = document.getElementById('prem-stat-text');

  if(feature==='bank'){
    if(headline) headline.textContent='Stop logging manually.';
    if(subline) subline.textContent='Upload once. Everything categorised.';
    if(statEl) statEl.innerHTML=`You've logged <strong>${expCount} expense${expCount!==1?'s':''}</strong> manually. Bank import catches every transaction automatically — including the ones you forgot to log.`;
    if(statBox) statBox.style.display='block';
  } else if(feature==='stokvel'){
    if(headline) headline.textContent='Stokvel tracker';
    if(subline) subline.textContent='Your group. Your money. In one place.';
    if(statEl) statEl.innerHTML=`Track contributions, payout order and the total pot for your stokvel group. No more WhatsApp confusion about whose turn it is.`;
    if(statBox) statBox.style.display='block';
  } else if(feature==='timeline'){
    if(headline) headline.textContent=`You're ${payoffMonths<=0?'debt free':'working on it'}.`;
    if(subline) subline.textContent='The timeline shows exactly how fast things change.';
    if(totalDebt>0&&statEl){
      statEl.innerHTML=`You have <strong>${numDebts} debt${numDebts!==1?'s':''}</strong> totalling <strong>R${Math.round(totalDebt).toLocaleString('en-ZA')}</strong>. At minimums: debt free in <strong>${payoffStr}</strong>.${monthsSaved>0?` Pay R${extraPay.toLocaleString('en-ZA')} extra/mo and cut <strong>${Math.round(monthsSaved)} months</strong> off that.`:''}`;
      if(statBox) statBox.style.display='block';
    }
  } else if(feature==='report'){
    if(headline) headline.textContent='Your full money picture.';
    if(subline) subline.textContent='One PDF. Every month. Ready to share.';
    if(statEl) statEl.innerHTML=`A monthly report showing your income, spending by category, debt progress and savings — formatted professionally. Share with a financial advisor or just keep for your records.`;
    if(statBox) statBox.style.display='block';
  } else {
    if(headline) headline.textContent='Premium feature';
    if(subline) subline.textContent='Unlock the full picture';
    if(statBox) statBox.style.display='none';
  }

  if(ov) ov.style.display='flex';
}

function closePremiumSheet(){
  const ov=document.getElementById('premium-upgrade-overlay');
  if(ov) ov.style.display='none';
}

function startPremiumUpgrade(){
  closePremiumSheet();
  // Trigger the existing upgrade flow but for Premium
  showUpgradeWall(true); // true = premium
}

// ── Debt Payment Logging ──────────────────────────────────────
let _paymentDebtId=null, _paymentDebtName='', _paymentDebtMin=0, _paymentDebtBal=0;

function openPaymentSheet(debtId, debtName, minPayment, balance){
  _paymentDebtId=debtId;
  _paymentDebtName=debtName;
  _paymentDebtMin=Number(minPayment||0);
  _paymentDebtBal=Number(balance||0);
  const ov=document.getElementById('payment-overlay');
  const nameEl=document.getElementById('payment-debt-name');
  const inp=document.getElementById('payment-amount-input');
  const btns=document.getElementById('payment-quick-btns');
  if(nameEl) nameEl.textContent='Pay '+debtName;
  if(inp){ inp.value=_paymentDebtMin||''; inp.focus(); }
  // Quick amount buttons
  if(btns && _paymentDebtMin>0){
    const amounts=[_paymentDebtMin, Math.round(_paymentDebtMin*1.5), _paymentDebtMin*2];
    btns.innerHTML=amounts.map(a=>`<button onclick="document.getElementById('payment-amount-input').value=${a}" style="flex:1;padding:8px;background:#f7f6f2;border:1px solid #e8e6de;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">R${a.toLocaleString('en-ZA')}</button>`).join('');
  }
  if(ov) ov.style.display='flex';
}

function closePaymentSheet(){
  const ov=document.getElementById('payment-overlay');
  if(ov) ov.style.display='none';
  _paymentDebtId=null;
}

async function confirmPayment(){
  const amount=Number(document.getElementById('payment-amount-input')?.value||0);
  if(!amount||amount<=0){ showToast('⚠️ Enter the amount you paid'); return; }
  if(!_paymentDebtId||!user?.id) return;
  const note=document.getElementById('payment-note')?.value||'';
  const newBal=Math.max(0, _paymentDebtBal-amount);
  try{
    // Log payment
    await sbP('debt_payments',{
      tester_id:user.id,
      debt_id:_paymentDebtId,
      amount,
      note:note||null,
      paid_at:new Date().toISOString()
    });
    // Reduce debt balance
    await sbPatch(`debts?id=eq.${_paymentDebtId}`,{ balance:newBal });
    // Update local debts array
    const idx=debts.findIndex(d=>d.id===_paymentDebtId);
    if(idx>=0) debts[idx].balance=newBal;
    closePaymentSheet();
    showToast(`✅ R${amount.toLocaleString('en-ZA')} payment recorded on ${_paymentDebtName}`);
    // Reload debt tab
    loadDebtsPWA();
    // Check for celebration
    if(newBal<=0) setTimeout(()=>checkDebtPayoffCelebration(),500);
    // Mark this month as paid for this debt
    const monthKey=`rw_paid_${_paymentDebtId}_${new Date().getFullYear()}_${new Date().getMonth()+1}`;
    localStorage.setItem(monthKey,'paid:'+amount);
  }catch(e){
    console.error('Payment save error:', e);
    showToast('Could not save payment: '+(e?.message||e||'unknown error'));
  }
}

async function logCantPay(reason){
  if(!_paymentDebtId||!user?.id) return;
  const monthKey=`rw_paid_${_paymentDebtId}_${new Date().getFullYear()}_${new Date().getMonth()+1}`;
  localStorage.setItem(monthKey,'missed:'+reason);
  // Log as missed payment
  try{
    await sbP('debt_payments',{
      tester_id:user.id,
      debt_id:_paymentDebtId,
      amount:0,
      note:'missed:'+reason,
      paid_at:new Date().toISOString()
    });
  }catch{}
  closePaymentSheet();
  const msgs={
    no_money:'💚 We understand. Focus on essentials this month. Come back when you can.',
    forgot:'💡 Tip: set a reminder on your phone for next month.',
    partial:'Enter how much you did pay and we\'ll update your balance.'
  };
  if(reason==='partial'){
    // Re-open for partial entry
    openPaymentSheet(_paymentDebtId,_paymentDebtName,_paymentDebtMin,_paymentDebtBal);
    showToast('Enter the partial amount you paid');
  } else {
    showToast(msgs[reason]||'Noted.');
  }
}

async function loadLastPayment(debtId){
  const el=document.getElementById('last-payment-'+debtId);
  if(!el||!user?.id) return;
  const now=new Date();
  const monthName=now.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
  try{
    const payments=await sbG(`debt_payments?debt_id=eq.${debtId}&order=paid_at.desc&limit=1`);
    if(payments?.length){
      const p=payments[0];
      const pDate=new Date(p.paid_at);
      const date=pDate.toLocaleDateString('en-ZA',{day:'numeric',month:'short'});
      const pMonth=pDate.getMonth(); const pYear=pDate.getFullYear();
      const isThisMonth=pMonth===now.getMonth()&&pYear===now.getFullYear();
      const monthLabel=pDate.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
      if(Number(p.amount)>0){
        el.innerHTML=`✅ ${isThisMonth?'Paid this month':'Last paid'}: R${Number(p.amount).toLocaleString('en-ZA')} on ${date}${!isThisMonth?' ('+monthLabel+')':''}`;
        el.style.color=isThisMonth?'#1a5c35':'#888';
      } else {
        el.innerHTML=`⚠️ ${isThisMonth?'Missed this month':'Missed payment'}: ${date}${!isThisMonth?' ('+monthLabel+')':''}`;
        el.style.color='#ba7517';
      }
    } else {
      el.textContent=`${monthName} — no payments recorded yet`;
      el.style.color='#aaa';
    }
  }catch{
    el.textContent='';
  }
}

// ── Payday Payment Check-in ───────────────────────────────────

// ── Salary Confirmation ───────────────────────────────────────
function maybeShowSalaryConfirm(force=false){
  if(!user?.id) return;
  const now=new Date(),payDay=Number(user.pay_day||25),today=now.getDate();
  const cycleKey=`rw_salary_confirmed_${now.getFullYear()}_${now.getMonth()+1}`;
  // force=true (user tapped manually) bypasses the "already confirmed" check
  if(!force && localStorage.getItem(cycleKey)) return;
  // Day check — only auto-trigger on payday/day after. But force=true bypasses (user tapped manually)
  if(!force){
    const daysAfter=today>=payDay?today-payDay:today+(new Date(now.getFullYear(),now.getMonth(),0).getDate()-payDay);
    if(daysAfter!==0&&daysAfter!==1) return;
  }
  const el=document.getElementById('salary-confirm-amount');
  const _freq=user?.income_freq||'Monthly';
  const _dispInc=_freq==='Weekly'?Math.round(Number(user.income_amount||0)/4):_freq==='Daily'?Math.round(Number(user.income_amount||0)/22):Number(user.income_amount||0);
  if(el)el.textContent='R'+_dispInc.toLocaleString('en-ZA');
  const ov=document.getElementById('salary-confirm-overlay');
  if(ov)ov.style.display='flex';
}
async function confirmSalaryReceived(received){
  const ov=document.getElementById('salary-confirm-overlay');
  if(ov)ov.style.display='none';
  const now=new Date();
  const cycleKey=`rw_salary_confirmed_${now.getFullYear()}_${now.getMonth()+1}`;
  if(received){
    localStorage.setItem(cycleKey,'confirmed:'+new Date().toISOString());
    try{
      await sbPatch(`beta_testers?id=eq.${user.id}`,{
        salary_last_confirmed:new Date().toISOString(),
        salary_confirmed_key:cycleKey
      });
    }catch{}
    showToast('✅ Salary confirmed');
    checkBreakdownUnlock();
    setTimeout(maybeShowPaydayCheckin,1000);
  } else {
    localStorage.setItem(cycleKey,'pending:'+new Date().toISOString());
    showToast('📌 Noted — update your income in Profile when it arrives');
  }
  renderDash();
}
function maybeShowMonthlyNeedsConfirm(){
  const now=new Date(),key=`rw_needs_confirmed_${now.getFullYear()}_${now.getMonth()+1}`;
  if(localStorage.getItem(key)) return;
  const ov=document.getElementById('needs-checkin-overlay');
  const list=document.getElementById('needs-checkin-list');
  if(!ov||!list) return;
  const needs=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
  const custom=JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
  const items=[...Object.entries(needs).map(([k,v])=>({label:k.charAt(0).toUpperCase()+k.slice(1),amount:v})),...custom.map(c=>({label:c.name,amount:c.amount}))];
  // No needs data — show setup screen instead of auto-confirming
  if(!items.length){showMonthlyNeedsSetup();return;}
  list.innerHTML=items.map(i=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0e8"><span style="font-size:13px;color:#2c2c2a">${i.label}</span><span style="font-size:13px;font-weight:700;color:#1a5c35">R${Number(i.amount).toLocaleString('en-ZA')}</span></div>`).join('');
  ov.style.display='flex';
}
function checkBreakdownUnlock(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const s1=(localStorage.getItem(`rw_salary_confirmed_${y}_${m}`)||'').startsWith('confirmed:');
  // Auto-pass debt step if user has no debts — don't block them on an irrelevant step
  if(!debts?.length) localStorage.setItem(`rw_payday_checkin_${y}_${m}`,'done');
  const s2=localStorage.getItem(`rw_payday_checkin_${y}_${m}`)==='done';
  const s3=(localStorage.getItem(`rw_needs_confirmed_${y}_${m}`)||'').startsWith('confirmed:');
  // Only unlock if needs data actually exists — confirmed flag without data is stale
  const _needsData=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
  const _needsHasData=Object.values(_needsData).some(v=>Number(v)>0);
  const _needsReady=s3&&_needsHasData;
  if(s1&&s2&&_needsReady){
    renderDash();
    // Show motivational completion popup
    setTimeout(()=>{
      const {disposable,wb}=getSmartWeeklyBudget();
      const _inc=Number(user?.income_amount||0);
      const _sp=Math.max(0,disposable);
      const ov=document.getElementById('breakdown-complete-overlay');
      const amtEl=document.getElementById('complete-amount');
      const wkEl=document.getElementById('complete-weekly');
      const msgEl=document.getElementById('complete-message');
      if(amtEl) amtEl.textContent='R'+_sp.toLocaleString('en-ZA');
      if(wkEl) wkEl.textContent='R'+Math.round(_sp/4).toLocaleString('en-ZA')+'/wk to work with';
      if(msgEl){
        const accPlan=JSON.parse(localStorage.getItem('rw_acc_plan')||'null');
        if(accPlan&&accPlan.extra>0){
          msgEl.textContent=`You have a debt-free plan in place. R${Number(accPlan.extra).toLocaleString('en-ZA')} extra/mo is already working to clear your debt faster. Most people never get this far.`;
        } else {
          msgEl.textContent='Most South Africans never know this number. You do. This is the number that changes everything — yours to grow, save, or plan with.';
        }
      }
      if(ov) ov.style.display='flex';
    },500);
  }
}
// ── Incomplete breakdown nudge ───────────────────────────────
// Called after login — checks what's missing and shows a card nudge
function nudgeIncompleteBreakdown(){
  if(!user?.id) return;
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const s1=(localStorage.getItem(`rw_salary_confirmed_${y}_${m}`)||'').startsWith('confirmed:');
  const s2=localStorage.getItem(`rw_payday_checkin_${y}_${m}`)==='done'||(!(debts&&debts.length>0));
  const s3=(localStorage.getItem(`rw_needs_confirmed_${y}_${m}`)||'').startsWith('confirmed:');
  const needsData=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
  const hasNeedsData=Object.values(needsData).some(v=>Number(v)>0);
  const allDone=s1&&s2&&s3&&hasNeedsData;
  if(allDone) return; // Nothing to nudge about

  // Build message based on what's missing
  let msg='';
  if(!s1) msg='Confirm your salary arrived this month to unlock your budget.';
  else if(!s3||!hasNeedsData) msg='Confirm your monthly needs to see your real weekly budget.';
  else if(!s2) msg='Confirm your debt payments to complete your budget breakdown.';
  if(!msg) return;

  // Show nudge on the breakdown card
  const card=document.getElementById('budget-breakdown-card');
  if(!card) return;
  const nudgeEl=document.getElementById('bb-nudge');
  if(nudgeEl){
    nudgeEl.textContent='👆 '+msg;
    nudgeEl.style.display='block';
  }
  // Also pulse the card border
  card.style.border='1.5px solid #f59e0b';
  card.style.animation='pulse-border 2s ease-in-out infinite';
}

function handleBreakdownTap(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const s1=(localStorage.getItem(`rw_salary_confirmed_${y}_${m}`)||'').startsWith('confirmed:');
  // Auto-pass debt step silently if user has no debts
  const hasDebts=debts&&debts.length>0;
  if(!hasDebts) localStorage.setItem(`rw_payday_checkin_${y}_${m}`,'done');
  const s2=localStorage.getItem(`rw_payday_checkin_${y}_${m}`)==='done';
  const s3=(localStorage.getItem(`rw_needs_confirmed_${y}_${m}`)||'').startsWith('confirmed:');
  const _nd=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
  const _ndReady=s3&&Object.values(_nd).some(v=>Number(v)>0);
  if(s1&&s2&&_ndReady){checkBreakdownUnlock();return;}
  // Only include debt step if user actually has debts
  const steps=[
    {label:'Confirm salary received',done:s1,action:'salary'},
    ...(hasDebts?[{label:'Confirm debt payments',done:s2,action:'debts'}]:[]),
    {label:'Confirm monthly needs',done:s3,action:'needs'}
  ];
  const list=document.getElementById('breakdown-steps-list');
  if(list)list.innerHTML=steps.map(s=>`<div style="display:flex;align-items:center;gap:12px;padding:12px;background:${s.done?'#f0faf4':'#fff9f0'};border-radius:12px;margin-bottom:8px;border:1px solid ${s.done?'#d1ead9':'#ffe0b2'}"><div style="font-size:20px">${s.done?'✅':'⏳'}</div><div style="flex:1;font-size:13px;font-weight:600;color:${s.done?'#1a5c35':'#2c2c2a'}">${s.label}</div><div style="font-size:11px;color:${s.done?'#5a8a6a':'#e65100'}">${s.done?'Done':'Pending'}</div></div>`).join('');
  const btn=document.getElementById('breakdown-action-btn');
  const next=steps.find(s=>!s.done);
  if(btn&&next){btn.textContent={salary:'Confirm salary →',debts:'Confirm debt payments →',needs:'Confirm monthly needs →'}[next.action]||'Start →';btn.dataset.action=next.action;}
  document.getElementById('breakdown-action-overlay').style.display='flex';
}
function startBreakdownCheckin(){
  document.getElementById('breakdown-action-overlay').style.display='none';
  const action=document.getElementById('breakdown-action-btn')?.dataset?.action;
  setTimeout(()=>{if(action==='salary')maybeShowSalaryConfirm(true);else if(action==='debts')showPaydayCheckin('prev');else if(action==='needs')maybeShowMonthlyNeedsConfirm();},300);
}

async function maybeShowPaydayCheckin(){
  if(!user?.id||!debts?.length) return;
  const now=new Date();
  const payDay=Number(user.pay_day||25);
  const today=now.getDate();
  const currentMonth=now.getMonth()+1;
  const currentYear=now.getFullYear();
  const monthKey=`rw_payday_checkin_${currentYear}_${currentMonth}`;
  if(localStorage.getItem(monthKey)==='done') return;
  // Trigger on payday itself, and retry once 2 days later — then stop
  // e.g. payday=25: triggers on 25th and 27th only
  const daysAfterPay=today>=payDay?today-payDay:today+(new Date(currentYear,currentMonth-1,0).getDate()-payDay);
  if(daysAfterPay!==0&&daysAfterPay!==2) return;
  // Check Supabase for payments already made this month — don't ask again
  const prevMonth=currentMonth===1?12:currentMonth-1;
  const prevYear=currentMonth===1?currentYear-1:currentYear;
  // Query from payday of previous cycle onwards (payday = start of new pay cycle)
  // e.g. paid on 25th: look for payments from 25th April onwards
  const cycleStart=new Date(currentYear,currentMonth-1,payDay);
  // If today is before payday this month, cycle started last month
  if(cycleStart>now) cycleStart.setMonth(cycleStart.getMonth()-1);
  const cycleStartStr=cycleStart.toISOString().split('T')[0];
  try{
    const paid=await sbG(`debt_payments?tester_id=eq.${user.id}&paid_at=gte.${cycleStartStr}`);
    const paidIds=new Set((paid||[]).map(p=>p.debt_id));
    // Mark already-paid debts in localStorage so check-in skips them
    debts.forEach(d=>{
      if(paidIds.has(d.id)){
        localStorage.setItem(`rw_paid_${d.id}_${prevYear}_${prevMonth}`,'paid:confirmed');
      }
    });
    const unpaidPrev=debts.filter(d=>!paidIds.has(d.id));
    if(!unpaidPrev.length){
      // All paid — mark done, no check-in needed
      localStorage.setItem(monthKey,'done');
      return;
    }
    setTimeout(()=>showPaydayCheckin('prev'),2000);
  }catch{
    // Fallback to localStorage only
    const unpaidPrev=debts.filter(d=>!localStorage.getItem(`rw_paid_${d.id}_${prevYear}_${prevMonth}`));
    if(!unpaidPrev.length){ localStorage.setItem(monthKey,'done'); return; }
    setTimeout(()=>showPaydayCheckin('prev'),2000);
  }
}

function showPaydayCheckin(mode){
  const ov=document.getElementById('payday-checkin-overlay');
  const title=document.getElementById('payday-checkin-title');
  const list=document.getElementById('payday-debt-list');
  if(!ov||!list) return;
  const now=new Date();
  const prevMonth=now.getMonth()===0?12:now.getMonth();
  const prevYear=now.getMonth()===0?now.getFullYear()-1:now.getFullYear();
  const prevMonthName=new Date(prevYear,prevMonth-1,1).toLocaleString('en-ZA',{month:'long'});
  if(mode==='prev'&&title){
    title.textContent=`First — let's close out ${prevMonthName}`;
  }
  // Show debts needing payment confirmation
  const targetYear=mode==='prev'?prevYear:now.getFullYear();
  const targetMonth=mode==='prev'?prevMonth:now.getMonth()+1;
  const pending=debts.filter(d=>{
    const key=`rw_paid_${d.id}_${targetYear}_${targetMonth}`;
    return !localStorage.getItem(key);
  });
  if(!pending.length){
    closePaydayCheckin(true);
    showToast('✅ All debt payments confirmed for this month!');
    setTimeout(maybeShowMonthlyNeedsConfirm, 1500);
    return;
  }
  list.innerHTML=pending.map(d=>`
    <div style="background:#f7f6f2;border-radius:14px;padding:14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:14px;font-weight:700;color:#2c2c2a">${d.name||'Debt'}</div>
          <div style="font-size:12px;color:#888">Minimum: R${Number(d.min_payment||0).toLocaleString('en-ZA')}/mo</div>
        </div>
        <div style="font-size:14px;font-weight:800;color:#c62828">R${Number(d.balance||0).toLocaleString('en-ZA')}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="quickConfirmPayment('${d.id}','${(d.name||'').replace(/'/g,"\\'")}',${Number(d.min_payment||0)},${Number(d.balance||0)},${targetYear},${targetMonth})" style="flex:2;padding:10px;background:#1a7a4a;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">✅ Paid R${Number(d.min_payment||0).toLocaleString('en-ZA')}</button>
        <button onclick="quickMissedPayment('${d.id}',${targetYear},${targetMonth})" style="flex:1;padding:10px;background:#fdecea;color:#a32d2d;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">❌ Missed</button>
      </div>
    </div>`).join('');
  ov.style.display='flex';
}

async function quickConfirmPayment(debtId,debtName,minPay,bal,year,month){
  const newBal=Math.max(0,bal-minPay);
  const monthKey=`rw_paid_${debtId}_${year}_${month}`;
  localStorage.setItem(monthKey,'paid:'+minPay);
  try{
    await sbP('debt_payments',{tester_id:user.id,debt_id:debtId,amount:minPay,note:'confirmed via payday checkin',paid_at:new Date().toISOString()});
    await sbPatch(`debts?id=eq.${debtId}`,{balance:newBal});
    const idx=debts.findIndex(d=>d.id===debtId);
    if(idx>=0) debts[idx].balance=newBal;
  }catch{}
  // Refresh the payday checkin list
  const now=new Date();
  const mode=year<now.getFullYear()||(year===now.getFullYear()&&month<now.getMonth()+1)?'prev':'current';
  showPaydayCheckin(mode);
}

async function quickMissedPayment(debtId,year,month){
  const monthKey=`rw_paid_${debtId}_${year}_${month}`;
  localStorage.setItem(monthKey,'missed');
  try{ await sbP('debt_payments',{tester_id:user.id,debt_id:debtId,amount:0,note:'missed - confirmed via payday checkin',paid_at:new Date().toISOString()}); }catch{}
  const now=new Date();
  const mode=year<now.getFullYear()||(year===now.getFullYear()&&month<now.getMonth()+1)?'prev':'current';
  showPaydayCheckin(mode);
}

function closePaydayCheckin(markDone=false){
  const ov=document.getElementById('payday-checkin-overlay');
  if(ov) ov.style.display='none';
  // Only mark done if explicitly all debts confirmed — not just on dismiss
  if(markDone){
    const now=new Date();
    const monthKey=`rw_payday_checkin_${now.getFullYear()}_${now.getMonth()+1}`;
    localStorage.setItem(monthKey,'done');
  }
}

// ── Income Check-in (every 3 months) ─────────────────────────
function maybeShowIncomeCheckin(){
  if(!user?.id) return;
  const lastCheckin=localStorage.getItem('rw_income_checkin_date');
  const now=Date.now();
  const threeMonths=90*24*60*60*1000;
  if(lastCheckin&&(now-Number(lastCheckin))<threeMonths) return;
  // Don't show on same day as other prompts
  const lastPopup=localStorage.getItem('rw_last_popup');
  if(lastPopup&&(now-Number(lastPopup))<86400000) return;
  setTimeout(()=>{
    const ov=document.getElementById('income-checkin-overlay');
    const el=document.getElementById('income-checkin-current');
    if(el) el.textContent='R'+Number(user.income_amount||0).toLocaleString('en-ZA');
    if(ov) ov.style.display='flex';
    localStorage.setItem('rw_last_popup',now.toString());
  },5000);
}

async function confirmIncomeUnchanged(){
  localStorage.setItem('rw_income_checkin_date',Date.now().toString());
  try{ await sbPatch(`beta_testers?id=eq.${user.id}`,{last_income_checkin:new Date().toISOString()}); }catch{}
  closeIncomeCheckin();
  showToast('✅ Income confirmed — budget stays accurate');
}

function closeIncomeCheckin(){
  const ov=document.getElementById('income-checkin-overlay');
  if(ov) ov.style.display='none';
}

// ── Monthly Needs Check-in (every 3 months) ──────────────────
function maybeShowNeedsCheckin(){
  if(!user?.id) return;
  const lastCheckin=localStorage.getItem('rw_needs_checkin_date');
  const now=Date.now();
  const threeMonths=90*24*60*60*1000;
  if(lastCheckin&&(now-Number(lastCheckin))<threeMonths) return;
  if(!localStorage.getItem('rw_needs_setup_done')) return; // hasn't set up needs yet
  const lastPopup=localStorage.getItem('rw_last_popup');
  if(lastPopup&&(now-Number(lastPopup))<86400000) return;
  setTimeout(()=>{
    const ov=document.getElementById('needs-checkin-overlay');
    const list=document.getElementById('needs-checkin-list');
    const needs=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
    if(!Object.keys(needs).length) return;
    if(list){
      list.innerHTML=Object.entries(needs).map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0efe9">
          <div style="font-size:13px;color:#2c2c2a;text-transform:capitalize">${k}</div>
          <div style="font-size:13px;font-weight:700;color:#1a5c35">R${Number(v).toLocaleString('en-ZA')}/mo</div>
        </div>`).join('');
    }
    if(ov) ov.style.display='flex';
    localStorage.setItem('rw_last_popup',now.toString());
  },7000);
}

async function confirmNeedsUnchanged(){
  localStorage.setItem('rw_needs_checkin_date',Date.now().toString());
  // Write monthly confirmation key — required for breakdown unlock
  const _nc=new Date();
  localStorage.setItem(`rw_needs_confirmed_${_nc.getFullYear()}_${_nc.getMonth()+1}`,'confirmed:'+new Date().toISOString());
  try{ await sbPatch(`beta_testers?id=eq.${user.id}`,{last_needs_checkin:new Date().toISOString()}); }catch{}
  closeNeedsCheckin();
  showToast('✅ Monthly costs confirmed — budget stays accurate');
  // Ask about debt before completing breakdown
  setTimeout(showDebtQuestion, 400);
}

function closeNeedsCheckin(){
  const ov=document.getElementById('needs-checkin-overlay');
  if(ov) ov.style.display='none';
}

// ── Debt Question (shown after needs confirmation) ────────────
function showDebtQuestion(){
  const hasDebts=debts&&debts.length>0;
  if(hasDebts){
    // User already has debts — go straight to completion
    checkBreakdownUnlock();
    return;
  }
  const ov=document.getElementById('debt-question-overlay');
  if(ov) ov.style.display='flex';
}

function debtQuestionNo(){
  // No debt — mark debt step done and complete breakdown
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  localStorage.setItem(`rw_payday_checkin_${y}_${m}`,'done');
  const ov=document.getElementById('debt-question-overlay');
  if(ov) ov.style.display='none';
  checkBreakdownUnlock();
}

function debtQuestionYes(){
  // Has debt — close overlay and send to debt tab
  const ov=document.getElementById('debt-question-overlay');
  if(ov) ov.style.display='none';
  // Show instruction overlay then go to debt tab
  const instr=document.getElementById('debt-instruction-overlay');
  if(instr) instr.style.display='flex';
}

function goToDebtTab(){
  const instr=document.getElementById('debt-instruction-overlay');
  if(instr) instr.style.display='none';
  // Use the app's native tab switcher
  if(typeof switchTab==='function') switchTab('debt');
}



// ── Quick Income Edit ─────────────────────────────────────────
function openQuickEditIncome(){
  const ov=document.getElementById('income-edit-overlay');
  const inp=document.getElementById('quick-income-input');
  if(ov) ov.style.display='flex';
  if(inp){ inp.value=Number(user?.income_amount||0)||''; inp.focus(); }
}
function closeQuickEditIncome(){
  const ov=document.getElementById('income-edit-overlay');
  if(ov) ov.style.display='none';
}
async function saveQuickIncome(){
  const val=Number(document.getElementById('quick-income-input')?.value||0);
  if(!val||val<100){ showToast('⚠️ Enter a valid income amount'); return; }
  if(!user?.id) return;
  user.income_amount=val;
  localStorage.setItem('rw_user',JSON.stringify(user));
  try{
    await sbPatch(`beta_testers?id=eq.${user.id}`,{income_amount:val});
    showToast('✅ Income updated');
  }catch{ showToast('✅ Income updated (syncing...)'); }
  closeQuickEditIncome();
  // Reload debts then re-render with new income
  sbG(`debts?tester_id=eq.${user.id}&order=balance.asc`).then(d=>{debts=d||[];renderDash();}).catch(()=>renderDash());
}

// ── Expense Search ────────────────────────────────────────────
function openSearch(){
  const ov=document.getElementById('search-overlay');
  if(ov){ ov.style.display='flex'; }
  setTimeout(()=>document.getElementById('search-input')?.focus(),100);
}
function closeSearch(){
  const ov=document.getElementById('search-overlay');
  if(ov) ov.style.display='none';
  const inp=document.getElementById('search-input');
  if(inp) inp.value='';
}
function renderSearchResults(){
  const query=(document.getElementById('search-input')?.value||'').toLowerCase().trim();
  const countEl=document.getElementById('search-count');
  const resultsEl=document.getElementById('search-results');
  if(!resultsEl) return;
  if(!query){ countEl.textContent='Type to search'; resultsEl.innerHTML=''; return; }
  const matches=expenses.filter(e=>{
    const cat=(e.category||'').toLowerCase();
    const note=(e.note||'').toLowerCase();
    const amt=String(e.amount||'');
    return cat.includes(query)||note.includes(query)||amt.includes(query);
  });
  countEl.textContent=`${matches.length} result${matches.length!==1?'s':''}`;
  if(!matches.length){
    resultsEl.innerHTML=`<div style="text-align:center;padding:40px 20px;color:#888780"><div style="font-size:32px;margin-bottom:12px">🔍</div><div style="font-size:14px">No expenses matching "${query}"</div></div>`;
    return;
  }
  const CATS_MAP={Groceries:'🛒',Transport:'🚗',Electricity:'⚡',Airtime:'📱','Eating out':'🍽️',Entertainment:'🎬',Medical:'💊',Clothing:'👕',Savings:'💰',Education:'📚',Insurance:'🛡️',Rent:'🏠',Other:'📦'};
  resultsEl.innerHTML=matches.map(e=>{
    const d=new Date(e.logged_at||e.created_at);
    const dateStr=d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});
    const emoji=CATS_MAP[e.category]||'📦';
    return`<div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;border-radius:12px;background:#f7f6f2;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:#2c2c2a">${e.category||'Other'}</div>
        <div style="font-size:12px;color:#888780;margin-top:2px">${e.note||''} · ${dateStr}</div>
      </div>
      <div style="font-size:15px;font-weight:800;color:#a32d2d;flex-shrink:0">−R${Number(e.amount||0).toLocaleString('en-ZA')}</div>
    </div>`;
  }).join('');
}

function showPrivacyPolicy(){
  const sheet=document.createElement('div');
  sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  sheet.innerHTML=`<div style="background:#fff;border-radius:24px 24px 0 0;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto">
    <div style="font-size:17px;font-weight:800;color:#1a5c35;margin-bottom:12px">Privacy Policy</div>
    <div style="font-size:13px;color:#444;line-height:1.7">
      <strong>What we collect:</strong> Your name, email, income, expenses, debts, savings goals, and device type.<br><br>
      <strong>Why we collect it:</strong> To provide the MyRandWise budgeting and debt management service.<br><br>
      <strong>What we never do:</strong> We never sell your data. We never use your data for advertising. We never share it with third parties without your consent.<br><br>
      <strong>Your rights (POPIA):</strong> You have the right to access, correct, or delete your data at any time. Email support@myrandwise.co.za to exercise these rights.<br><br>
      <strong>Data storage:</strong> Your data is stored securely on Supabase servers (EU-West). All connections are encrypted (HTTPS/TLS).<br><br>
      <strong>Retention:</strong> Your data is kept for as long as your account is active. Deleting your account removes all personal data within 30 days.<br><br>
      <strong>Contact:</strong> support@myrandwise.co.za
    </div>
    <button onclick="this.closest('div').parentElement.remove()" style="width:100%;padding:12px;background:#1a5c35;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:16px">Close</button>
  </div>`;
  document.body.appendChild(sheet);
}
function showTerms(){
  const sheet=document.createElement('div');
  sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  sheet.innerHTML=`<div style="background:#fff;border-radius:24px 24px 0 0;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto">
    <div style="font-size:17px;font-weight:800;color:#1a5c35;margin-bottom:12px">Terms of Service</div>
    <div style="font-size:13px;color:#444;line-height:1.7">
      <strong>Service:</strong> MyRandWise provides personal budgeting and financial planning tools. We are not a registered financial services provider. Nothing in the app constitutes financial advice.<br><br>
      <strong>Your account:</strong> You are responsible for keeping your password secure. You may not share your account.<br><br>
      <strong>Payments:</strong> Subscriptions are billed monthly or annually. Cancellations take effect at the end of the billing period. No refunds for partial periods.<br><br>
      <strong>Free trial:</strong> The 14-day Pro trial automatically reverts to Free tier unless you subscribe. No charge during trial.<br><br>
      <strong>Accuracy:</strong> MyRandWise calculations are based on data you provide. We are not responsible for decisions made based on app data.<br><br>
      <strong>Termination:</strong> We reserve the right to suspend accounts that violate these terms.<br><br>
      <strong>Governing law:</strong> These terms are governed by South African law.<br><br>
      <strong>Contact:</strong> support@myrandwise.co.za
    </div>
    <button onclick="this.closest('div').parentElement.remove()" style="width:100%;padding:12px;background:#1a5c35;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:16px">Close</button>
  </div>`;
  document.body.appendChild(sheet);
}

// ── App Rating Prompt ─────────────────────────────────────────
function checkAppRating(){
  if(localStorage.getItem('rw_rated')||localStorage.getItem('rw_rate_never')) return;
  const sessions=Number(localStorage.getItem('rw_session_count')||0)+1;
  localStorage.setItem('rw_session_count',sessions);
  // Show after 5 sessions
  if(sessions===5||sessions===10||sessions===20){
    setTimeout(()=>{
      const ov=document.getElementById('rating-overlay');
      if(ov) ov.style.display='flex';
    },6000);
  }
}
function openAppRating(){
  localStorage.setItem('rw_rated','1');
  const ov=document.getElementById('rating-overlay');
  if(ov) ov.style.display='none';
  // Show in-app star rating sheet instead of opening APK
  showInAppRating();
}
function showInAppRating(){
  const existing=document.getElementById('star-rating-sheet');
  if(existing) existing.remove();
  const sheet=document.createElement('div');
  sheet.id='star-rating-sheet';
  sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  sheet.innerHTML=`
    <div style="background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;text-align:center">
      <div style="width:40px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 20px"></div>
      <div style="font-size:32px;margin-bottom:8px">⭐</div>
      <div style="font-size:18px;font-weight:800;color:#1a5c35;margin-bottom:6px">Enjoying MyRandWise?</div>
      <div style="font-size:14px;color:#666;margin-bottom:20px;line-height:1.5">Your feedback helps us improve and reach more South Africans who need this.</div>
      <div id="star-row" style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;font-size:36px">
        ${[1,2,3,4,5].map(i=>`<span onclick="selectStar(${i})" style="cursor:pointer;opacity:.4;transition:all .2s" id="star-${i}">★</span>`).join('')}
      </div>
      <textarea id="star-comment" placeholder="Optional: Tell us what you love or what we can improve..." style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;resize:none;height:70px;font-family:inherit;box-sizing:border-box;margin-bottom:16px"></textarea>
      <button onclick="submitRating()" style="width:100%;padding:14px;background:#1a5c35;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px">Submit Feedback</button>
      <button onclick="document.getElementById('star-rating-sheet').remove()" style="width:100%;padding:10px;background:none;color:#999;border:none;font-size:14px;cursor:pointer;font-family:inherit">Maybe later</button>
    </div>`;
  document.body.appendChild(sheet);
  window._selectedStar=0;
}
function selectStar(n){
  window._selectedStar=n;
  for(let i=1;i<=5;i++){
    const el=document.getElementById('star-'+i);
    if(el) el.style.opacity=i<=n?'1':'0.4';
  }
}
async function submitRating(){
  const stars=window._selectedStar||0;
  const comment=document.getElementById('star-comment')?.value||'';
  if(stars===0){showToast('Please select a star rating first');return;}
  try{
    await sbP('bug_reports',{tester_id:user?.id,type:'rating',message:`${stars} stars: ${comment}`,created_at:new Date().toISOString()});
  }catch(e){}
  document.getElementById('star-rating-sheet')?.remove();
  if(stars>=4){
    showToast('🌟 Thank you! Your support means everything to us.');
  } else {
    showToast('Thank you for your honest feedback — we will improve!');
  }
}
function dismissRating(){
  const ov=document.getElementById('rating-overlay');
  if(ov) ov.style.display='none';
}
function neverRating(){
  localStorage.setItem('rw_rate_never','1');
  const ov=document.getElementById('rating-overlay');
  if(ov) ov.style.display='none';
}

// ── Referral Home Card ────────────────────────────────────────
function initReferralCard(){
  const card=document.getElementById('referral-home-card');
  if(!card||!user?.referral_code) return;
  // Show on every 3rd session
  const sessions=Number(localStorage.getItem('rw_session_count')||0);
  if(sessions%3===0) card.style.display='block';
  else card.style.display='none';
}
function shareReferral(){
  const code=user?.referral_code||'';
  const name=user?.name?.split(' ')[0]||'a friend';
  const refUrl=`https://myrandwise.co.za/refer.html?ref=${code}`;
  const msg=`${name} invited you to MyRandWise 🌱\n\nMost of us get paid on the 25th and wonder where it all went by the 10th. MyRandWise was built to fix that — for real South African life.\n\nTry it free for 14 days — no card needed.\n👉 ${refUrl}`;
  if(navigator.share){
    navigator.share({title:'MyRandWise 🌱',text:msg,url:refUrl}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(msg).then(()=>showToast('✅ Link copied!')).catch(()=>{
      window.open('https://wa.me/?text='+encodeURIComponent(msg));
    });
  }
}
function dismissReferral(){
  var card = document.getElementById('referral-home-card');
  if(card){ card.style.display = 'none'; localStorage.setItem('refDismissed', Date.now()); }
}
(function(){
  var dismissed = localStorage.getItem('refDismissed');
  if(dismissed && Date.now() - parseInt(dismissed) < 7*24*60*60*1000){
    var card = document.getElementById('referral-home-card');
    if(card) card.style.display = 'none';
  }
})();


// ── Monthly Check-in ──────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BFuQZpJQzod8ZpJjIkn-RTGmpM9Xrgop7R3EjUPsbPCuR3FECzqGchLLTXdyPgZKB8M1Xy2XQS9MGSp7Cgb82Gg';

function maybeShowCheckin(){
  if(!user?.id) return;
  const now=new Date();
  const monthKey=`rw_checkin_${now.getFullYear()}_${now.getMonth()+1}`;
  if(now.getDate() < 2) return;
  if(localStorage.getItem(monthKey)) return;
  // Retry logic — if they skipped "why" 2 days ago, ask again once
  const skippedWhy=localStorage.getItem('rw_checkin_skipped_why');
  if(skippedWhy){
    const skippedDaysAgo=(Date.now()-Number(skippedWhy))/86400000;
    if(skippedDaysAgo < 2) return; // wait 2 days
    if(skippedDaysAgo > 5) { localStorage.removeItem('rw_checkin_skipped_why'); return; } // gave up after 5 days
    // Show step 2 directly (retry asking why)
    const ov=document.getElementById('checkin-overlay');
    if(ov){
      document.getElementById('checkin-step1').style.display='none';
      document.getElementById('checkin-step2').style.display='block';
      ov.style.display='flex';
    }
    return;
  }
  const lastPopup=localStorage.getItem('rw_last_popup');
  if(lastPopup&&(Date.now()-Number(lastPopup))<86400000) return;
  setTimeout(()=>{
    const ov=document.getElementById('checkin-overlay');
    if(ov){
      document.getElementById('checkin-step1').style.display='block';
      document.getElementById('checkin-step2').style.display='none';
      ov.style.display='flex';
    }
  },3500);
}

async function submitCheckin(feeling){
  if(feeling==='worse'){
    // Show step 2 — ask why
    document.getElementById('checkin-step1').style.display='none';
    document.getElementById('checkin-step2').style.display='block';
    // Save the "worse" feeling now, reason comes next
    window._pendingCheckinFeeling='worse';
    return;
  }
  await _saveCheckin(feeling, null);
  const ov=document.getElementById('checkin-overlay');
  if(ov) ov.style.display='none';
  localStorage.setItem('rw_last_popup', Date.now().toString());
  if(feeling==='better') showToast('🌱 Great to hear! Keep going.');
  else showToast('👍 Steady progress is still progress.');
}

async function submitWorseReason(reason){
  await _saveCheckin('worse', reason);
  const ov=document.getElementById('checkin-overlay');
  if(ov) ov.style.display='none';
  localStorage.removeItem('rw_checkin_skipped_why');
  localStorage.setItem('rw_last_popup', Date.now().toString());
  // Personalised response based on reason
  const responses={
    unexpected:'💚 Unexpected expenses happen. Check your weekly budget to recover.',
    income:'💚 Variable income is hard. Your snowball plan still works — even at minimum payments.',
    debt:'💚 Debt can feel heavy. Open your Debt tab — your payoff plan is still on track.',
    overspent:'💚 It happens. Next week is a fresh start. Your budget resets Monday.'
  };
  showToast(responses[reason]||'💚 Thank you for sharing. We\'re here to help.');
  if(reason==='debt') setTimeout(()=>switchTab('debt'),1500);
  // Send alert to owner
  sendOwnerAlert(`Check-in: ${user?.name||'A user'} is feeling worse this month. Reason: ${reason}. Consider reaching out.`,'moderate');
}

async function skipWorseReason(){
  // Record that they skipped — retry in 2 days
  await _saveCheckin('worse', 'skipped');
  localStorage.setItem('rw_checkin_skipped_why', Date.now().toString());
  localStorage.setItem('rw_last_popup', Date.now().toString());
  const ov=document.getElementById('checkin-overlay');
  if(ov) ov.style.display='none';
  showToast('💚 No worries. We\'ll check in again soon.');
  // Still alert owner
  sendOwnerAlert(`Check-in: ${user?.name||'A user'} is feeling worse this month but skipped the reason. Consider reaching out personally.`,'moderate');
}

async function skipCheckin(){
  // Record skip — retry in 2 days
  localStorage.setItem('rw_checkin_skipped_why', Date.now().toString());
  localStorage.setItem('rw_last_popup', Date.now().toString());
  const ov=document.getElementById('checkin-overlay');
  if(ov) ov.style.display='none';
}

async function _saveCheckin(feeling, reason){
  const now=new Date();
  const monthKey=`rw_checkin_${now.getFullYear()}_${now.getMonth()+1}`;
  localStorage.setItem(monthKey, feeling+(reason?':'+reason:''));
  if(user?.id){
    try{
      await sbP('monthly_checkins',{
        tester_id:user.id,
        feeling,
        reason: reason||null,
        month:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
      });
    }catch(e){console.warn('Check-in save failed:',e);}
  }
}

// ── Story Consent ─────────────────────────────────────────────
async function toggleStoryConsent(){
  if(!user?.id) return;
  const current=user.story_consent||false;
  const newVal=!current;
  user.story_consent=newVal;
  localStorage.setItem('rw_user',JSON.stringify(user));
  try{
    await sbPatch(`beta_testers?id=eq.${user.id}`,{
      story_consent:newVal,
      story_consent_at:newVal?new Date().toISOString():null
    });
  }catch(e){console.warn('Story consent save failed:',e);}
  initStoryConsent();
  showToast(newVal?'🌱 Thank you — your story can inspire others':'Story sharing turned off');
}

function initStoryConsent(){
  const tog=document.getElementById('story-consent-toggle');
  const label=document.getElementById('story-consent-label');
  const on=user?.story_consent===true;
  if(tog) tog.style.background=on?'#1a7a4a':'#ccc';
  if(label) label.textContent=on?'✅ Happy to share my story':'Not sharing yet';
}

// ── Monthly Needs Supabase Sync ───────────────────────────────
async function loadMonthlyNeedsFromSupabase(){
  if(!user?.id) return;
  try{
    const rows=await sbG(`beta_testers?id=eq.${user.id}&select=monthly_needs,debit_orders,income_amount,pay_day,salary_last_confirmed,salary_confirmed_key`);
    const row=rows?.[0];

    // ── Restore salary confirmation from Supabase if localStorage missing ──
    const salaryKey=row?.salary_confirmed_key;
    if(salaryKey && !localStorage.getItem(salaryKey)){
      localStorage.setItem(salaryKey,'confirmed:'+row.salary_last_confirmed);
    }
    const localDOs=JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
    if(localDOs.length===0 && row?.debit_orders?.length>0){
      localStorage.setItem('rw_debit_orders',JSON.stringify(row.debit_orders));
      debitOrders=row.debit_orders;
    } else if(localDOs.length>0 && (!row?.debit_orders||row.debit_orders.length===0)){
      // Push local to Supabase if Supabase is empty
      sbPatch(`beta_testers?id=eq.${user.id}`,{debit_orders:localDOs}).catch(()=>{});
    }

    // ── Restore monthly needs ──
    const dbNeeds=row?.monthly_needs;
    // Don't overwrite if user already confirmed needs this month — local is freshest
    const _nowN=new Date(),_needsKey=`rw_needs_confirmed_${_nowN.getFullYear()}_${_nowN.getMonth()+1}`;
    const _needsConfirmedThisMonth=(localStorage.getItem(_needsKey)||'').startsWith('confirmed:');
    if(dbNeeds&&typeof dbNeeds==='object'&&!_needsConfirmedThisMonth){
      if(dbNeeds.preset&&Object.keys(dbNeeds.preset).length>0){
        localStorage.setItem('rw_monthly_needs',JSON.stringify(dbNeeds.preset));
        localStorage.setItem('rw_needs_setup_done','1');
      }
      if(dbNeeds.custom&&dbNeeds.custom.length>0){
        localStorage.setItem('rw_monthly_needs_custom',JSON.stringify(dbNeeds.custom));
      }
    } else if(!dbNeeds||typeof dbNeeds!=='object'){
      const localNeeds=JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
      const localCustom=JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
      if(Object.keys(localNeeds).length>0){
        await sbPatch(`beta_testers?id=eq.${user.id}`,{monthly_needs:{preset:localNeeds,custom:localCustom}}).catch(()=>{});
      }
    }
  }catch(e){console.warn('Could not load data from Supabase:',e);}
}

// ── Push Notifications (Web Push / VAPID) ─────────────────────
function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=window.atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}

// Push functions defined above

// ── Push Permission Prompt ────────────────────────────────────
function maybeShowPushPrompt(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted') return; // already enabled
  if(Notification.permission === 'denied') return; // user blocked it
  if(localStorage.getItem('rw_push_prompt_seen')) return; // already shown
  if(!user?.id) return;
  // Show 5 seconds after dashboard loads, once ever
  setTimeout(()=>{
    const ov = document.getElementById('push-prompt-overlay');
    if(ov) ov.style.display = 'flex';
  }, 5000);
}

async function enablePushFromPrompt(){
  const ov = document.getElementById('push-prompt-overlay');
  if(ov) ov.style.display = 'none';
  localStorage.setItem('rw_push_prompt_seen','1');
  
  // Check if permission was previously denied
  if(Notification.permission === 'denied'){
    showPushBlockedGuide();
    return;
  }
  
  try {
    await enablePushNotifications();
  } catch(e) {
    // If blocked by overlay or other issue, show manual guide
    showPushBlockedGuide();
  }
}

function showPushBlockedGuide(){
  // Show a simple in-app guide instead of failing silently
  const msg = `To enable notifications:\n\n1. Tap the 🔒 or ⓘ in your browser address bar\n2. Tap Site settings\n3. Tap Notifications → Allow\n\nThen come back to the app.`;
  showToast('ℹ️ To enable: tap the lock icon in your browser → Site settings → Notifications → Allow', 6000);
}

function dismissPushPrompt(){
  const ov = document.getElementById('push-prompt-overlay');
  if(ov) ov.style.display = 'none';
  localStorage.setItem('rw_push_prompt_seen','1');
}


// Close on backdrop tap
document.addEventListener('click',e=>{
  const ppOv=document.getElementById('push-prompt-overlay');
  if(e.target===ppOv) dismissPushPrompt();
  const ieOv=document.getElementById('income-edit-overlay');
  if(e.target===ieOv) closeQuickEditIncome();
  const puOv=document.getElementById('premium-upgrade-overlay');
  if(e.target===puOv) closePremiumSheet();
  const rOv=document.getElementById('rating-overlay');
  if(e.target===rOv) dismissRating();
  const ccOv=document.getElementById('custom-cat-overlay');
  if(e.target===ccOv) closeCustomCatSheet();
  const msOv=document.getElementById('monthly-summary-overlay');
  if(e.target===msOv) closeMonthlySummary();
});



function renderSeeAllFilters(){
  const cats = [...new Set(expenses.map(e=>e.category))].filter(Boolean);
  const el = document.getElementById('sa-filters');
  el.innerHTML = ['All',...cats].map(c=>`
    <button onclick="saFilter='${c==='All'?'all':c}';renderSeeAllFilters();renderSeeAll()"
      style="padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;border:none;
      background:${(c==='All'&&saFilter==='all')||(saFilter===c)?'#1a5c35':'#f0f0ec'};
      color:${(c==='All'&&saFilter==='all')||(saFilter===c)?'#fff':'#555'}">${c}</button>
  `).join('');
}

function renderSeeAll(){
  const search = (document.getElementById('sa-search')?.value||'').toLowerCase();
  let filtered = expenses;
  if(saFilter !== 'all') filtered = filtered.filter(e=>e.category===saFilter);
  if(search) filtered = filtered.filter(e=>(e.category||'').toLowerCase().includes(search)||(e.note||'').toLowerCase().includes(search));

  // Summary
  const total = filtered.reduce((s,e)=>s+Number(e.amount),0);
  const avg = filtered.length ? Math.round(total/filtered.length) : 0;
  document.getElementById('sa-count').textContent = expenses.length+' total';
  document.getElementById('sa-total').textContent = 'R'+total.toLocaleString('en-ZA');
  document.getElementById('sa-txn-count').textContent = filtered.length;
  document.getElementById('sa-avg').textContent = 'R'+avg.toLocaleString('en-ZA');

  // Group by day
  const groups = {};
  filtered.forEach(e=>{
    const d = new Date(e.logged_at||e.created_at);
    const key = d.toDateString();
    if(!groups[key]) groups[key] = {date:d, items:[]};
    groups[key].items.push(e);
  });

  const cm = CATS.reduce((m,c)=>{m[c.id]=c;return m;},{});
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();

  const el = document.getElementById('sa-list');
  if(!filtered.length){
    el.innerHTML='<div style="text-align:center;padding:40px 20px;color:#888"><div style="font-size:32px;margin-bottom:12px">🔍</div><div style="font-size:15px;font-weight:600">No transactions found</div></div>';
    return;
  }

  el.innerHTML = Object.keys(groups).sort((a,b)=>new Date(b)-new Date(a)).map(key=>{
    const g = groups[key];
    const dLabel = key===today?'Today':key===yesterday?'Yesterday':g.date.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'});
    const dayTotal = g.items.reduce((s,e)=>s+Number(e.amount),0);
    const rows = g.items.map(e=>{
      const c = cm[e.category_id]||{e:'📦',c:'#5f5e5a'};
      const t = new Date(e.logged_at||e.created_at).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
      return`<div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid #f5f5f0">
        <div style="width:40px;height:40px;border-radius:12px;background:${c.c}20;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${e.emoji||c.e}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600;color:#111">${e.category}</div>
          <div style="font-size:11px;color:#888">${e.note||t}</div>
        </div>
        <div style="font-size:14px;font-weight:700;color:#c0392b">-R${Number(e.amount).toLocaleString('en-ZA')}</div>
        <button onclick="editExp('${e.id}')" style="background:none;border:none;font-size:13px;cursor:pointer;color:#888;padding:4px">✏️</button>
        <button onclick="delExp('${e.id}');renderSeeAll();" style="background:none;border:none;font-size:14px;cursor:pointer;color:#ccc;padding:4px">×</button>
      </div>`;
    }).join('');
    return`<div>
      <div style="padding:8px 14px;background:#f0f0ec;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;display:flex;justify-content:space-between;position:sticky;top:0">
        <span>${dLabel}</span><span>-R${dayTotal.toLocaleString('en-ZA')}</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

function addDebtAsDebitOrder(id, name, amount){
  const dos=JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
  if(dos.find(d=>d.name===name)){showToast('Already in debit orders');return;}
  dos.push({name, amount:Number(amount), addedFromDebt:true});
  localStorage.setItem('rw_debit_orders',JSON.stringify(dos));
  if(user?.id) sbPatch(`beta_testers?id=eq.${user.id}`,{debit_orders:dos}).catch(()=>{});
  debitOrders=dos;
  showToast('✅ '+name+' added as debit order');
  if(id) loadDebtsPWA();
  renderDebitOrdersList();
  renderDash();
}

// ══ MONTHLY NEEDS SETUP ═════════════════════════════════════════
const NEEDS_PRESETS = [
  {id:'electricity', label:'Electricity / Water', emoji:'⚡', placeholder:'e.g. R1 600'},
  {id:'groceries',   label:'Groceries',           emoji:'🛒', placeholder:'e.g. R3 500'},
  {id:'transport',   label:'Transport / Petrol',  emoji:'🚗', placeholder:'e.g. R2 000'},
  {id:'airtime',     label:'Airtime / Data',      emoji:'📱', placeholder:'e.g. R300'},
  {id:'school',      label:'School / Education',  emoji:'🎓', placeholder:'e.g. R1 200'},
  {id:'medical',     label:'Medical',             emoji:'🏥', placeholder:'e.g. R500'},
];
let customNeeds = [];

function showMonthlyNeedsSetup(){
  const overlay = document.getElementById('needs-overlay');
  overlay.style.display = 'flex';
  
  // Load existing saved needs
  const saved = JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}');
  customNeeds = JSON.parse(localStorage.getItem('rw_monthly_needs_custom')||'[]');
  
  // Render preset list
  const list = document.getElementById('needs-list');
  list.innerHTML = NEEDS_PRESETS.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f9f9f7;border-radius:12px;border:1.5px solid #e8e8e0">
      <div style="font-size:22px;width:32px;text-align:center">${p.emoji}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:#111">${p.label}</div>
        <div style="font-size:11px;color:#888">${p.placeholder}</div>
      </div>
      <div style="position:relative">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#888">R</span>
        <input type="number" id="need_${p.id}" value="${saved[p.id]||''}" oninput="updateNeedsTotal()"
          placeholder="0"
          style="width:90px;padding:8px 8px 8px 24px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-weight:600;font-family:inherit;text-align:right">
      </div>
    </div>
  `).join('');
  
  renderCustomNeedsList();
  updateNeedsTotal();
}

function renderCustomNeedsList(){
  const el = document.getElementById('custom-needs-list');
  el.innerHTML = customNeeds.map((n,i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f0faf4;border-radius:10px;border:1px solid #d1ead9">
      <div style="flex:1;font-size:14px;font-weight:600;color:#111">${n.label}</div>
      <div style="font-size:14px;font-weight:700;color:#1a5c35">R${Number(n.amount).toLocaleString('en-ZA')}/mo</div>
      <button onclick="removeCustomNeed(${i})" style="background:none;border:none;color:#ccc;font-size:16px;cursor:pointer">×</button>
    </div>
  `).join('');
  updateNeedsTotal();
}

function addCustomNeed(){
  const name = document.getElementById('needs-custom-name').value.trim();
  const amount = Number(document.getElementById('needs-custom-amount').value);
  if(!name || !amount){ showToast('Enter a name and amount'); return; }
  customNeeds.push({label:name, amount});
  document.getElementById('needs-custom-name').value = '';
  document.getElementById('needs-custom-amount').value = '';
  renderCustomNeedsList();
}

function removeCustomNeed(i){
  customNeeds.splice(i,1);
  renderCustomNeedsList();
}

function updateNeedsTotal(){
  const presetTotal = NEEDS_PRESETS.reduce((s,p)=>{
    const v = Number(document.getElementById('need_'+p.id)?.value||0);
    return s+v;
  },0);
  const customTotal = customNeeds.reduce((s,n)=>s+Number(n.amount),0);
  const total = presetTotal + customTotal;
  
  document.getElementById('needs-total').textContent = 'R'+total.toLocaleString('en-ZA');
  
  // Preview weekly budget
  const inc = Number(user?.income_amount||0);
  const storedDOs = JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
  const manualDOs = storedDOs.filter(d=>!d.addedFromDebt);
  const doT = manualDOs.reduce((s,d)=>s+Number(d.amount||0),0);
  const debtT = (typeof debts!=='undefined'&&Array.isArray(debts))?debts.reduce((s,d)=>s+Number(d.min_payment||0),0):0;
  const wb = Math.round(Math.max(0, inc - doT - debtT - total) / 4);
  document.getElementById('needs-wb-preview').textContent = 'R'+wb.toLocaleString('en-ZA')+'/wk';
}

async function saveMonthlyNeeds(){
  const saved = {};
  NEEDS_PRESETS.forEach(p=>{
    const v = Number(document.getElementById('need_'+p.id)?.value||0);
    if(v>0) saved[p.id] = v;
  });
  // Save to localStorage (immediate)
  localStorage.setItem('rw_monthly_needs', JSON.stringify(saved));
  localStorage.setItem('rw_monthly_needs_custom', JSON.stringify(customNeeds));
  localStorage.setItem('rw_needs_setup_done', '1');
  // Save to Supabase (syncs across devices)
  if(user?.id){
    try{
      await sbPatch(`beta_testers?id=eq.${user.id}`, {
        monthly_needs: { preset: saved, custom: customNeeds }
      });
    }catch(e){ /* Supabase sync failed — localStorage already saved, will retry on next load */ }
  }
  document.getElementById('needs-overlay').style.display = 'none';
  showToast('✅ Monthly needs saved — budget updated');
  renderDash();
  // Mark needs as confirmed for this month
  const _nc=new Date();
  localStorage.setItem(`rw_needs_confirmed_${_nc.getFullYear()}_${_nc.getMonth()+1}`,'confirmed:'+new Date().toISOString());
  // Ask about debt before completing breakdown
  setTimeout(showDebtQuestion, 400);
}

function skipMonthlyNeeds(){
  localStorage.setItem('rw_needs_setup_done', '1');
  document.getElementById('needs-overlay').style.display = 'none';
}


function checkNeedsSetup(){
  // Show for ALL users who haven't done this yet
  if(!localStorage.getItem('rw_needs_setup_done') && user?.id){
    setTimeout(()=>showMonthlyNeedsSetup(), 2000);
  }
}

// ── OTP Verification ─────────────────────────────────────────
let otpEmail = '';
function otpInput(el){
  el.classList.toggle('filled', el.value.length>0);
  if(el.value.length===1){
    const boxes=[...document.querySelectorAll('.otp-box')];
    const idx=boxes.indexOf(el);
    if(idx<boxes.length-1)boxes[idx+1].focus();
    // Auto-verify when all 6 filled
    if(boxes.every(b=>b.value.length===1))verifyOtp();
  }
}
function otpKey(e,el){
  if(e.key==='Backspace'&&!el.value){
    const boxes=[...document.querySelectorAll('.otp-box')];
    const idx=boxes.indexOf(el);
    if(idx>0){boxes[idx-1].focus();boxes[idx-1].value='';boxes[idx-1].classList.remove('filled');}
  }
}
function getOtpCode(){
  return [...document.querySelectorAll('.otp-box')].map(b=>b.value).join('');
}
async function verifyOtp(){
  const code=getOtpCode();
  if(code.length!==6){document.getElementById('otp-err').textContent='Please enter all 6 digits.';return;}
  const btn=document.getElementById('otp-btn');
  btn.disabled=true;btn.textContent='Verifying...';
  document.getElementById('otp-err').textContent='';
  try{
    const res=await fetch(SB+'/auth/v1/verify',{
      method:'POST',
      headers:{'apikey':AK,'Authorization':'Bearer '+AK,'Content-Type':'application/json'},
      body:JSON.stringify({type:'signup',email:otpEmail,token:code})
    });
    const data=await res.json();
    if(data.access_token){
      localStorage.setItem('rw_token',data.access_token);
      if(data.refresh_token)localStorage.setItem('rw_refresh',data.refresh_token);
      // Load user and go to dashboard
      const rows=await sbG(`beta_testers?email=eq.${encodeURIComponent(otpEmail)}&limit=1&select=*`);
      if(rows?.length){user=rows[0];localStorage.setItem('rw_user',JSON.stringify(user));}
      show('done');
    } else {
      document.getElementById('otp-err').textContent='Incorrect code. Please try again.';
      btn.disabled=false;btn.textContent='Verify →';
    }
  }catch(e){
    document.getElementById('otp-err').textContent='Verification failed. Please try again.';
    btn.disabled=false;btn.textContent='Verify →';
  }
}
async function resendOtp(){
  if(!otpEmail)return;
  try{
    await fetch(SB+'/auth/v1/resend',{
      method:'POST',
      headers:{'apikey':AK,'Authorization':'Bearer '+AK,'Content-Type':'application/json'},
      body:JSON.stringify({type:'signup',email:otpEmail})
    });
    document.getElementById('otp-err').textContent='';
    const msg=document.createElement('div');
    msg.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a7a4a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999';
    msg.textContent='New code sent! Check your inbox.';
    document.body.appendChild(msg);setTimeout(()=>msg.remove(),3000);
  }catch(e){}
}
function showOtpScreen(email){
  otpEmail=email;
  document.getElementById('otp-desc').textContent=`We sent a 6-digit code to ${email}. Enter it below to verify your account.`;
  document.querySelectorAll('.otp-box').forEach(b=>{b.value='';b.classList.remove('filled');});
  document.getElementById('otp-err').textContent='';
  show('verify-otp');
  setTimeout(()=>document.querySelector('.otp-box')?.focus(),300);
}

// ── Phone Number Popup ────────────────────────────────────────
function checkPhonePopup(){
  if(user && !user.phone){
    const dismissed=localStorage.getItem('rw_phone_dismissed');
    const dismissedAt=dismissed?new Date(dismissed):null;
    const daysSince=dismissedAt?(Date.now()-dismissedAt.getTime())/(1000*60*60*24):999;
    if(!dismissed||daysSince>7){
      const popup=document.getElementById('phone-popup');
      if(popup){popup.style.display='flex';setTimeout(()=>document.getElementById('popup-phone')?.focus(),300);}
    }
  }
}
function dismissPhonePopup(){
  localStorage.setItem('rw_phone_dismissed',new Date().toISOString());
  document.getElementById('phone-popup').style.display='none';
}
async function savePopupPhone(){
  const phone=document.getElementById('popup-phone').value.trim();
  const errEl=document.getElementById('popup-phone-err');
  if(!phone||phone.length<9){errEl.textContent='Please enter a valid cell number.';return;}
  errEl.textContent='';
  try{
    await fetch(SB+'/rest/v1/beta_testers?id=eq.'+user.id,{
      body:JSON.stringify({phone})
    });
    user.phone=phone;
    localStorage.setItem('rw_user',JSON.stringify(user));
    document.getElementById('phone-popup').style.display='none';
    const msg=document.createElement('div');
    msg.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a7a4a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999';
    msg.textContent='Cell number saved!';
    document.body.appendChild(msg);setTimeout(()=>msg.remove(),2500);
  }catch(e){errEl.textContent='Could not save. Please try again.';}
}

// ── Phone Number Formatting ───────────────────────────────────
function formatPhone(el){
  let v=el.value.replace(/\D/g,'');
  if(v.length<=3) el.value=v;
  else if(v.length<=6) el.value=v.slice(0,3)+' '+v.slice(3);
  else el.value=v.slice(0,3)+' '+v.slice(3,6)+' '+v.slice(6,10);
  ob.phone=el.value;
}

function editProfilePhone(){
  const current = user?.phone || '';
  const popup = document.getElementById('phone-popup');
  if(popup){
    document.getElementById('popup-phone').value = current;
    popup.style.display='flex';
    setTimeout(()=>document.getElementById('popup-phone')?.focus(),300);
  }
}

// ── Newsletter Subscribe Popup ────────────────────────────────
// Shows after first expense, respects snooze (7 days) and
// permanent decline. Subscribes via Supabase newsletter_subscribers
// table and sends welcome email via Edge Function.

function isNlSnoozed() {
  const snoozed = localStorage.getItem('rw_nl_snoozed_until');
  if (!snoozed) return false;
  return Date.now() < parseInt(snoozed);
}

function showNewsletterNudge() {
  const sheet = document.getElementById('nl-sheet');
  const ov    = document.getElementById('nl-ov');
  if (!sheet || !ov) return;
  // Reset to default content in case it was in a different state
  const body = document.getElementById('nl-body');
  if (body) body.innerHTML = `
    <div class="nl-icon">💌</div>
    <div class="nl-title">Free weekly money tips</div>
    <div class="nl-sub">
      Every Monday we send one practical tip built for South African life —
      no spam, no fluff, just real advice you can act on.
    </div>
    <div class="nl-perks">
      <div class="nl-perk">
        <div class="nl-perk-icon">📅</div>
        <span>One email every Monday at 8am</span>
      </div>
      <div class="nl-perk">
        <div class="nl-perk-icon">🇿🇦</div>
        <span>Built for South African budgets &amp; life stages</span>
      </div>
      <div class="nl-perk">
        <div class="nl-perk-icon">🔕</div>
        <span>Unsubscribe any time — one click, no questions</span>
      </div>
    </div>
    <button class="nl-btn-yes" onclick="subscribeNewsletter()">
      Yes, send me tips 🌱
    </button>
    <button class="nl-btn-later" onclick="dismissNewsletterNudge('later')">
      Maybe later
    </button>
    <button class="nl-btn-no" onclick="dismissNewsletterNudge('no')">
      No thanks
    </button>
  `;
  ov.classList.add('open');
  sheet.classList.add('open');
}

function closeNewsletterNudge() {
  document.getElementById('nl-sheet')?.classList.remove('open');
  document.getElementById('nl-ov')?.classList.remove('open');
}

function dismissNewsletterNudge(type) {
  closeNewsletterNudge();
  if (type === 'later') {
    // Snooze for 7 days — ask once more after that
    const snoozeCount = parseInt(localStorage.getItem('rw_nl_snooze_count') || '0');
    if (snoozeCount >= 1) {
      // Already snoozed once — treat as permanent decline
      localStorage.setItem('rw_nl_declined', '1');
    } else {
      localStorage.setItem('rw_nl_snoozed_until', String(Date.now() + 7 * 86400000));
      localStorage.setItem('rw_nl_snooze_count', String(snoozeCount + 1));
      showToast('👍 We\'ll remind you in a week');
    }
  } else if (type === 'no') {
    localStorage.setItem('rw_nl_declined', '1');
    showToast('No problem — you can subscribe any time in settings');
  }
}

async function subscribeNewsletter() {
  const email = user?.email;
  const name  = user?.name || '';
  if (!email) {
    showToast('⚠️ No email found on your account');
    closeNewsletterNudge();
    return;
  }

  // Show loading state
  const body = document.getElementById('nl-body');
  if (body) body.innerHTML = `
    <div class="nl-loading">
      <div style="font-size:32px;margin-bottom:12px">⏳</div>
      <div>Subscribing you...</div>
    </div>`;

  try {
    // 1. Insert into newsletter_subscribers table
    const res = await fetch(`${SB}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: {
        'apikey': AK,
        'Authorization': 'Bearer ' + (localStorage.getItem('rw_token') || AK),
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'  // silently skip if already subscribed
      },
      body: JSON.stringify({
        email,
        name,
        source: 'app_popup',
        active: true
      })
    });

    // 2. Send welcome email via Edge Function
    const welcomeHtml = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f9">
        <div style="background:#1a5c35;border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px">
          <div style="font-size:40px;margin-bottom:8px">🌱</div>
          <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:6px">You're in!</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.7)">MyRandWise Weekly Tips</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px">
          <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 16px">
            Hi ${name || 'there'} 👋<br><br>
            You're now subscribed to <strong>weekly money tips</strong> from MyRandWise —
            one practical tip every Monday at 8am, built for South African life.
          </p>
          <p style="font-size:13px;color:#666;margin:0 0 20px">
            Your first tip arrives next Monday. In the meantime, keep tracking your
            expenses — even small amounts add up to big insights over time.
          </p>
          <a href="https://myrandwise.co.za/app.html"
            style="display:block;background:#1a5c35;color:#fff;text-decoration:none;border-radius:12px;padding:14px;text-align:center;font-size:15px;font-weight:700">
            Open MyRandWise →
          </a>
        </div>
        <p style="font-size:11px;color:#999;text-align:center;line-height:1.6;margin:0">
          🇿🇦 Built in South Africa · POPIA Compliant<br>
          © 2026 MyRandWise ·
          <a href="mailto:hello@myrandwise.co.za" style="color:#1a5c35;text-decoration:none">hello@myrandwise.co.za</a>
        </p>
      </div>`;

    await fetch(`${SB}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + AK,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MyRandWise Tips <hello@myrandwise.co.za>',
        to: [email],
        subject: '🌱 You\'re subscribed — first tip arrives Monday',
        html: welcomeHtml
      })
    }).catch(() => {}); // non-blocking — subscription still works even if welcome email fails

    // 3. Mark as subscribed locally so we never ask again
    localStorage.setItem('rw_nl_subscribed', '1');

    // 4. Show success state
    if (body) body.innerHTML = `
      <div class="nl-success">
        <div class="nl-success-icon">🎉</div>
        <div class="nl-success-title">You're subscribed!</div>
        <div class="nl-success-sub">
          Check your inbox for a welcome email from<br>
          <strong>hello@myrandwise.co.za</strong>.<br><br>
          First tip arrives next Monday at 8am.
        </div>
      </div>
      <button class="nl-btn-yes" style="margin-top:20px" onclick="closeNewsletterNudge()">
        Awesome, let's go! →
      </button>`;

    // Close after 4 seconds automatically
    setTimeout(closeNewsletterNudge, 4000);

  } catch (err) {
    // Fail gracefully — subscription failed but don't punish the user
    if (body) body.innerHTML = `
      <div class="nl-success">
        <div class="nl-success-icon">⚠️</div>
        <div class="nl-success-title">Something went wrong</div>
        <div class="nl-success-sub">
          We couldn't subscribe you right now.<br>
          You can try again from your profile settings.
        </div>
      </div>
      <button class="nl-btn-later" onclick="closeNewsletterNudge()">Close</button>`;
  }
}
