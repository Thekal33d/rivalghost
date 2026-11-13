import {describe,it,expect,vi,afterEach} from 'vitest';
import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {Account,JsonRpcProvider,PublicKey,KeyType,DelegateAction} from 'near-api-js';
import {GuestStore} from './guest-store.js';
import {ChainSessionAuth} from './chain-auth.js';
import type {ChainRelay} from './chain-relay.js';
afterEach(()=>vi.restoreAllMocks());
function setup(){
 const store=new GuestStore(':memory:','http://localhost:5173'),pair=generateKeyPairSync('ed25519'),raw=pair.publicKey.export({type:'spki',format:'der'}).subarray(-32),actor=raw.toString('hex'),publicKey=new PublicKey({keyType:KeyType.ED25519,data:raw}),session='b'.repeat(64),id='a'.repeat(64);
 store.db.prepare("INSERT INTO guests(id,public_key,account_id,state) VALUES(?,?,?,'local')").run(id,'near:'+actor,actor);
 store.db.prepare("INSERT INTO sessions(hash,guest_id,expires,auth_method) VALUES(?,?,?,'near')").run(createHash('sha256').update(session).digest('hex'),id,Date.now()+3600000);
 const rpc=new JsonRpcProvider({url:'https://test.rpc.fastnear.com'});vi.spyOn(rpc,'viewAccount').mockResolvedValue({} as any);
 vi.spyOn(Account.prototype,'createMetaTransaction').mockImplementation(async(args)=>new DelegateAction({senderId:actor,receiverId:args.receiverId,actions:args.actions,nonce:1n,maxBlockHeight:999n,publicKey}));
 const delegate=vi.fn(async()=>({settled:true,transactionHash:'confirmed'})),fundIdentity=vi.fn();
 const relay={store,rpc,config:{contractId:'game.testnet'},delegate,fundIdentity} as unknown as ChainRelay;
 const network={deriveKey:vi.fn(async()=>publicKey.toString()),ownsImplicitAccount:vi.fn(async()=>true)};
 const signing={sign:vi.fn(async(_jwt:string,payload:number[])=>Buffer.from(JSON.stringify({signature:[...sign(null,createHash('sha256').update(Uint8Array.from(payload)).digest(),pair.privateKey)]})).toString('base64'))};
 const auth=new ChainSessionAuth(relay,network,signing,async token=>JSON.parse(token));
 return {store,session,guest:store.guest(id)!,auth,signing,delegate,network};
}
describe('NEAR Auth delegated game authorization',()=>{
 it('binds explicit join/session actions to identity and browser session, without another paid signature on retry',async()=>{
  const x=setup();try{const flow=await x.auth.begin(x.guest,x.session,'11'.repeat(32)),jwt=JSON.stringify({sub:'subject',fatxn:flow.payload});
   await expect(x.auth.complete(x.guest,'other',flow.id,jwt)).rejects.toThrow('different session');
   const result=await x.auth.complete(x.guest,x.session,flow.id,jwt);expect(result.settled).toBe(true);expect(x.signing.sign).toHaveBeenCalledTimes(1);expect(x.delegate).toHaveBeenCalledTimes(1);
   expect(await x.auth.complete(x.guest,x.session,flow.id,jwt)).toEqual(result);expect(x.signing.sign).toHaveBeenCalledTimes(1);
   const signed=(x.delegate.mock.calls as any)[0][1];expect(signed.delegateAction.receiverId).toBe('game.testnet');expect(signed.delegateAction.senderId).toBe(x.guest.accountId);expect(signed.delegateAction.actions.map((a:any)=>a.functionCall.methodName)).toEqual(['join','set_session']);
  }finally{x.store.close();}
 });
 it('rejects modified authorization and changed account ownership before sponsorship',async()=>{
  const x=setup();try{const flow=await x.auth.begin(x.guest,x.session,'11'.repeat(32));await expect(x.auth.complete(x.guest,x.session,flow.id,JSON.stringify({sub:'subject',fatxn:[]}))).rejects.toThrow('does not match');expect(x.signing.sign).not.toHaveBeenCalled();x.network.ownsImplicitAccount.mockResolvedValue(false);await expect(x.auth.complete(x.guest,x.session,flow.id,JSON.stringify({sub:'subject',fatxn:flow.payload}))).rejects.toThrow('identity');expect(x.signing.sign).not.toHaveBeenCalled();}finally{x.store.close();}
 });
 it('retains the exact signed delegate after an uncertain broadcast',async()=>{
  const x=setup();try{const flow=await x.auth.begin(x.guest,x.session,'11'.repeat(32)),jwt=JSON.stringify({sub:'subject',fatxn:flow.payload});x.delegate.mockRejectedValueOnce(new Error('pending'));
   await expect(x.auth.complete(x.guest,x.session,flow.id,jwt)).rejects.toThrow('pending');await x.auth.complete(x.guest,x.session,flow.id,jwt);expect(x.signing.sign).toHaveBeenCalledTimes(1);
   const calls=x.delegate.mock.calls as any;expect(Buffer.from(calls[0][1].encode())).toEqual(Buffer.from(calls[1][1].encode()));
  }finally{x.store.close();}
 });
});
