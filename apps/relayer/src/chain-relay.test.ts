import {describe,it,expect,vi,afterEach} from 'vitest';
import {Account,JsonRpcProvider,KeyPair,Transaction,SignedTransaction,Signature,KeyType,actions} from 'near-api-js';
import {GuestStore} from './guest-store.js';
import {ChainRelay} from './chain-relay.js';
afterEach(()=>vi.restoreAllMocks());
function setup(){
 const store=new GuestStore(':memory:','http://localhost:5173'),rpc=new JsonRpcProvider({url:'https://test.rpc.fastnear.com'},{retries:1}),pair=KeyPair.fromRandom('ed25519');
 const relay=new ChainRelay(store,rpc,{contractId:'game.testnet',accountId:'relay.testnet',privateKey:pair.toString(),dailyBudget:60000000000000000000000n,maxDailyRequests:2,gasPriceCap:1000000000n,gas:30000000000000n});
 vi.spyOn(rpc,'getNetworkId').mockResolvedValue('testnet');vi.spyOn(rpc,'viewGasPrice').mockResolvedValue({gas_price:'100000000'});
 const build=vi.spyOn(Account.prototype,'createSignedTransaction').mockImplementation(async({receiverId,actions:as})=>new SignedTransaction({transaction:new Transaction({signerId:'relay.testnet',publicKey:pair.getPublicKey(),nonce:1n,receiverId,actions:as,blockHash:new Uint8Array(32)}),signature:new Signature({keyType:KeyType.ED25519,data:new Uint8Array(64)})}));
 const final={final_execution_status:'FINAL',status:{SuccessValue:Buffer.from('{"cr":100}').toString('base64')},receipts_outcome:[]} as any;
 return {store,rpc,relay,build,final};
}
describe('persisted NEAR sponsor relay',()=>{
 it('persists before submission, reconciles an uncertain result and never signs twice',async()=>{
  const x=setup();try{
   const send=vi.spyOn(x.rpc,'sendTransactionUntil').mockImplementation(async()=>{expect(x.store.db.prepare('SELECT count(*) n FROM chain_transactions').get()!.n).toBe(1);throw new Error('timeout');});
   await expect(x.relay.change('action:one','execute',{intent:{nonce:1}})).rejects.toThrow('pending');
   vi.spyOn(x.rpc,'viewTransactionStatus').mockResolvedValue(x.final);
   const result=await x.relay.change<{cr:number}>('action:one','execute',{intent:{nonce:1}});expect(result.value.cr).toBe(100);expect(result.settled).toBe(true);expect(x.build).toHaveBeenCalledTimes(1);expect(send).toHaveBeenCalledTimes(1);
   await expect(x.relay.change('action:one','execute',{intent:{nonce:2}})).rejects.toThrow('different contents');
  }finally{x.store.close();}
 });
 it('retains budget on failure and detects a failed inner receipt',async()=>{
  const x=setup();try{
   vi.spyOn(x.rpc,'sendTransactionUntil').mockResolvedValue({...x.final,receipts_outcome:[{outcome:{status:{Failure:{error:'denied'}}}}]} as any);
   await expect(x.relay.change('action:one','execute',{})).rejects.toThrow('rejected');
   expect(x.store.db.prepare('SELECT state,reserved FROM chain_transactions').get()).toMatchObject({state:'failed',reserved:'30000000000000000000000'});
   await expect(x.relay.change('action:one','execute',{})).rejects.toThrow('failed');
   // Distinct semantic request -> distinct tx hash in the mock.
   x.build.mockImplementationOnce(async({receiverId,actions:as})=>new SignedTransaction({transaction:new Transaction({signerId:'relay.testnet',publicKey:KeyPair.fromRandom('ed25519').getPublicKey(),nonce:2n,receiverId,actions:as,blockHash:new Uint8Array(32)}),signature:new Signature({keyType:KeyType.ED25519,data:new Uint8Array(64)})}));
   await expect(x.relay.change('action:two','execute',{})).rejects.toThrow('rejected');
   await expect(x.relay.change('action:three','execute',{})).rejects.toThrow('allowance');
  }finally{x.store.close();}
 });
 it('refuses unexpected methods, invalid funding identities and wrong networks before signing',async()=>{
  const x=setup();try{expect(()=>x.relay.change('action:one','delete_account',{})).toThrow('denied');expect(()=>x.relay.fundIdentity('identity:x','attacker.near')).toThrow('identity');vi.spyOn(x.rpc,'getNetworkId').mockResolvedValue('mainnet');await expect(x.relay.change('action:one','execute',{})).rejects.toThrow('Testnet');expect(x.build).not.toHaveBeenCalled();}finally{x.store.close();}
 });
});
