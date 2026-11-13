import {createHash,randomBytes,createPublicKey,verify} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {PublicKey} from 'near-api-js';
import {encodeNearLogin,type NearLoginChallenge} from '@rivalghost/game-data';
import {GuestStore,type Guest} from './guest-store.js';
export const AUTH_DOMAIN='login.testnet.fast-auth.com',AUTH_AUDIENCE='auth0.jwt.fast-auth.testnet',AUTH_CLIENT='np8paqIpMWmNbzT4xAvOOapZBjsOpptl';
const issuer=`https://${AUTH_DOMAIN}/`,guard=`jwt#${issuer}`;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export class NearAuthError extends Error{}
export interface NearAuthNetwork {
  deriveKey(path:string):Promise<string>;
  ownsImplicitAccount(accountId:string,publicKey:string):Promise<boolean>;
}
export interface NearAuthRelay {sign(jwt:string,payload:number[],flowId:string):Promise<string>}
export interface AuthClaims {sub?:string;fatxn?:unknown}
const jwks=createRemoteJWKSet(new URL('.well-known/jwks.json',issuer),{timeoutDuration:5000,cooldownDuration:30000});
export async function checkJwt(jwt:string,keys:Parameters<typeof jwtVerify>[1]=jwks):Promise<AuthClaims>{return (await jwtVerify(jwt,keys,{issuer,audience:AUTH_AUDIENCE,algorithms:['RS256'],requiredClaims:['sub','exp','iat'],maxTokenAge:'10m',clockTolerance:5})).payload;}
export class NearAuthService {
  constructor(readonly store:GuestStore,private readonly network:NearAuthNetwork,private readonly relay?:NearAuthRelay,private readonly claims=checkJwt,private readonly now=Date.now){
    store.db.exec(`CREATE TABLE IF NOT EXISTS near_identities(account_id TEXT PRIMARY KEY, guest_id TEXT UNIQUE NOT NULL REFERENCES guests(id));
      CREATE TABLE IF NOT EXISTS near_login_flows(id TEXT PRIMARY KEY,binding TEXT NOT NULL,guest_id TEXT,session_hash TEXT,mode TEXT NOT NULL,challenge TEXT NOT NULL,expires INTEGER NOT NULL,state TEXT NOT NULL);`);
  }
  status(){return {enabled:!!this.relay,network:'testnet',clientId:AUTH_CLIENT,domain:AUTH_DOMAIN,signingAudience:AUTH_AUDIENCE,callbackUrl:this.store.origin+'/auth/callback'};}
  begin(mode:unknown,session:string,ip:string){
    if(!this.relay)throw new NearAuthError('NEAR sign-in is waiting for its testnet sponsor. Your local pilot is safe.');
    if(mode!=='link'&&mode!=='signin')throw new NearAuthError('Choose whether to link this pilot or sign in.');
    const guest=this.store.session(session);if(mode==='link'&&!guest)throw new NearAuthError('Reconnect this local pilot before linking it.');
    if(mode==='link'&&this.store.db.prepare('SELECT account_id FROM near_identities WHERE guest_id=?').get(guest!.id))throw new NearAuthError('This pilot is already linked. Sign in to that NEAR account.');
    if(mode==='link'&&guest?.accountId)throw new NearAuthError('This pilot already has a provisioned account; account migration needs review.');
    this.store.rate('near-auth-global',40);this.store.rate('near-auth-ip:'+ip,5);
    this.store.db.prepare('DELETE FROM near_login_flows WHERE expires<=?').run(this.now());
    if(Number(this.store.db.prepare('SELECT count(*) n FROM near_login_flows').get()!.n)>=200)throw new NearAuthError('Sign-in capacity is full. Try later.');
    const id=randomBytes(16).toString('hex'),binding=randomBytes(32).toString('hex');
    const challenge:NearLoginChallenge={id,nonce:randomBytes(32).toString('hex'),recipient:this.store.origin,callbackUrl:this.store.origin+'/auth/callback',expiresAt:this.now()+600000,message:`${mode==='link'?'Link this local pilot to':'Sign in to'} RivalGhost on NEAR testnet. No token transfer or game entry is authorized. Request ${id}.`};
    this.store.db.prepare('INSERT INTO near_login_flows VALUES(?,?,?,?,?,?,?,?)').run(id,hash(binding),mode==='link'?guest!.id:null,mode==='link'?hash(session):null,mode,JSON.stringify(challenge),challenge.expiresAt,'open');
    return {challenge,binding};
  }
  private flow(id:string,binding:string,session:string){
    if(!/^[a-f0-9]{32}$/.test(id)||!(/^[a-f0-9]{64}$/).test(binding))throw new NearAuthError('Login expired. Start again.');
    const row=this.store.db.prepare('SELECT * FROM near_login_flows WHERE id=? AND binding=? AND expires>?').get(id,hash(binding),this.now());
    if(!row)throw new NearAuthError('Login expired. Start again.');
    if(row.mode==='link'&&(row.session_hash!==hash(session)||this.store.session(session)?.id!==row.guest_id))throw new NearAuthError('The pilot session changed. Reconnect before linking.');
    return row;
  }
  cancel(id:string,binding:string,session:string){this.flow(id,binding,session);this.store.db.prepare("UPDATE near_login_flows SET state='cancelled' WHERE id=? AND state='open'").run(id);}
  async complete(id:string,binding:string,session:string,jwt:string):Promise<{token:string;guest:Guest}>{
    const row=this.flow(id,binding,session);if(row.state!=='open')throw new NearAuthError('This login was already attempted. Start a new sign-in.');
    if(typeof jwt!=='string'||jwt.length>7168)throw new NearAuthError('Invalid identity proof.');
    const c=JSON.parse(String(row.challenge)) as NearLoginChallenge,payload=Array.from(encodeNearLogin(c));
    // Validate the issuer signature locally before spending any sponsorship budget.
    let claims:AuthClaims;try{claims=await this.claims(jwt);}catch{throw new NearAuthError('Identity proof expired or invalid. Start a new sign-in.');}
    if(typeof claims.sub!=='string'||claims.sub.length>256||JSON.stringify(claims.fatxn)!==JSON.stringify(payload))throw new NearAuthError('The approved message does not match this login.');
    this.flow(id,binding,session);
    const reserved=this.store.db.prepare("UPDATE near_login_flows SET state='pending' WHERE id=? AND state='open'").run(id);
    if(reserved.changes!==1)throw new NearAuthError('This login was already attempted.');
    try{
      const publicKey=await this.network.deriveKey(`${guard}#${claims.sub}`),key=PublicKey.fromString(publicKey);
      if(!publicKey.startsWith('ed25519:')||key.data.length!==32)throw new NearAuthError('Unsupported account key.');
      const accountId=Buffer.from(key.data).toString('hex');
      const existing=this.store.db.prepare('SELECT guest_id FROM near_identities WHERE account_id=?').get(accountId);
      if(row.mode==='link'&&existing&&existing.guest_id!==row.guest_id)throw new NearAuthError('That account already has a pilot. Sign in to it; inventories cannot be merged.');
      const result=await this.relay!.sign(jwt,payload,id);
      const decoded=JSON.parse(Buffer.from(result,'base64').toString('utf8')) as {scheme?:string;signature?:unknown};
      if(!decoded||!Array.isArray(decoded.signature)||decoded.signature.length!==64||!decoded.signature.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=255))throw new NearAuthError('NEAR Auth did not return a valid signature.');
      const signature=Buffer.from(decoded.signature);
      const cryptoKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(key.data)]),type:'spki',format:'der'});
      if(!verify(null,createHash('sha256').update(Uint8Array.from(payload)).digest(),cryptoKey,signature)||!await this.network.ownsImplicitAccount(accountId,publicKey))throw new NearAuthError('Account ownership could not be verified.');
      this.flow(id,binding,session);
      const token=randomBytes(32).toString('hex');let guestId='';
      this.store.db.exec('BEGIN IMMEDIATE');
      try{
        const linked=this.store.db.prepare('SELECT guest_id FROM near_identities WHERE account_id=?').get(accountId);
        if(row.mode==='link'&&linked&&linked.guest_id!==row.guest_id)throw new NearAuthError('That account already has another pilot.');
        guestId=String(row.guest_id??linked?.guest_id??hash('near:'+accountId));
        if(!this.store.guest(guestId)){
          if(Number(this.store.db.prepare('SELECT count(*) n FROM guests').get()!.n)>=10000)throw new NearAuthError('Pilot capacity is full.');
          this.store.db.prepare("INSERT INTO guests(id,public_key,account_id,state) VALUES(?,?,?,'local')").run(guestId,'near:'+accountId,accountId);
        }
        this.store.db.prepare('INSERT OR IGNORE INTO near_identities VALUES(?,?)').run(accountId,guestId);
        if(this.store.db.prepare('SELECT account_id FROM near_identities WHERE guest_id=?').get(guestId)?.account_id!==accountId)throw new NearAuthError('This pilot is linked to a different account.');
        this.store.db.prepare('UPDATE guests SET account_id=? WHERE id=?').run(accountId,guestId);
        if(row.mode==='link')this.store.db.prepare('DELETE FROM sessions WHERE guest_id=?').run(guestId);
        this.store.db.prepare("INSERT INTO sessions(hash,guest_id,expires,auth_method) VALUES(?,?,?,'near')").run(hash(token),guestId,this.now()+12*3600000);
        this.store.db.prepare("UPDATE near_login_flows SET state='complete' WHERE id=?").run(id);this.store.db.exec('COMMIT');
      }catch(error){this.store.db.exec('ROLLBACK');throw error;}
      return {token,guest:this.store.guest(guestId)!};
    }catch(error){this.store.db.prepare("UPDATE near_login_flows SET state='failed' WHERE id=?").run(id);if(error instanceof NearAuthError)throw error;throw new NearAuthError('NEAR sign-in could not finish. Your local pilot is unchanged. Try a new sign-in.');}
  }
}
