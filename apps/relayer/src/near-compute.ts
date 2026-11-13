import type {GuestStore} from './guest-store.js';
export const PILOT_MODEL='Qwen/Qwen3-VL-30B-A3B-Instruct';
export const REQUEST_RESERVE_MICRO_USD=3000; // $0.003; covers the full allowed context at the pinned price ceilings.
export interface ComputeConfig {totalBudgetMicroUsd?:number;enabled:boolean;apiKey?:string;model?:string;dailyLimit:number;stakeToken?:string;organization?:string;nearAccount?:string}
type Focus='recovery'|'courier';
interface Decision {focus:Focus;source:'local'|'near-ai';at:number;responseId?:string;reason:string}
const BASE='https://cloud-api.near.ai/v1';
const fallback=(stock:number):Focus=>stock<8?'recovery':'courier';
/** Only public world aggregates leave the server. No pilot identifiers, chat or wallet keys. */
export class NearCompute {
 private pending:Promise<Decision>|null=null;
 private stakeCache:{at:number;value:StakeStatus}|null=null;
 private stakePending:Promise<StakeStatus>|null=null;
 constructor(private store:GuestStore,readonly config:ComputeConfig,private request:typeof fetch=fetch,private now=Date.now){
  if(!Number.isInteger(config.dailyLimit)||config.dailyLimit<0||config.dailyLimit>4)throw new Error('Invalid NEAR AI daily request limit');
  if(config.enabled&&(!config.apiKey||!config.model||!config.dailyLimit))throw new Error('NEAR AI needs an approved request allowance, API key and model');
  if(config.enabled&&(config.model!==PILOT_MODEL||!Number.isSafeInteger(config.totalBudgetMicroUsd)||config.totalBudgetMicroUsd!<REQUEST_RESERVE_MICRO_USD||config.totalBudgetMicroUsd!>5000000))throw new Error('NEAR AI requires the reviewed pilot model and a total budget of at most $5');
  if(config.model&&(config.model.length>150||!/^[-a-zA-Z0-9/._:]+$/.test(config.model)))throw new Error('Invalid NEAR AI model');
  if(config.organization&&!/^[a-f0-9-]{36}$/i.test(config.organization))throw new Error('Invalid Cloud organization');
  store.db.exec("CREATE TABLE IF NOT EXISTS npc_compute(id INTEGER PRIMARY KEY CHECK(id=1),day TEXT NOT NULL,calls INTEGER NOT NULL,last_attempt INTEGER NOT NULL,decision TEXT)");
  store.db.prepare("INSERT OR IGNORE INTO npc_compute VALUES(1,'',0,0,NULL)").run();
  store.db.exec('CREATE TABLE IF NOT EXISTS npc_compute_budget(id INTEGER PRIMARY KEY CHECK(id=1),reserved_micro_usd INTEGER NOT NULL CHECK(reserved_micro_usd>=0)); INSERT OR IGNORE INTO npc_compute_budget VALUES(1,0)');
 }
 status(){const r=this.store.db.prepare('SELECT * FROM npc_compute WHERE id=1').get()!,d=r.decision?JSON.parse(String(r.decision)) as Decision:null;return {enabled:this.config.enabled,model:this.config.enabled?this.config.model:null,dailyLimit:this.config.dailyLimit,callsToday:r.day===this.day()?Number(r.calls):0,source:d?.source??'local',lastDecision:d,funding:'developer-pool',attestationVerified:false,budget:{limitUsd:(this.config.totalBudgetMicroUsd??0)/1e6,reservedUsd:this.reservedMicroUsd()/1e6,perRequestUsd:REQUEST_RESERVE_MICRO_USD/1e6,kind:'conservative-reservation-not-provider-balance'}};}
 private reservedMicroUsd(){return Number(this.store.db.prepare('SELECT reserved_micro_usd FROM npc_compute_budget WHERE id=1').get()!.reserved_micro_usd);}
 private day(){return new Date(this.now()).toISOString().slice(0,10);}
 decide(stock:number,restored:number):Promise<Decision>{if(this.pending)return this.pending;this.pending=this.run(stock,restored).finally(()=>{this.pending=null;});return this.pending;}
 private async run(stock:number,restored:number):Promise<Decision>{
  if(!Number.isSafeInteger(stock)||stock<0||stock>40||!Number.isInteger(restored)||restored<0||restored>10)throw new Error('Invalid world snapshot');
  const local:Decision={focus:fallback(stock),source:'local',at:this.now(),reason:stock<8?'Restock the salvage counter.':'Bring the couriers home while inventory is healthy.'};
  if(!this.config.enabled)return local;
  const r=this.store.db.prepare('SELECT * FROM npc_compute WHERE id=1').get()!;
  if(this.now()-Number(r.last_attempt)<21600000)return r.decision?JSON.parse(String(r.decision)):local;
  if(r.day===this.day()&&Number(r.calls)>=this.config.dailyLimit)return {...local,reason:'Daily Cloud allowance reached. Local policy is running.'};
  if(this.reservedMicroUsd()+REQUEST_RESERVE_MICRO_USD>this.config.totalBudgetMicroUsd!)return {...local,reason:'Total Cloud pilot allowance reached. Local policy is running.'};
  // Reserve both limits atomically before I/O. Failures never release reservations.
  const db=this.store.db;db.exec('BEGIN IMMEDIATE');
  try{
   const reserved=db.prepare(`UPDATE npc_compute SET calls=CASE WHEN day=? THEN calls+1 ELSE 1 END,day=?,last_attempt=? WHERE id=1 AND (day<>? OR calls<?) AND last_attempt<=?`).run(this.day(),this.day(),this.now(),this.day(),this.config.dailyLimit,this.now()-21600000);
   if(!reserved.changes){db.exec('ROLLBACK');return local;}
   const budget=db.prepare('UPDATE npc_compute_budget SET reserved_micro_usd=reserved_micro_usd+? WHERE id=1 AND reserved_micro_usd+?<=?').run(REQUEST_RESERVE_MICRO_USD,REQUEST_RESERVE_MICRO_USD,this.config.totalBudgetMicroUsd!);
   if(!budget.changes){db.exec('ROLLBACK');return {...local,reason:'Total Cloud pilot allowance reached. Local policy is running.'};}
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  let decision=local;
  try{
   await this.checkModelPrice();
   const response=await this.request(BASE+'/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+this.config.apiKey,'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),body:JSON.stringify({model:this.config.model,max_tokens:64,stream:false,messages:[{role:'system',content:'You are MOTH, a salvage mechanic rebuilding an arcade city. Choose the next featured free flight. Reply only JSON {"focus":"recovery"} or {"focus":"courier"}. Low stock favors recovery; healthy stock favors rescues. No other actions.'},{role:'user',content:JSON.stringify({salvageInStock:stock,fullyRestoredDistricts:restored})}]})});
   if(!response.ok)throw new Error('Cloud unavailable');const data=await boundedJson(response),text=data?.choices?.[0]?.message?.content;
   if(typeof text!=='string'||text.length>256)throw new Error('Invalid NPC response');const choice=JSON.parse(text);
   if(!choice||Object.keys(choice).length!==1||!['recovery','courier'].includes(choice.focus))throw new Error('NPC choice rejected');
   decision={focus:choice.focus,source:'near-ai',at:this.now(),reason:choice.focus==='recovery'?'MOTH chose a salvage recovery focus.':'MOTH chose a courier rescue focus.',...(typeof data.id==='string'&&data.id.length<200?{responseId:data.id}:{})};
  }catch{decision={...local,reason:'Cloud unavailable or response rejected. Local policy is running.'};}
  this.store.db.prepare('UPDATE npc_compute SET decision=? WHERE id=1').run(JSON.stringify(decision));return decision;
 }
 /** Read-only provider catalog validation; never sends an inference request. */
 async checkModelPrice(){
  const response=await this.request(BASE+'/models',{headers:{Authorization:'Bearer '+this.config.apiKey},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Model pricing unavailable');
  const data=await boundedJson(response,262144),models=data?.data;
  if(!Array.isArray(models))throw new Error('Invalid model catalog');
  const matches=models.filter((m:any)=>m?.id===PILOT_MODEL);if(matches.length!==1)throw new Error('Pilot model unavailable');
  const model=matches[0],price=model.pricing;
  const boundedPrice=(value:unknown,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max;
  // Require both pricing representations to agree; reject new fees or reasoning billing.
  if(model.owned_by!=='nearai'||model.is_ready!==true||!Number.isSafeInteger(model.context_length)||model.context_length<1024||model.context_length>16384||!Number.isSafeInteger(model.max_output_length)||model.max_output_length<64||!Array.isArray(model.supported_features)||model.supported_features.includes('reasoning')||!model.supported_sampling_parameters?.includes('max_tokens')||!boundedPrice(price?.input,0.15)||!boundedPrice(price?.output,0.55)||typeof price.prompt!=='string'||typeof price.completion!=='string'||Math.abs(Number(price.prompt)*1e6-price.input)>1e-9||Math.abs(Number(price.completion)*1e6-price.output)>1e-9||!Number.isFinite(Number(price.prompt))||!Number.isFinite(Number(price.completion))||Number(price.request)!==0||Number(price.image)!==0)throw new Error('Model pricing or capabilities changed');
  if(Math.ceil(model.context_length*price.input+64*price.output)>REQUEST_RESERVE_MICRO_USD)throw new Error('Request exceeds reserved budget');
 }
 async stake():Promise<StakeStatus>{
  if(!this.config.stakeToken||!this.config.organization||!this.config.nearAccount)return {state:'not-configured'};
  if(this.stakeCache&&this.now()-this.stakeCache.at<300000)return this.stakeCache.value;
  if(this.stakePending)return this.stakePending;
  this.stakePending=this.readStake().then(value=>{this.stakeCache={at:this.now(),value};return value;}).finally(()=>{this.stakePending=null;});return this.stakePending;
 }
 private async readStake():Promise<StakeStatus>{
  try{
   const get=async(path:string)=>{const r=await this.request(BASE+path,{headers:{Authorization:'Bearer '+this.config.stakeToken},redirect:'error',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Stake reporting unavailable');return boundedJson(r);};
   const [config,state]=await Promise.all([get('/staking/farm/config'),get('/organizations/'+this.config.organization+'/staking/farm')]);
   if(!['contract_id','farm_product_id','network_id'].every(k=>typeof config[k]==='string'&&config[k].length>0&&config[k].length<128))throw new Error('Invalid farm configuration');
   if(!config.enabled||state.organization_id!==this.config.organization||state.near_account_id!==this.config.nearAccount||state.contract_id!==config.contract_id||state.farm_product_id!==config.farm_product_id||state.network_id!==config.network_id)throw new Error('Stake identity mismatch');
   if(typeof state.sync_status!=='string'||state.sync_status.length>80)throw new Error('Invalid sync status');
   const credits=state.farm_credit_nano_usd;
   if(credits!==null&&credits!==undefined&&(!Number.isSafeInteger(credits)||credits<0))throw new Error('Invalid credits');
   const synced=typeof state.last_synced_at==='string'?Date.parse(state.last_synced_at):NaN;
   const maxAge=Number(config.sync_staleness_seconds)*1000;
   const fresh=Number.isFinite(synced)&&Number.isFinite(maxAge)&&maxAge>0&&synced<=this.now()+60000&&this.now()-synced<=maxAge;
   return {state:'provider-reported',farmCreditNanoUsd:credits??null,syncStatus:state.sync_status,lastSyncedAt:Number.isFinite(synced)?new Date(synced).toISOString():null,stale:!fresh};
  }catch{return {state:'unavailable'};}
 }
}
export type StakeStatus={state:'not-configured'|'unavailable'}|{state:'provider-reported';farmCreditNanoUsd:number|null;syncStatus:string;lastSyncedAt:string|null;stale:boolean};
async function boundedJson(response:Response,maxBytes=32768):Promise<any>{const reader=response.body?.getReader();if(!reader)throw new Error('Empty provider response');const chunks:Uint8Array[]=[];let size=0;try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw new Error('Provider response too large');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{});}}
export function computeConfig(env:NodeJS.ProcessEnv):ComputeConfig{return {totalBudgetMicroUsd:parseUsd(env.NEAR_AI_TOTAL_BUDGET_USD),enabled:env.NEAR_AI_ENABLED==='true',apiKey:env.NEAR_AI_API_KEY,model:env.NEAR_AI_MODEL,dailyLimit:Number(env.NEAR_AI_DAILY_REQUESTS??0),stakeToken:env.NEAR_AI_STAKE_ACCESS_TOKEN,organization:env.NEAR_AI_ORGANIZATION_ID,nearAccount:env.NEAR_AI_STAKE_ACCOUNT};}

function parseUsd(value:string|undefined){
 if(value===undefined||value==='')return 0;
 const match=/^(\d{1,2})(?:\.(\d{1,6}))?$/.exec(value);if(!match)throw new Error('Invalid AI dollar allowance');
 const micros=Number(match[1])*1000000+Number((match[2]??'').padEnd(6,'0'));
 if(micros>5000000)throw new Error('AI pilot allowance exceeds approved $5 ceiling');return micros;
}
