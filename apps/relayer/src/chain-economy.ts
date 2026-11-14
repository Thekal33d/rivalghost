import {SignedTransaction} from 'near-api-js';
import {createHash,createPublicKey,verify} from 'node:crypto';
import {CHAPTERS,HOUND_POLICY,bytesHex,economyIntentMessage,encodeEconomyCertificate,type ChainPilot,type ChainRun,type ChainWorld,type EconomyIntent,type EconomyCertificate,type ChapterId} from '@rivalghost/game-data';
import {flyHound,HOUND_STYLES,canonicalExpeditionReplayJson,type ExpeditionReplay} from '@rivalghost/sim';
import {verifyEconomyReplay} from '@rivalghost/verifier';
import {ChainError,ChainRelay} from './chain-relay.js';
import type {Guest} from './guest-store.js';
const ITEMS=['afterglow','ion','sunflare'] as const,JOBS=['','recovery','courier','commission'];
export class ChainEconomy {
 private nextAttack=Date.now()+120000;
 constructor(readonly relay:ChainRelay,readonly verifierKey:CryptoKey,readonly npc?:ChainRelay,private readonly now=Date.now){
  relay.store.db.exec(`CREATE TABLE IF NOT EXISTS economy_replays(hash TEXT PRIMARY KEY,body TEXT NOT NULL,actor TEXT NOT NULL,score INTEGER NOT NULL,commission INTEGER NOT NULL,at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS economy_settlements(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,certificate TEXT NOT NULL,context TEXT NOT NULL,response TEXT);
   CREATE TABLE IF NOT EXISTS economy_npc_flights(id TEXT PRIMARY KEY,body TEXT NOT NULL);`);
 }
 world(){return this.relay.view<ChainWorld>('get_world');}
 pilot(actor:string){return this.relay.view<ChainPilot|null>('get_pilot',{actor});}
 actor(guest:Guest){if(!guest.accountId)throw new ChainError('Sign in with NEAR to use the on-chain economy');return guest.accountId;}
 private ticket(r:ChainRun){return {id:String(r.id),kind:JOBS[r.kind],config:{rulesVersion:3,chapter:r.chapter,rig:'fan',seed:r.seed},stage:r.stage,expires:r.expires,creditsHeld:r.kind===3?8:0,focusBonus:r.bonus?1:0};}
 private readReplay(hash:number[]){const row=this.relay.store.db.prepare('SELECT body FROM economy_replays WHERE hash=?').get(bytesHex(hash));return row?JSON.parse(String(row.body)) as ExpeditionReplay:null;}
 async status(guest:Guest|null){return {enabled:true,mode:'onchain',contractId:this.relay.config.contractId,actor:guest?.accountId??null,pilot:guest?.accountId?await this.pilot(guest.accountId):null};}
 async workshop(guest:Guest|null){
  const [w,p]=await Promise.all([this.world(),guest?.accountId?this.pilot(guest.accountId):null]);
  const [m,h]=await Promise.all([this.pilot(w.moth),this.pilot(w.hound)]),price=Math.max(1,5-Math.floor(w.stock/8));
  return {mode:'onchain',contractId:this.relay.config.contractId,balance:p?.cr??null,pilot:p?{salvage:p.salvage,items:Object.fromEntries(ITEMS.map((n,i)=>[n,p.items[i]])),equipped:ITEMS[p.equipped]??null,claims:p.day===Math.floor(this.now()/86400000)?JOBS.filter((_,i)=>i>0&&(p.claims&(1<<i))!==0):[],...(p.run&&p.run.kind>0?{ticket:this.ticket(p.run)}:{})}:null,
   districts:w.districts,focus:JOBS[w.focus],moth:{balance:m!.cr,stock:w.stock,buyPrice:price,sellPrice:price+2,spent:w.moth_spent,dailyBudget:80},commissionAvailable:h!.cr>=28&&w.commission_spent+8<=24,
   listings:w.listings.map(l=>({...l,id:String(l.id),item:ITEMS[l.item],you:l.seller===guest?.accountId})),ghosts:this.relay.store.db.prepare('SELECT * FROM economy_replays WHERE commission=1 ORDER BY at DESC LIMIT 12').all().map(r=>({id:r.hash,pilot:r.actor,score:r.score,replay:JSON.parse(String(r.body))}))};
 }
 private events(){return this.relay.store.db.prepare("SELECT id,hash,day,bytes FROM chain_transactions WHERE state='final' ORDER BY rowid DESC LIMIT 15").all().map(row=>{
  let text='Game transaction confirmed on NEAR',kind='confirmed';
  try{const tx=SignedTransaction.decode(Buffer.from(String(row.bytes),'base64')),call=tx.transaction.actions[0]?.functionCall;
   if(call){kind=call.methodName;const args=JSON.parse(Buffer.from(call.args).toString('utf8'));const names=['','Job reserved','Salvage sold to MOTH','Salvage bought from MOTH','Cosmetic crafted','Trail equipped','Item listed','Listing cancelled','Item purchased','District repaired','Crown entry reserved','Defense funded','Job cancelled'];text=(kind==='execute'?names[args.intent?.op]??'Game action':kind==='seed_crown'?'HOUND funded a Crown':kind==='settle'?'Verified flight settled':kind==='expire'?'Expired flight resolved':kind==='close_crown'?'Round bounty returned':kind)+' on NEAR';}
  }catch{/* Historical receipt remains linkable even if its display decoding fails. */}
  return {id:String(row.hash),kind,text,at:Date.parse(String(row.day)),explorer:'https://explorer.testnet.near.org/transactions/'+row.hash};
 });}
 async view(guest:Guest|null){
  const [w,p]=await Promise.all([this.world(),guest?.accountId?this.pilot(guest.accountId):null]);const h=await this.pilot(w.hound);
  const crowns=w.crowns.map((c,i)=>{const replay=c?this.readReplay(c.replay_hash):null;return {id:i,name:['PUP','HOUND','ALPHA'][i],chapter:c?.chapter??i,style:HOUND_STYLES[i],holder:c?.holder??w.hound,holderName:c?.holder===w.hound?'HOUND':c?.holder?c.holder.slice(0,6)+'…'+c.holder.slice(-4):'HOUND',you:!!c&&c.holder===guest?.accountId,score:c?.score??0,replay:replay??flyHound({rulesVersion:3,chapter:i as ChapterId,rig:'fan',seed:CHAPTERS[i].seed},HOUND_STYLES[i]).replay,bounty:c?.bounty??0,expires:c?.expires??0,active:!!c&&!!replay&&c.expires>this.now(),defended:c?.defended??false,lock:c?.lock??null,decision:!c?'Waiting for HOUND to fund a new round.':!replay?'The on-chain ghost is awaiting its replay file. Entries are paused.':'This purse and ghost are recorded on NEAR testnet.'};});
  return {mode:'onchain',automation:{enabled:!!this.npc,logic:'deterministic',dailyTransactionLimit:this.npc?.config.maxDailyRequests??0,dailyGasReserveYocto:this.npc?.config.dailyBudget.toString()??'0',inferenceEnabled:false},contractId:this.relay.config.contractId,balance:p?.cr??null,joined:!!p,houndBalance:h!.cr,reserve:w.reserve,total:w.total_cr,spentToday:w.hound_spent,policy:HOUND_POLICY,now:this.now(),crowns,attempt:p?.run?.kind===0?{id:String(p.run.id),crown:p.run.slot,expires:p.run.expires,status:p.run.expires>this.now()?'live':'forfeited'}:null,events:this.events()};
 }
 async execute(guest:Guest,intent:EconomyIntent,requestId:unknown){
  const actor=this.actor(guest);if(intent?.actor!==actor||typeof requestId!=='string'||!/^[a-f0-9-]{36}$/.test(requestId))throw new ChainError('Invalid game intent');
  const id=`action:${actor}:${requestId}`,prior=this.relay.store.db.prepare('SELECT id FROM chain_transactions WHERE id=?').get(id);
  if(!prior){
   let p=await this.pilot(actor);if(!p)throw new ChainError('Activate your on-chain pilot first');
   if(intent.nonce!==p.nonce+1||intent.epoch!==p.session_epoch||intent.deadline<this.now()||intent.deadline>this.now()+300000||p.session_until<=this.now()||intent.signature.length!==64)throw new ChainError('Game session expired or changed. Refresh and authorize it again.');
   const pk=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(p.session_key)]),format:'der',type:'spki'});
   if(!verify(null,Buffer.from(economyIntentMessage(this.relay.config.contractId,intent)),pk,Buffer.from(intent.signature)))throw new ChainError('Browser action signature does not match this account');
   if(p.run&&(p.run.expires<=this.now()||(p.run.kind>0&&p.run.day!==Math.floor(this.now()/86400000))))await this.relay.change(`expire:${actor}:${p.run.id}`,'expire',{actor});
  }
  const receipt=await this.relay.change<ChainPilot>(id,'execute',{intent}),p=receipt.value;
  if(intent.op===1&&p.run)return {...this.ticket(p.run),...this.proof(receipt)};
  if(intent.op===10&&p.run)return {id:String(p.run.id),player:actor,crown:p.run.slot,expires:p.run.expires,status:'live',...this.proof(receipt)};
  return {ok:true,pilot:p,...this.proof(receipt)};
 }
 private proof(r:{transactionHash:string}){return {settled:true,network:'testnet',transactionHash:r.transactionHash,explorer:`https://explorer.testnet.near.org/transactions/${r.transactionHash}`};}
 async settle(guest:Guest,id:unknown,replay:ExpeditionReplay){
  const actor=this.actor(guest);if(typeof id!=='string'||!/^\d+$/.test(id))throw new ChainError('Invalid reserved flight');
  const body=canonicalExpeditionReplayJson(replay),fingerprint=createHash('sha256').update(body).digest('hex'),key=`result:${actor}:${id}`,db=this.relay.store.db;
  let row=db.prepare('SELECT * FROM economy_settlements WHERE id=?').get(key);
  if(row&&row.fingerprint!==fingerprint)throw new ChainError('A different replay was already submitted for this run');
  if(row?.response)return JSON.parse(String(row.response));
  if(!row){
   const [p,w]=await Promise.all([this.pilot(actor),this.world()]);if(!p?.run||String(p.run.id)!==id)throw new ChainError('This reserved flight is no longer active');
   const certificate=await verifyEconomyReplay(this.relay.config.contractId,actor,p.run,replay,this.now(),w.key_version,this.verifierKey);
   const crown=p.run.kind===0?w.crowns[p.run.slot]:null;
   db.prepare('INSERT OR IGNORE INTO economy_settlements VALUES(?,?,?,?,NULL)').run(key,fingerprint,JSON.stringify(certificate),JSON.stringify({kind:p.run.kind,bonus:p.run.bonus,score:certificate.score,target:crown?.score??0,bounty:crown?.bounty??0}));
   row=db.prepare('SELECT * FROM economy_settlements WHERE id=?').get(key)!;
   if(row.fingerprint!==fingerprint)throw new ChainError('Replay submission conflict');
  }
  const c=JSON.parse(String(row.certificate)) as EconomyCertificate,context=JSON.parse(String(row.context));
  const receipt=await this.relay.change<ChainPilot>(key,'settle',{certificate:encodeEconomyCertificate(c)}),p=receipt.value;
  const result=context.kind===0?{id,won:p.last_won,score:c.score,target:context.target,entryReturned:p.last_won?10:0,bountyPaid:p.last_won?context.bounty:0,bountyAdded:p.last_won?0:8,holderPaid:p.last_won?0:2,balance:p.cr,hash:bytesHex(c.replay_hash)}:{ok:p.last_won,message:p.last_won?"Reward confirmed on NEAR.":"Objective missed; no reward issued.",score:c.score,salvage:p.last_won?[0,4,6,2][context.kind]+(context.bonus?1:0):0,credits:p.last_won&&context.kind===3?8:0,hash:bytesHex(c.replay_hash)};
  const response={...result,...this.proof(receipt)};
  db.prepare('INSERT OR IGNORE INTO economy_replays VALUES(?,?,?,?,?,?)').run(bytesHex(c.replay_hash),body,actor,c.score,context.kind===3&&p.last_won?1:0,this.now());
  db.prepare('UPDATE economy_settlements SET response=? WHERE id=?').run(JSON.stringify(response),key);return response;
 }
 /** Explicit bounded NPC tick; no paid inference or invented scores. */
 async tick(){
  if(!this.npc)return;
  await this.npc.resumePending();
  let w=await this.world();if(w.paused)return;
  // A restart or lost settlement response must finish the existing flight before buying another entry.
  const activeHound=await this.pilot(w.hound);
  if(activeHound?.run){
   const run=activeHound.run;
   if(run.expires<=this.now())await this.relay.change(`expire:${w.hound}:${run.id}`,'expire',{actor:w.hound});
   else if(run.kind===0){
    const saved=this.relay.store.db.prepare('SELECT body FROM economy_npc_flights WHERE id=?').get(`npc-entry:${activeHound.nonce}`);
    const replay=saved?JSON.parse(String(saved.body)) as ExpeditionReplay:HOUND_STYLES.map(style=>flyHound({rulesVersion:3,chapter:run.chapter as ChapterId,rig:'fan',seed:run.seed},style)).sort((a,b)=>b.result.score-a.result.score)[0].replay;
    await this.settle({accountId:w.hound} as Guest,String(run.id),replay);
   }
   return;
  }
  for(let slot=0;slot<3;slot++){
   let c=w.crowns[slot];
   if(c?.lock){const p=await this.pilot(c.lock);if(p?.run&&p.run.expires<=this.now())await this.relay.change(`expire:${c.lock}:${p.run.id}`,'expire',{actor:c.lock});else continue;w=await this.world();c=w.crowns[slot];}
   if(c&&c.expires<=this.now()){await this.relay.change(`close:${slot}:${c.expires}`,'close_crown',{slot});c=null;}
   if(!c){
    const h=await this.pilot(w.hound);if(!h||h.cr<40)continue;
    const flight=flyHound({rulesVersion:3,chapter:slot as ChapterId,rig:'fan',seed:CHAPTERS[slot].seed},HOUND_STYLES[slot]);
    const sequence=await this.relay.view<number>('next_sequence'),now=this.now();
    const run:ChainRun={id:sequence,kind:4,slot,chapter:slot,seed:flight.replay.seed,stage:0,bonus:false,day:Math.floor(now/86400000),started:now,expires:now+300000};
    const certificate=await verifyEconomyReplay(this.relay.config.contractId,w.hound,run,flight.replay,now,w.key_version,this.verifierKey);
    this.relay.store.db.prepare('INSERT OR IGNORE INTO economy_replays VALUES(?,?,?,?,?,?)').run(bytesHex(certificate.replay_hash),canonicalExpeditionReplayJson(flight.replay),w.hound,certificate.score,0,now);
    await this.npc.change(`npc-seed:${sequence}`,'seed_crown',{certificate:encodeEconomyCertificate(certificate)});
    return; // At most one new paid NPC action per tick.
   }
   if(c.holder===w.hound&&c.bounty===0&&!c.defended&&!c.lock&&c.expires>=this.now()+120000){
    const h=await this.pilot(w.hound);if(h&&h.cr>=40){const intent:EconomyIntent={actor:w.hound,nonce:h.nonce+1,epoch:h.session_epoch,deadline:this.now()+300000,op:11,a:slot,b:0,signature:[]};await this.npc.change(`npc-defense:${h.nonce+1}`,'execute',{intent});return;}
   }
   // Counterattacks use their actual on-chain mission; policy is also enforced by the contract.
   if(c.holder!==w.hound&&c.bounty>=20&&c.expires>=this.now()+120000&&!c.lock){
    const h=await this.pilot(w.hound);if(!h||h.run||h.cr<30||w.hound_spent>=60||this.nextAttack>this.now())continue;
    const best=HOUND_STYLES.map(style=>flyHound({rulesVersion:3,chapter:c!.chapter as ChapterId,rig:'fan',seed:c!.seed},style)).sort((a,b)=>b.result.score-a.result.score)[0];
    if(best.result.score<=c.score)continue;
    const intent:EconomyIntent={actor:w.hound,nonce:h.nonce+1,epoch:h.session_epoch,deadline:this.now()+300000,op:10,a:slot,b:0,signature:[]};
    this.nextAttack=this.now()+120000;
    this.relay.store.db.prepare('INSERT OR IGNORE INTO economy_npc_flights VALUES(?,?)').run(`npc-entry:${h.nonce+1}`,canonicalExpeditionReplayJson(best.replay));
    await this.npc.change(`npc-entry:${h.nonce+1}`,'execute',{intent});
    const active=await this.pilot(w.hound);if(active?.run)await this.settle({accountId:w.hound} as Guest,String(active.run.id),best.replay);return;
   }
  }
 }
}
