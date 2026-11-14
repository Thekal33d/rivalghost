import {createHash} from 'node:crypto';
import {Account,JsonRpcProvider,SignedTransaction,actions,baseEncode,type Action,type KeyPairString,type SignedDelegate} from 'near-api-js';
import type {GuestStore} from './guest-store.js';
export class ChainError extends Error {constructor(message:string,readonly transactionHash?:string){super(message);}}
export interface RelayConfig {contractId:string;accountId:string;privateKey:KeyPairString;dailyBudget:bigint;maxDailyRequests:number;gasPriceCap:bigint;gas:bigint}
export interface ChainReceipt<T=unknown>{value:T;transactionHash:string;network:'testnet';settled:true}
const digest=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
/** One process owns a sponsor key. Persist signed transaction bytes before broadcast.
 * Explicit retries reconcile/rebroadcast those exact bytes, never create a new nonce.
 */
export class ChainRelay {
 readonly account:Account;private queue:Promise<unknown>=Promise.resolve();
 constructor(readonly store:GuestStore,readonly rpc:JsonRpcProvider,readonly config:RelayConfig,private readonly now=Date.now){
  if(!config.contractId.endsWith('.testnet')||!config.accountId.endsWith('.testnet')||config.gasPriceCap<1000000000n||config.gas<10000000000000n||config.gas>100000000000000n||config.dailyBudget<config.gas*config.gasPriceCap||!Number.isInteger(config.maxDailyRequests)||config.maxDailyRequests<1||config.maxDailyRequests>200)throw new Error('Invalid game relay allowance');
  this.account=new Account(config.accountId,rpc,config.privateKey);
  store.db.exec(`CREATE TABLE IF NOT EXISTS chain_transactions(id TEXT PRIMARY KEY,signer TEXT NOT NULL,fingerprint TEXT NOT NULL,day TEXT NOT NULL,reserved TEXT NOT NULL,hash TEXT UNIQUE NOT NULL,bytes TEXT NOT NULL,state TEXT NOT NULL,result TEXT);`);
 }
 private exclusive<T>(fn:()=>Promise<T>):Promise<T>{const result=this.queue.then(fn,fn);this.queue=result.catch(()=>{});return result;}
 async view<T>(method:string,args:Record<string,unknown>={}):Promise<T>{const value=await this.rpc.callFunction({contractId:this.config.contractId,method,args,blockQuery:{finality:'final'}});if(value===undefined)throw new ChainError('NEAR returned no state');return value as T;}
 async check(){if(await this.rpc.getNetworkId()!=='testnet')throw new ChainError('Testnet required');if(BigInt((await this.rpc.viewGasPrice()).gas_price)>this.config.gasPriceCap)throw new ChainError('Sponsorship paused while gas is high');}
 /** Recover already-authorized bytes before generating another NPC decision. No new nonce or budget reservation. */
 resumePending(){return this.exclusive(async()=>{
  const rows=this.store.db.prepare("SELECT * FROM chain_transactions WHERE signer=? AND state='pending' ORDER BY rowid").all(this.config.accountId);
  for(const row of rows)await this.reconcile(row,true);
  return rows.length;
 });}
 change<T>(id:string,method:string,args:Record<string,unknown>):Promise<ChainReceipt<T>>{
  if(!['execute','settle','expire','close_crown','seed_crown','configure','set_focus'].includes(method))throw new ChainError('Relay method denied');
  return this.submit<T>(id,this.config.contractId,[actions.functionCall(method,args,this.config.gas,0n)],0n);
 }
 fundIdentity(id:string,actor:string){if(!/^[a-f0-9]{64}$/.test(actor))throw new ChainError('Implicit identity required');return this.submit(id,actor,[actions.transfer(5000000000000000000000n)],5000000000000000000000n);}
 delegate(id:string,signed:SignedDelegate){
  const d=signed.delegateAction;
  if(d.receiverId!==this.config.contractId||!/^[a-f0-9]{64}$/.test(d.senderId)||d.actions.length!==2)throw new ChainError('Unexpected session transaction');
  for(const [i,a] of d.actions.entries())if(a.enum!=='functionCall'||a.functionCall?.methodName!==['join','set_session'][i]||a.functionCall.deposit!==0n||a.functionCall.gas>30000000000000n)throw new ChainError('Unexpected delegated action');
  return this.submit(id,d.senderId,[actions.signedDelegate(signed)],0n,60000000000000n);
 }
 private finish<T>(row:Record<string,unknown>,result:any):ChainReceipt<T>{
  if(result.final_execution_status!=='FINAL')throw new ChainError('Transaction is still confirming',String(row.hash));
  if(!result.status||!('SuccessValue' in result.status)||(result.receipts_outcome??[]).some((r:any)=>r.outcome?.status&&'Failure' in r.outcome.status)){
   this.store.db.prepare("UPDATE chain_transactions SET state='failed' WHERE id=?").run(String(row.id));throw new ChainError('NEAR rejected this action. Refresh before making a new request.',String(row.hash));
  }
  let value:unknown=null;const encoded=result.status.SuccessValue;if(encoded){try{value=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));}catch{throw new ChainError('Confirmed response needs reconciliation',String(row.hash));}}
  const receipt:ChainReceipt<T>={value:value as T,transactionHash:String(row.hash),network:'testnet',settled:true};
  this.store.db.prepare("UPDATE chain_transactions SET state='final',result=? WHERE id=?").run(JSON.stringify(receipt),String(row.id));return receipt;
 }
 private async reconcile<T>(row:Record<string,unknown>,rebroadcast=false):Promise<ChainReceipt<T>>{
  if(row.state==='final')return JSON.parse(String(row.result));if(row.state==='failed')throw new ChainError('This transaction failed. Refresh before a new action.',String(row.hash));
  try{return this.finish<T>(row,await this.rpc.viewTransactionStatus({txHash:String(row.hash),accountId:String(row.signer),waitUntil:'FINAL'}));}
  catch(error){if(error instanceof ChainError)throw error;if(!rebroadcast)throw new ChainError('A previous transaction is still unconfirmed. Retry that request first.',String(row.hash));}
  try{return this.finish<T>(row,await this.rpc.sendTransactionUntil(SignedTransaction.decode(Buffer.from(String(row.bytes),'base64')),'FINAL'));}
  catch(error){if(error instanceof ChainError)throw error;throw new ChainError('Transaction confirmation is pending. Retry to check the same transaction.',String(row.hash));}
 }
 private submit<T>(id:string,receiverId:string,txActions:Action[],deposit:bigint,gas=this.config.gas):Promise<ChainReceipt<T>>{
  return this.exclusive(async()=>{
   if(typeof id!=='string'||id.length>180||id.length<8)throw new ChainError('Invalid request identifier');
   const fingerprint=digest(JSON.stringify({receiverId,txActions},(_,v)=>typeof v==='bigint'?v.toString():v));
   const old=this.store.db.prepare('SELECT * FROM chain_transactions WHERE id=?').get(id);
   if(old){if(old.fingerprint!==fingerprint||old.signer!==this.config.accountId)throw new ChainError('Request identifier was reused with different contents');return this.reconcile<T>(old,true);}
   await this.check();
   for(const pending of this.store.db.prepare("SELECT * FROM chain_transactions WHERE signer=? AND state='pending'").all(this.config.accountId))await this.reconcile(pending);
   const day=new Date(this.now()).toISOString().slice(0,10),reserve=gas*this.config.gasPriceCap+deposit;
   const rows=this.store.db.prepare('SELECT reserved FROM chain_transactions WHERE signer=? AND day=?').all(this.config.accountId,day);
   if(rows.length>=this.config.maxDailyRequests||rows.reduce((sum,r)=>sum+BigInt(String(r.reserved)),0n)+reserve>this.config.dailyBudget)throw new ChainError('Today’s testnet sponsor allowance is full. Free play remains available.');
   const signed=await this.account.createSignedTransaction({receiverId,actions:txActions});
   const hash=baseEncode(createHash('sha256').update(signed.transaction.encode()).digest());
   this.store.db.prepare("INSERT INTO chain_transactions VALUES(?,?,?,?,?,?,?,'pending',NULL)").run(id,this.config.accountId,fingerprint,day,String(reserve),hash,Buffer.from(signed.encode()).toString('base64'));
   const row=this.store.db.prepare('SELECT * FROM chain_transactions WHERE id=?').get(id)!;
   try{return this.finish<T>(row,await this.rpc.sendTransactionUntil(signed,'FINAL'));}
   catch(error){if(error instanceof ChainError)throw error;throw new ChainError('Submitted to NEAR; confirmation is pending. Retry this same request.',hash);}
  });
 }
}
