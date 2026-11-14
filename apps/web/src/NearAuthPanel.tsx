import {isNearAuthReturn} from './near-auth-return';
import {useEffect,useState} from 'react';
import {socialRequest,IDENTITY_KEY} from './social-client';
export function NearAuthPanel({hasPilot,connected=false,onChanged}:{hasPilot:boolean;connected?:boolean;onChanged:()=>void}){
 const [revision,setRevision]=useState(0),[clock,setClock]=useState(Date.now());
 const [gameSession,setGameSession]=useState<{state:'checking'|'ready'|'required'|'unavailable';until?:number;cr?:number;otherDevice?:boolean}>({state:'checking'});
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(sessionStorage.getItem('rivalghost.auth.error')??'Checking sign-in availability…'),[chain,setChain]=useState(false);
 useEffect(()=>{
  let alive=true;setGameSession({state:'checking'});
  void Promise.all([socialRequest('chain/config'),connected?import('./guest-key').then(m=>m.readPilotKey()):Promise.resolve(null)]).then(([c,key])=>{
   if(!alive)return;setChain(c.enabled);
   const p=c.pilot,matches=!!key&&Array.isArray(p?.session_key)&&p.session_key.map((n:number)=>n.toString(16).padStart(2,'0')).join('')===key.publicKey;
   setGameSession(connected&&matches&&p.session_until>Date.now()?{state:'ready',until:p.session_until,cr:p.cr}:{state:'required',otherDevice:connected&&!!p&&p.session_until>Date.now()&&!matches});
  }).catch(()=>{if(alive)setGameSession({state:'unavailable'});});
  return()=>{alive=false;};
 },[connected,revision]);
 useEffect(()=>{const tick=setInterval(()=>setClock(Date.now()),1000),refresh=()=>{setClock(Date.now());setRevision(v=>v+1);};window.addEventListener('focus',refresh);return()=>{clearInterval(tick);window.removeEventListener('focus',refresh);};},[]);
 const active=connected&&gameSession.state==='ready'&&Number(gameSession.until)>clock;

 useEffect(()=>{let alive=true;void socialRequest('near-auth/config').then(c=>{if(alive){setEnabled(c.enabled);if(!sessionStorage.getItem('rivalghost.auth.error')&&!isNearAuthReturn())setMessage(c.enabled?(connected?'Step 1 complete: signed in with NEAR.':'Step 1: sign in with NEAR. Then authorize your game session below.'):'NEAR sign-in is not enabled on this site yet. Free play and your local pilot are available.');}}).catch(()=>{if(alive)setMessage('Sign-in service is unavailable. Keep playing locally.');});return()=>{alive=false;};},[connected]);
 useEffect(()=>{
  if(!isNearAuthReturn())return;
  let alive=true;setBusy(true);setMessage('Verifying your account…');
  void import('./near-auth-client').then(m=>m.finishNearLogin()).then(async result=>{
   if(!alive)return;
   onChanged();setRevision(v=>v+1);setMessage(result.economyAuthorized?'Game session confirmed on NEAR. Open Workshop or Crown Pit.':'Step 1 complete: NEAR account connected. Authorize your game session next.');
   // Profile loading is optional; its failure must not turn a verified login into an auth error.
   try{const p=(await socialRequest('social/me')).profile;if(p)localStorage.setItem(IDENTITY_KEY,JSON.stringify(p));else localStorage.removeItem(IDENTITY_KEY);}catch{/* Existing profile remains until the next successful refresh. */}
   window.dispatchEvent(new Event('rivalghost:identity'));
  }).catch(e=>{if(alive)setMessage(e.message);}).finally(()=>{if(alive)setBusy(false);});
  return()=>{alive=false;};
 },[onChanged]);
 async function connect(mode:'link'|'signin'){setBusy(true);setMessage('Opening NEAR Auth. After the popup, we’ll verify your pilot securely…');try{await(await import('./near-auth-client')).beginNearLogin(mode);}catch(e){setMessage((e as Error).message);setBusy(false);}}
 return <div className="near-auth-panel">
  <p className="eyebrow">NEAR AUTH / TESTNET</p><p role="status">{message}</p>
  {hasPilot&&<button className="pilot-save" disabled={!enabled||busy} onClick={()=>void connect('link')}>LINK THIS PILOT TO NEAR ↗</button>}
  {!connected&&<button className="text-button" disabled={!enabled||busy} onClick={()=>void connect('signin')}>SIGN IN TO A NEAR PILOT →</button>}
  {chain&&<>
   <p className="eyebrow">{active?'GAME SESSION ACTIVE ✓':'STEP 2 / GAME SESSION'}</p>
   {!connected&&<p>Finish NEAR sign-in first. No account authorization has been submitted.</p>}
   {active?<div className="pilot-status" role="status">
    This browser is authorized. You have {gameSession.cr} CR on NEAR testnet.
    <small>Active until <time dateTime={new Date(gameSession.until!).toISOString()}>{new Date(gameSession.until!).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</time>.</small>
    <small>Open Workshop or Crown Pit. No need to authorize again while this session is active.</small>
   </div>:<>
    {connected&&gameSession.state==='checking'?<p role="status">Checking this browser’s on-chain session…</p>:gameSession.state==='unavailable'?<p role="status">Session status is unavailable. Check again before starting another authorization.</p>:<>
     {gameSession.otherDevice&&<p>Another browser is authorized. Authorizing here replaces that browser’s game session.</p>}
     {connected&&gameSession.state==='ready'&&<p>Your game session has expired. Authorize again to continue using on-chain items and CR.</p>}
     <p>Authorize this browser for 12 hours to spend game CR, trade cosmetics and reserve flights. It cannot transfer NEAR. On-chain balances start separately from demo balances.</p>
    </>}
    {gameSession.state==='unavailable'?<button className="pilot-save" disabled={busy} onClick={()=>setRevision(v=>v+1)}>CHECK SESSION STATUS →</button>:<button className="pilot-save" disabled={!enabled||!connected||busy||gameSession.state==='checking'} onClick={()=>{
     setBusy(true);void import('./guest-key').then(m=>m.getOrCreatePilotKey()).then(k=>import('./near-auth-client').then(m=>m.beginEconomySession(k.publicKey))).catch(e=>{setMessage(e.message);setBusy(false);});
    }}>{gameSession.state==='checking'?'CHECKING SESSION…':'AUTHORIZE GAME SESSION →'}</button>}
   </>}
   <button className="text-button" disabled={!connected||busy} onClick={()=>{setBusy(true);void import('./chain-client').then(m=>m.recoverChainAction()).then(r=>{setMessage('Confirmed on NEAR: '+r.transactionHash);setRevision(v=>v+1);}).catch(e=>setMessage(e.message)).finally(()=>setBusy(false));}}>RECOVER PENDING TRANSACTION</button>
  </>}
  <small>Linking keeps your pilot identity. Signing in never merges balances or grants extra credits.</small>
 </div>;
}
