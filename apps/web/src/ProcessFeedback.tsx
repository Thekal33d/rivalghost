import {useEffect,useState,useSyncExternalStore} from 'react';
import {GameDialog} from './GameDialog';
import {subscribeOperation,operationSnapshot,dismissOperation} from './operation-state';
export function ProcessFeedback(){
 const op=useSyncExternalStore(subscribeOperation,operationSnapshot),[hidden,setHidden]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(op?.state!=='pending')return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[op?.id,op?.state]);
 useEffect(()=>{if(op?.state!=='success')return;const id=setTimeout(()=>{if(operationSnapshot()?.id===op.id)dismissOperation();},6500);return()=>clearTimeout(id);},[op?.id,op?.state]);
 if(!op)return null;const key=op.id+':'+op.state,elapsed=Math.max(0,Math.floor((now-op.started)/1000));
 const close=()=>{setHidden(key);if(op.state!=='pending')dismissOperation();};
 if(op.state==='success')return <aside className="process-toast" role="status"><span className="process-check">✓</span><div><strong>{op.title}</strong><p>Complete{op.receipt?' · confirmed on NEAR':''}</p>{op.receipt&&<a href={'https://testnet.nearblocks.io/txns/'+op.receipt} target="_blank" rel="noreferrer">VIEW RECEIPT</a>}</div><button aria-label="Dismiss completion" onClick={close}>×</button></aside>;
 if(hidden===key)return <button className="process-mini" onClick={()=>setHidden('')}><span className="process-spinner"/> {op.title} · show progress</button>;
 return <GameDialog title={op.title} eyebrow={op.state==='pending'?'FLIGHT CONTROL / WORKING':'FLIGHT CONTROL / NEEDS ATTENTION'} onClose={close}>
  <div role={op.state==='error'?'alert':'status'} aria-live="polite">{op.state==='pending'&&<span className="process-spinner"/>}<p>{op.detail}</p></div>
  {op.state==='pending'?<><p className="process-time">{elapsed}s elapsed</p><p>{elapsed>=20?'Still waiting for a response. Your request has not been submitted again.':'You can close this panel while the request continues.'}</p><button className="text-button" onClick={close}>HIDE PROGRESS</button></>:<>{/NEAR|transaction|confirm|settle|receipt/i.test(op.detail)&&<p>If a transaction is still confirming, use its recovery action in Pilot Identity. A timeout does not mean it failed on NEAR.</p>}<button className="pilot-save" onClick={close}>GOT IT</button></>}
 </GameDialog>;
}
