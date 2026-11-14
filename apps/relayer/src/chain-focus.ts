import type {ChainWorld} from '@rivalghost/game-data';
import type {ChainRelay} from './chain-relay.js';
import type {NearCompute,Decision} from './near-compute.js';

/** Model chooses one enum. The service creates the entire transaction; the key can only call set_focus. */
export class ChainFocus {
 private pending:Promise<void>|null=null;
 constructor(readonly relay:ChainRelay,readonly compute:NearCompute,private readonly now=Date.now){
  if(!compute.config.enabled||relay.config.maxDailyRequests>4)throw new Error('Focus requires bounded Cloud and chain allowances');
  relay.store.db.exec(`CREATE TABLE IF NOT EXISTS npc_focus_updates(id TEXT PRIMARY KEY,decision TEXT NOT NULL,args TEXT NOT NULL,state TEXT NOT NULL,receipt TEXT);`);
 }
 status(){
  const row=this.relay.store.db.prepare('SELECT * FROM npc_focus_updates ORDER BY rowid DESC LIMIT 1').get();
  return {enabled:true,method:'set_focus',dailyTransactionLimit:this.relay.config.maxDailyRequests,lastUpdate:row?{id:row.id,decision:JSON.parse(String(row.decision)) as Decision,state:row.state,...(row.receipt?JSON.parse(String(row.receipt)):{})}:null};
 }
 tick(){if(this.pending)return this.pending;this.pending=this.run().finally(()=>{this.pending=null;});return this.pending;}
 private async submit(row:Record<string,unknown>){
  const db=this.relay.store.db,args=JSON.parse(String(row.args));
  const tx=db.prepare('SELECT state FROM chain_transactions WHERE id=?').get(String(row.id));
  // Never sign a stale decision. Already-signed bytes must still be reconciled after a lost response.
  if(tx?.state==='failed'||(!tx&&args.validUntil<this.now())){db.prepare("UPDATE npc_focus_updates SET state='rejected' WHERE id=?").run(String(row.id));return;}
  try{
   const receipt=await this.relay.change<number>(String(row.id),'set_focus',{slot:args.slot});
   if(receipt.value!==args.slot)throw new Error('Unexpected focus receipt');
   const proof={transactionHash:receipt.transactionHash,explorer:'https://explorer.testnet.near.org/transactions/'+receipt.transactionHash,confirmedAt:this.now(),focus:args.slot===1?'recovery':'courier'};
   db.prepare("UPDATE npc_focus_updates SET state='confirmed',receipt=? WHERE id=?").run(JSON.stringify(proof),String(row.id));
  }catch(error){
   if(db.prepare('SELECT state FROM chain_transactions WHERE id=?').get(String(row.id))?.state==='failed')db.prepare("UPDATE npc_focus_updates SET state='rejected' WHERE id=?").run(String(row.id));
   throw error;
  }
 }
 private async run(){
  const db=this.relay.store.db;
  const pending=db.prepare("SELECT * FROM npc_focus_updates WHERE state='pending' ORDER BY rowid LIMIT 1").get();
  if(pending){await this.submit(pending);return;}
  let world=await this.relay.view<ChainWorld>('get_world');if(world.paused)return;
  if(world.moth!==this.relay.config.accountId)throw new Error('MOTH signer mismatch');
  const decision=await this.compute.decide(world.stock,world.districts.filter(n=>n>=60).length);
  // Outages, exhausted budgets and rejected model output keep the last on-chain focus intact.
  if(decision.source!=='near-ai'||!['recovery','courier'].includes(decision.focus)||!Number.isSafeInteger(decision.at)||decision.at>this.now()||this.now()-decision.at>=21600000)return;
  const id=`moth-focus:${decision.at}`;if(db.prepare('SELECT id FROM npc_focus_updates WHERE id=?').get(id))return;
  world=await this.relay.view<ChainWorld>('get_world');if(world.paused)return;
  const args={slot:decision.focus==='recovery'?1:2,validUntil:this.now()+300000};
  db.prepare("INSERT INTO npc_focus_updates VALUES(?,?,?,'pending',NULL)").run(id,JSON.stringify(decision),JSON.stringify(args));
  await this.submit(db.prepare('SELECT * FROM npc_focus_updates WHERE id=?').get(id)!);
 }
}
