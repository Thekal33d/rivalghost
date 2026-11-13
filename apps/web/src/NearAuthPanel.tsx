import {isNearAuthReturn} from './near-auth-return';
import {useEffect,useState} from 'react';
import {socialRequest,IDENTITY_KEY} from './social-client';
export function NearAuthPanel({hasPilot,connected=false,onChanged}:{hasPilot:boolean;connected?:boolean;onChanged:()=>void}){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(sessionStorage.getItem('rivalghost.auth.error')??'Checking sign-in availability…'),[chain,setChain]=useState(false);
 useEffect(()=>{void socialRequest('chain/config').then(c=>setChain(c.enabled)).catch(()=>{});},[]);
 useEffect(()=>{let alive=true;void socialRequest('near-auth/config').then(c=>{if(alive){setEnabled(c.enabled);if(!sessionStorage.getItem('rivalghost.auth.error')&&!isNearAuthReturn())setMessage(c.enabled?(connected?'Step 1 complete: signed in with NEAR. You can now authorize this browser.':'Step 1: sign in with NEAR. Then authorize your game session below.'):'Testnet sponsor setup is pending. Free play and your local pilot are available.');}}).catch(()=>{if(alive)setMessage('Sign-in service is unavailable. Keep playing locally.');});return()=>{alive=false;};},[connected]);
 useEffect(()=>{
  if(!isNearAuthReturn())return;
  let alive=true;setBusy(true);setMessage('Verifying your account…');
  void import('./near-auth-client').then(m=>m.finishNearLogin()).then(async result=>{
   if(!alive)return;
   onChanged();setMessage(result.economyAuthorized?'Game session confirmed on NEAR. Open Workshop or Crown Pit.':'Step 1 complete: NEAR account connected. Authorize your game session next.');
   // Profile loading is optional; its failure must not turn a verified login into an auth error.
   try{const p=(await socialRequest('social/me')).profile;if(p)localStorage.setItem(IDENTITY_KEY,JSON.stringify(p));else localStorage.removeItem(IDENTITY_KEY);}catch{/* Existing profile remains until the next successful refresh. */}
   window.dispatchEvent(new Event('rivalghost:identity'));
  }).catch(e=>{if(alive)setMessage(e.message);}).finally(()=>{if(alive)setBusy(false);});
  return()=>{alive=false;};
 },[onChanged]);
 async function connect(mode:'link'|'signin'){setBusy(true);setMessage('Opening NEAR Auth…');try{await(await import('./near-auth-client')).beginNearLogin(mode);}catch(e){setMessage((e as Error).message);setBusy(false);}}
 return <div className="near-auth-panel"><p className="eyebrow">NEAR AUTH / TESTNET</p><p role="status">{message}</p>{hasPilot&&<button className="pilot-save" disabled={!enabled||busy} onClick={()=>void connect('link')}>LINK THIS PILOT TO NEAR ↗</button>}{!connected&&<button className="text-button" disabled={!enabled||busy} onClick={()=>void connect('signin')}>SIGN IN TO A NEAR PILOT →</button>}{chain&&<><p className="eyebrow">STEP 2 / GAME SESSION</p>{!connected&&<p>Finish NEAR sign-in first. No account authorization has been submitted.</p>}<p>Authorize this browser for 12 hours to spend game CR, trade cosmetics and reserve flights. It cannot transfer NEAR. On-chain balances start separately from demo balances.</p><button className="pilot-save" disabled={!enabled||!connected||busy} onClick={()=>{setBusy(true);void import('./guest-key').then(m=>m.getOrCreatePilotKey()).then(k=>import('./near-auth-client').then(m=>m.beginEconomySession(k.publicKey))).catch(e=>{setMessage(e.message);setBusy(false);});}}>AUTHORIZE GAME SESSION →</button><button className="text-button" disabled={!connected||busy} onClick={()=>{setBusy(true);void import('./chain-client').then(m=>m.recoverChainAction()).then(r=>setMessage('Confirmed on NEAR: '+r.transactionHash)).catch(e=>setMessage(e.message)).finally(()=>setBusy(false));}}>RECOVER PENDING TRANSACTION</button></>}<small>Linking keeps your pilot identity. Signing in never merges balances or grants extra credits.</small></div>;
}
