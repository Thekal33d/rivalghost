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
 return <GameDialog className="wallet-welcome" title="MAKE IT YOURS." eyebrow="WELCOME TO THE HANGAR" onClose={onPlay}>
  <div className="wallet-welcome-art" aria-hidden="true"><Ship ghost/><span className="wallet-link-line"/><Ship/><span className="wallet-link-badge"><Icon name="lock" size={15}/>YOUR PILOT ACCOUNT</span></div>
  <p className="wallet-welcome-lead">Sign in. Build your collection. Take on your rivals.</p>
  <ul className="wallet-welcome-benefits">
   <li><Icon name="chip" size={22}/><span><b>Make every CR count</b><small>Use the Workshop and trade cosmetics as you unlock them.</small></span></li>
   <li><Icon name="shield" size={22}/><span><b>Take your collection with you</b><small>Recover your account on another device with your recovery file and password.</small></span></li>
  </ul>
  <p className="wallet-welcome-setup">New here? Create an account. Returning? Sign in or restore your account.</p>
  <ArcadeButton tone="mint" className="wallet-welcome-connect" onClick={onConnect}><Icon name="lock" size={20}/>SIGN IN<Icon name="chevronRight" size={20}/></ArcadeButton>
  <button className="text-button wallet-welcome-play" onClick={onPlay}>PLAY FIRST</button>
  <p className="wallet-welcome-note">Free flights stay free. Campaign medals and best flights stay on this device. Signing in does not enable purchases.</p>
 </GameDialog>;
}
