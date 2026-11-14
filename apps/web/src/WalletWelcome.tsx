import {useCallback,useEffect,useState} from 'react';
import {ArcadeButton,Icon,Ship} from './Brand';
import {GameDialog} from './GameDialog';

/** Check server authentication, never a cached callsign or the presence of wallet keys. */
export function useWalletWelcome(){
 const [checked,setChecked]=useState(false),[signedOut,setSignedOut]=useState(false),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  let alive=true,controller:AbortController|undefined;
  const refresh=async()=>{
   controller?.abort();const request=new AbortController();controller=request;
   const timeout=setTimeout(()=>request.abort(),3500);
   try{
    const read=async(path:string)=>{const response=await fetch(`/api/guest/${path}`,{credentials:'same-origin',cache:'no-store',signal:request.signal});if(!response.ok)throw new Error('Account status unavailable');return response.json();};
    const [session,config]=await Promise.all([read('me'),read('embedded/config')]);
    if(alive&&controller===request)setSignedOut(config.enabled===true&&!(session.guest?.accountId&&['near','embedded'].includes(session.authMethod)));
   }catch{if(alive&&controller===request)setSignedOut(false);}
   finally{clearTimeout(timeout);if(alive&&controller===request)setChecked(true);}
  };
  void refresh();window.addEventListener('focus',refresh);window.addEventListener('rivalghost:identity',refresh);
  return()=>{alive=false;controller?.abort();window.removeEventListener('focus',refresh);window.removeEventListener('rivalghost:identity',refresh);};
 },[]);
 // Dismiss for this opening only. A fresh load prompts again if still signed out.
 const dismiss=useCallback(()=>setDismissed(true),[]);
 return {checked,offer:checked&&signedOut&&!dismissed,dismiss};
}

export function WalletWelcome({onConnect,onPlay}:{onConnect:()=>void;onPlay:()=>void}){
 return <GameDialog className="wallet-welcome" title="YOUR PILOT. YOUR WALLET." eyebrow="WELCOME TO THE HANGAR" onClose={onPlay}>
  <div className="wallet-welcome-art" aria-hidden="true"><Ship ghost/><span className="wallet-link-line"/><Ship/><span className="wallet-link-badge"><Icon name="lock" size={15}/>MAKE THE CONNECTION</span></div>
  <p className="wallet-welcome-lead">Bring your wallet into the game.</p>
  <ul className="wallet-welcome-benefits">
   <li><Icon name="chip" size={22}/><span><b>Put your CR and items on NEAR</b><small>Use the Workshop and trade cosmetics as you unlock them.</small></span></li>
   <li><Icon name="shield" size={22}/><span><b>Bring your wallet to another device</b><small>Restore your device wallet with its encrypted backup and password.</small></span></li>
  </ul>
  <p className="wallet-welcome-setup">Create a device wallet here, or restore your encrypted backup.</p>
  <ArcadeButton tone="mint" className="wallet-welcome-connect" onClick={onConnect}><Icon name="lock" size={20}/>CONNECT MY WALLET<Icon name="chevronRight" size={20}/></ArcadeButton>
  <button className="text-button wallet-welcome-play" onClick={onPlay}>PLAY FIRST — CONNECT LATER</button>
  <p className="wallet-welcome-note">NEAR testnet · Free flights stay free. Campaign medals and best flights stay on this device. Connecting does not authorize spending.</p>
 </GameDialog>;
}
