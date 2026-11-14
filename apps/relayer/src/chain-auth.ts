import {createHash,randomBytes,createPublicKey,verify} from 'node:crypto';
import {Account,PublicKey,KeyType,DelegateAction,SignedDelegate,Signature,encodeDelegateAction,actions} from 'near-api-js';
import {AccountDoesNotExistError} from 'near-api-js/rpc-errors';
import {checkJwt,AUTH_DOMAIN,NearAuthError,type NearAuthRelay,type NearAuthNetwork,type AuthClaims} from './near-auth.js';
import {ChainRelay} from './chain-relay.js';
import type {Guest} from './guest-store.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export class ChainSessionAuth {
 constructor(readonly relay:ChainRelay,readonly network:NearAuthNetwork,readonly signing:NearAuthRelay,private readonly claims:(jwt:string)=>Promise<AuthClaims>=checkJwt,private readonly now=Date.now,readonly dailyNewAccounts=4){
  if(!Number.isInteger(dailyNewAccounts)||dailyNewAccounts<1||dailyNewAccounts>100)throw new Error('New-player allowance must be between 1 and 100 per UTC day');
  relay.store.db.exec('CREATE TABLE IF NOT EXISTS economy_auth_flows(id TEXT PRIMARY KEY,session TEXT NOT NULL,actor TEXT NOT NULL,payload TEXT NOT NULL,descriptor TEXT NOT NULL,expires INTEGER NOT NULL,state TEXT NOT NULL,result TEXT)');
 }
 async begin(guest:Guest,session:string,publicKey:unknown){
  if(!guest.accountId||!/^[a-f0-9]{64}$/.test(guest.accountId)||typeof publicKey!=='string'||!/^[a-f0-9]{64}$/.test(publicKey)||!['near','embedded'].includes(this.relay.store.authMethod(session)??''))throw new NearAuthError('Sign in to NEAR before activating the economy.');
  this.relay.store.rate('chain-auth:'+guest.id,3,600000);
  const actor=guest.accountId,ownerKey=new PublicKey({keyType:KeyType.ED25519,data:Buffer.from(actor,'hex')});
  if(!await this.network.ownsImplicitAccount(actor,ownerKey.toString()))throw new NearAuthError('Account ownership changed. Reconnect NEAR.');
  try{await this.relay.rpc.viewAccount({accountId:actor,blockQuery:{finality:'final'}});}catch(error){if(!(error instanceof AccountDoesNotExistError))throw error;if(this.relay.store.authMethod(session)==='embedded')this.reserveEmbeddedFunding(actor);await this.relay.fundIdentity('identity:'+actor,actor);}
  const until=this.now()+12*3600000;
  const delegate=await new Account(actor,this.relay.rpc).createMetaTransaction({receiverId:this.relay.config.contractId,publicKey:ownerKey,blockHeightTtl:600,
   actions:[actions.functionCall('join',{},20000000000000n,0n),actions.functionCall('set_session',{public_key:[...Buffer.from(publicKey,'hex')],until},20000000000000n,0n)]});
  const payload=[...encodeDelegateAction(delegate)],id=randomBytes(16).toString('hex');
  const descriptor={actor,nonce:String(delegate.nonce),maxBlockHeight:String(delegate.maxBlockHeight),publicKey:ownerKey.toString(),deviceKey:publicKey,until};
  this.relay.store.db.prepare("DELETE FROM economy_auth_flows WHERE expires<? AND state='open'").run(this.now());
  this.relay.store.db.prepare("INSERT INTO economy_auth_flows VALUES(?,?,?,?,?,?,'open',NULL)").run(id,hash(session),actor,JSON.stringify(payload),JSON.stringify(descriptor),this.now()+300000);
  return {id,payload,descriptor,contractId:this.relay.config.contractId,until,rights:'Claim starter CR and authorize this browser for RivalGhost CR, salvage, items, jobs, trades and Crown entries for 12 hours. No NEAR transfer is authorized.'};
 }
 private reserveEmbeddedFunding(actor:string){
  const db=this.relay.store.db,day=new Date(this.now()).toISOString().slice(0,10);
  db.exec('CREATE TABLE IF NOT EXISTS embedded_funding_reservations(actor TEXT PRIMARY KEY,day TEXT NOT NULL)');
  db.exec('BEGIN IMMEDIATE');
  try{
   if(!db.prepare('SELECT actor FROM embedded_funding_reservations WHERE actor=?').get(actor)){
    if(Number(db.prepare('SELECT count(*) n FROM embedded_funding_reservations WHERE day=?').get(day)!.n)>=this.dailyNewAccounts)throw new NearAuthError(`Today's ${this.dailyNewAccounts}-player testnet setup allowance is full. It resets at 00:00 UTC. You can still sign in and play free.`);
    db.prepare('INSERT INTO embedded_funding_reservations VALUES(?,?)').run(actor,day);
   }
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
 async completeEmbedded(guest:Guest,session:string,id:unknown,signature:unknown){
  if(this.relay.store.authMethod(session)!=='embedded'||typeof id!=='string'||typeof signature!=='string'||!/^[a-f0-9]{128}$/.test(signature))throw new NearAuthError('Invalid embedded authorization');
  const db=this.relay.store.db,row=db.prepare('SELECT * FROM economy_auth_flows WHERE id=? AND session=? AND actor=?').get(id,hash(session),guest.accountId??'');
  if(!row)throw new NearAuthError('Authorization belongs to a different session');
  if(row.state==='complete')return JSON.parse(String(row.result));
  if((row.state==='attempted'||row.state==='pending')&&row.result){
   const receipt=await this.relay.delegate('session:'+id,SignedDelegate.decode(Buffer.from(String(row.result),'base64')));
   db.prepare("UPDATE economy_auth_flows SET state='complete',result=? WHERE id=?").run(JSON.stringify(receipt),id);return receipt;
  }
  if(row.state!=='open'||Number(row.expires)<=this.now())throw new NearAuthError('Authorization expired. Start a fresh game session.');
  const d=JSON.parse(String(row.descriptor)),payload=JSON.parse(String(row.payload));
  const ownerKey=new PublicKey({keyType:KeyType.ED25519,data:Buffer.from(String(row.actor),'hex')});
  if(!await this.network.ownsImplicitAccount(String(row.actor),ownerKey.toString()))throw new NearAuthError('Wallet ownership changed');
  if(Number(row.expires)<=this.now())throw new NearAuthError('Authorization expired. Start a fresh game session.');
  const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(ownerKey.data)]),type:'spki',format:'der'});
  if(!verify(null,createHash('sha256').update(Uint8Array.from(payload)).digest(),key,Buffer.from(signature,'hex')))throw new NearAuthError('Wallet signature does not match this authorization');
  const delegateAction=new DelegateAction({senderId:d.actor,receiverId:this.relay.config.contractId,nonce:BigInt(d.nonce),maxBlockHeight:BigInt(d.maxBlockHeight),publicKey:ownerKey,actions:[actions.functionCall('join',{},20000000000000n,0n),actions.functionCall('set_session',{public_key:[...Buffer.from(d.deviceKey,'hex')],until:d.until},20000000000000n,0n)]});
  if(d.actor!==row.actor||d.publicKey!==ownerKey.toString()||JSON.stringify([...encodeDelegateAction(delegateAction)])!==JSON.stringify(payload))throw new NearAuthError('Session encoding changed');
  const signed=new SignedDelegate({delegateAction,signature:new Signature({keyType:KeyType.ED25519,data:Buffer.from(signature,'hex')})});
  if(db.prepare("UPDATE economy_auth_flows SET state='pending',result=? WHERE id=? AND state='open'").run(Buffer.from(signed.encode()).toString('base64'),id).changes!==1)throw new NearAuthError('Authorization already attempted');
  try{
   const receipt=await this.relay.delegate('session:'+id,signed);db.prepare("UPDATE economy_auth_flows SET state='complete',result=? WHERE id=?").run(JSON.stringify(receipt),id);return receipt;
  }catch(error){db.prepare("UPDATE economy_auth_flows SET state='attempted' WHERE id=?").run(id);throw error;}
 }
 async complete(guest:Guest,session:string,id:unknown,jwt:unknown){
  if(typeof id!=='string'||typeof jwt!=='string'||jwt.length>7168)throw new NearAuthError('Invalid authorization');
  const db=this.relay.store.db,row=db.prepare('SELECT * FROM economy_auth_flows WHERE id=? AND session=? AND actor=?').get(id,hash(session),guest.accountId??'');
  if(!row)throw new NearAuthError('Authorization belongs to a different session');
  if(this.relay.store.authMethod(session)!=='near')throw new NearAuthError('Use this wallet’s own authorization method');
  if(row.state==='complete')return JSON.parse(String(row.result));
  if((row.state==='attempted'||row.state==='pending')&&row.result){
    const receipt=await this.relay.delegate('session:'+id,SignedDelegate.decode(Buffer.from(String(row.result),'base64')));
    db.prepare("UPDATE economy_auth_flows SET state='complete',result=? WHERE id=?").run(JSON.stringify(receipt),id);return receipt;
  }
  if(row.state!=='open'||Number(row.expires)<=this.now())throw new NearAuthError('Authorization expired or already attempted. Check the economy status before starting again.');
  const claims=await this.claims(jwt),payload=JSON.parse(String(row.payload)) as number[];
  if(typeof claims.sub!=='string'||JSON.stringify(claims.fatxn)!==JSON.stringify(payload))throw new NearAuthError('The approved transaction does not match this game session');
  const ownerKey=await this.network.deriveKey(`jwt#https://${AUTH_DOMAIN}/#${claims.sub}`);
  if(Buffer.from(PublicKey.fromString(ownerKey).data).toString('hex')!==row.actor||!await this.network.ownsImplicitAccount(String(row.actor),ownerKey))throw new NearAuthError('Wrong NEAR identity');
  if(db.prepare("UPDATE economy_auth_flows SET state='pending' WHERE id=? AND state='open'").run(id).changes!==1)throw new NearAuthError('Authorization already attempted');
  try{
   const encoded=await this.signing.sign(jwt,payload,'session:'+id),response=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
   if(!Array.isArray(response.signature)||response.signature.length!==64||response.signature.some((n:unknown)=>!Number.isInteger(n)||Number(n)<0||Number(n)>255))throw new NearAuthError('Invalid NEAR Auth signature');
   const raw=PublicKey.fromString(ownerKey).data,publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(raw)]),type:'spki',format:'der'});
   if(!verify(null,createHash('sha256').update(Uint8Array.from(payload)).digest(),publicKey,Buffer.from(response.signature)))throw new NearAuthError('Invalid account authorization');
   const d=JSON.parse(String(row.descriptor));
   const delegateAction=new DelegateAction({senderId:d.actor,receiverId:this.relay.config.contractId,nonce:BigInt(d.nonce),maxBlockHeight:BigInt(d.maxBlockHeight),publicKey:PublicKey.fromString(d.publicKey),actions:[actions.functionCall('join',{},20000000000000n,0n),actions.functionCall('set_session',{public_key:[...Buffer.from(d.deviceKey,'hex')],until:d.until},20000000000000n,0n)]});
   if(JSON.stringify([...encodeDelegateAction(delegateAction)])!==JSON.stringify(payload))throw new NearAuthError('Session encoding changed');
   const signed=new SignedDelegate({delegateAction,signature:new Signature({keyType:KeyType.ED25519,data:Uint8Array.from(response.signature)})});
   db.prepare('UPDATE economy_auth_flows SET result=? WHERE id=?').run(Buffer.from(signed.encode()).toString('base64'),id);
   const receipt=await this.relay.delegate('session:'+id,signed);
   db.prepare("UPDATE economy_auth_flows SET state='complete',result=? WHERE id=?").run(JSON.stringify(receipt),id);return receipt;
  }catch(error){db.prepare("UPDATE economy_auth_flows SET state='attempted' WHERE id=?").run(id);throw error;}
 }
}
