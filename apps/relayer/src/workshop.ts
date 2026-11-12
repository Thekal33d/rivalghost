import {createHash,randomUUID} from 'node:crypto';
import {CHAPTERS,JOBS,RECIPES,repairStage,type ChapterId,type JobId,type TrailId} from '@rivalghost/game-data';
import {simulateExpedition,validateExpedition,canonicalExpeditionReplayJson,type ExpeditionReplay,type ExpeditionConfig} from '@rivalghost/sim';
export class WorkshopError extends Error{}
function fail(s:string):never{throw new WorkshopError(s);}
export interface JobTicket {id:string;kind:JobId;day:string;config:ExpeditionConfig;stage:number;expires:number;creditsHeld?:number;receipt?:{ok:boolean;salvage:number;credits:number;score:number;message:string}}
interface PilotStock {salvage:number;items:Record<string,number>;equipped:TrailId|null;day:string;claims:string[];ticket?:JobTicket;receipts:{id:string;fingerprint:string;result:unknown}[]}
export interface WorldState {version:1;pilots:Record<string,PilotStock>;districts:number[];moth:{stock:number;day:string;spent:number};ghosts:{id:string;pilot:string;replay:ExpeditionReplay;score:number}[];listings:{id:string;seller:string;item:TrailId;price:number}[];commissionDay:string;commissionSpent:number;focus:'recovery'|'courier';}
interface Ledger {wallets:Record<string,number>;world?:WorldState}
const dayOf=(now:number)=>new Date(now).toISOString().slice(0,10);
function pay(s:Ledger,from:string,to:string,n:number){if(!Number.isSafeInteger(n)||n<0||(s.wallets[from]??0)<n)fail('That wallet cannot cover this purchase.');s.wallets[from]-=n;s.wallets[to]=(s.wallets[to]??0)+n;}
export function world(s:Ledger,now:number){
  if(!s.world){pay(s,'reserve','npc:moth',600);s.world={version:1,pilots:{},districts:Array(10).fill(0),moth:{stock:0,day:dayOf(now),spent:0},ghosts:[],listings:[],commissionDay:dayOf(now),commissionSpent:0,focus:'recovery'};}
  const w=s.world,day=dayOf(now);if(w.moth.day!==day){w.moth.day=day;w.moth.spent=0;}if(w.commissionDay!==day){w.commissionDay=day;w.commissionSpent=0;}for(const [id,p] of Object.entries(w.pilots)){const t=p.ticket;if(t?.creditsHeld&&(t.expires<=now||t.day!==day)){pay(s,'npc:commission:'+id,'npc:hound',t.creditsHeld);if(t.day===day)w.commissionSpent-=t.creditsHeld;t.creditsHeld=0;}}return w;
}
function pilot(w:WorldState,id:string,now:number){const p=w.pilots[id]??(w.pilots[id]={salvage:0,items:{},equipped:null,day:dayOf(now),claims:[],receipts:[]});if(p.day!==dayOf(now)){p.day=dayOf(now);p.claims=[];}return p;}
export function workshopView(s:Ledger,id:string|null,now:number){const w=world(s,now),p=id?w.pilots[id]:undefined;return {mode:'local-demo',balance:id?s.wallets[id]??null:null,pilot:p?{...p,receipts:undefined,claims:p.day===dayOf(now)?p.claims:[]}:null,districts:w.districts,focus:w.focus,moth:{...w.moth,balance:s.wallets['npc:moth'],buyPrice:Math.max(1,5-Math.floor(w.moth.stock/8)),sellPrice:Math.max(1,5-Math.floor(w.moth.stock/8))+2,dailyBudget:80},commissionAvailable:w.commissionSpent<24&&s.wallets['npc:hound']>=28,ghosts:w.ghosts.slice(0,12),listings:w.listings.map(l=>({...l,you:l.seller===id}))};}
export function workshopAction(s:Ledger,id:string,input:Record<string,unknown>,now:number){
  if(!(id in s.wallets))fail('Claim your pilot demo wallet first.');
  const w=world(s,now),p=pilot(w,id,now);
  if(typeof input.requestId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(input.requestId))fail('A valid action receipt ID is required.');
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex'),cached=p.receipts.find(r=>r.id===input.requestId);
  if(cached){if(cached.fingerprint!==fingerprint)fail('That receipt ID belongs to a different action.');return cached.result;}
  let result:unknown={ok:true};
  switch(input.action){
    case 'job':{
      const job=JOBS.find(j=>j.id===input.kind);if(!job)fail('Choose a recovery job.');
      if(p.claims.includes(job!.id))fail('This job is already rewarded today. Free story flights remain open.');
      if(job!.id==='commission'&&(w.commissionSpent>=24||s.wallets['npc:hound']<28))fail('HOUND is protecting his reserve. This commission is closed.');
      if(p.ticket&&!p.ticket.receipt&&p.ticket.expires>now){result=p.ticket;break;}
      const chapter=Number(input.chapter);if(!Number.isInteger(chapter)||chapter<0||chapter>=10)fail('Choose a district.');
      const nonce=randomUUID(),stage=repairStage(w.districts[chapter]);
      const seed=createHash('sha256').update(id+nonce+stage).digest().readUInt32LE(0)||1;
      p.ticket={id:nonce,kind:job!.id,day:dayOf(now),config:{rulesVersion:3,chapter:chapter as ChapterId,rig:'fan',seed},stage,expires:now+900000,creditsHeld:job!.credits};if(job!.credits){pay(s,'npc:hound','npc:commission:'+id,job!.credits);w.commissionSpent+=job!.credits;}result=p.ticket;break;
    }
    case 'claim':{
      const t=p.ticket;if(!t||input.ticket!==t.id)fail('This job does not belong to your pilot.');
      if(t!.receipt){result=t!.receipt;break;}if(now>t!.expires||t!.day!==dayOf(now))fail('The job expired. Launch a new free recovery.');
      if(p.claims.includes(t!.kind))fail('This job was already rewarded today.');
      const replay=input.replay as ExpeditionReplay;try{validateExpedition(replay);}catch{fail('Invalid flight recording.');}
      if(replay.rulesVersion!==3||replay.seed!==t!.config.seed||replay.chapter!==t!.config.chapter||replay.rig!==t!.config.rig)fail('The replay does not match the launched job.');
      const r=simulateExpedition(replay),job=JOBS.find(j=>j.id===t!.kind)!;
      const ok=t!.kind==='recovery'?r.kills>=12:t!.kind==='courier'?r.rescues>=2:r.score>=12000&&r.pulses===0;
      if(ok){if(job.credits){if(t!.creditsHeld!==job.credits)fail('The commission reservation expired.');pay(s,'npc:commission:'+id,id,job.credits);t!.creditsHeld=0;w.ghosts.unshift({id:t!.id,pilot:id,replay:JSON.parse(canonicalExpeditionReplayJson(replay)),score:r.score});w.ghosts=w.ghosts.slice(0,30);}
        p.salvage+=job.salvage;p.claims.push(job.id);
      }
      if(!ok&&t!.creditsHeld){pay(s,'npc:commission:'+id,'npc:hound',t!.creditsHeld);w.commissionSpent-=t!.creditsHeld;t!.creditsHeld=0;}
      t!.receipt={ok,salvage:ok?job.salvage:0,credits:ok?job.credits:0,score:r.score,message:ok?'Replay checked. Cargo delivered.':`Flight checked; objective missed: ${job.goal}. Retry for free.`};result=t!.receipt;break;
    }
    case 'sell':{
      const price=Math.max(1,5-Math.floor(w.moth.stock/8));if(p.salvage<1)fail('Recover salvage first.');
      if(w.moth.stock>=40||w.moth.spent+price>80||s.wallets['npc:moth']-price<40)fail('MOTH is holding inventory or protecting her daily budget.');
      if(input.price!==price)fail('MOTH updated her quote. Refresh and try again.');pay(s,'npc:moth',id,price);p.salvage--;w.moth.stock++;w.moth.spent+=price;break;
    }
    case 'buySalvage':{
      const price=Math.max(1,5-Math.floor(w.moth.stock/8))+2;if(w.moth.stock<1)fail('MOTH has no salvage in stock.');if(input.price!==price)fail('MOTH updated her quote. Refresh and try again.');pay(s,id,'npc:moth',price);p.salvage++;w.moth.stock--;break;
    }
    case 'craft':{
      const recipe=RECIPES.find(r=>r.id===input.item);if(!recipe)fail('Unknown blueprint.');if(p.salvage<recipe!.salvage)fail('Recover more salvage for this blueprint.');
      if(Object.values(p.items).reduce((a,b)=>a+b,0)>=50)fail('Your workshop holds up to 50 items.');
      pay(s,id,'reserve',recipe!.fee);p.salvage-=recipe!.salvage;p.items[recipe!.id]=(p.items[recipe!.id]??0)+1;break;
    }
    case 'equip':{
      if(input.item===null){p.equipped=null;break;}const recipe=RECIPES.find(r=>r.id===input.item);if(!recipe||(p.items[recipe.id]??0)<1)fail('Craft or buy that trail before equipping it.');p.equipped=recipe.id;break;
    }
    case 'list':{
      const recipe=RECIPES.find(r=>r.id===input.item),price=Number(input.price);
      if(!recipe||(p.items[recipe.id]??0)<1)fail('You do not own that item.');if(!Number.isSafeInteger(price)||price<1||price>200)fail('Choose a price between 1 and 200 CR.');
      if(w.listings.length>=200||w.listings.filter(l=>l.seller===id).length>=5)fail('The listing limit is reached.');
      p.items[recipe.id]--;if(!p.items[recipe.id]&&p.equipped===recipe.id)p.equipped=null;
      const listing={id:randomUUID(),seller:id,item:recipe.id,price};w.listings.push(listing);result=listing;break;
    }
    case 'buy':case 'cancel':{
      const at=w.listings.findIndex(l=>l.id===input.listing);if(at<0)fail('This listing is no longer available.');const l=w.listings[at];
      if(input.action==='cancel'){if(l.seller!==id)fail('Only the seller can cancel.');}
      else{if(l.seller===id)fail('Cancel your own listing instead.');if(Object.values(p.items).reduce((a,b)=>a+b,0)>=50)fail('Your workshop is full.');const fee=Math.max(1,Math.floor(l.price*0.05));pay(s,id,l.seller,l.price-fee);pay(s,id,'reserve',fee);}
      p.items[l.item]=(p.items[l.item]??0)+1;w.listings.splice(at,1);break;
    }
    case 'repair':{
      const chapter=Number(input.chapter);if(!Number.isInteger(chapter)||chapter<0||chapter>9)fail('Choose a district.');if(p.salvage<1)fail('Recover salvage first.');if(w.districts[chapter]>=60)fail('This district is fully restored.');p.salvage--;w.districts[chapter]++;break;
    }
    default:fail('Unknown workshop action.');
  }
  p.receipts.unshift({id:input.requestId as string,fingerprint,result});p.receipts=p.receipts.slice(0,40);return result;
}
export function assertWorld(s:Ledger){if(!s.world)return;const w=s.world;for(const p of Object.values(w.pilots))if(!Number.isSafeInteger(p.salvage)||p.salvage<0||Object.values(p.items).some(n=>!Number.isSafeInteger(n)||n<0)||p.equipped&&(p.items[p.equipped]??0)<1)throw new Error('Inventory invariant failed');if(w.districts.some(n=>!Number.isSafeInteger(n)||n<0||n>60)||w.moth.stock<0||w.moth.stock>40)throw new Error('District invariant failed');}
