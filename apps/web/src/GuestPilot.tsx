import {useEffect,useRef,useState} from "react";
import {getOrCreatePilotKey,readPilotKey,signGuestChallenge} from "./guest-key";
interface Guest {id:string;publicKey:string;accountId:string|null;state:"local"|"pending"|"ready"}
interface Session {guest:Guest|null;onlineAvailable:boolean}
async function request(path:string,body?:unknown){
  const response=await fetch(`/api/guest/${path}`,{method:body===undefined?"GET":"POST",credentials:"same-origin",headers:body===undefined?{}:{"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error??"Pilot service unavailable");return data;
}
export function GuestPilot(){
  const toggle=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [session,setSession]=useState<Session>({guest:null,onlineAvailable:false}),[hasKey,setHasKey]=useState(false);
  useEffect(()=>{let active=true;void Promise.all([readPilotKey(),request("me")]).then(([key,data])=>{if(active){setHasKey(Boolean(key));if(key&&data.guest?.publicKey===key.publicKey)setSession(data);else setSession({guest:null,onlineAvailable:data.onlineAvailable});}}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);toggle.current?.focus();}};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[open]);
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

  const guest=session.guest;
  return <div className="guest-pilot">
    <button ref={toggle} className="pilot-toggle" aria-expanded={open} aria-controls="pilot-onboarding" onClick={()=>setOpen(v=>!v)}>{guest?"PILOT SAVED ✓":hasKey?"RECONNECT PILOT":"SAVE PILOT"}</button>
    {open&&<section id="pilot-onboarding" className="pilot-onboarding" aria-label="Save your pilot">
      <p className="eyebrow">YOUR PILOT. YOUR DEVICE.</p><h2>{guest?`GHOST-${guest.id.slice(0,4).toUpperCase()}`:"MAKE IT YOURS."}</h2>
      <p>{guest?"Your pilot is saved in this browser. Your medals and best flights stay here too.":"Save a guest pilot without a wallet popup. Free play is always available."}</p>
      <p className="pilot-disclosure">Clearing this browser’s site data removes access to this pilot and its local progress. There’s no cross-device recovery yet.</p>
      {guest&&<p className="pilot-status">{guest.state==="ready"?"NEAR testnet account ready":guest.state==="pending"?"Online account setup pending":"Saved here · online rivalry coming soon"}{guest.state==="ready"&&<small>{guest.accountId}</small>}</p>}
      {error&&<p role="status" className="pilot-error">{error}</p>}
      {!guest&&<button className="pilot-save" disabled={busy} onClick={()=>void connect()}>{busy?"SAVING YOUR PILOT…":hasKey?"RECONNECT THIS PILOT ↗":"SAVE IN THIS BROWSER ↗"}</button>}
      {guest&&guest.state!=="ready"&&session.onlineAvailable&&<button className="pilot-save" disabled={busy} onClick={()=>void connect()}>{busy?"CHECKING ACCOUNT…":"RETRY ONLINE SETUP ↗"}</button>}
      <button className="text-button" onClick={()=>setOpen(false)}>{guest?"BACK TO THE HANGAR":"KEEP PLAYING FOR NOW"} →</button>
    </section>}
  </div>;
}
