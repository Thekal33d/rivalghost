import {Account,JsonRpcProvider,PublicKey,actions,type KeyPairString} from 'near-api-js';
import {AccountDoesNotExistError} from 'near-api-js/rpc-errors';
import type {GuestStore} from './guest-store.js';
import {NearAuthError,type NearAuthNetwork,type NearAuthRelay,AUTH_DOMAIN} from './near-auth.js';
export class AuthNetwork implements NearAuthNetwork {
  readonly rpc:JsonRpcProvider;
  constructor(url='https://test.rpc.fastnear.com'){if(!url.startsWith('https://'))throw new Error('Auth RPC must use HTTPS');this.rpc=new JsonRpcProvider({url},{retries:1});}
  async assertNetwork(){if(await this.rpc.getNetworkId()!=='testnet')throw new NearAuthError('Testnet authentication required.');}
  async deriveKey(path:string){await this.assertNetwork();const key=await this.rpc.callFunction<string>({contractId:'v1.signer-prod.testnet',method:'derived_public_key',args:{path,predecessor:'fast-auth.testnet',domain_id:1},blockQuery:{finality:'final'}});if(typeof key!=='string')throw new NearAuthError('Cannot derive an account key.');return key;}
  async ownsImplicitAccount(accountId:string,publicKey:string){
    if(!publicKey.startsWith('ed25519:')||Buffer.from(PublicKey.fromString(publicKey).data).toString('hex')!==accountId)return false;
    await this.assertNetwork();
    try{await this.rpc.viewAccount({accountId,blockQuery:{finality:'final'}});}
    catch(error){if(error instanceof AccountDoesNotExistError)return true;throw error;}
    const key=await this.rpc.viewAccessKey({accountId,publicKey,finalityQuery:{finality:'final'}});return key.permission==='FullAccess';
  }
}
export interface AuthRelayConfig {accountId:string;privateKey:KeyPairString;dailyBudget:bigint;maxDailyRequests:number;gasPriceCap:bigint}
export class AuthRelay implements NearAuthRelay {
  private readonly account:Account;
  readonly reservedPerCall:bigint;
  constructor(private readonly store:GuestStore,private readonly network:AuthNetwork,private readonly config:AuthRelayConfig,private readonly now=Date.now){
    if(!config.accountId.endsWith('.testnet')||config.gasPriceCap<1000000000n||!Number.isInteger(config.maxDailyRequests)||config.maxDailyRequests<1||config.maxDailyRequests>100)throw new Error('Invalid testnet auth sponsorship configuration');
    this.reservedPerCall=300000000000000n*config.gasPriceCap+1n;
    if(config.dailyBudget<this.reservedPerCall)throw new Error('Auth budget cannot cover one signing request');
    this.account=new Account(config.accountId,network.rpc,config.privateKey);
    store.db.exec('CREATE TABLE IF NOT EXISTS auth_signing_reservations(flow_id TEXT PRIMARY KEY, day TEXT NOT NULL, reserved TEXT NOT NULL)');
  }
  async sign(jwt:string,payload:number[],flowId:string){
    await this.network.assertNetwork();
    if(BigInt((await this.network.rpc.viewGasPrice()).gas_price)>this.config.gasPriceCap)throw new NearAuthError('Auth sponsorship is paused while gas is high.');
    const day=new Date(this.now()).toISOString().slice(0,10),db=this.store.db;
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('DELETE FROM auth_signing_reservations WHERE day<?').run(new Date(this.now()-7*86400000).toISOString().slice(0,10));
      const rows=db.prepare('SELECT reserved FROM auth_signing_reservations WHERE day=?').all(day);
      if(rows.length>=this.config.maxDailyRequests||rows.reduce((n,r)=>n+BigInt(String(r.reserved)),0n)+this.reservedPerCall>this.config.dailyBudget)throw new NearAuthError("Today's sign-in sponsor allowance is full. Free play is available.");
      db.prepare('INSERT INTO auth_signing_reservations VALUES(?,?,?)').run(flowId,day,String(this.reservedPerCall));db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    // One fixed receiver/action; the server reconstructed every sign_payload byte.
    // Uncertain failures retain their reservation and are never automatically rebroadcast.
    const result=await this.account.signAndSendTransaction({receiverId:'fast-auth.testnet',actions:[actions.functionCall('sign',{guard_id:`jwt#https://${AUTH_DOMAIN}/`,verify_payload:jwt,sign_payload:payload,algorithm:'eddsa'},300000000000000n,1n)],waitUntil:'FINAL',throwOnFailure:true,retries:0});
    const status=result.status;if(typeof status!=='object'||!('SuccessValue' in status)||!status.SuccessValue)throw new NearAuthError('NEAR Auth did not approve this login.');return status.SuccessValue;
  }
}
