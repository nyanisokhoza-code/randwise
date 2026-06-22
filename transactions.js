// ── Expense sheet ─────────────────────────────────────────────
function openSheet(){
  document.getElementById('cat-row').innerHTML=CATS.map(c=>`<div class="cat-p" data-id="${c.id}" data-e="${c.e}" data-n="${c.l}" data-c="${c.c}" onclick="selectCat(this)"><div class="cat-p-e">${c.e}</div><div class="cat-p-l">${c.l}</div></div>`).join('');
  selectedCat=null;document.getElementById('ea').value='';document.getElementById('en').value='';document.getElementById('save-btn').disabled=true;
  document.getElementById('ov').classList.add('open');document.getElementById('sheet').classList.add('open');
  setTimeout(()=>document.getElementById('ea').focus(),400);
}
function closeSheet(){document.getElementById('ov').classList.remove('open');document.getElementById('sheet').classList.remove('open');if(window._pendingUpdate){window._pendingUpdate=false;setTimeout(()=>window.location.reload(),400);}}
function selectCat(el){document.querySelectorAll('.cat-p').forEach(p=>p.classList.remove('sel'));el.classList.add('sel');selectedCat={id:el.dataset.id,e:el.dataset.e,n:el.dataset.n,c:el.dataset.c};chkSave();}
function setAmt(v){document.getElementById('ea').value=v;chkSave();}
function chkSave(){const a=parseFloat(document.getElementById('ea').value);document.getElementById('save-btn').disabled=!selectedCat||!a||a<=0;}
function toggleRecurringStyle(checked){
  const track=document.getElementById('rec-track');
  const thumb=document.getElementById('rec-thumb');
  if(track) track.style.background=checked?'#1a5c35':'#ccc';
  if(thumb) thumb.style.transform=checked?'translateX(20px)':'translateX(0)';
}

async function saveExp(){
  if(!selectedCat){showToast('⚠️ Pick a category first');return;}
  const a=parseFloat(document.getElementById('ea').value);
  const note=document.getElementById('en').value.trim();
  const recurring=document.getElementById('exp-recurring')?.checked||false;
  if(!a||a<=0){showToast('⚠️ Enter an amount');return;}
  const btn=document.getElementById('save-btn');
  btn.disabled=true;btn.textContent='Saving...';
  const d={tester_id:user?.id||null,category_id:selectedCat.id,category:selectedCat.n,emoji:selectedCat.e,amount:a,note:note||'',recurring:recurring||false};
  if(!user?.id){showToast('⚠️ Please sign in to save expenses');btn.disabled=false;btn.textContent='Save expense';return;}
  // Optimistic save - show immediately, sync in background
  const tid='tmp-'+Date.now();
  expenses.unshift({id:tid,...d,logged_at:new Date().toISOString()});
  renderDash();
  closeSheet();
  if(recurring) showToast(`✅ R${a.toLocaleString('en-ZA')} saved · 🔁 Recurring`);
  else showToast(`✅ R${a.toLocaleString('en-ZA')} saved`);
  btn.disabled=false; btn.textContent='Save expense';
  const recEl=document.getElementById('exp-recurring');
  if(recEl){recEl.checked=false;toggleRecurringStyle(false);}
  const expCount = expenses.length;

  // Newsletter nudge — fires after 1st expense (most engaged moment)
  if (expCount === 1 &&
      !localStorage.getItem('rw_nl_subscribed') &&
      !localStorage.getItem('rw_nl_declined') &&
      !isNlSnoozed()) {
    setTimeout(() => showNewsletterNudge(), 1800);
  }

  if(expCount===5&&!localStorage.getItem('rw_share_nudge_shown')){
    localStorage.setItem('rw_share_nudge_shown','1');
    setTimeout(()=>showShareNudge(),1500);
  }
  // Background sync to Supabase
  if(user?.id){
    try{
      await refreshTokenIfNeeded();
      const s=await sbP('expenses',d);
      if(s?.message||s?.error){
        const errMsg=s.message||s.hint||s.code||JSON.stringify(s);
        sendOwnerAlert('save_failed',{email:user?.email,error:errMsg,tester_id:user?.id});
        console.error('Expense save error:',JSON.stringify(s));
        expenses=expenses.filter(e=>e.id!==tid);
        renderDash();
        showToast('❌ ' + errMsg.substring(0,80));
      } else if(s?.[0]){
        expenses=expenses.map(e=>e.id===tid?s[0]:e);
        if(recurring){
          const recList=JSON.parse(localStorage.getItem('rw_recurring')||'[]');
          const exists=recList.find(r=>r.category===selectedCat.n&&r.amount===a);
          if(!exists){
            recList.push({category:selectedCat.n,category_id:selectedCat.id,emoji:selectedCat.e,amount:a,note:note||'',added:new Date().toISOString()});
            localStorage.setItem('rw_recurring',JSON.stringify(recList));
          }
        }
      }
    }catch(err){
      console.error('saveExp background sync failed:',err);
    }
  }
}
async function delExp(id){expenses=expenses.filter(e=>e.id!==id);renderDash();if(!id.startsWith('tmp-'))await sbD(`expenses?id=eq.${id}`);}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(t){
  // Guard: Pro-only tabs for expired free users
  const {isPro, trialActive} = getTier();
  const proOnlyTabs = ['import']; // only import is fully blocked for free
  if(!isPro && proOnlyTabs.includes(t)){
    showUpgradeWall(false);
    return;
  }
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('act'));
  const tpPane = document.getElementById('tp-'+t);
if(tpPane) tpPane.classList.add('active');
  const btn=document.getElementById('tb-'+t);
  if(btn)btn.classList.add('act');
  // Reset scroll to top
  const pane=document.getElementById('tp-'+t);
  if(pane) pane.scrollTop=0;
  const tabContent=document.querySelector('.tab-content');
  if(tabContent) tabContent.scrollTop=0;
  if(t==='home'){
    const dc=document.getElementById('dash-main-content');
    if(dc) dc.scrollTop=0;
    // Load debts (auto-syncs to debit orders) then render dash
    loadDebtsPWA().then(()=>renderDash()).catch(()=>renderDash());
    // Load goals to update savings goal card on dashboard
    loadGoalsPWA().catch(()=>{});
  }
  if(t==='debt')loadDebtsPWA();
  if(t==='grow'){loadGoalsPWA();loadStokvelList();}
  if(t==='profile'){updateBondPreview();initLock();initPushToggle();}
  if(t==='import')initImportTab();
}

// ── Edit Profile ──────────────────────────────────────────────
function openEditProfile(){
  document.getElementById('ep-name').value=user?.name||'';
  document.getElementById('ep-income').value=user?.income_amount||'';
  const pdEl=document.getElementById('ep-payday');
  if(pdEl)pdEl.value=user?.pay_day||25;
  const phEl=document.getElementById('ep-phone');
  if(phEl)phEl.value=user?.phone||'';
  document.getElementById('ep-sheet').classList.add('open');
  document.getElementById('ep-ov').classList.add('open');
}
function closeEditProfile(){
  document.getElementById('ep-sheet').classList.remove('open');
  document.getElementById('ep-ov').classList.remove('open');
}
async function saveProfile(){
  const name=document.getElementById('ep-name').value.trim();
  const income=parseFloat(document.getElementById('ep-income').value)||0;
  const payDay=parseInt(document.getElementById('ep-payday')?.value||25);
  const phone=document.getElementById('ep-phone')?.value.trim()||'';
  if(!name){showToast('Enter your name');return;}
  const btn=document.getElementById('ep-save-btn');
  btn.disabled=true;btn.textContent='Saving...';
  try{
    await fetch(`${SB}/rest/v1/beta_testers?id=eq.${user.id}`,{method:'PATCH',headers:{...H,'Prefer':'return=minimal'},body:JSON.stringify({name,income_amount:income,pay_day:payDay,phone:phone||null})});
    user.name=name;user.income_amount=income;user.pay_day=payDay;user.phone=phone;
    localStorage.setItem('rw_user',JSON.stringify(user));
    renderDash();closeEditProfile();showToast('✅ Profile updated');
    // Update pay day display
    const pdDisplay=document.getElementById('ppayday');
    if(pdDisplay)pdDisplay.textContent=payDay+(payDay===1?'st':payDay===2?'nd':payDay===3?'rd':'th');
  }catch(e){showToast('Could not save. Try again.');}
  btn.disabled=false;btn.textContent='Save changes';
}

// ── Debit Orders ──────────────────────────────────────────────
let debitOrders=JSON.parse(localStorage.getItem('rw_debit_orders')||'[]');
