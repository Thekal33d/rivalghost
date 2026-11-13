import {economyIntentMessage,type EconomyIntent,type ChainPilot} from '@rivalghost/game-data';
import {getOrCreatePilotKey} from './guest-key';
const PENDING='rivalghost.chain.pending.v1',ITEMS=['afterglow','ion','sunflare'],JOBS=['','recovery','courier','commission'];
export async function chainHttp(path:string,body?:unknown){
 let response:Response;try{response=await fetch('/api/guest/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});}catch{throw new Error('NEAR confirmation is unavailable. Retry the same action to recover its transaction.');}
 const data=await response.json();if(!response.ok){const error=new Error(data.error??'The chain request failed') as Error&{transactionHash?:string};error.transactionHash=data.transactionHash;throw error;}return data;
}
export async function recoverChainAction(){const pending=JSON.parse(localStorage.getItem(PENDING)??'null');if(!pending)throw new Error('No pending game transaction');try{const receipt=await chainHttp('chain/execute',{intent:pending.intent,requestId:pending.requestId});localStorage.removeItem(PENDING);return receipt;}catch(error){if(error instanceof Error&&/NEAR rejected|This transaction failed|session expired|signature does not match/.test(error.message))localStorage.removeItem(PENDING);throw error;}}
function action(path:string,body:any):[number,number,number]{
 if(path==='economy/start')return [10,Number(body.crown),0];if(path==='economy/defend')return [11,Number(body.crown),0];
 switch(body.action){
  case 'job':return [1,JOBS.indexOf(body.kind),Number(body.chapter)];
  case 'sell':return [2,Number(body.price),0];case 'buySalvage':return [3,Number(body.price),0];
  case 'craft':return [4,ITEMS.indexOf(body.item),0];case 'equip':return [5,body.item===null?3:ITEMS.indexOf(body.item),0];
  case 'list':return [6,ITEMS.indexOf(body.item),Number(body.price)];
  case 'cancel':return [7,Number(body.listing),0];case 'buy':return [8,Number(body.listing),0];
  case 'repair':return [9,Number(body.chapter),0];case 'cancelJob':return [12,Number(body.ticket),0];
  default:throw new Error('Unknown on-chain action');
 }
}
export async function chainRequest(path:string,body:any):Promise<{handled:boolean;value?:any}>{
 if(!['economy/join','economy/start','economy/defend','economy/settle','workshop/action'].includes(path))return {handled:false};
 const config=await chainHttp('chain/config');if(!config.enabled)return {handled:false};
 const me=await chainHttp('me');if(me.authMethod!=='near'||!config.actor)throw new Error('Open Pilot Identity and sign in with NEAR to use on-chain items and CR. Free play stays available.');
 if(path==='economy/settle'||body.action==='claim')return {handled:true,value:await chainHttp('chain/settle',{id:String(body.id??body.ticket),replay:body.replay})};
 const key=await getOrCreatePilotKey(),p=config.pilot as ChainPilot|null;
 const ready=!!p&&p.session_until>Date.now()&&p.session_key.map(n=>n.toString(16).padStart(2,'0')).join('')===key.publicKey;
 if(path==='economy/join'){
  if(ready)return {handled:true,value:{balance:p!.cr}};
  await(await import('./near-auth-client')).beginEconomySession(key.publicKey);return {handled:true,value:{}};
 }
 if(!ready)throw new Error('Authorize this browser’s game session in Pilot Identity, then retry. Your on-chain items are safe.');
 if(path==='economy/start'&&p!.run?.kind===0&&p!.run.slot===body.crown&&p!.run.expires>Date.now())return {handled:true,value:{id:String(p!.run.id),crown:p!.run.slot,expires:p!.run.expires,status:'live'}};
 const {requestId:_r,issuedAt:_t,...semantic}=body,fingerprint=path+'|'+JSON.stringify(semantic);
 let pending=JSON.parse(localStorage.getItem(PENDING)??'null') as {fingerprint:string;requestId:string;intent:EconomyIntent}|null;
 if(pending&&pending.fingerprint!==fingerprint)throw new Error('Recover your pending transaction in Pilot Identity before making another purchase or entry.');
 if(!pending){
  const [op,a,b]=action(path,body);const intent:EconomyIntent={actor:config.actor,nonce:p!.nonce+1,epoch:p!.session_epoch,deadline:Date.now()+240000,op,a,b,signature:[]};
  intent.signature=Array.from(new Uint8Array(await crypto.subtle.sign('Ed25519',key.privateKey,new TextEncoder().encode(economyIntentMessage(config.contractId,intent)))));
  pending={fingerprint,requestId:crypto.randomUUID(),intent};localStorage.setItem(PENDING,JSON.stringify(pending));
 }
 try{const value=await chainHttp('chain/execute',{requestId:pending.requestId,intent:pending.intent});localStorage.removeItem(PENDING);if(value.expires&&value.expires<=Date.now())throw new Error('This reservation has expired. Refresh before reserving another flight.');return {handled:true,value};}
 catch(error){if(error instanceof Error&&/expired|Stale|rejected|failed|signature|different contents/.test(error.message)&&(!(error as any).transactionHash||/NEAR rejected|This transaction failed/.test(error.message)))localStorage.removeItem(PENDING);throw error;}
}
