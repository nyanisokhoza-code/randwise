// ── Weekly Planner ─────────────────────────────────────────────
// ── Bond Readiness ────────────────────────────────────────────
function updateBondPreview(){
  const inc=Number(user?.income_amount||0);
  const PRIME=11.5,TERM=240,monthlyRate=PRIME/100/12;
  const debtsMin=0; // simplified for preview
  const maxRep=inc*0.30;
  const bond=maxRep>0?Math.round(maxRep*(1-Math.pow(1+monthlyRate,-TERM))/monthlyRate/10000)*10000:0;
  const dti=0;
  let score=50;
  if(inc>=30000)score+=20;else if(inc>=20000)score+=15;else if(inc>=15000)score+=10;else if(inc>=10000)score+=5;
  score=Math.max(5,Math.min(100,score));
  const el=document.getElementById('bond-score-preview');
  if(el)el.textContent=score;
}
function openBondReadiness(){
  document.getElementById('bond-screen').style.display='block';
  document.body.style.overflow='hidden';
  renderBondReadiness();
}
function closeBondReadiness(){
  document.getElementById('bond-screen').style.display='none';
  document.body.style.overflow='';
}
function applyForBond(){
  window.open('https://www.ooba.co.za/home-loans/apply/?source=myrandwise','_blank');
  sendOwnerAlert('bond_apply',{name:user?.name||'Unknown',income:user?.income_amount||0});
}
async function renderBondReadiness(){
  const inc=Number(user?.income_amount||0);
  const PRIME=11.5;
  const TERM_YEARS=20;
  const TERM_MONTHS=TERM_YEARS*12;
  const monthlyRate=PRIME/100/12;

  // Get debts for DTI
  let debts=[];
  try{debts=await sbG(`debts?tester_id=eq.${user.id}`);}catch(e){console.warn('Bond: debts load error',e);}
  const totalDebt=debts.reduce((s,d)=>s+Number(d.balance||0),0);
  const totalMinPayments=debts.reduce((s,d)=>s+Number(d.min_payment||0),0);

  // Get savings for deposit
  let goals=[];
  try{goals=await sbG(`savings_goals?tester_id=eq.${user.id}`);}catch(e){console.warn('Bond: goals load error',e);}
  const totalSaved=goals.reduce((s,g)=>s+Number(g.saved||0),0);

  // ── CALCULATIONS ──────────────────────────────────────────
  // Max monthly repayment (30% of income minus existing debt payments)
  const maxRepayment=Math.max(0,inc*0.30-totalMinPayments);

  // Bond amount from max repayment (PV formula)
  const bondAmount=maxRepayment>0?
    Math.round(maxRepayment*(1-Math.pow(1+monthlyRate,-TERM_MONTHS))/monthlyRate/10000)*10000:0;

  // Actual repayment for the bond amount
  const actualRepayment=bondAmount>0?
    Math.round(bondAmount*monthlyRate/(1-Math.pow(1+monthlyRate,-TERM_MONTHS))):0;

  // DTI ratio (total debt / annual income)
  const dti=inc>0?(totalMinPayments/inc*100):0;

  // Deposit needed (10% of bond)
  const depositNeeded=Math.round(bondAmount*0.10);
  const depositSaved=totalSaved;
  const depositGap=Math.max(0,depositNeeded-depositSaved);

  // ── SCORE ─────────────────────────────────────────────────
  let score=50; // base
  // Income factor
  if(inc>=30000)score+=20;else if(inc>=20000)score+=15;else if(inc>=15000)score+=10;else if(inc>=10000)score+=5;
  // DTI factor
  if(dti<20)score+=15;else if(dti<30)score+=10;else if(dti<40)score+=5;else score-=10;
  // Savings factor
  if(depositSaved>=depositNeeded)score+=15;else if(depositSaved>=depositNeeded*0.5)score+=8;else if(depositSaved>0)score+=3;
  // Spending discipline (use weekly budget adherence)
  const {wb}=getSmartWeeklyBudget();
  const now=new Date();
  const weekAgo=new Date(now-7*24*60*60*1000);
  const weekExp=expenses.filter(e=>new Date(e.logged_at||e.created_at)>=weekAgo);
  const weekSpent=weekExp.reduce((s,e)=>s+Number(e.amount||0),0);
  if(weekSpent<=wb)score+=10;else if(weekSpent<=wb*1.1)score+=5;
  score=Math.max(5,Math.min(100,score));

  // ── TIMELINE ──────────────────────────────────────────────
  // How long to fix the worst issue
  let timelineMonths=0;
  // Time to save deposit
  const monthlySpare=Math.max(0,inc-totalMinPayments-weekSpent*4);
  const depositMonths=depositGap>0&&monthlySpare>0?Math.ceil(depositGap/monthlySpare*0.3):0;
  // Time to reduce DTI
  const dtiMonths=dti>30?Math.ceil((totalDebt*0.1)/Math.max(1,monthlySpare)):0;
  timelineMonths=Math.max(depositMonths,dtiMonths,score<60?6:score<80?3:0);

  // ── RENDER ────────────────────────────────────────────────
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  const setStyle=(id,prop,val)=>{const el=document.getElementById(id);if(el)el.style[prop]=val;};

  set('bond-score-big',score);
  set('bond-score-preview',score);
  setStyle('bond-score-bar','width',score+'%');
  setStyle('bond-score-bar','background',score>=75?'#4ade80':score>=50?'#fbbf24':'#f87171');

  const label=score>=80?'Bond ready — apply now':score>=60?'Getting close — keep going':score>=40?'Building towards it':'Start with the basics';
  set('bond-score-label',label);
  set('bond-amount','R'+bondAmount.toLocaleString('en-ZA'));
  set('bond-repayment','R'+actualRepayment.toLocaleString('en-ZA')+'/mo');
  set('bond-timeline',timelineMonths>0?`in approximately ${timelineMonths} months`:'based on your current profile');
  set('bond-terms',`${TERM_YEARS} year term · ${PRIME}% prime rate`);

  // Actions
  const actionsEl=document.getElementById('bond-actions');
  if(actionsEl){
    const actions=[];
    if(dti>30) actions.push({color:'#fee2e2',textColor:'#c62828',title:'Reduce debt payments',desc:`Your debt payments are ${Math.round(dti)}% of income — banks want under 30%. Pay extra R${Math.round((dti-30)*inc/100/12).toLocaleString('en-ZA')}/mo on your smallest debt.`});
    if(depositGap>0) actions.push({color:'#fff8e1',textColor:'#92400e',title:'Save your deposit',desc:`R${depositNeeded.toLocaleString('en-ZA')} deposit needed (10%). You have R${depositSaved.toLocaleString('en-ZA')} saved. ${depositMonths>0?`At your savings rate, ${depositMonths} months to go.`:'Keep saving consistently.'}`});
    if(weekSpent>wb) actions.push({color:'#fff8e1',textColor:'#92400e',title:'Stay within weekly budget',desc:`You spent R${Math.round(weekSpent).toLocaleString('en-ZA')} this week vs R${wb.toLocaleString('en-ZA')} budget. Banks look at 3 months of consistent spending.`});
    if(actions.length===0) actions.push({color:'#e8f5ee',textColor:'#1a5c35',title:'Looking good!',desc:'Your debt, savings and spending are in good shape. Focus on building your deposit and maintaining consistency.'});
    // Limit to 3
    actionsEl.innerHTML=actions.slice(0,3).map((a,i)=>`
      <div style="display:flex;gap:10px;align-items:flex-start;${i<Math.min(actions.length,3)-1?'margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #d1ead9':''}">
        <div style="width:24px;height:24px;border-radius:50%;background:${a.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${a.textColor};flex-shrink:0">${i+1}</div>
        <div><div style="font-size:13px;font-weight:700;color:#1a5c35;margin-bottom:2px">${a.title}</div><div style="font-size:11px;color:#5a8a6a;line-height:1.6">${a.desc}</div></div>
      </div>`).join('');
  }

  // Factors
  const factorsEl=document.getElementById('bond-factors');
  if(factorsEl){
    const factors=[
      {label:'Income',value:'R'+inc.toLocaleString('en-ZA')+'/mo',status:inc>=15000?'good':inc>=10000?'ok':'low'},
      {label:'Debt-to-income',value:Math.round(dti)+'%',status:dti<30?'good':dti<40?'ok':'high'},
      {label:'Deposit saved',value:'R'+depositSaved.toLocaleString('en-ZA'),status:depositSaved>=depositNeeded?'good':depositSaved>0?'ok':'none'},
      {label:'Weekly budget',value:weekSpent<=wb?'On track':'Over budget',status:weekSpent<=wb?'good':'high'},
    ];
    factorsEl.innerHTML=factors.map((f,i)=>{
      const col=f.status==='good'?'#2e7d32':f.status==='ok'?'#f59e0b':'#c62828';
      return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${i<factors.length-1?'border-bottom:1px solid #d1ead9':''}">
        <div style="font-size:13px;color:#5a8a6a">${f.label}</div>
        <div style="font-size:13px;font-weight:700;color:${col}">${f.value}</div>
      </div>`;
    }).join('');
  }
}

// ── AI Nudges ──────────────────────────────────────────────────
async function loadAINudge(){
  const{isPro}=getTier();
  const card=document.getElementById('ai-nudge-card');
  if(!card)return;
  // Only for Pro/trial users
  if(!isPro){card.style.display='none';return;}
  // Check if dismissed today
  const dismissed=localStorage.getItem('rw_nudge_dismissed');
  if(dismissed===new Date().toDateString()){card.style.display='none';return;}
  // Check if we have a cached nudge from today
  const cached=localStorage.getItem('rw_nudge_cache');
  const cachedDate=localStorage.getItem('rw_nudge_date');
  const forceTop=()=>{ const el=document.getElementById('dash-main-content'); if(el) el.scrollTop=0; };
  if(cached&&cachedDate===new Date().toDateString()){
    card.style.display='block';
    document.getElementById('ai-nudge-text').textContent=cached;
    const preview=document.getElementById('ai-nudge-preview');
    if(preview)preview.textContent=cached.slice(0,60)+'…';
    const dateEl=document.getElementById('ai-nudge-date');
    if(dateEl)dateEl.textContent='Generated today · Tap ↻ to refresh';
    forceTop();
    openNudgePopup(); // auto-open popup on load
    return;
  }
  // Only generate on Monday or if no nudge yet this week
  const dayOfWeek=new Date().getDay();
  const lastNudgeWeek=localStorage.getItem('rw_nudge_week');
  const thisWeek=`${new Date().getFullYear()}-W${Math.ceil(new Date().getDate()/7)}`;
  if(lastNudgeWeek===thisWeek&&!cached){return;} // Already tried this week
  // Show card with loading state
  card.style.display='block';
  forceTop(); // Keep scroll at top after showing card
  document.getElementById('ai-nudge-text').textContent='Analysing your spending patterns...';
  await generateAINudge();
}

async function generateAINudge(){
  const card=document.getElementById('ai-nudge-card');
  const textEl=document.getElementById('ai-nudge-text');
  const dateEl=document.getElementById('ai-nudge-date');
  const btn=document.getElementById('nudge-refresh-btn');
  if(btn){btn.textContent='Loading...';btn.disabled=true;}
  try{
    // Build spending context
    const inc=Number(user?.income_amount||0);
    const now=new Date();
    const weekAgo=new Date(now-7*24*60*60*1000);
    const weekExp=expenses.filter(e=>new Date(e.logged_at||e.created_at)>=weekAgo);
    const totalWeek=weekExp.reduce((s,e)=>s+Number(e.amount||0),0);
    const cats={};
    weekExp.forEach(e=>{const c=e.category||'Other';cats[c]=(cats[c]||0)+Number(e.amount||0);});
    const catSummary=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,a])=>`${c}: R${Math.round(a)}`).join(', ');
    const {wb}=getSmartWeeklyBudget();
    const pctUsed=wb>0?Math.round(totalWeek/wb*100):0;
    const prompt=`You are a personal finance advisor for South African users. Based on this week's spending data, give ONE specific, actionable money tip. Be conversational, warm, and South African in tone. Maximum 2 sentences. No generic advice.

User context:
- Monthly income: R${inc.toLocaleString('en-ZA')}
- Weekly budget: R${wb.toLocaleString('en-ZA')}
- Spent this week: R${Math.round(totalWeek).toLocaleString('en-ZA')} (${pctUsed}% of budget)
- Top categories: ${catSummary||'No expenses yet this week'}
- Day of week: ${now.toLocaleDateString('en-ZA',{weekday:'long'})}

Give one specific tip based on this data. If they overspent, suggest how to recover. If they're on track, suggest how to save more. Reference actual amounts and categories from their data.`;

    const res=await fetch(`${SB}/functions/v1/ai-nudge`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':AK,'Authorization':'Bearer '+AK},
      body:JSON.stringify({prompt})
    });
    const data=await res.json();
    const nudge=data?.nudge||'Keep tracking your spending — every rand logged helps you understand your patterns better.';
    // Cache it
    localStorage.setItem('rw_nudge_cache',nudge);
    localStorage.setItem('rw_nudge_date',new Date().toDateString());
    localStorage.setItem('rw_nudge_week',`${now.getFullYear()}-W${Math.ceil(now.getDate()/7)}`);
    if(textEl)textEl.textContent=nudge;
    if(dateEl)dateEl.textContent=`Generated ${now.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'short'})}`;
    if(card)card.style.display='block';
  }catch(e){
    // Fail silently — just hide the card
    if(card)card.style.display='none';
    console.warn('AI nudge failed:',e);
  }finally{
    if(btn){btn.textContent='↻ Refresh';btn.disabled=false;}
  }
}

// ── Weekly Insight Popup ─────────────────────────────────────
function openNudgePopup(){
  const overlay=document.getElementById('nudge-overlay');
  if(!overlay)return;
  overlay.style.display='flex';
  document.body.style.overflow='hidden';
}

function closeNudgePopup(){
  const overlay=document.getElementById('nudge-overlay');
  if(!overlay)return;
  overlay.style.display='none';
  document.body.style.overflow='';
  localStorage.setItem('rw_nudge_dismissed',new Date().toDateString());
}

function minimizeNudgePopup(){
  // Closes popup but keeps card on dashboard so user can reopen
  const overlay=document.getElementById('nudge-overlay');
  if(!overlay)return;
  overlay.style.display='none';
  document.body.style.overflow='';
}

function dismissAINudge(){
  closeNudgePopup();
  const card=document.getElementById('ai-nudge-card');
  if(card)card.style.display='none';
}

// kept for safety — old onclick refs won't break
function toggleNudgeExpand(){}

async function refreshAINudge(){
  localStorage.removeItem('rw_nudge_cache');
  localStorage.removeItem('rw_nudge_date');
  const textEl=document.getElementById('ai-nudge-text');
  if(textEl)textEl.textContent='Analysing your spending patterns...';
  await generateAINudge();
}

function openWeeklyPlanner(){
  document.getElementById('weekly-planner').style.display='block';
  document.body.style.overflow='hidden';
  const currentWeek=Math.ceil(new Date().getDate()/7);
  selectedWeek=currentWeek;
  renderWeeklyPlanner(currentWeek);
}
function closeWeeklyPlanner(){
  document.getElementById('weekly-planner').style.display='none';
  document.body.style.overflow='';
}

let selectedWeek=null; // null = current week

function selectWeek(w){
  const now=new Date();
  const currentWeek=Math.ceil(now.getDate()/7);
  selectedWeek=w;
  renderWeeklyPlanner(w);
}

function getWeekSpent(weekNum, year, month){
  // Helper: get total spent for any week number
  const wStartDay=(weekNum-1)*7+1;
  const wEndDay=Math.min(weekNum*7, new Date(year,month+1,0).getDate());
  const wStart=new Date(year,month,wStartDay,0,0,0,0);
  const wEnd=new Date(year,month,wEndDay,23,59,59,999);
  return expenses.filter(e=>{const d=new Date(e.logged_at||e.created_at);return d>=wStart&&d<=wEnd;}).reduce((s,e)=>s+Number(e.amount||0),0);
}

function getWeekCarryover(weekNum, wb, year, month){
  // Calculate cumulative carry-over from previous weeks
  // If Week 1 had R400 surplus, Week 2 gets +R400
  // If Week 1 overspent by R200, Week 2 gets -R200
  if(weekNum<=1) return 0;
  let carry=0;
  for(let w=1;w<weekNum;w++){
    const spent=getWeekSpent(w, year, month);
    carry += (wb - spent); // positive = surplus, negative = overspend
  }
  return Math.round(carry);
}

function renderWeeklyPlanner(weekNum){
  if(!user)return;
  const inc=Number(user.income_amount||0);
  const now=new Date();
  const currentWeek=Math.ceil(now.getDate()/7);
  const w=weekNum||currentWeek;
  const {wb}=getSmartWeeklyBudget();

  // Calculate week date range
  // Week 1 = days 1-7, Week 2 = 8-14, Week 3 = 15-21, Week 4 = 22-end
  const year=now.getFullYear();
  const month=now.getMonth();
  const weekStartDay=(w-1)*7+1;
  const weekEndDay=Math.min(w*7, new Date(year,month+1,0).getDate());
  const weekStart=new Date(year,month,weekStartDay,0,0,0,0);
  const weekEnd=new Date(year,month,weekEndDay,23,59,59,999);

  // Carry-over from previous weeks
  const carryover = getWeekCarryover(w, wb, year, month);
  const effectiveWb = Math.max(0, wb + carryover); // total budget for this week including rollover

  // Days left (only relevant for current week)
  const dow=now.getDay();
  const mon=(dow+6)%7;
  const daysLeft=w===currentWeek?7-mon:0;

  // Week tabs
  const weekOfMonth=currentWeek;
  const tabsEl=document.getElementById('wp-week-tabs');
  if(tabsEl){
    tabsEl.innerHTML=[1,2,3,4].map(wk=>{ const sd=new Date(year,month,(wk-1)*7+1); const ed=new Date(year,month,Math.min(wk*7,new Date(year,month+1,0).getDate())); const lbl=sd.toLocaleDateString('en-ZA',{day:'numeric',month:'short'})+' – '+ed.toLocaleDateString('en-ZA',{day:'numeric',month:'short'}); return `<div onclick="selectWeek(${wk})" style="flex-shrink:0;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:${wk===w?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.1)'};color:#fff;white-space:nowrap">W${wk}${wk===currentWeek?' ✦':''}<br><span style='font-size:9px;font-weight:400;opacity:.8'>${lbl}</span></div>`; }).join('');
  }

  // Title with date range
  const monthName=now.toLocaleString('en-ZA',{month:'long',year:'numeric'});
  const el=document.getElementById('wp-title');
  const wStartFmt=weekStart.toLocaleDateString('en-ZA',{day:'numeric',month:'short'});
  const wEndFmt=weekEnd.toLocaleDateString('en-ZA',{day:'numeric',month:'short'});
  if(el)el.textContent=`Week ${w} · ${wStartFmt} – ${wEndFmt}`;

  // Filter expenses for selected week
  const weekExp=expenses.filter(e=>{
    const d=new Date(e.logged_at||e.created_at);
    return d>=weekStart&&d<=weekEnd;
  });
  const spent=weekExp.reduce((s,e)=>s+Number(e.amount||0),0);
  const left=Math.max(0,effectiveWb-spent);
  const pct=effectiveWb>0?Math.min(100,Math.round(spent/effectiveWb*100)):0;

  // Month overview strip — all 4 weeks at a glance
  const overviewEl=document.getElementById('wp-month-overview');
  if(overviewEl){
    overviewEl.innerHTML=[1,2,3,4].map(wk=>{
      const wkSpent=getWeekSpent(wk,year,month);
      const wkCarry=getWeekCarryover(wk,wb,year,month);
      const wkBudget=Math.max(0,wb+wkCarry);
      const isOver=wkSpent>wkBudget&&wkBudget>0;
      const isEmpty=wkSpent===0&&wk>currentWeek;
      const isCurrent=wk===currentWeek;
      const bg=isCurrent?'rgba(255,255,255,0.25)':isOver?'rgba(198,40,40,0.3)':wkSpent>0?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.07)';
      const border=isCurrent?'2px solid rgba(255,255,255,0.6)':isOver?'2px solid rgba(198,40,40,0.5)':'2px solid transparent';
      const label=isEmpty?'—':isOver?'-R'+Math.round(wkSpent-wkBudget).toLocaleString('en-ZA'):'R'+Math.round(wkSpent).toLocaleString('en-ZA');
      const sublabel=isEmpty?'future':isOver?'over':'spent';
      return`<div onclick="selectWeek(${wk})" style="flex:1;background:${bg};border:${border};border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;transition:all .2s"><div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;margin-bottom:2px">Wk ${wk}${isCurrent?' ●':''}</div><div style="font-size:12px;font-weight:800;color:${isOver?'#ff8a80':'#fff'}">${label}</div><div style="font-size:9px;color:rgba(255,255,255,0.5);margin-top:1px">${sublabel}</div></div>`;
    }).join('');
  }

  // Big number — show overspend or left
  const wpLeft=document.getElementById('wp-left');
  const wpLeftLabel=document.getElementById('wp-left-label');
  const wpOf=document.getElementById('wp-of-total');
  const wpBar=document.getElementById('wp-progress-bar');
  const wpSpent=document.getElementById('wp-spent');
  const overspend=spent>effectiveWb?Math.round(spent-effectiveWb):0;
  if(overspend>0){
    if(wpLeft){wpLeft.textContent='R'+overspend.toLocaleString('en-ZA');wpLeft.style.color='#c62828';}
    if(wpLeftLabel)wpLeftLabel.textContent='Over budget by';
    const ovDetail=document.getElementById('wp-overspend-detail');
    if(ovDetail){ovDetail.style.display='block';ovDetail.textContent='Spent R'+spent.toLocaleString('en-ZA')+' of R'+effectiveWb.toLocaleString('en-ZA')+' available';}
  } else {
    if(wpLeft){wpLeft.textContent='R'+left.toLocaleString('en-ZA');wpLeft.style.color='#1a5c35';}
    if(wpLeftLabel)wpLeftLabel.textContent='Left this week';
    const ovDetail=document.getElementById('wp-overspend-detail');
    if(ovDetail)ovDetail.style.display='none';
  }
  let ofLabel='of R'+wb.toLocaleString('en-ZA')+' weekly budget';
  if(carryover>0) ofLabel='of R'+effectiveWb.toLocaleString('en-ZA')+' (R'+wb.toLocaleString('en-ZA')+' + R'+carryover.toLocaleString('en-ZA')+' rollover)';
  else if(carryover<0) ofLabel='of R'+effectiveWb.toLocaleString('en-ZA')+' (R'+wb.toLocaleString('en-ZA')+' − R'+Math.abs(carryover).toLocaleString('en-ZA')+' carried over)';
  if(wpOf)wpOf.textContent=ofLabel;
  if(wpBar){wpBar.style.width=Math.min(100,pct)+'%';wpBar.style.background=pct>100?'#c62828':pct>70?'#f59e0b':'#1a5c35';}
  if(wpSpent)wpSpent.textContent='R'+Math.round(spent).toLocaleString('en-ZA');

  // Carry-over badge
  const badge=document.getElementById('wp-carryover-badge');
  if(badge){
    if(carryover>0){badge.style.display='block';badge.style.background='#e8f5e9';badge.style.color='#1a5c35';badge.style.border='1px solid #a5d6a7';badge.textContent='✅ +R'+carryover.toLocaleString('en-ZA')+' rollover from last week';}
    else if(carryover<0){badge.style.display='block';badge.style.background='#fdecea';badge.style.color='#a32d2d';badge.style.border='1px solid #f5c6c6';badge.textContent='⚠️ −R'+Math.abs(carryover).toLocaleString('en-ZA')+' overspend carried from last week';}
    else{badge.style.display='none';}
  }
  // Daily left (only for current week)
  const dailyLeft=daysLeft>0?Math.round(left/daysLeft):0;
  const wpDailyLeft=document.getElementById('wp-daily-left');
  const wpDaysRem=document.getElementById('wp-days-remaining');
  if(wpDailyLeft)wpDailyLeft.textContent=daysLeft>0?'R'+dailyLeft.toLocaleString('en-ZA'):'R0';
  if(wpDaysRem)wpDaysRem.textContent=w<currentWeek?'week complete':w>currentWeek?'week not started yet':daysLeft<=1?'for today':`for each of the next ${daysLeft} days`;

  // Daily dots — use effectiveWb for limit
  const DAYS=['M','T','W','T','F','Sa','Su'];
  const dailySpends=[0,0,0,0,0,0,0];
  weekExp.forEach(e=>{
    const d=new Date(e.logged_at||e.created_at);
    const di=(d.getDay()+6)%7;
    if(di>=0&&di<7)dailySpends[di]+=Number(e.amount||0);
  });
  const todayIdx=w===currentWeek?mon:w<currentWeek?6:-1;
  const dailyLimit=effectiveWb/7;
  const dotsEl=document.getElementById('wp-daily-dots');
  if(dotsEl){
    dotsEl.innerHTML=DAYS.map((d,i)=>{
      const amt=dailySpends[i];
      const isFuture=w>currentWeek||(w===currentWeek&&i>todayIdx);
      const over=amt>dailyLimit&&amt>0;
      const hasSpend=amt>0&&!isFuture;
      const dotBg=isFuture||amt===0?'#c8e6cf':over?'#c62828':'#2e7d32';
      let label=hasSpend?(amt>=1000?'R'+(amt/1000).toFixed(1)+'k':'R'+Math.round(amt)):'';
      const fSize=amt>=1000?'7px':amt>=100?'8px':'10px';
      return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:36px;height:36px;border-radius:50%;background:${dotBg};display:flex;align-items:center;justify-content:center">
          ${hasSpend?`<span style="font-size:${fSize};color:#fff;font-weight:700">${label}</span>`:`<span style="font-size:11px;color:${isFuture?'#8fbc8f':'#fff'}">—</span>`}
        </div>
        <div style="font-size:10px;color:#5a8a6a;font-weight:600">${d}</div>
      </div>`;
    }).join('');
  }

  // Category breakdown
  const cats={};
  weekExp.forEach(e=>{const c=e.category||'Other';cats[c]=(cats[c]||0)+Number(e.amount||0);});
  const catEl=document.getElementById('wp-categories');
  if(catEl){
    if(Object.keys(cats).length===0){
      catEl.innerHTML=`<div style="font-size:12px;color:#5a8a6a;text-align:center;padding:8px">${w<currentWeek?'No expenses logged for this week':'No expenses logged this week yet'}</div>`;
    } else {
      catEl.innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,a])=>{
        const pct2=spent>0?Math.round(a/spent*100):0;
        return`<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <div style="font-size:12px;font-weight:600;color:#1a5c35">${c}</div>
            <div style="font-size:12px;font-weight:700;color:#c62828">R${Math.round(a).toLocaleString('en-ZA')}</div>
          </div>
          <div style="height:4px;background:#c8e6cf;border-radius:3px;overflow:hidden">
            <div style="height:100%;background:#1a5c35;width:${pct2}%;border-radius:3px"></div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Rollover (only current week)
  const rollEl=document.getElementById('wp-rollover');
  const rollText=document.getElementById('wp-rollover-text');
  if(rollEl&&rollText){
    if(w===currentWeek&&left>200&&daysLeft<=3){
      rollEl.style.display='block';
      rollText.textContent=`You have R${Math.round(left).toLocaleString('en-ZA')} left. Any amount not spent this week automatically rolls over to Week ${w<4?w+1:1}'s budget — so don't rush to spend it!`;
    } else if(w<currentWeek&&carryover!==0){
      rollEl.style.display='block';
      rollText.textContent=carryover>0
        ? `This week's R${Math.abs(carryover).toLocaleString('en-ZA')} surplus was rolled over to the following week.`
        : `This week's R${Math.abs(carryover).toLocaleString('en-ZA')} overspend was deducted from the following week.`;
    } else {
      rollEl.style.display='none';
    }
  }

  // Transactions
  const txEl=document.getElementById('wp-transactions');
  if(txEl){
    if(!weekExp.length){
      txEl.innerHTML=`<div style="font-size:12px;color:#5a8a6a;text-align:center;padding:8px">${w>currentWeek?'Week not started yet':w<currentWeek?'No transactions recorded for this week':'No transactions this week'}</div>`;
    } else {
      txEl.innerHTML=weekExp.sort((a,b)=>new Date(b.logged_at||b.created_at)-new Date(a.logged_at||a.created_at)).map(e=>{
        const d=new Date(e.logged_at||e.created_at);
        const day=d.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e8f5ee">
          <div>
            <div style="font-size:13px;font-weight:600">${e.category||'Other'}</div>
            <div style="font-size:11px;color:#5a8a6a">${day}${e.note?' · '+e.note:''}</div>
          </div>
          <div style="font-size:14px;font-weight:800;color:#c62828">-R${Number(e.amount||0).toLocaleString('en-ZA')}</div>
        </div>`;
      }).join('');
    }
  }
}

function exportCSV(){
  if(!expenses?.length){showToast('No expenses to export yet');return;}
  const rows=[['Date','Category','Amount','Note','Source']];
  expenses.forEach(e=>{
    const date=e.logged_at||e.created_at||'';
    rows.push([
      date?new Date(date).toLocaleDateString('en-ZA'):'',
      e.category||'',
      Number(e.amount||0).toFixed(2),
      (e.note||'').replace(/,/g,' '),
      e.source||'manual'
    ]);
  });
  const csv=rows.map(r=>r.join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const month=new Date().toLocaleString('en-ZA',{month:'long',year:'numeric'});
  a.download=`MyRandWise_Expenses_${month.replace(' ','_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV downloaded');
  sendOwnerAlert('export',{name:user?.name||'Unknown',type:'CSV',count:expenses.length});
}

function exportPDF(){
  if(!expenses?.length){showToast('No expenses to export yet');return;}
  const month=new Date().toLocaleString('en-ZA',{month:'long',year:'numeric'});
  const total=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  // Group by category
  const cats={};
  expenses.forEach(e=>{const c=e.category||'Other';cats[c]=(cats[c]||0)+Number(e.amount||0);});
  const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #e8f5ee">${c}</td><td style="padding:6px 8px;border-bottom:1px solid #e8f5ee;text-align:right;font-weight:600">R${a.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr>`).join('');
  const expRows=expenses.slice(0,50).map(e=>{
    const date=e.logged_at||e.created_at||'';
    return`<tr><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${date?new Date(date).toLocaleDateString('en-ZA'):''}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px">${e.category||''}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#333">${e.note||''}</td><td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;font-weight:600;color:#c62828">R${Number(e.amount||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MyRandWise Report — ${month}</title><style>body{font-family:sans-serif;color:#333;padding:32px;max-width:700px;margin:0 auto}h1{color:#1a5c35;margin-bottom:4px}table{width:100%;border-collapse:collapse}th{background:#1a5c35;color:#fff;padding:8px;text-align:left;font-size:13px}.total{font-size:20px;font-weight:900;color:#1a5c35}.sub{font-size:13px;color:#5a8a6a;margin-bottom:24px}.section{margin-bottom:28px}.section h3{color:#1a5c35;border-bottom:2px solid #e8f5ee;padding-bottom:6px;margin-bottom:12px}.footer{margin-top:32px;font-size:11px;color:#999;text-align:center;border-top:1px solid #e8f5ee;padding-top:12px}</style></head><body>
  <h1>🌱 MyRandWise</h1>
  <div class="sub">Expense Report — ${month} · ${user?.name||''}</div>
  <div class="section"><h3>Summary</h3><table><tr><td style="padding:8px 0;font-size:14px">Total expenses</td><td style="text-align:right" class="total">R${total.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr><tr><td style="padding:8px 0;font-size:14px">Transactions</td><td style="text-align:right;font-size:18px;font-weight:700">${expenses.length}</td></tr><tr><td style="padding:8px 0;font-size:14px">Monthly income</td><td style="text-align:right;font-size:18px;font-weight:700;color:#1a5c35">R${Number(user?.income_amount||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr></table></div>
  <div class="section"><h3>By category</h3><table><tr><th>Category</th><th style="text-align:right">Total</th></tr>${catRows}</table></div>
  <div class="section"><h3>Transactions${expenses.length>50?' (latest 50)':''}</h3><table><tr><th>Date</th><th>Category</th><th>Note</th><th style="text-align:right">Amount</th></tr>${expRows}</table></div>
  <div class="footer">Generated by MyRandWise · ${new Date().toLocaleDateString('en-ZA')} · Your money, your rules. 🇿🇦<br><br>⚖️ This report is for informational purposes only. MyRandWise is not a registered Financial Services Provider (FSP). Figures shown are estimates based on data you have entered. This is not financial advice. Consult a qualified financial advisor before making major financial decisions.</div>
  
  <!-- Reset Password Screen -->
  <div class="screen" id="reset-screen" style="background:#f7f6f2;align-items:center;justify-content:center;padding:24px">
    <div style="width:100%;max-width:380px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:48px;margin-bottom:12px">🔐</div>
        <div style="font-size:24px;font-weight:800;color:#111">Set new password</div>
        <div style="font-size:14px;color:#666;margin-top:8px">Choose a strong password for your account</div>
      </div>
      <div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 2px 16px rgba(0,0,0,.08)">
        <input id="rp-pass" type="password" placeholder="New password (min 6 characters)"
          style="width:100%;padding:14px 16px;border:1.5px solid #e0e0e0;border-radius:12px;font-size:15px;margin-bottom:12px;font-family:inherit;box-sizing:border-box">
        <input id="rp-pass2" type="password" placeholder="Confirm new password"
          style="width:100%;padding:14px 16px;border:1.5px solid #e0e0e0;border-radius:12px;font-size:15px;margin-bottom:16px;font-family:inherit;box-sizing:border-box">
        <div id="rp-err" style="display:none;color:#c0392b;font-size:13px;margin-bottom:12px;padding:10px;background:#fdecea;border-radius:8px"></div>
        <button onclick="doResetPassword()" id="rp-btn"
          style="width:100%;background:#1a7a4a;color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit">
          Set new password →
        </button>
      </div>
    </div>
  </div>

<!-- ══ SEE ALL TRANSACTIONS SHEET ══════════════════════════════ -->
<div id="see-all-screen" style="display:none;position:fixed;inset:0;background:#f7f6f2;z-index:300;display:none;flex-direction:column">
  <!-- Header -->
  <div style="background:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #eee;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,0px) + 16px)">
    <button onclick="closeSeeAll()" style="width:34px;height:34px;border-radius:10px;background:#f5f5f0;border:none;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">←</button>
    <div style="font-size:17px;font-weight:800;color:#111">All transactions</div>
    <div id="sa-count" style="font-size:12px;color:#888;margin-left:auto;background:#f5f5f0;padding:4px 10px;border-radius:20px">0 total</div>
  </div>
  <!-- Search -->
  <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #f0f0ec;flex-shrink:0">
    <div style="position:relative">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;opacity:.5">🔍</span>
      <input id="sa-search" type="text" placeholder="Search transactions..." oninput="renderSeeAll()"
        style="width:100%;padding:10px 14px 10px 34px;background:#f5f5f0;border:none;border-radius:12px;font-size:14px;font-family:inherit;box-sizing:border-box">
    </div>
  </div>
  <!-- Filter chips -->
  <div id="sa-filters" style="display:flex;gap:8px;padding:10px 14px;overflow-x:auto;background:#fff;border-bottom:1px solid #f0f0ec;flex-shrink:0"></div>
  <!-- Summary bar -->
  <div style="display:flex;background:#fff;border-bottom:1px solid #f0f0ec;flex-shrink:0">
    <div style="flex:1;text-align:center;padding:10px">
      <div id="sa-total" style="font-size:15px;font-weight:800;color:#c0392b">R0</div>
      <div style="font-size:10px;color:#888;font-weight:600">Total spent</div>
    </div>
    <div style="flex:1;text-align:center;padding:10px;border-left:1px solid #eee;border-right:1px solid #eee">
      <div id="sa-txn-count" style="font-size:15px;font-weight:800;color:#111">0</div>
      <div style="font-size:10px;color:#888;font-weight:600">Transactions</div>
    </div>
    <div style="flex:1;text-align:center;padding:10px">
      <div id="sa-avg" style="font-size:15px;font-weight:800;color:#1a7a4a">R0</div>
      <div style="font-size:10px;color:#888;font-weight:600">Average</div>
    </div>
  </div>
  <!-- Transaction list grouped by day -->
  <div id="sa-list" style="overflow-y:auto;flex:1;padding-bottom:40px"></div>
</div>

<!-- ══ MONTHLY NEEDS SETUP SHEET ══════════════════════════════ -->
<div id="needs-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;align-items:flex-end;justify-content:center">
  <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:0 0 40px;max-height:92vh;overflow-y:auto">
    <div style="text-align:center;padding:12px 0 0"><div style="width:36px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto"></div></div>
    <div style="padding:20px 24px 0">
      <div style="font-size:22px;font-weight:900;color:#111;margin-bottom:6px">Monthly needs 🌱</div>
      <div style="font-size:14px;color:#666;line-height:1.5;margin-bottom:20px">These are things you spend money on every month. Adding them helps MyRandWise calculate your <strong>real</strong> weekly budget — what's left after all your commitments.</div>
      <div style="background:#f0faf4;border-radius:12px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#1a5c35">
        💡 Don't include debit orders or debt payments — those are already tracked separately.
      </div>

      <!-- Preset categories -->
      <div id="needs-list" style="display:flex;flex-direction:column;gap:10px"></div>

      <!-- Add custom -->
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f0f0ec">
        <div style="font-size:13px;font-weight:700;color:#666;margin-bottom:10px">+ Add custom need</div>
        <div style="display:flex;gap:8px">
          <input id="needs-custom-name" placeholder="e.g. School fees" style="flex:1;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit">
          <input id="needs-custom-amount" type="number" placeholder="R amount" style="width:110px;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit">
          <button onclick="addCustomNeed()" style="padding:10px 14px;background:#1a5c35;color:#fff;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:700">+</button>
        </div>
      </div>

      <!-- Custom needs added -->
      <div id="custom-needs-list" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>

      <!-- Total preview -->
      <div style="margin-top:20px;background:#1a5c35;border-radius:14px;padding:16px 18px;color:#fff">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:13px;opacity:.8">Monthly needs total</div>
          <div id="needs-total" style="font-size:20px;font-weight:800">R0</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.7;border-top:1px solid rgba(255,255,255,.2);padding-top:8px;margin-top:4px">
          <span>Your weekly budget after all commitments</span>
          <span id="needs-wb-preview" style="font-weight:700">R0/wk</span>
        </div>
      </div>

      <button onclick="saveMonthlyNeeds()" style="width:100%;margin-top:16px;padding:16px;background:#1a7a4a;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit">Save my monthly needs →</button>
      <button onclick="skipMonthlyNeeds()" style="width:100%;margin-top:8px;padding:12px;background:none;border:none;font-size:14px;color:#888;cursor:pointer">Skip for now</button>
    </div>
  </div>
</div>
</body></html>`;
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`MyRandWise_Report_${month.replace(' ','_')}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ PDF report downloaded — open in browser then print/save as PDF');
  sendOwnerAlert('export',{name:user?.name||'Unknown',type:'PDF',count:expenses.length});
}

// ── Auto-login ────────────────────────────────────────────────
window.addEventListener('load',async()=>{
  // Load admin notification/popup settings from Supabase
  loadAppSettings(); // async, non-blocking
  loadCustomCats(); // load any saved custom categories

  // App lock — init toggle state
  initLock();

  // Lock on visibility change (user switches away for 5+ min)
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      // App going to background — start timer
      if(isLockEnabled()) startLockTimer();
    } else {
      // App coming to foreground — check if should lock
      if(isLockEnabled()&&getLockPin()&&!lockTimer){
        showLockScreen();
      }
    }
  });

  // Reset timer on any user interaction
  ['touchstart','mousedown','keydown'].forEach(evt=>{
    document.addEventListener(evt, resetLockTimer, {passive:true});
  });

  // Add shake keyframe if not already present
  if(!document.getElementById('lock-shake-style')){
    const s=document.createElement('style');
    s.id='lock-shake-style';
    s.textContent='@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}';
    document.head.appendChild(s);
  }

  // Splash: branded ring-draw animation for ALL users
  const hasSession = localStorage.getItem('rw_user') && localStorage.getItem('rw_token');
  const loader = document.getElementById('splash-loader');
  const content = document.getElementById('splash-content');
  if(loader) loader.style.display='flex';
  if(content) content.style.display='none';
  // Trigger ring draw + fade-up animations
  const splashRing = document.getElementById('splash-ring');
  const splashTitle = document.getElementById('splash-title');
  const splashSub = document.getElementById('splash-sub');
  if(splashRing) splashRing.style.animation='splashRingDraw 2.8s cubic-bezier(.4,0,.2,1) forwards';
  if(splashTitle) setTimeout(()=>{ splashTitle.style.animation='splashFadeUp .7s ease forwards'; },400);
  if(splashSub) setTimeout(()=>{ splashSub.style.animation='splashFadeUp .7s ease forwards'; },700);
  if(!hasSession){
    // New visitor — show buttons after 3s
    setTimeout(()=>{
      if(loader) loader.style.display='none';
      if(content){ content.style.display='flex'; setTimeout(()=>content.style.opacity='1',50); }
    }, 3000);
  }
  // Returning users: loader stays visible until auto-login completes below
  await refreshTokenIfNeeded();
  const s=localStorage.getItem('rw_user');
  const tok=localStorage.getItem('rw_token');
  if(s && tok){
    try{
      user=JSON.parse(s);
      if(user?.id){
        // ── Show app IMMEDIATELY from cache — no waiting ──────────
        try{renderDash();}catch{}
        const _splashLoader=document.getElementById('splash-loader');
        if(_splashLoader) _splashLoader.style.display='none';
        show('main');
        startLockTimer();
        setTimeout(()=>schedulePushNudges(), 3000);
        const introSeen=localStorage.getItem('rw_intro_seen');
        if(!introSeen){
          setTimeout(()=>{try{showIntro();localStorage.setItem('rw_intro_seen','1');}catch{}},600);
        } else {
          setTimeout(()=>showWhatsNew(APP_VERSION), 1500);
        }
        // ── Refresh data in background (non-blocking) ─────────────
        setTimeout(async()=>{
          try{
            const f=await sbG(`beta_testers?id=eq.${user.id}&limit=1&select=*`);
            if(f?.[0]){user=f[0];localStorage.setItem('rw_user',JSON.stringify(user));sbPatch(`beta_testers?id=eq.${user.id}`,{last_active:new Date().toISOString()}).catch(()=>{});}
          }catch{}
          try{await loadExp();}catch{expenses=[];}
          try{
            const d=await sbG(`debts?tester_id=eq.${user.id}&order=balance.asc`);
            debts=Array.isArray(d)?d:[];
          }catch{debts=[];}
          await loadMonthlyNeedsFromSupabase().catch(()=>{});
          try{renderDash();}catch{} // Re-render with fresh data
        }, 100);
      }
    }catch{
      show('splash');
    }
  } else if(s && !tok){
    // Token missing but user data exists — try to use cached data
    // Don't redirect to splash/landing, show app with cached data
    try {
      user = JSON.parse(s);
      if(user?.id){
        try{ await loadExp(); }catch{ expenses=[]; }
        try{ const d=await sbG(`debts?tester_id=eq.${user.id}&order=balance.asc`); debts=Array.isArray(d)?d:[]; }catch{ debts=[]; }
        try{ renderDash(); }catch{}
        const _splashLoader=document.getElementById('splash-loader');
        if(_splashLoader) _splashLoader.style.display='none';
        show('main');
        startLockTimer();
      } else { show('splash'); }
    } catch { show('splash'); }
  } else {
    show('splash');
  }
  // Show auth error if redirected with error hash
  const authErr = sessionStorage.getItem('rw_auth_error');
  if(authErr){
    sessionStorage.removeItem('rw_auth_error');
    setTimeout(()=>{
      const toast = document.getElementById('toast');
      if(toast){toast.textContent=authErr;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),5000);}
    }, 1000);
  }
});
