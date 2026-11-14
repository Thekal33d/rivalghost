import {createHash,randomBytes,createPublicKey,verify} from 'node:crypto';
import {PublicKey,KeyType} from 'near-api-js';
import {embeddedLoginMessage,type EmbeddedChallenge} from '@rivalghost/game-data';
import {NearAuthError,type NearAuthNetwork} from './near-auth.js';
import type {GuestStore} from './guest-store.js';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Proof of an on-device ED25519 owner key. No OAuth, funding or server custody. */
export class EmbeddedAuth {
 constructor(readonly store:GuestStore,private readonly network:NearAuthNetwork,private readonly now=Date.now){
  store.db.exec('CREATE TABLE IF NOT EXISTS embedded_login_flows(nonce TEXT PRIMARY KEY,actor TEXT NOT NULL,expires INTEGER NOT NULL)');
 }
 begin(accountId:unknown,ip:string):EmbeddedChallenge {
  if(typeof accountId!=='string'||!/^[a-f0-9]{64}$/.test(accountId))throw new NearAuthError('Invalid embedded wallet');
  this.store.rate('embedded-login-global',60);this.store.rate('embedded-login-ip:'+ip,6);
  this.store.db.prepare('DELETE FROM embedded_login_flows WHERE expires<=?').run(this.now());
  if(Number(this.store.db.prepare('SELECT count(*) n FROM embedded_login_flows').get()!.n)>=200)throw new NearAuthError('Wallet login is busy. Try again shortly.');
  const c={nonce:randomBytes(32).toString('hex'),accountId,origin:this.store.origin,expiresAt:this.now()+60000};
  this.store.db.prepare('INSERT INTO embedded_login_flows VALUES(?,?,?)').run(c.nonce,accountId,c.expiresAt);return c;
 }
 async complete(nonce:unknown,signature:unknown){
  if(typeof nonce!=='string'||!/^[a-f0-9]{64}$/.test(nonce)||typeof signature!=='string'||!/^[a-f0-9]{128}$/.test(signature))throw new NearAuthError('Invalid wallet proof');
  const row=this.store.db.prepare('DELETE FROM embedded_login_flows WHERE nonce=? RETURNING *').get(nonce);
  if(!row||Number(row.expires)<=this.now())throw new NearAuthError('Wallet proof expired. Unlock and reconnect.');
  const actor=String(row.actor),raw=Buffer.from(actor,'hex'),key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]),type:'spki',format:'der'});
  const c={nonce,accountId:actor,origin:this.store.origin,expiresAt:Number(row.expires)};
  if(!verify(null,Buffer.from(embeddedLoginMessage(c)),key,Buffer.from(signature,'hex')))throw new NearAuthError('Wallet signature does not match');
  const publicKey=new PublicKey({keyType:KeyType.ED25519,data:raw});
  if(!await this.network.ownsImplicitAccount(actor,publicKey.toString()))throw new NearAuthError('Wallet ownership changed. Use its current wallet.');
  if(Number(row.expires)<=this.now())throw new NearAuthError('Wallet proof expired. Unlock and reconnect.');
  const id=hash('embedded:'+actor),token=randomBytes(32).toString('hex'),db=this.store.db;
  db.exec('BEGIN IMMEDIATE');
  try{
   const other=db.prepare('SELECT id FROM guests WHERE account_id=? AND id<>?').get(actor,id);
   if(other)throw new NearAuthError('This account belongs to an existing pilot. Use its original sign-in method.');
   if(!this.store.guest(id)&&Number(db.prepare('SELECT count(*) n FROM guests').get()!.n)>=10000)throw new NearAuthError('Pilot capacity is full');
   db.prepare("INSERT OR IGNORE INTO guests(id,public_key,account_id,state) VALUES(?,?,?,'local')").run(id,'embedded:'+actor,actor);
   db.prepare('DELETE FROM sessions WHERE guest_id=?').run(id);
   db.prepare("INSERT INTO sessions(hash,guest_id,expires,auth_method) VALUES(?,?,?,'embedded')").run(hash(token),id,this.now()+12*3600000);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return {token,guest:this.store.guest(id)!};
 }
}
