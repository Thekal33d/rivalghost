export interface Operation {id:number;title:string;detail:string;state:'pending'|'success'|'error';started:number;receipt?:string}
let current:Operation|null=null,sequence=0;const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export const operationSnapshot=()=>current;
export function subscribeOperation(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function dismissOperation(){if(current?.state!=='pending'){current=null;emit();}}
export function operationStage(detail:string){if(current?.state==='pending'){current={...current,detail};emit();}}
/** Serializes user mutations. An uncertain failure is reported, never silently resubmitted. */
export async function withOperation<T>(title:string,fn:()=>Promise<T>):Promise<T>{
 if(current?.state==='pending')throw new Error('Another action is still processing. Wait for its result before trying again.');
 const id=++sequence;current={id,title,detail:'Preparing your request…',state:'pending',started:Date.now()};emit();
 try{const result=await fn();const receipt=(result as {transactionHash?:unknown}|null)?.transactionHash;current={...current!,state:'success',detail:'Finished successfully.',...(typeof receipt==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(receipt)?{receipt}:{})};emit();return result;}
 catch(error){current={...current!,state:'error',detail:error instanceof Error?error.message:'This action could not finish. Please check its status before trying again.'};emit();throw error;}
}
export function requestTitle(path:string,body:any){
 if(path==='workshop/action')return ({job:'Reserving your salvage flight',claim:'Checking your flight and reward',craft:'Crafting your trail',equip:'Equipping your trail',sell:'Selling salvage to MOTH',buySalvage:'Buying salvage',list:'Listing your cosmetic',buy:'Buying a pilot cosmetic',cancel:'Returning your listed item',repair:'Restoring the district',cancelJob:'Releasing your job reservation'} as Record<string,string>)[body?.action]??'Updating your workshop';
 return ({'economy/join':'Activating your pilot','economy/start':'Reserving your Crown challenge','economy/defend':'Funding your Crown defense','economy/settle':'Checking your flight and settlement','social/profile':'Saving your callsign and style','social/publish':'Publishing your ghost','social/rival':'Updating your rivals'} as Record<string,string>)[path];
}
