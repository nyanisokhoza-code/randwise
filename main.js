// ── MAIN APP LOGIC ─────────────────────────────────────────────
// Supabase config, budget calculations, transaction management,
// screen routing, onboarding, home dashboard rendering.
const SB='https://mmezkseblafurjolkfkt.supabase.co';
const APP_URL='https://myrandwise.co.za';
const AK='sb_publishable_AKYpC4L4qBnwt1Gu3oWTSQ_KwKQ0tGm';
// Always use user JWT when available so RLS policies work correctly
async function refreshTokenIfNeeded(){
  const tok=localStorage.getItem('rw_token');
  const ref=localStorage.getItem('rw_refresh');
  if(!tok)return;
  try{
    const payload=JSON.parse(atob(tok.split('.')[1]));
    const expiresIn=(payload.exp*1000)-Date.now();
    // Token still valid with >10 min left — no action needed
    if(expiresIn>600000)return;
    // Token expired or expiring — try to refresh
    if(!ref){
      // No refresh token — clear and force re-login
      localStorage.removeItem('rw_token');
      localStorage.removeItem('rw_user');
      return;
    }
    const res=await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',
      headers:{'apikey':AK,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:ref}),
      signal:AbortSignal.timeout(3000)
    });
    const data=await res.json();
    if(data.access_token){
      localStorage.setItem('rw_token',data.access_token);
      if(data.refresh_token)localStorage.setItem('rw_refresh',data.refresh_token);
    } else {
      // Refresh failed — clear everything and force re-login
      localStorage.removeItem('rw_token');
      localStorage.removeItem('rw_refresh');
      localStorage.removeItem('rw_user');
    }
  }catch(e){console.warn('Token refresh failed:',e);}
}
function getH(){
  const tok=localStorage.getItem('rw_token');
  return{'apikey':AK,'Authorization':'Bearer '+(tok||AK),'Content-Type':'application/json'};
}
const H={'apikey':AK,'Authorization':'Bearer '+AK,'Content-Type':'application/json'};
let user=null,expenses=[],selectedCat=null,debts=[];
let ob={stage:'',stageEmoji:'',incomeType:'',income:'',incomeFreq:'Monthly',goals:[],name:'',email:'',password:'',referralCode:''};
// Auto-fill referral code from URL ?ref= OR from localStorage (set by refer.html)
(()=>{
  const p=new URLSearchParams(window.location.search);
  const rc=p.get('ref')||localStorage.getItem('rw_pending_ref')||'';
  if(rc){
    ob.referralCode=rc;
    const el=document.getElementById('r-ref');
    if(el) el.value=rc;
  }
})();
let step=1;
const CATS=[
  {id:'groceries',e:'🛒',l:'Groceries',c:'#1a7a4a'},{id:'transport',e:'🚌',l:'Transport',c:'#639922'},
  {id:'airtime',e:'📱',l:'Airtime',c:'#ba7517'},{id:'eating',e:'🍽️',l:'Eating out',c:'#a32d2d'},
  {id:'kids',e:'👶',l:'Kids',c:'#534ab7'},{id:'health',e:'💊',l:'Health',c:'#0f6e56'},
  {id:'electricity',e:'⚡',l:'Electricity',c:'#ba7517'},{id:'clothing',e:'👗',l:'Clothing',c:'#993556'},
  {id:'stokvel',e:'🤝',l:'Stokvel',c:'#1a7a4a'},{id:'hair',e:'💇',l:'Hair/Beauty',c:'#993556'},
  {id:'other',e:'📦',l:'Other',c:'#5f5e5a'}
];
async function sbP(p,b){const r=await fetch(`${SB}/rest/v1/${p}`,{method:'POST',headers:{...getH(),'Prefer':'return=representation'},body:JSON.stringify(b)});return r.json();}
async function sbG(p){const r=await fetch(`${SB}/rest/v1/${p}`,{headers:getH()});return r.json();}
async function sbD(p){await fetch(`${SB}/rest/v1/${p}`,{method:'DELETE',headers:getH()});}
async function sbPatch(p,b){await fetch(`${SB}/rest/v1/${p}`,{method:'PATCH',headers:{...getH(),'Prefer':'return=minimal'},body:JSON.stringify(b)});}
async function authPost(path,body){const r=await fetch(`${SB}/auth/v1/${path}`,{method:'POST',headers:{'apikey':AK,'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json();}
function show(id){
  if(id==='main'){
    if(sessionStorage.getItem('rw_pending_update')==='1'){
      sessionStorage.removeItem('rw_pending_update');
      const banner=document.getElementById('update-banner');
      if(banner)banner.style.display='flex';
    }
  }
  // When showing splash — always show buttons immediately (skip loader)
  // Loader is only for first-ever visit, not for sign-out returns
  if(id==='splash'){
    const loader=document.getElementById('splash-loader');
    const content=document.getElementById('splash-content');
    if(loader) loader.style.display='none';
    if(content){ content.style.display='flex'; content.style.opacity='1'; }
  }
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='none';});
  const el=document.getElementById(id);
if(el){
  el.classList.add('active');
  el.style.display='flex';
}
  // Tab bar only visible on main screen
  const tabBar=document.getElementById('main-tab-bar');
  if(tabBar) tabBar.style.display=id==='main'?'flex':'none';
  if(id==='main'&&tabBar){
    requestAnimationFrame(()=>{
      const h=tabBar.getBoundingClientRect().height;
      if(h>0) document.documentElement.style.setProperty('--tb',h+'px');
    });
  }
}
function togglePass(id,btn){const i=document.getElementById(id);i.type=i.type==='password'?'text':'password';btn.textContent=i.type==='password'?'Show':'Hide';}

// ── Onboarding ────────────────────────────────────────────────
function startOB(){step=1;ob={stage:'',stageEmoji:'',incomeType:'',income:'',incomeFreq:'Monthly',goals:[],name:'',email:'',password:'',referralCode:ob?.referralCode||''};renderStep();}
function renderStep(){
  [1,2,3,4,5].forEach(i=>document.getElementById('ob-'+i).style.display=i===step?'block':'none');
  document.getElementById('ob-prog').style.width=(step/5*100)+'%';
  document.getElementById('ob-lbl').textContent=`Step ${step} of 5`;
  document.getElementById('ob-bk').style.visibility='visible';
  document.getElementById('ob-bk').textContent=step===1?'‹ Home':'‹ Back';
  valStep();
  document.getElementById('ob-body').scrollTop=0;
}
function valStep(){
  const popiaChecked = step===5 ? (document.getElementById('popia-consent')?.checked||false) : true;
  const v=(step===1&&ob.stage)||(step===2&&ob.incomeType)||(step===3&&parseFloat(ob.income)>0)||(step===4&&ob.goals.length>0)||(step===5&&ob.name.trim().length>=2&&ob.email.includes('@')&&ob.password.length>=8&&(document.getElementById('r-phone')?.value||'').trim().length>=9&&popiaChecked&&(()=>{const p2=document.getElementById('r-pass2')?.value||'';const errEl=document.getElementById('r-pass2-err');if(p2&&p2!==ob.password){if(errEl)errEl.textContent='Passwords do not match';return false;}if(errEl)errEl.textContent='';return p2===ob.password&&p2.length>=8;})());
  const btn=document.getElementById('ob-next');
  btn.disabled=!v;
  btn.textContent=step===5?"Let's go 🚀":'Continue →';
}
function obNext(){if(step<5){step++;renderStep();}else{doRegister();}}
function obBack(){if(step>1){step--;renderStep();}else{show('splash');}}
function selStage(el){document.querySelectorAll('#stage-opts .opt').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');ob.stage=el.dataset.s;ob.stageEmoji=el.dataset.e;valStep();}
function selIType(el){document.querySelectorAll('#itype-opts .opt').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');ob.incomeType=el.dataset.t;valStep();}
function selFreq(el,f){document.querySelectorAll('.freq').forEach(c=>c.classList.remove('act'));el.classList.add('act');ob.incomeFreq=f;updInc();}
function updInc(){
  ob.income=document.getElementById('inc-in').value;
  const a=parseFloat(ob.income)||0,s=document.getElementById('inc-sum');
  if(a>0){const m=ob.incomeFreq==='Weekly'?a*4:ob.incomeFreq==='Daily'?a*22:a;s.style.display='block';s.innerHTML=`📊 Weekly budget: <strong>R${Math.round(m*.6/4).toLocaleString('en-ZA')}</strong><br>🛡️ Monthly savings: <strong>R${Math.round(m*.2).toLocaleString('en-ZA')}</strong>`;}
  else s.style.display='none';
  valStep();
}
function togGoal(el){
  el.classList.toggle('sel');
  const t=el.querySelectorAll('span')[1].textContent;
  el.querySelector('.goal-chk').textContent=el.classList.contains('sel')?'✓':'';
  if(el.classList.contains('sel'))ob.goals.push(t);else ob.goals=ob.goals.filter(g=>g!==t);
  valStep();
}
document.getElementById('name-in')&&document.getElementById('name-in').addEventListener('input',()=>{ob.name=document.getElementById('name-in').value;valStep();});
document.getElementById('r-ref')&&document.getElementById('r-ref').addEventListener('input',()=>{ob.referralCode=document.getElementById('r-ref').value.trim().toUpperCase();});
document.getElementById('r-email')&&document.getElementById('r-email').addEventListener('input',()=>{ob.email=document.getElementById('r-email').value;valStep();});
document.getElementById('r-pass')&&document.getElementById('r-pass').addEventListener('input',()=>{ob.password=document.getElementById('r-pass').value;valStep();});
document.getElementById('r-phone')&&document.getElementById('r-phone').addEventListener('input',()=>{ob.phone=document.getElementById('r-phone').value;valStep();});

async function doRegister(){
  show('saving');
  try{
    // 0. Check for duplicate email BEFORE creating auth account
    const emailCheck=await fetch(`${SB}/rest/v1/beta_testers?select=id,name&email=eq.${encodeURIComponent(ob.email.trim().toLowerCase())}`,{headers:{'apikey':AK,'Authorization':'Bearer '+AK}});
    const existing=await emailCheck.json();
    if(existing?.length>0){
      show('onboarding');
      // Show friendly inline message — don't use alert()
      const errEl=document.createElement('div');
      errEl.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
      errEl.innerHTML=`<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:320px;text-align:center">
        <div style="font-size:36px;margin-bottom:12px">👋</div>
        <div style="font-size:18px;font-weight:800;color:#111;margin-bottom:8px">You already have an account</div>
        <div style="font-size:13px;color:#666;line-height:1.6;margin-bottom:20px">An account with <strong>${ob.email}</strong> already exists. Sign in instead — your data is safe.</div>
        <button onclick="this.closest('[style*=fixed]').remove();show('login')" style="width:100%;background:#1a7a4a;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px">Sign in →</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:#f5f5f0;color:#666;border:none;border-radius:12px;padding:12px;font-size:13px;cursor:pointer">Go back</button>
      </div>`;
      document.body.appendChild(errEl);
      sendOwnerAlert('duplicate_attempt',{email:ob.email,name:ob.name});
      return;
    }
    // 1. Create Supabase Auth account
    const auth=await authPost('signup',{email:ob.email.trim().toLowerCase(),password:ob.password,options:{data:{name:ob.name.trim()}}});
    if(auth.error){
      const msg=auth.error.message||'';
      if(msg.toLowerCase().includes('already registered')||msg.toLowerCase().includes('already exists')||msg.toLowerCase().includes('user already')){
        show('onboarding');
        const errEl=document.createElement('div');
        errEl.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
        errEl.innerHTML=`<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:320px;text-align:center">
          <div style="font-size:36px;margin-bottom:12px">👋</div>
          <div style="font-size:18px;font-weight:800;color:#111;margin-bottom:8px">You already have an account</div>
          <div style="font-size:13px;color:#666;line-height:1.6;margin-bottom:20px">An account with <strong>${ob.email}</strong> already exists. Sign in instead.</div>
          <button onclick="this.closest('[style*=fixed]').remove();show('login')" style="width:100%;background:#1a7a4a;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px">Sign in →</button>
          <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:#f5f5f0;color:#666;border:none;border-radius:12px;padding:12px;font-size:13px;cursor:pointer">Go back</button>
        </div>`;
        document.body.appendChild(errEl);
        return;
      }
      throw new Error(msg||'Sign up failed');
    }
    const authId=auth.user?.id;
    // Store token immediately after signup so user is logged in right away
    if(auth.access_token){
      localStorage.setItem('rw_token',auth.access_token);
      if(auth.refresh_token)localStorage.setItem('rw_refresh',auth.refresh_token);
    }
    // 2. Create profile
    const a=parseFloat(ob.income)||0;
    const m=ob.incomeFreq==='Weekly'?a*4:ob.incomeFreq==='Daily'?a*22:a;
    const res=await sbP('beta_testers',{auth_id:authId,email:ob.email.trim().toLowerCase(),name:ob.name.trim(),language:'English',life_stage:ob.stage,life_stage_emoji:ob.stageEmoji,income_type:ob.incomeType,income_amount:m,income_freq:ob.incomeFreq,goals:ob.goals,tier:'free',consent_given:true,consented:true,referral_joined:ob.referralCode?true:false,referred_by:ob.referralCode||null,status:'active',phone:ob.phone||null});
    user=res?.[0];
    if(user){
      localStorage.setItem('rw_user',JSON.stringify(user));
      localStorage.removeItem('rw_pending_ref'); // clear referral code after use
    }
    // Fire alert email to owner (non-blocking)
    sendOwnerAlert('new_user',{name:ob.name.trim(),email:ob.email.trim(),life_stage:ob.stage,income_amount:m,referred_by:ob.referralCode||null});
    // Goal-triggered welcome email (non-blocking)
    sendGoalWelcomeEmail(ob.name.trim(), ob.email.trim().toLowerCase(), ob.goals).catch(()=>{});
    // Celebration
    document.getElementById('done-t').textContent=`Welcome, ${ob.name.trim().split(' ')[0]}! 🎉`;
    document.getElementById('done-s').textContent=`Your account is ready! Check your inbox now — click the confirmation link from MyRandWise to activate your account.`;
    document.getElementById('done-inc').textContent=`Income: R${m.toLocaleString('en-ZA')}/month`;
    document.getElementById('done-gls').textContent=`${ob.goals.length} goal${ob.goals.length!==1?'s':''} tracked`;
    showOtpScreen(ob.email.trim().toLowerCase());
  }catch(e){
    show('onboarding'); const eDiv=document.createElement('div'); eDiv.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;max-width:320px;text-align:center'; eDiv.textContent='Registration failed: '+(e.message||'Please try again'); document.body.appendChild(eDiv); setTimeout(()=>eDiv.remove(),5000);
    show('onboarding');
  }
}

// ── Login ─────────────────────────────────────────────────────
let loginAttempts=0;
async function doLogin(){
  const email=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  if(!email||!pass){showErr('l-err','Please enter your email and password');return;}
  const btn=document.getElementById('l-btn');
  btn.disabled=true;btn.textContent='Signing in...';
  hideErr('l-err');
  try{
    // Pre-check: does this email exist in our database?
    const emailCheck=await fetch(SB+'/rest/v1/beta_testers?select=id&email=eq.'+encodeURIComponent(email.toLowerCase()),{headers:{'apikey':AK,'Authorization':'Bearer '+AK}});
    const existing=await emailCheck.json();
    if(!existing?.length){
      showErr('l-err','No account found with this email. Please sign up first.');
      btn.disabled=false;btn.textContent='Sign in →';
      return;
    }
    const auth=await authPost('token?grant_type=password',{email:email.toLowerCase(),password:pass});
    if(!auth.access_token){
      loginAttempts++;
      const msg=auth.error_description||'';
      const reason=msg.includes('Invalid login')||msg.includes('invalid')||msg.includes('credentials')||msg.includes('password')?'wrong_password':
        msg.includes('confirmed')||msg.includes('verify')||msg.includes('Email not confirmed')?'not_confirmed':
        msg.includes('disabled')||msg.includes('banned')?'disabled':
        msg||'unknown';
      const friendlyMsg=reason==='wrong_password'?'Wrong email or password. Check your details and try again.':
        reason==='not_confirmed'?'Your email is not confirmed yet. Check your inbox for a confirmation email from MyRandWise and click the link, then try again.':
        reason==='disabled'?'This account has been disabled. Contact support@myrandwise.co.za':
        reason==='unknown'?'Sign in failed. Check your email and password, or tap "Forgot password" below.':
        msg;
      showErr('l-err',friendlyMsg);
      btn.disabled=false;btn.textContent='Sign in →';
      // Log to admin after first failure
      sendOwnerAlert('login_failed',{email,attempts:loginAttempts,reason});
      logLoginFailure(email, reason, loginAttempts);
      // Show help button after 1 failure
      const helpEl=document.getElementById('login-help-btn');
      if(helpEl)helpEl.style.display='block';
      return;
    }
    loginAttempts=0;
    const rows=await sbG(`beta_testers?auth_id=eq.${auth.user.id}&limit=1&select=*`);
    if(!rows?.length){
      // Auth succeeded but no profile — try matching by email
      const byEmail=await sbG(`beta_testers?email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1&select=*`);
      if(byEmail?.length){
        // Fix the auth_id mismatch silently
        await fetch(`${SB}/rest/v1/beta_testers?id=eq.${byEmail[0].id}`,{
          method:'PATCH',headers:{...H,'Prefer':'return=minimal'},
          body:JSON.stringify({auth_id:auth.user.id})
        });
        user=byEmail[0];
        user.auth_id=auth.user.id;
      } else {
        showErr('l-err','Account not found. Please register first.');
        btn.disabled=false;btn.textContent='Sign in →';return;
      }
    } else {
      user=rows[0];
    }
    localStorage.setItem('rw_user',JSON.stringify(user));
    localStorage.setItem('rw_token',auth.access_token);
    // Track last active
    sbPatch(`beta_testers?id=eq.${user.id}`,{last_active:new Date().toISOString()}).catch(()=>{});
    if(auth.refresh_token)localStorage.setItem('rw_refresh',auth.refresh_token);
    try{
      await Promise.all([
        loadExp().catch(()=>{expenses=[];}),
        sbG(`debts?tester_id=eq.${user?.id}&order=balance.asc`).then(d=>{debts=d||[];}).catch(()=>{debts=[];})
      ]);
    }catch(ex){expenses=[];debts=[];}
    await loadMonthlyNeedsFromSupabase().catch(()=>{});
    // Load debts fully (auto-syncs debit orders) and goals (updates dashboard cards)
    loadDebtsPWA().catch(()=>{});
    loadGoalsPWA().catch(()=>{});
    try{renderDash();}catch(ex){console.error('renderDash error:',ex);}
    if(!auth.user?.email_confirmed_at){
      otpEmail=user?.email||email.toLowerCase();
      document.getElementById('otp-desc').textContent='Please verify your email first. Enter the 6-digit code sent to '+otpEmail+'.';
      document.querySelectorAll('.otp-box').forEach(b=>{b.value='';b.classList.remove('filled');});
      document.getElementById('otp-err').textContent='';
      show('verify-otp');
      setTimeout(()=>document.querySelector('.otp-box')?.focus(),300);
      btn.disabled=false;btn.textContent='Sign in →';
      return;
    }
    show('main');
    try{setTimeout(showIntro,400);}catch(ex){}
    setTimeout(checkPhonePopup, 1500);
    btn.disabled=false;btn.textContent='Sign in →';
  }catch(e){
    loginAttempts++;
    const msg=e?.message||'';
    const isNetwork=msg.includes('fetch')||msg.includes('network')||msg.includes('Failed');
    showErr('l-err',isNetwork?'No connection. Check your internet and try again.':'Sign in failed. Please try again.');
    btn.disabled=false;btn.textContent='Sign in →';
    logLoginFailure(email||'unknown', isNetwork?'network_error':msg, loginAttempts);
  }
}
async function logLoginFailure(email, reason, attempts){
  try{
    await fetch(`${SB}/rest/v1/bug_reports`,{
      method:'POST',
      headers:{...H,'Prefer':'return=minimal'},
      body:JSON.stringify({
        user_id:null, user_name:email,
        error_message:`Login failed — ${reason}`,
        error_source:'login_failure',
        error_line:0,
        page_url:window.location.href,
        created_at:new Date().toISOString()
      })
    });
  }catch(e){console.warn('Login failure log error:',e);}
}
async function requestLoginHelp(){
  const email=document.getElementById('l-email').value.trim()||'unknown';
  sendOwnerAlert('login_help',{email});
  showToast('✅ Help requested — the MyRandWise team will contact you shortly');
  const helpEl=document.getElementById('login-help-btn');
  if(helpEl)helpEl.style.display='none';
}
async function handleForgot(){
  const email=document.getElementById('l-email').value.trim();
  if(!email){showErr('l-err','Enter your email first, then tap Forgot your password?');return;}
  const btn=document.querySelector('[onclick="handleForgot()"]');
  if(btn){btn.textContent='Sending...';btn.disabled=true;}
  try{
    const res=await authPost('recover',{
      email:email.toLowerCase(),
      redirectTo:'https://myrandwise.co.za/reset-password.html'
    });
    const el=document.getElementById('reset-sent');
    el.style.display='block';
    if(res.error){
      el.style.background='#fdecea';el.style.color='#a32d2d';
      el.innerHTML=`⚠️ No account found for <strong>${email}</strong>.<br><span style="font-size:12px">Did you sign up with a different email? Or <button onclick="show('splash')" style="background:none;border:none;color:#a32d2d;font-weight:700;cursor:pointer;text-decoration:underline;font-size:12px">create a new account</button>.</span>`;
      sendOwnerAlert('reset_failed',{email,error:res.error.message||'Email not found'});
    } else {
      el.style.background='#e8f5ee';el.style.color='#1a7a4a';
      el.innerHTML=`✅ Reset link sent to <strong>${email}</strong>.<br><span style="font-size:12px">Check your <strong>inbox AND spam/junk folder</strong>. Link expires in 1 hour. Come back here to sign in after resetting.</span>`;
      sendOwnerAlert('reset_requested',{email});
    }
  }catch(e){
    showErr('l-err','Could not send reset email. Please try again.');
    sendOwnerAlert('reset_error',{email,error:e.message});
  } finally {
    if(btn){btn.textContent='Forgot your password?';btn.disabled=false;}
  }
}
function showErr(id,msg){const el=document.getElementById(id);el.style.display='block';el.textContent=msg;}
function hideErr(id){document.getElementById(id).style.display='none';}

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
  // GUARD: New user with no transactions/debts should show R0 for needs
const hasTransactions = (typeof transactions !== 'undefined' && transactions && transactions.length > 0);
const hasDebts = (typeof debts !== 'undefined' && debts && debts.length > 0);
if(needsTotal > 0 && (hasTransactions || hasDebts)) {
    breakdown.push({label:'Monthly needs', amount:needsTotal});
} else if (!hasTransactions && !hasDebts) {
    breakdown.push({label:'Monthly needs', amount:0});
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

  // New header elements
  set('dg-small',gr);
  set('dg-name',name.split(' ')[0]+' 👋');
  set('ds',`${dayName}, ${dateStr}`);
  set('av',init);
  set('hdr-income','R'+inc.toLocaleString('en-ZA'));
  // Profile tab
  set('pav',init);
  set('pname',name);
  set('pstage',(user.life_stage_emoji||'')+' '+(user.life_stage||'—'));
  set('pinc',`R${inc.toLocaleString('en-ZA')}/monthly`);

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
      document.getElementById('bb-weekly').textContent='— /wk';
      document.getElementById('bb-disposable').textContent='—';
      const _bRows=document.getElementById('bb-rows');
      if(_bRows){
        let _bHtml='';
        // Salary line
        _bHtml+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8f5ee"><span style="font-size:12px;color:#2c2c2a">Monthly income</span><span style="font-size:12px;font-weight:700;color:${_bSalary?'#1a5c35':'#aaa'}">${_bSalary?'R'+Number(user?.income_amount||0).toLocaleString('en-ZA'):'—'}</span></div>`;
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
        _bHtml+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8f5ee"><span style="font-size:12px;color:${_bNeeds?'#2c2c2a':'#aaa'}">⏳ Monthly needs</span><span style="font-size:12px;font-weight:700;color:${_bNeeds?'#c62828':'#aaa'}">${_bNeeds?'−R'+(Object.values(JSON.parse(localStorage.getItem('rw_monthly_needs')||'{}')).reduce((s,v)=>s+Number(v),0)).toLocaleString('en-ZA'):'pending'}</span></div>`;
        // Tap prompt
        if(_bCount<3) _bHtml+=`<div style="font-size:11px;color:#5a8a6a;text-align:center;margin-top:8px;cursor:pointer" onclick="handleBreakdownTap()">${_bCount} of 3 confirmed — tap to continue →</div>`;
        _bRows.innerHTML=_bHtml;
      }
    } else if(budgetBreakdown&&budgetBreakdown.length>0){
    // All 3 confirmed — show real confirmed numbers using sp (confirmed disposable)
    const spWk = sp>0 ? Math.round(sp/4) : 0;
    document.getElementById('bb-weekly').textContent = spWk>0 ? 'R'+spWk.toLocaleString('en-ZA')+'/wk free' : '— /wk';
    document.getElementById('bb-disposable').textContent = sp>0 ? 'R'+sp.toLocaleString('en-ZA')+'/mo' : '—';
    const rows = document.getElementById('bb-rows');
    if(rows){
      rows.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0">
          <span style="color:#5a8a6a">Monthly income</span>
          <span style="color:#1a1a1a;font-weight:600">R${inc.toLocaleString('en-ZA')}</span>
        </div>
        ${budgetBreakdown.map(b=>`
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0">
          <span style="color:#5a8a6a">− ${b.label}</span>
          <span style="color:#c62828;font-weight:600">−R${Math.round(b.amount).toLocaleString('en-ZA')}</span>
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
  const expCount=expenses.length;
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
    return debtList.reduce((s,d)=>s+calcInterestTotal(Number(d.balance||0),Math.max(Number(d.min_payment||0),50),extra,Number(d.interest_rate||0)),0);
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
  const storeMonthsStr=m=>m<=0?'Already paid':m<12?m+' months':Math.floor(m/12)+'y '+(m%12?m%12+'mo':'');

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
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <input type="range" id="acc-slider" min="0" max="${Math.min(freePerMonth,2000)}" value="${Math.round(freePerMonth*0.12)}" step="50"
          oninput="updateAccelerator(this.value,window._accDebts)"
          style="flex:1;height:4px;border-radius:2px;accent-color:#1a7a4a">
        <span style="font-size:14px;font-weight:700;color:#1a7a4a;min-width:60px;text-align:right" id="acc-slider-val">R${Math.round(freePerMonth*0.12).toLocaleString('en-ZA')}</span>
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

  function snowballMonths(dl,ex){
    const sorted=[...dl].sort((a,b)=>Number(a.balance)-Number(b.balance));
    let roll=ex,total=0;
    for(const d of sorted){
      const bal=Number(d.balance||0);const min=Math.max(Number(d.min_payment||0),50);const r=Number(d.interest_rate||0)/100/12;
      let b=bal,pay=min+roll,m=0;
      while(b>0.01&&m<600){b=b*(1+r)-pay;if(b<0)b=0;m++;}
      total+=m;roll+=min;
    }
    return total;
  }
  function snowballInterest(dl,ex){
    return dl.reduce((s,d)=>{
      const bal=Number(d.balance||0);const min=Math.max(Number(d.min_payment||0),50);
      const rate=Number(d.interest_rate||0)||20; // default 20% if no rate set
      const r=rate/100/12;
      if(bal<=0)return s;
      const pay=min+ex;let b=bal,total=0,m=0;
      while(b>0.01&&m<600){const i=b*r;total+=i;b=b+i-pay;if(b<0)b=0;m++;}
      return s+Math.round(total);
    },0);
  }

  const storeMonths=storeDebts.length?snowballMonths(storeDebts,extra):0;
  const storeMonthsBase=storeDebts.length?snowballMonths(storeDebts,0):0;
  const intBase=snowballInterest(storeDebts,0);
  const intNew=snowballInterest(storeDebts,extra);
  const intSaved=Math.max(0,intBase-intNew);
  const monthsSaved=Math.max(0,storeMonthsBase-storeMonths);

  const fmt=m=>m<=0?'Already paid':m<12?m+' mo':Math.floor(m/12)+'y '+(m%12?m%12+'mo':'');
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

  const plan = {
    extra,
    attack_debt_id: attackDebt?.id,
    attack_debt_name: attackDebt?.name,
    committed_at: new Date().toISOString()
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

  // Update UI
  const commitBtn = document.getElementById('acc-commit-btn');
  const committedBadge = document.getElementById('acc-committed-badge');
  if(commitBtn) commitBtn.style.display = 'none';
  if(committedBadge) committedBadge.style.display = 'block';

  showToast(`🎯 Plan set! Put R${extra.toLocaleString('en-ZA')} extra onto ${attackDebt?.name||'your debt'} each month.`);
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
  // Clear form
  document.getElementById('goal-target').value='';
  document.getElementById('goal-date').value='';
  document.getElementById('goal-saved').value='0';
  document.getElementById('goal-monthly-hint').textContent='';
  // Reset chips — first chip active by default
  document.querySelectorAll('.goal-chip').forEach((c,i)=>c.classList.toggle('act',i===0));
  document.getElementById('add-goal-sheet').classList.add('open');
  document.getElementById('add-goal-ov').classList.add('open');
}

function closeAddGoalPWA(){
  document.getElementById('add-goal-sheet').classList.remove('open');
  document.getElementById('add-goal-ov').classList.remove('open');
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
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  d.innerHTML=`<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:320px;width:100%;text-align:center">
    <div style="font-size:32px;margin-bottom:12px">👋</div>
    <div style="font-size:18px;font-weight:800;color:#111;margin-bottom:8px">Sign out?</div>
    <div style="font-size:13px;color:#666;margin-bottom:20px">Your data is safely stored and will be here when you come back.</div>
    <button onclick="localStorage.removeItem('rw_user');localStorage.removeItem('rw_token');localStorage.removeItem('rw_refresh');user=null;expenses=[];debts=[];this.closest('[style*=fixed]').remove();show('splash')" style="width:100%;background:#c0392b;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px">Sign out</button>
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:#f5f5f0;color:#666;border:none;border-radius:12px;padding:12px;font-size:13px;cursor:pointer">Cancel</button>
  </div>`;
  document.body.appendChild(d);
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

function initPushToggle(){
  const enabled = isPushEnabled();
  updatePushToggle(enabled);
}

function sendLocalNotification(title, body, icon){
  if(!isPushEnabled()) return;
  try{
    new Notification(title, {
      body,
      icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231a7a4a"/><text y=".9em" font-size="80">🌱</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231a7a4a"/></svg>',
      tag: 'myrandwise',
    });
  }catch(e){ console.warn('Notification failed:', e); }
}

function schedulePushNudges(){
  if(!isPushEnabled()) return;
  if(!getSetting('daily_reminder') && !getSetting('share_nudge')) return;
  const now = new Date();
  const hour = now.getHours();
  const totalExp = expenses.reduce((s,e) => s + Number(e.amount||0), 0);
  const weekBudget = getSmartWeeklyBudget().wb;
  const pctUsed = weekBudget > 0 ? Math.round(totalExp/weekBudget*100) : 0;
  const name = user?.name?.split(' ')[0] || 'there';

  // Today's expenses
  const todayExp = expenses.filter(e => {
    const d = new Date(e.logged_at || e.created_at);
    return d.toDateString() === now.toDateString();
  });
  const todayTotal = todayExp.reduce((s,e)=>s+Number(e.amount||0),0);

  // Schedule 8pm daily reminder if user hasn't logged today
  // Works when app is open. For background delivery, Service Worker handles it.
  const msUntil8pm = (() => {
    const target = new Date(now);
    target.setHours(20, 0, 0, 0);
    if(target <= now) return 0; // already past 8pm
    return target.getTime() - now.getTime();
  })();

  if(todayExp.length === 0){
    const delay = msUntil8pm > 0 ? msUntil8pm : 0;
    if(msUntil8pm > 0){
      // Schedule for exactly 8pm
      setTimeout(()=>{
        if(!isPushEnabled()) return;
        const stillNoExp = expenses.filter(e=>new Date(e.logged_at||e.created_at).toDateString()===new Date().toDateString()).length===0;
        if(stillNoExp){
          sendLocalNotification(
            `Hey ${name}, did you spend anything today? 💸`,
            'Tap to log your expenses — it takes 20 seconds to stay on track.',
          );
        }
      }, delay);
    } else if(hour >= 20) {
      // It's already past 8pm and nothing logged
      sendLocalNotification(
        `Hey ${name}, did you spend anything today? 💸`,
        'Tap to log your expenses — it takes 20 seconds to stay on track.',
      );
    }
  }

  // Store notification schedule in localStorage for SW to check
  const notifSchedule = {
    dailyReminder: { hour: 20, enabled: todayExp.length === 0 },
    userName: name,
    weekBudget,
    pctUsed,
    payDay: user?.pay_day || 25,
    lastScheduled: now.toISOString()
  };
  localStorage.setItem('rw_notif_schedule', JSON.stringify(notifSchedule));

  // Weekly budget warning (fires immediately if already over)
  if(pctUsed >= 80 && pctUsed < 100){
    setTimeout(()=>{
      sendLocalNotification(
        `Budget alert — ${pctUsed}% used this week`,
        `You have R${Math.max(0,weekBudget-totalExp).toLocaleString('en-ZA')} left. Slow down on spending.`,
      );
    }, 10000);
  }

  // Share nudge — frequency controlled by admin
  const shareFreqMap={'weekly':7,'biweekly':14,'monthly':30};
  const shareFreqDays=shareFreqMap[getSetting('share_nudge_frequency')]||7;
  const lastShareNudge = localStorage.getItem('rw_share_nudge_week');
  const thisWeek = `${now.getFullYear()}-W${Math.ceil(now.getDate()/7)}`;
  if(now.getDay() === 6 && lastShareNudge !== thisWeek){ // Saturday
    localStorage.setItem('rw_share_nudge_week', thisWeek);
    setTimeout(()=>{
      sendLocalNotification(
        'Know someone struggling with money? 🌱',
        'Share MyRandWise — it could change their financial life.',
      );
    }, 15000);
  }

  // Payday
  const payDay = user?.pay_day || 25;
  if(now.getDate() === payDay){
    setTimeout(()=>{
      sendLocalNotification(
        `🎉 Payday, ${name}! Plan your month now`,
        'Your salary should be hitting. Open MyRandWise to allocate your budget.',
      );
    }, 3000);
  }
}

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

function isLockEnabled(){ return localStorage.getItem(LOCK_KEY)==='1'; }
function getLockPin(){ return localStorage.getItem(LOCK_PIN_KEY)||''; }

function initLock(){
  const enabled=isLockEnabled();
  const toggle=document.getElementById('lock-toggle');
  const track=document.getElementById('lock-toggle-track');
  const thumb=document.getElementById('lock-toggle-thumb');
  const changeBtn=document.getElementById('change-pin-btn');
  if(toggle) toggle.checked=enabled;
  if(track) track.style.background=enabled?'#1a5c35':'#ccc';
  if(thumb) thumb.style.transform=enabled?'translateX(20px)':'translateX(0)';
  if(changeBtn) changeBtn.style.display=enabled?'block':'none';

  // Fingerprint only works reliably in native APK, not PWA browser
  // Hide it in browser to avoid confusion — will show in proper APK
  const bioBtn=document.getElementById('lock-bio-btn');
  if(bioBtn){
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isAndroidApp = document.referrer.includes('android-app://');
    if((isStandalone || isAndroidApp) && window.PublicKeyCredential){
      bioBtn.style.display='flex';
    } else {
      bioBtn.style.display='none';
    }
  }
}

function toggleAppLock(enabled){
  const track=document.getElementById('lock-toggle-track');
  const thumb=document.getElementById('lock-toggle-thumb');
  const changeBtn=document.getElementById('change-pin-btn');
  if(track) track.style.background=enabled?'#1a5c35':'#ccc';
  if(thumb) thumb.style.transform=enabled?'translateX(20px)':'translateX(0)';
  if(enabled){
    // Must set PIN first
    openSetPin('set');
  } else {
    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(LOCK_PIN_KEY);
    if(changeBtn) changeBtn.style.display='none';
    showToast('App lock disabled');
    stopLockTimer();
  }
}

function startLockTimer(){
  if(!isLockEnabled()) return;
  stopLockTimer();
  lockTimer=setTimeout(()=>{ showLockScreen(); }, LOCK_TIMEOUT);
}

function stopLockTimer(){
  if(lockTimer){ clearTimeout(lockTimer); lockTimer=null; }
}

function resetLockTimer(){
  if(!isLockEnabled()) return;
  stopLockTimer();
  startLockTimer();
}

function showLockScreen(){
  if(!isLockEnabled()||!getLockPin()) return;
  lockPinEntry='';
  lockFailCount=0;
  updateLockDots();
  const errEl=document.getElementById('lock-error');
  if(errEl){ errEl.style.display='none'; errEl.textContent=''; }
  document.getElementById('lock-subtitle').textContent='Enter your PIN';
  const ls=document.getElementById('app-lock-screen');
  if(ls) ls.style.display='flex';
  stopLockTimer();
}

function hideLockScreen(){
  const ls=document.getElementById('app-lock-screen');
  if(ls) ls.style.display='none';
  startLockTimer();
}

function updateLockDots(){
  const dots=document.querySelectorAll('.ldot');
  dots.forEach((d,i)=>{
    d.style.background=i<lockPinEntry.length?'#4ade80':'rgba(255,255,255,.2)';
  });
}

function lockPinTap(digit){
  if(lockPinEntry.length>=4) return;
  lockPinEntry+=digit;
  updateLockDots();
  if(lockPinEntry.length===4){
    setTimeout(()=>checkLockPin(), 150);
  }
}

function lockPinBack(){
  lockPinEntry=lockPinEntry.slice(0,-1);
  updateLockDots();
}

async function checkLockPin(){
  const stored=getLockPin();
  // Compare hash of entered PIN to stored hash
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(lockPinEntry));
  const hash=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(hash===stored){
    // Correct
    lockFailCount=0;
    hideLockScreen();
  } else {
    // Wrong
    lockFailCount++;
    lockPinEntry='';
    updateLockDots();
    const errEl=document.getElementById('lock-error');
    if(errEl){
      errEl.style.display='block';
      errEl.textContent=lockFailCount>=3?
        `${lockFailCount} wrong attempts — tap "Forgot PIN?" to use your password`:
        'Incorrect PIN — try again';
    }
    // Shake animation
    const dots=document.getElementById('lock-dots');
    if(dots){
      dots.style.animation='none';
      dots.offsetHeight; // reflow
      dots.style.animation='shake .4s ease';
    }
  }
}

async function lockBiometric(){
  // Check basic support
  if(!window.PublicKeyCredential){
    showToast('Biometrics not supported on this device/browser');
    return;
  }
  try{
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if(!available){
      showToast('No fingerprint sensor found — use your PIN');
      return;
    }

    // Update subtitle to show we're waiting
    const sub = document.getElementById('lock-subtitle');
    if(sub) sub.textContent = 'Waiting for fingerprint...';

    // PWA fingerprint approach: create a temporary credential to trigger biometric prompt
    // We register a new credential each time (no server needed)
    const userId = new TextEncoder().encode(user?.id || 'myrandwise-user');
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Try to authenticate with any existing platform credential first
    const assertResult = await navigator.credentials.get({
      publicKey:{
        challenge,
        timeout: 30000,
        userVerification: 'required',
        rpId: window.location.hostname
      }
    }).catch(()=>null);

    if(assertResult){
      // Fingerprint verified successfully
      if(sub) sub.textContent = '✅ Fingerprint recognised';
      setTimeout(()=>hideLockScreen(), 300);
      return;
    }

    // No existing credential — register one now to trigger fingerprint
    const regResult = await navigator.credentials.create({
      publicKey:{
        challenge,
        rp:{ name:'MyRandWise', id: window.location.hostname },
        user:{ id: userId, name: user?.email||'user', displayName: user?.name||'User' },
        pubKeyCredParams:[{alg:-7,type:'public-key'},{alg:-257,type:'public-key'}],
        authenticatorSelection:{
          authenticatorAttachment:'platform',
          userVerification:'required',
          residentKey:'preferred'
        },
        timeout:30000
      }
    }).catch(()=>null);

    if(regResult){
      // Fingerprint registered and verified
      if(sub) sub.textContent = '✅ Fingerprint set up';
      setTimeout(()=>hideLockScreen(), 300);
    } else {
      if(sub) sub.textContent = 'Enter your PIN';
      showToast('Fingerprint cancelled — use your PIN');
    }
  }catch(e){
    const sub = document.getElementById('lock-subtitle');
    if(sub) sub.textContent = 'Enter your PIN';
    if(e.name === 'NotAllowedError'){
      showToast('Fingerprint cancelled — use your PIN');
    } else if(e.name === 'SecurityError'){
      showToast('Fingerprint requires HTTPS — use your PIN');
    } else {
      console.warn('Biometric error:', e.name, e.message);
      showToast('Fingerprint unavailable — use your PIN');
    }
  }
}

function lockForgotPin(){
  // Sign out and let them log back in with password
  if(true){
    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(LOCK_PIN_KEY);
    localStorage.removeItem('rw_user');
    localStorage.removeItem('rw_token');
    localStorage.removeItem('rw_refresh');
    user=null; expenses=[];
    const ls=document.getElementById('app-lock-screen');
    if(ls) ls.style.display='none';
    show('splash');
  }
}

// SET PIN flow
function openSetPin(mode){
  setPinMode=mode;
  setPinStage='first';
  setPinEntry='';
  setPinConfirm='';
  updateSetPinDots();
  const errEl=document.getElementById('set-pin-error');
  if(errEl) errEl.style.display='none';
  const title=document.getElementById('set-pin-title');
  const sub=document.getElementById('set-pin-sub');
  if(title) title.textContent=mode==='change'?'Change your PIN':'Set your PIN';
  if(sub) sub.textContent='Choose a 4-digit PIN to lock your app';
  document.getElementById('set-pin-sheet').classList.add('open');
  document.getElementById('set-pin-ov').classList.add('open');
}

function closeSetPin(){
  document.getElementById('set-pin-sheet').classList.remove('open');
  document.getElementById('set-pin-ov').classList.remove('open');
  // If user cancelled without setting PIN, turn toggle back off
  if(!getLockPin()){
    const toggle=document.getElementById('lock-toggle');
    const track=document.getElementById('lock-toggle-track');
    const thumb=document.getElementById('lock-toggle-thumb');
    if(toggle) toggle.checked=false;
    if(track) track.style.background='#ccc';
    if(thumb) thumb.style.transform='translateX(0)';
    localStorage.removeItem(LOCK_KEY);
  }
}

function updateSetPinDots(){
  const entry=setPinStage==='first'?setPinEntry:setPinConfirm;
  for(let i=0;i<4;i++){
    const d=document.getElementById('sp-d'+i);
    if(d) d.style.background=i<entry.length?'#1a5c35':'#e0e0e0';
  }
}

function setPinTap(digit){
  const entry=setPinStage==='first'?setPinEntry:setPinConfirm;
  if(entry.length>=4) return;
  if(setPinStage==='first') setPinEntry+=digit;
  else setPinConfirm+=digit;
  updateSetPinDots();
  if((setPinStage==='first'?setPinEntry:setPinConfirm).length===4){
    setTimeout(()=>handleSetPinComplete(), 150);
  }
}

function setPinBack(){
  if(setPinStage==='first') setPinEntry=setPinEntry.slice(0,-1);
  else setPinConfirm=setPinConfirm.slice(0,-1);
  updateSetPinDots();
}

function handleSetPinComplete(){
  if(setPinStage==='first'){
    // Move to confirm step
    setPinStage='confirm';
    setPinConfirm='';
    updateSetPinDots();
    const sub=document.getElementById('set-pin-sub');
    if(sub) sub.textContent='Confirm your PIN';
  } else {
    // Confirm step — check match
    if(setPinEntry===setPinConfirm){
      // Save and enable
      // Store as SHA-256 hash — never store plain PIN
      crypto.subtle.digest('SHA-256',new TextEncoder().encode(setPinEntry)).then(buf=>{
        const hash=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
        localStorage.setItem(LOCK_PIN_KEY, hash);
      });
      localStorage.setItem(LOCK_KEY,'1');
      closeSetPin();
      initLock();
      startLockTimer();
      showToast('✅ App lock enabled');
    } else {
      // Mismatch — restart
      const errEl=document.getElementById('set-pin-error');
      if(errEl){ errEl.textContent="PINs don't match — try again"; errEl.style.display='block'; }
      setPinEntry=''; setPinConfirm=''; setPinStage='first';
      updateSetPinDots();
      const sub=document.getElementById('set-pin-sub');
      if(sub) sub.textContent='Choose a 4-digit PIN to lock your app';
    }
  }
}

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
    const dateEl=document.getElementById('ai-nudge-date');
    if(dateEl)dateEl.textContent='Generated today · Tap ↻ to refresh';
    forceTop(); // Keep scroll at top after showing card
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

function toggleNudgeExpand(){
  const body = document.getElementById('nudge-body');
  const icon = document.getElementById('nudge-toggle-icon');
  if(!body) return;
  const expanded = body.style.display !== 'none';
  body.style.display = expanded ? 'none' : 'block';
  if(icon) icon.textContent = expanded ? '▼' : '▲';
}

function dismissAINudge(){
  const card=document.getElementById('ai-nudge-card');
  if(card)card.style.display='none';
  localStorage.setItem('rw_nudge_dismissed',new Date().toDateString());
}

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
