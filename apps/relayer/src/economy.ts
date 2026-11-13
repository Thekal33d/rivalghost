import {workshopView,workshopAction,assertWorld,type WorldState} from './workshop.js';
import {randomUUID,createHash} from 'node:crypto';
import {CHAPTERS,HOUND_POLICY,houndDecision,type ChapterId} from '@rivalghost/game-data';
import {createExpedition,houndInput,flyHound,HOUND_STYLES,simulateExpedition,validateExpedition,canonicalExpeditionReplayJson,type ExpeditionReplay,type HoundStyle} from '@rivalghost/sim';
import {GuestStore,type Guest} from './guest-store.js';
export class EconomyError extends Error{}
const HOUND='npc:hound',TREASURY='reserve',ROUND=1800000,ENTRY_TIME=120000;
export interface PitCrown {id:number;name:string;chapter:ChapterId;style:HoundStyle;holder:string;score:number;replay:ExpeditionReplay;bounty:number;expires:number;active:boolean;defended:boolean;lock:string|null;decision:string}
export interface PitReceipt {id:string;won:boolean;score:number;target:number;entryReturned:number;bountyPaid:number;bountyAdded:number;holderPaid:number;balance:number;hash:string}
interface Attempt {id:string;player:string;crown:number;expires:number;status:'live'|'settled'|'refunded'|'forfeited';expiryPolicy?:'forfeit';receipt?:PitReceipt}
interface PitEvent {id:string;at:number;kind:string;text:string}
interface PitState {world?:WorldState;version:1;wallets:Record<string,number>;crowns:PitCrown[];attempts:Record<string,Attempt>;events:PitEvent[];day:string;spent:number;lastAttack:number;rounds:number}
const fail=(message:string):never=>{throw new EconomyError(message);};
const replayCache=new Map<string,ReturnType<typeof flyHound>>();
function flight(chapter:ChapterId,style:HoundStyle){const key=chapter+style;let run=replayCache.get(key);if(!run){run=flyHound({rulesVersion:3,chapter,rig:'fan',seed:CHAPTERS[chapter].seed},style);replayCache.set(key,run);}return run;}
function event(s:PitState,now:number,kind:string,text:string){s.events.unshift({id:randomUUID(),at:now,kind,text});s.events=s.events.slice(0,60);}
function total(s:PitState){return Object.values(s.wallets).reduce((a,b)=>a+b,0)+s.crowns.reduce((a,c)=>a+c.bounty,0)+Object.values(s.attempts).filter(a=>a.status==='live').length*10;}
function transfer(s:PitState,from:string,to:string,amount:number){if(!Number.isSafeInteger(amount)||amount<0||(s.wallets[from]??0)<amount)fail('Insufficient demo CR. Free flight is always available.');s.wallets[from]-=amount;s.wallets[to]=(s.wallets[to]??0)+amount;}
function seed(s:PitState,c:PitCrown,now:number){
  if(s.wallets[HOUND]-20<20){c.decision='My reserve comes first. This Crown stays closed until I can afford its stake.';return;}
  const run=flight(c.chapter,c.style);s.wallets[HOUND]-=20;c.holder=HOUND;c.score=run.result.score;c.replay=run.replay;c.bounty=20;c.expires=now+ROUND;c.active=true;c.defended=false;c.lock=null;
  c.decision='I put 20 of my own demo CR behind this ghost. Beat it.';s.rounds++;event(s,now,'stake',`${c.name}: HOUND staked 20 CR using ${c.style} inputs (${c.score} points).`);
}
function initial(now:number):PitState{
  const s:PitState={version:1,wallets:{[TREASURY]:100000,[HOUND]:100},crowns:[],attempts:{},events:[],day:new Date(now).toISOString().slice(0,10),spent:0,lastAttack:0,rounds:0};
  for(let id=0;id<3;id++){const run=flight(id as ChapterId,HOUND_STYLES[id]);const c:PitCrown={id,name:['PUP','HOUND','ALPHA'][id],chapter:id as ChapterId,style:HOUND_STYLES[id],holder:HOUND,score:run.result.score,replay:run.replay,bounty:0,expires:now,active:false,defended:false,lock:null,decision:''};s.crowns.push(c);seed(s,c,now);}
  return s;
}
function maintenance(s:PitState,now:number){
  const day=new Date(now).toISOString().slice(0,10);if(day!==s.day){s.day=day;s.spent=0;}
  for(const a of Object.values(s.attempts))if(a.status==='live'&&now>=a.expires){
    const c=s.crowns[a.crown];
    if(a.expiryPolicy==='forfeit'){c.bounty+=8;s.wallets[c.holder]+=2;a.status='forfeited';event(s,now,'forfeit',`${c.name}: flight expired; 8 CR to bounty, 2 CR to holder.`);}
    else{s.wallets[a.player]+=10;a.status='refunded';event(s,now,'refund',`${c.name}: pre-policy reservation refunded under its original terms.`);}
    c.lock=null;
  }
  for(const c of s.crowns){if(c.active&&now>=c.expires&&!c.lock){s.wallets[c.holder]+=c.bounty;event(s,now,'close',`${c.name}: round closed; remaining ${c.bounty} CR returned to its holder.`);c.bounty=0;c.active=false;}
    if(!c.active)seed(s,c,now);
  }
}
function start(s:PitState,player:string,crownId:number,now:number):Attempt{
  const existing=s.attempts[player];if(existing?.status==='live'){if(existing.crown===crownId)return existing;fail('Finish your reserved flight first.');}
  const c=s.crowns[crownId];if(!c||!c.active||now+ENTRY_TIME>c.expires)fail('This round has closed or cannot fit another flight.');
  if(c.bounty<20)fail('The winner must fund a defense before this Crown reopens.');
  if(c.holder===player)fail('You already hold this Crown.');if(c.lock)fail('Another pilot reserved this Crown. Try another target.');
  if((s.wallets[player]??0)<10)fail('You need 10 demo CR. Free flight is always available.');
  s.wallets[player]-=10;const a:Attempt={id:randomUUID(),player,crown:c.id,expires:now+ENTRY_TIME,status:'live',expiryPolicy:'forfeit'};s.attempts[player]=a;c.lock=a.id;return a;
}
function settle(s:PitState,player:string,id:string,replay:ExpeditionReplay,now:number){
  const a=s.attempts[player];if(!a||a.id!==id)fail('This flight does not belong to your pilot.');
  if(a.status==='settled')return a.receipt!;
  if(a.status!=='live'||now>=a.expires)fail(a.expiryPolicy==='forfeit'?'Flight expired. The 10 CR entry is forfeited: 8 to bounty, 2 to holder. Check the Crown Pit.':'Flight expired. Your pre-policy entry is refunded; check the Crown Pit.');
  const c=s.crowns[a.crown];if(c.lock!==a.id)fail('The Crown lock is no longer valid.');
  try{validateExpedition(replay);}catch{fail('Invalid flight recording.');}
  if(replay.rulesVersion!==3||replay.chapter!==c.chapter||replay.rig!=='fan'||replay.seed!==c.replay.seed)fail('The replay does not match the reserved mission.');
  const result=simulateExpedition(replay),won=result.score>c.score,bounty=c.bounty,target=c.score;
  if(won){s.wallets[player]+=10+bounty;c.bounty=0;c.holder=player;c.score=result.score;c.replay=JSON.parse(canonicalExpeditionReplayJson(replay));c.decision='That ghost is yours. Keep the payout, or spend 20 CR to reopen a defense.';}
  else{c.bounty+=8;s.wallets[c.holder]+=2;if(c.holder===HOUND)c.decision=`My ghost held by ${target-result.score} points. The purse is ${c.bounty} CR now. Find a new line.`;}
  c.lock=null;a.status='settled';a.receipt={id:a.id,won,score:result.score,target,entryReturned:won?10:0,bountyPaid:won?bounty:0,bountyAdded:won?0:8,holderPaid:won?0:2,balance:s.wallets[player],hash:createHash('sha256').update(canonicalExpeditionReplayJson(replay)).digest('hex')};
  event(s,now,won?'win':'hold',`${c.name}: ${player===HOUND?'HOUND':'a pilot'} scored ${result.score}. ${won?`Crown taken; ${bounty} CR bounty and 10 CR entry paid.`:'Crown held; 8 CR to bounty, 2 CR to holder.'}`);
  return a.receipt;
}
function npcTick(s:PitState,now:number){
  maintenance(s,now);
  for(const c of s.crowns){if(c.holder===HOUND)continue;
    const best=HOUND_STYLES.map(style=>flight(c.chapter,style)).sort((a,b)=>b.result.score-a.result.score)[0];
    const d=houndDecision({balance:s.wallets[HOUND],spentToday:s.spent,now,lastAttack:s.lastAttack,target:c.score,rehearsal:best.result.score,bounty:c.bounty,locked:!!c.lock,open:c.active&&now+ENTRY_TIME<=c.expires});
    if(d.reason!==c.decision){c.decision=d.reason;event(s,now,d.action,`${c.name} / HOUND: ${d.reason}`);}
    if(d.action==='attack'){
      // Commit policy/entry before the independently re-simulated result; no invented payout.
      const a=start(s,HOUND,c.id,now);s.spent+=10;s.lastAttack=now;
      const receipt=settle(s,HOUND,a.id,best.replay,now);
      c.decision=`I chose ${best.style}. Replay checked: ${receipt.score} points. ${receipt.won?'The Crown is back.':'You held the line.'}`;
      if(receipt.won&&!c.defended&&s.wallets[HOUND]-20>=20){s.wallets[HOUND]-=20;c.bounty=20;c.defended=true;event(s,now,'defend',`${c.name}: HOUND reinvested 20 CR in its one defense.`);}
      break;
    }
  }
}
export class EconomyService {
  constructor(readonly store:GuestStore,private readonly now=Date.now){
    store.db.exec('CREATE TABLE IF NOT EXISTS crown_economy(id INTEGER PRIMARY KEY CHECK(id=1),body TEXT NOT NULL)');
    if(!store.db.prepare('SELECT id FROM crown_economy WHERE id=1').get())store.db.prepare('INSERT INTO crown_economy VALUES(1,?)').run(JSON.stringify(initial(now())));
  }
  private update<T>(fn:(s:PitState)=>T):T{
    this.store.db.exec('BEGIN IMMEDIATE');
    try{const s=JSON.parse(String(this.store.db.prepare('SELECT body FROM crown_economy WHERE id=1').get()!.body)) as PitState;
      const result=fn(s);assertWorld(s);if(total(s)!==100100||Object.values(s.wallets).some(v=>!Number.isSafeInteger(v)||v<0))throw new Error('Economy invariant failed');
      this.store.db.prepare('UPDATE crown_economy SET body=? WHERE id=1').run(JSON.stringify(s));this.store.db.exec('COMMIT');return result;
    }catch(e){this.store.db.exec('ROLLBACK');throw e;}
  }
  workshop(guest:Guest|null){return this.update(s=>workshopView(s,guest?.id??null,this.now()));}
  work(guest:Guest,input:Record<string,unknown>){this.store.rate("work:"+guest.id,30);return this.update(s=>workshopAction(s,guest.id,input,this.now()));}
  setFocus(focus:"recovery"|"courier"){this.update(s=>{workshopView(s,null,this.now());s.world!.focus=focus;});}
  tick(){this.update(s=>{if(s.world)workshopView(s,null,this.now());npcTick(s,this.now());});}
  view(guest:Guest|null){return this.update(s=>{maintenance(s,this.now());const a=guest?s.attempts[guest.id]:null;
    const name=(id:string)=>id===HOUND?'HOUND':String(this.store.db.prepare('SELECT username FROM social_profiles WHERE id=?').get(id)?.username??'Pilot');
    return {mode:'local-demo' as const,balance:guest?s.wallets[guest.id]??null:null,joined:!!guest&&guest.id in s.wallets,houndBalance:s.wallets[HOUND],reserve:s.wallets[TREASURY],total:total(s),spentToday:s.spent,policy:HOUND_POLICY,now:this.now(),crowns:s.crowns.map(c=>({...c,holderName:name(c.holder),you:guest?.id===c.holder})),attempt:a??null,events:s.events.slice(0,15)};
  });}
  join(guest:Guest){return this.update(s=>{if(!(guest.id in s.wallets)){if(Object.keys(s.wallets).filter(id=>!id.startsWith("npc:")&&id!==TREASURY).length>=1000)fail('The demo pilot capacity is full. Free flight remains available.');transfer(s,TREASURY,guest.id,100);event(s,this.now(),'grant','A new pilot claimed 100 demo CR from the finite reserve.');}return {balance:s.wallets[guest.id]};});}
  start(guest:Guest,crown:unknown){
    if(!Number.isInteger(crown)||Number(crown)<0||Number(crown)>2)fail('Choose a valid Crown.');this.store.rate('pit-start:'+guest.id,6,600000);
    return this.update(s=>{maintenance(s,this.now());return start(s,guest.id,Number(crown),this.now());});
  }
  settle(guest:Guest,id:unknown,replay:ExpeditionReplay){if(typeof id!=='string')fail('Choose your reserved flight.');this.store.rate('pit-settle-global',30);this.store.rate('pit-settle:'+guest.id,6);return this.update(s=>settle(s,guest.id,id as string,replay,this.now()));}
  defend(guest:Guest,id:unknown){if(!Number.isInteger(id))fail('Choose a Crown.');return this.update(s=>{maintenance(s,this.now());const c=s.crowns[Number(id)];if(!c||c.holder!==guest.id||!c.active||c.lock||c.bounty!==0||c.defended)fail('Only the winner can fund one defense of an empty, unlocked Crown.');if(this.now()+ENTRY_TIME>c.expires)fail('There is not enough time left for a defense.');if((s.wallets[guest.id]??0)<20)fail('A defense costs 20 demo CR.');s.wallets[guest.id]-=20;c.bounty=20;c.defended=true;event(s,this.now(),'defend',`${c.name}: its holder staked 20 CR for one defense.`);return {ok:true};});}
}
/** Isolated judge experiment: accelerated time, scripted pilots, no writes to live wallets. */
export function simulateEconomyWeek(){
  let now=1800000000000;const s=initial(now),days=[];s.wallets['demo-pilot']=0;transfer(s,TREASURY,'demo-pilot',100);
  const challenger=createExpedition({rulesVersion:3,chapter:0,rig:'fan',seed:CHAPTERS[0].seed});let direction=0;
  while(!challenger.snapshot().finished){const frame=challenger.snapshot();if(frame.tick%2===0)direction=houndInput(frame,'rescuer');challenger.step(direction);}
  for(let day=0;day<7;day++){
    now+=86400000;maintenance(s,now);
    for(const c of s.crowns){if(!c.active||c.holder==='demo-pilot'||s.wallets['demo-pilot']<10||c.bounty<20)continue;
      const a=start(s,'demo-pilot',c.id,now),run=flight(c.chapter,HOUND_STYLES[day%3]);settle(s,'demo-pilot',a.id,c.id===0&&day%3===1?challenger.replay():run.replay,now);
      if(c.holder==='demo-pilot'&&!c.defended&&s.wallets['demo-pilot']>=20){s.wallets['demo-pilot']-=20;c.bounty=20;c.defended=true;}
    }
    npcTick(s,now+1000);if(total(s)!==100100)throw new Error('Sandbox conservation failure');
    days.push({day:day+1,npcSpent:s.spent,player:s.wallets['demo-pilot'],hound:s.wallets[HOUND],bounties:s.crowns.reduce((sum,c)=>sum+c.bounty,0),total:total(s)});
  }
  return {isolated:true,days,events:s.events.slice(0,15)};
}
