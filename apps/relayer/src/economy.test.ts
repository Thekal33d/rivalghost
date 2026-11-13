import {describe,it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {guestAuthMessage,CHAPTERS,houndDecision} from '@rivalghost/game-data';
import {flyHound,HOUND_STYLES,createExpedition,houndInput,simulateExpedition} from '@rivalghost/sim';
import {GuestStore} from './guest-store.js';
import {SocialService} from './social.js';
import {GuestService} from './guest-service.js';
import {EconomyService,simulateEconomyWeek} from './economy.js';
import {createGuestServer} from './guest-http.js';
const origin='http://localhost:5173';
function guest(store:GuestStore){const key=generateKeyPairSync('ed25519'),publicKey=key.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('hex'),c=store.challenge(publicKey,'test');return store.authenticate(c.nonce,publicKey,sign(null,Buffer.from(guestAuthMessage(c)),key.privateKey).toString('hex'));}
function setup(){let time=1800000000000;const store=new GuestStore(':memory:',origin,()=>time);new SocialService(store);const economy=new EconomyService(store,()=>time),pilot=guest(store).guest;economy.join(pilot);return {store,economy,pilot,advance:(n:number)=>time+=n};}
const config={chapter:0 as const,rig:'fan' as const,seed:CHAPTERS[0].seed,rulesVersion:3 as const};
const winner=flyHound(config,'ace').replay;
describe('HOUND economy',()=>{
  it('transfers a one-time grant from a finite reserve and conserves the total across restart',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'rg-economy-'));let store=new GuestStore(join(dir,'db'),origin);new SocialService(store);let pit=new EconomyService(store);const pilot=guest(store).guest;
    try{pit.join(pilot);pit.join(pilot);expect(pit.view(pilot)).toMatchObject({balance:100,reserve:99900,total:100100,houndBalance:40});store.close();store=new GuestStore(join(dir,'db'),origin);new SocialService(store);pit=new EconomyService(store);expect(pit.view(pilot).balance).toBe(100);}finally{store.close();await rm(dir,{recursive:true,force:true});}
  });
  it('locks entries once, binds the mission and pilot, and pays an authenticated win exactly once',()=>{
    const {store,economy,pilot}=setup();try{const a=economy.start(pilot,0);expect(economy.start(pilot,0).id).toBe(a.id);expect(economy.view(pilot).balance).toBe(90);
      const other=guest(store).guest;economy.join(other);expect(()=>economy.start(other,0)).toThrow('reserved');expect(()=>economy.settle(other,a.id,winner)).toThrow('belong');
      expect(()=>economy.settle(pilot,a.id,{...winner,seed:999})).toThrow('mission');expect(economy.view(pilot).balance).toBe(90);
      const receipt=economy.settle(pilot,a.id,winner);expect(receipt).toMatchObject({won:true,entryReturned:10,bountyPaid:20,balance:120});expect(economy.settle(pilot,a.id,winner)).toEqual(receipt);expect(economy.view(pilot).total).toBe(100100);
      expect(()=>economy.start(other,0)).toThrow('defense');economy.defend(pilot,0);expect(economy.view(pilot).balance).toBe(100);expect(()=>economy.defend(pilot,0)).toThrow('one defense');
    }finally{store.close();}
  });
  it('treats a tie as a loss, splits 8/2, and never trusts a supplied score',()=>{
    const {store,economy,pilot}=setup();try{const c=economy.view(pilot).crowns[0],a=economy.start(pilot,0);const receipt=economy.settle(pilot,a.id,{...c.replay,score:9999999} as any);expect(receipt).toMatchObject({won:false,bountyAdded:8,holderPaid:2,balance:90,score:c.score});const v=economy.view(pilot);expect(v.crowns[0].bounty).toBe(28);expect(v.houndBalance).toBe(42);expect(v.total).toBe(100100);}finally{store.close();}
  });
  it('forfeits unresolved flights, rejects late results and releases Crown locks',()=>{
    const {store,economy,pilot,advance}=setup();try{const a=economy.start(pilot,0);advance(120001);expect(()=>economy.settle(pilot,a.id,winner)).toThrow('expired');economy.tick();const v=economy.view(pilot);expect(v.balance).toBe(90);expect(v.attempt?.status).toBe('forfeited');expect(v.crowns[0].bounty).toBe(28);expect(v.houndBalance).toBe(42);economy.tick();expect(economy.view(pilot).balance).toBe(90);expect(v.crowns[0].lock).toBeNull();expect(v.total).toBe(100100);advance(1800000);economy.tick();expect(economy.view(pilot).total).toBe(100100);}finally{store.close();}
  });
  it('uses a readable budget policy with reserve, daily ceiling, cooldown and honest passes',()=>{
    const base={balance:100,spentToday:0,now:1800000000000,lastAttack:0,target:10000,rehearsal:12000,bounty:20,locked:false,open:true};
    expect(houndDecision(base).action).toBe('attack');
    for(const change of [{balance:29},{spentToday:60},{lastAttack:base.now},{locked:true},{bounty:0},{open:false},{rehearsal:9999}])expect(houndDecision({...base,...change}).action).toBe('pass');
  });
  it('NPC counterattacks use real inputs and cannot spend twice during a cooldown',()=>{
    const {store,economy,pilot}=setup();try{
      const opening=economy.view(pilot).crowns[0].score,ceiling=simulateExpedition(winner).score;
      let mid=winner;
      for(let cadence=2;cadence<=40;cadence++){const game=createExpedition(config);let input=0;while(!game.snapshot().finished){const a=game.snapshot();if(a.tick%cadence===0)input=houndInput(a,'rescuer');game.step(input);}if(game.result().score>opening&&game.result().score<ceiling){mid=game.replay();break;}}
      expect(simulateExpedition(mid).score).toBeLessThan(ceiling);
      const a=economy.start(pilot,0);expect(economy.settle(pilot,a.id,mid).won).toBe(true);economy.defend(pilot,0);economy.tick();let v=economy.view(pilot);expect(v.crowns[0].holderName).toBe('HOUND');expect(v.spentToday).toBe(10);expect(simulateExpedition(v.crowns[0].replay).score).toBe(v.crowns[0].score);economy.tick();v=economy.view(pilot);expect(v.spentToday).toBe(10);expect(v.total).toBe(100100);
    }finally{store.close();}
  });
  it('reproduces every NPC style without editing the simulation and isolates the seven-day lab',()=>{
    for(const style of HOUND_STYLES){const run=flyHound(config,style);expect(simulateExpedition(run.replay)).toEqual(run.result);}
    const {store,economy,pilot}=setup();try{const before=economy.view(pilot);const week=simulateEconomyWeek();expect(week.days).toHaveLength(7);expect(week.days.some(day=>day.npcSpent>0)).toBe(true);expect(week.days.every(day=>day.total===100100)).toBe(true);expect(economy.view(pilot)).toEqual(before);expect(new Set(week.days.map(d=>`${d.player}/${d.hound}/${d.bounties}`)).size).toBeGreaterThan(1);}finally{store.close();}
  });
  it('protects economy writes through the HTTP session/origin boundary',async()=>{
    const store=new GuestStore(':memory:',origin),server=createGuestServer(new GuestService(store));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('port');const base=`http://127.0.0.1:${address.port}/api/guest/`;
    const request=(path:string,body:unknown,cookie='',requestOrigin=origin)=>fetch(base+path,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
    try{expect((await request('economy/join',{})).status).toBe(401);const {token}=guest(store),cookie=`rg_guest=${token}`;expect((await request('economy/join',{},cookie,'https://evil.example')).status).toBe(403);expect((await request('economy/join',{},cookie)).status).toBe(200);
      const attempt=await (await request('economy/start',{crown:0,player:'forged'},cookie)).json();const response=await request('economy/settle',{id:attempt.id,replay:winner,score:9999999},cookie);expect(response.status).toBe(200);expect((await response.json()).score).toBe(simulateExpedition(winner).score);
      const v=await(await fetch(base+'economy')).json();expect(v.balance).toBeNull();expect(v.attempt).toBeNull();expect(v.mode).toBe('local-demo');
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();}
  });
});
