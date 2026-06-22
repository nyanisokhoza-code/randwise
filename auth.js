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

