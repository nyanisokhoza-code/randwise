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

