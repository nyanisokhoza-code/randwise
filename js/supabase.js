// ── Supabase config + API helpers ──
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
