import {NearAuthPanel} from './NearAuthPanel';
import {useEffect,useState,useCallback} from "react";
import {ArcadeButton,Icon} from './Brand';
import {getOrCreatePilotKey,readPilotKey,signGuestChallenge} from "./guest-key";
interface Guest {id:string;publicKey:string;accountId:string|null;state:"local"|"pending"|"ready"}
interface Session {guest:Guest|null;onlineAvailable:boolean;authMethod?:string}
async function request(path:string,body?:unknown){
  const response=await fetch(`/api/guest/${path}`,{method:body===undefined?"GET":"POST",credentials:"same-origin",headers:body===undefined?{}:{"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error??"Pilot service unavailable");return data;
}
/** Device pilot save + NEAR sign-in, shown inline on the Pilot screen. */
export function PilotAccount({username,onDone}:{username?:string;onDone:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [session,setSession]=useState<Session>({guest:null,onlineAvailable:false}),[hasKey,setHasKey]=useState(false);
  useEffect(()=>{let active=true;void Promise.all([readPilotKey(),request("me")]).then(([key,data])=>{if(active){setHasKey(Boolean(key));if(data.authMethod==="near"||(key&&data.guest?.publicKey===key.publicKey))setSession(data);else setSession({guest:null,onlineAvailable:data.onlineAvailable});}}).catch(()=>{});return()=>{active=false;};},[username]);
  async function connect(){
    setBusy(true);setError("");
    try {
      const key=await getOrCreatePilotKey();setHasKey(true);
      const challenge=await request("challenge",{publicKey:key.publicKey});
      const signature=await signGuestChallenge(key,challenge,location.origin);
      const signed:Session=await request("session",{nonce:challenge.nonce,publicKey:key.publicKey,signature});setSession(signed);
      if(signed.onlineAvailable){const provisioned:Session=await request("provision",{});setSession(provisioned);}
    }catch{setError("We couldn’t finish connecting your pilot. Keep flying locally and try again shortly.");}finally{setBusy(false);}
  }

  const refresh=useCallback(()=>{void request("me").then(setSession);},[]);
  const guest=session.guest,near=session.authMethod==='near';
  async function logout(){setBusy(true);try{await request('logout',{});await(await import('./near-auth-client')).clearNearLogin();setSession({guest:null,onlineAvailable:false});localStorage.removeItem('rivalghost.pilot-profile.v1');window.dispatchEvent(new Event('rivalghost:identity'));}catch{setError('Could not finish signing out. Try again.');}finally{setBusy(false);}}
  return <section id="pilot-onboarding" className="pilot-account" aria-label="Save your pilot">
    <div className="pilot-account-head"><h2>{guest?(username??`GHOST-${guest.id.slice(0,4).toUpperCase()}`):"MAKE IT YOURS."}</h2><span>{near?"YOUR PILOT. YOUR ACCOUNT.":"YOUR PILOT. YOUR DEVICE."}</span></div>
    <p>{near?"Your server pilot is linked to your NEAR account. Medals and best flights remain on this device.":guest?"Your pilot is saved in this browser. Your medals and best flights stay here too.":"Save a guest pilot without a wallet popup. Free play is always available."}</p>
    {guest&&!near&&<p className="pilot-status">{guest.state==="ready"?"NEAR testnet account ready":guest.state==="pending"?"Online account setup pending":"Saved here · link NEAR for on-chain rivalry"}{guest.state==="ready"&&<small>{guest.accountId}</small>}</p>}
    {error&&<p role="status" className="pilot-error">{error}</p>}
    {!guest&&<ArcadeButton size="md" className="pilot-account-save" disabled={busy} onClick={()=>void connect()}><Icon name="check" size={24}/>{busy?"SAVING YOUR PILOT…":hasKey?"RECONNECT THIS PILOT":"SAVE IN THIS BROWSER"}</ArcadeButton>}
    {guest&&!near&&guest.state!=="ready"&&session.onlineAvailable&&<ArcadeButton tone="steel" size="sm" disabled={busy} onClick={()=>void connect()}><Icon name="refresh" size={18}/>{busy?"CHECKING ACCOUNT…":"RETRY ONLINE SETUP"}</ArcadeButton>}
    {near?<><p className="pilot-status">NEAR identity verified<small>{guest?.accountId}</small></p><button className="text-button" disabled={busy} onClick={()=>void logout()}>SIGN OUT</button></>:null}
    <NearAuthPanel hasPilot={!near&&!!guest} connected={near} onChanged={refresh}/>
    <p className="pilot-disclosure">{near?"Use NEAR Auth to recover your server pilot on another device. Local campaign saves do not sync yet.":"Local-only pilots depend on this browser. Link your pilot when NEAR Auth is available to recover its server identity later."}</p>
    <button className="link-button pilot-account-done" onClick={onDone}>{guest?"BACK TO THE HANGAR":"KEEP PLAYING FOR NOW"}</button>
  </section>;
}
