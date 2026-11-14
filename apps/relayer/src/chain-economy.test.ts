import {describe,it,expect,vi} from 'vitest';
import {GuestStore} from './guest-store.js';
import {ChainEconomy} from './chain-economy.js';
import type {ChainRelay} from './chain-relay.js';
import type {ChainPilot,ChainWorld} from '@rivalghost/game-data';

function setup(enabled=true){
 const store=new GuestStore(':memory:','http://localhost:5173');
 const relay={store,change:vi.fn(),view:vi.fn()} as unknown as ChainRelay;
 const npc={resumePending:vi.fn().mockResolvedValue(0),change:vi.fn()} as unknown as ChainRelay;
 const economy=new ChainEconomy(relay,{} as CryptoKey,enabled?npc:undefined,()=>1000);
 vi.spyOn(economy,'world').mockResolvedValue({hound:'hound.testnet',paused:false,crowns:[]} as unknown as ChainWorld);
 return {store,relay,npc,economy};
}
describe('bounded on-chain HOUND recovery',()=>{
 it('does nothing when the worker is disabled',async()=>{
  const x=setup(false);try{await x.economy.tick();expect(x.economy.world).not.toHaveBeenCalled();expect(x.npc.resumePending).not.toHaveBeenCalled();}finally{x.store.close();}
 });
 it('resumes the saved flight after restart instead of paying a second entry',async()=>{
  const x=setup();try{
   const replay={seed:123,chapter:0,frames:[]};
   x.store.db.prepare('INSERT INTO economy_npc_flights VALUES(?,?)').run('npc-entry:7',JSON.stringify(replay));
   vi.spyOn(x.economy,'pilot').mockResolvedValue({nonce:7,run:{id:42,kind:0,expires:2000}} as ChainPilot);
   const settle=vi.spyOn(x.economy,'settle').mockResolvedValue({} as never);
   await x.economy.tick();
   expect(x.npc.resumePending).toHaveBeenCalledOnce();
   expect(settle).toHaveBeenCalledWith({accountId:'hound.testnet'},'42',replay);
   expect(x.npc.change).not.toHaveBeenCalled();
  }finally{x.store.close();}
 });
 it('resolves an expired flight without buying a replacement on the same tick',async()=>{
  const x=setup();try{
   vi.spyOn(x.economy,'pilot').mockResolvedValue({nonce:7,run:{id:42,kind:0,expires:999}} as ChainPilot);
   await x.economy.tick();
   expect(x.relay.change).toHaveBeenCalledWith('expire:hound.testnet:42','expire',{actor:'hound.testnet'});
   expect(x.npc.change).not.toHaveBeenCalled();
  }finally{x.store.close();}
 });
});
