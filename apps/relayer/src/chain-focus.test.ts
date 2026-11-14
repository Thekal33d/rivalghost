import {describe,it,expect,vi} from 'vitest';
import {GuestStore} from './guest-store.js';
import {ChainFocus} from './chain-focus.js';
import type {ChainRelay} from './chain-relay.js';
import type {NearCompute} from './near-compute.js';
function setup(){
 let now=1800000000000;const store=new GuestStore(':memory:','http://localhost:5173');
 store.db.exec('CREATE TABLE chain_transactions(id TEXT PRIMARY KEY,state TEXT)');
 const world={moth:'moth.testnet',paused:false,focus:1,stock:10,districts:Array(10).fill(0)};
 const decision={source:'near-ai',focus:'courier',at:now,reason:'MOTH chose couriers'};
 const relay={store,config:{accountId:'moth.testnet',maxDailyRequests:4},view:vi.fn(async()=>({...world})),change:vi.fn(async()=>({value:2,transactionHash:'confirmed-hash'}))} as unknown as ChainRelay;
 const compute={config:{enabled:true},decide:vi.fn(async()=>({...decision}))} as unknown as NearCompute;
 return {store,world,decision,relay,compute,advance:(ms:number)=>now+=ms,make:()=>new ChainFocus(relay,compute,()=>now)};
}
describe('live MOTH decision bridge',()=>{
 it('submits only a bounded enum, journals before I/O and never repeats a confirmed cached decision',async()=>{
  const x=setup();try{
   vi.mocked(x.relay.change).mockImplementation(async()=>{expect(x.store.db.prepare('SELECT state FROM npc_focus_updates').get()?.state).toBe('pending');return {value:2,transactionHash:'confirmed-hash',network:'testnet',settled:true};});
   const worker=x.make();await Promise.all([worker.tick(),worker.tick()]);await x.make().tick();
   expect(x.relay.change).toHaveBeenCalledTimes(1);expect(x.relay.change).toHaveBeenCalledWith(`moth-focus:${x.decision.at}`,'set_focus',{slot:2});
   expect(worker.status().lastUpdate).toMatchObject({state:'confirmed',focus:'courier',transactionHash:'confirmed-hash'});
  }finally{x.store.close();}
 });
 it('resumes the saved request after restart without another Cloud call',async()=>{
  const x=setup();try{
   vi.mocked(x.relay.change).mockRejectedValueOnce(new Error('response lost'));
   await expect(x.make().tick()).rejects.toThrow();const first=vi.mocked(x.relay.change).mock.calls[0];
   await x.make().tick();expect(vi.mocked(x.relay.change).mock.calls[1]).toEqual(first);expect(x.compute.decide).toHaveBeenCalledTimes(1);
  }finally{x.store.close();}
 });
 it('rejects expired unsigned requests but still reconciles signed requests',async()=>{
  for(const signed of [false,true]){const x=setup();try{
   vi.mocked(x.relay.change).mockRejectedValueOnce(new Error('timeout'));await expect(x.make().tick()).rejects.toThrow();
   if(signed)x.store.db.prepare('INSERT INTO chain_transactions VALUES(?,?)').run(`moth-focus:${x.decision.at}`,'pending');
   x.advance(300001);await x.make().tick();expect(x.relay.change).toHaveBeenCalledTimes(signed?2:1);
   expect(x.make().status().lastUpdate?.state).toBe(signed?'confirmed':'rejected');
  }finally{x.store.close();}}
 });
 it('keeps the existing contract focus on fallback, hostile, stale, future or paused decisions',async()=>{
  for(const variant of [{source:'local'},{focus:'transfer'},{at:0},{at:1800000000001},{paused:true}]){
   const x=setup();try{Object.assign(x.decision,variant);if('paused'in variant)x.world.paused=true;await x.make().tick();expect(x.relay.change).not.toHaveBeenCalled();if(x.world.paused)expect(x.compute.decide).not.toHaveBeenCalled();}finally{x.store.close();}
  }
 });
 it('does not retry a known failed transaction or allow an unbounded bridge',async()=>{
  const x=setup();try{
   vi.mocked(x.relay.change).mockRejectedValueOnce(new Error('pending'));await expect(x.make().tick()).rejects.toThrow();
   x.store.db.prepare('INSERT INTO chain_transactions VALUES(?,?)').run(`moth-focus:${x.decision.at}`,'failed');await x.make().tick();await x.make().tick();expect(x.relay.change).toHaveBeenCalledTimes(1);
   x.relay.config.maxDailyRequests=5;expect(()=>x.make()).toThrow('bounded');
  }finally{x.store.close();}
 });
});
