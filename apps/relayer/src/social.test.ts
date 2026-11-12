import {describe,it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {guestAuthMessage,DEFAULT_AVATAR,dailySignal} from '@rivalghost/game-data';
import {createExpedition} from '@rivalghost/sim';
import {GuestStore} from './guest-store.js';
import {GuestService} from './guest-service.js';
import {SocialService} from './social.js';
import {createGuestServer} from './guest-http.js';
const origin='http://localhost:5173';
function guest(store:GuestStore){const key=generateKeyPairSync('ed25519'),publicKey=key.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('hex'),c=store.challenge(publicKey,'test');return store.authenticate(c.nonce,publicKey,sign(null,Buffer.from(guestAuthMessage(c)),key.privateKey).toString('hex'));}
const game=createExpedition({chapter:0,rig:'fan',seed:313,rulesVersion:3});while(!game.snapshot().finished)game.step(0);const replay=game.replay(),score=game.result().score;
const input={mode:'story',replay};
describe('off-chain social flights',()=>{
  it('reserves case-insensitive names and validates cosmetics without overwriting an existing pilot',()=>{
    const store=new GuestStore(':memory:',origin),social=new SocialService(store);try{const a=guest(store).guest,b=guest(store).guest;
      social.saveProfile(a,{username:'Pilot_One',avatar:DEFAULT_AVATAR});expect(()=>social.saveProfile(b,{username:'pilot_one',avatar:DEFAULT_AVATAR})).toThrow('taken');
      expect(()=>social.saveProfile(a,{username:'<script>',avatar:DEFAULT_AVATAR})).toThrow('3–16');
      expect(()=>social.saveProfile(a,{username:'Pilot_One',avatar:{...DEFAULT_AVATAR,palette:'url(secret)'}})).toThrow('avatar');
      expect(social.profile(a.id)?.username).toBe('Pilot_One');
    }finally{store.close();}
  });
  it('derives the score and identity, deduplicates shared replays, and exposes no public key/session',()=>{
    const store=new GuestStore(':memory:',origin),social=new SocialService(store);try{const {guest:a}=guest(store);social.saveProfile(a,{username:'Pilot_One',avatar:DEFAULT_AVATAR});
      const run=social.publish(a,{...input,score:9999999,player:'forged'} as any);expect(run.score).toBe(score);expect(run.pilot.id).toBe(a.id);expect(social.publish(a,input)?.id).toBe(run.id);
      const board=social.board(new URLSearchParams('chapter=0&rig=fan'),a);expect(board.total).toBe(1);expect(board.yourRank).toBe(1);expect(board.rows[0].you).toBe(true);
      expect(JSON.stringify(board)).not.toContain(a.publicKey);expect(social.challenge(run.id)?.replay).toEqual(replay);
    }finally{store.close();}
  });
  it('ranks one best flight per pilot rather than filling the board with their runs',()=>{
    const store=new GuestStore(':memory:',origin),social=new SocialService(store);try{
      const a=guest(store).guest,b=guest(store).guest;social.saveProfile(a,{username:'Alpha',avatar:DEFAULT_AVATAR});social.saveProfile(b,{username:'Bravo',avatar:DEFAULT_AVATAR});
      const alternate=createExpedition({chapter:0,rig:'fan',seed:313,rulesVersion:3});while(!alternate.snapshot().finished)alternate.step(Math.floor(alternate.snapshot().tick/90)%9);
      social.publish(a,input);social.publish(a,{mode:'story',replay:alternate.replay()});social.publish(b,input);
      const board=social.board(new URLSearchParams(),a);expect(board.total).toBe(2);expect(board.rows.filter(row=>row.pilot.id===a.id)).toHaveLength(1);
      expect(board.rows.find(row=>row.pilot.id===a.id)?.score).toBe(Math.max(score,alternate.result().score));expect(board.rows.map(row=>row.rank)).toEqual([1,2]);expect(board.rows[0].score).toBeGreaterThanOrEqual(board.rows[1].score);
    }finally{store.close();}
  });
  it('keeps rigs separate and follows only real other pilots',()=>{
    const store=new GuestStore(':memory:',origin),social=new SocialService(store);try{const a=guest(store).guest,b=guest(store).guest;
      social.saveProfile(a,{username:'Ace',avatar:DEFAULT_AVATAR});social.saveProfile(b,{username:'Wing',avatar:DEFAULT_AVATAR});social.publish(b,input);
      expect(social.board(new URLSearchParams('scope=rivals'),a).total).toBe(0);social.follow(a,b.id,true);
      expect(social.board(new URLSearchParams('scope=rivals'),a).rows[0].following).toBe(true);expect(social.board(new URLSearchParams('scope=rivals&rig=guard'),a).rivals.map(p=>p.id)).toEqual([b.id]);expect(social.board(new URLSearchParams('rig=guard'),a).total).toBe(0);
      expect(()=>social.follow(a,a.id,true)).toThrow('another');social.follow(a,b.id,false);expect(social.board(new URLSearchParams('scope=rivals'),a).total).toBe(0);
    }finally{store.close();}
  });
  it('rejects wrong seeds, older rules and stale daily runs before publishing',()=>{
    const store=new GuestStore(':memory:',origin),social=new SocialService(store);try{const a=guest(store).guest;social.saveProfile(a,{username:'Pilot',avatar:DEFAULT_AVATAR});
      expect(()=>social.publish(a,{...input,replay:{...replay,seed:314}})).toThrow('seed');expect(()=>social.publish(a,{...input,replay:{...replay,rulesVersion:2}})).toThrow('current');expect(()=>social.publish(a,{mode:'daily',day:'2001-01-01',replay})).toThrow('ended');
      expect(social.board(new URLSearchParams(),a).total).toBe(0);
    }finally{store.close();}
  });
  it('expires daily links at midnight and older story links after retention',()=>{
    let now=Date.UTC(2026,10,12,23,59);const store=new GuestStore(':memory:',origin,()=>now),social=new SocialService(store,()=>now);try{const a=guest(store).guest;social.saveProfile(a,{username:'Pilot',avatar:DEFAULT_AVATAR});
      const signal=dailySignal(new Date(now)),daily=createExpedition({seed:signal.seed,chapter:2,rig:'fan',rulesVersion:3});while(!daily.snapshot().finished)daily.step(0);
      const dailyRun=social.publish(a,{mode:'daily',day:signal.key,replay:daily.replay()}),story=social.publish(a,input);now+=120000;expect(social.challenge(dailyRun.id)).toBeNull();expect(social.challenge(story.id)).not.toBeNull();now+=31*86400000;expect(social.challenge(story.id)).toBeNull();
    }finally{store.close();}
  });
  it('persists pilot appearance, rivals and replay challenges across restarts',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'rivalghost-social-'));let store=new GuestStore(join(dir,'db.sqlite'),origin);try{let social=new SocialService(store);const a=guest(store).guest,b=guest(store).guest;const avatar={palette:'gold',helmet:'halo',badge:'wings'} as const;social.saveProfile(a,{username:'Pilot',avatar});social.saveProfile(b,{username:'Rival',avatar:DEFAULT_AVATAR});social.follow(a,b.id,true);const run=social.publish(b,input);store.close();store=new GuestStore(join(dir,'db.sqlite'),origin);social=new SocialService(store);expect(social.profile(a.id)?.avatar).toEqual(avatar);expect(social.challenge(run.id)?.score).toBe(score);expect(social.board(new URLSearchParams('scope=rivals'),a).total).toBe(1);
    }finally{store.close();await rm(dir,{recursive:true,force:true});}
  });
  it('requires a session and origin for writes while allowing public board and ghost reads',async()=>{
    const store=new GuestStore(':memory:',origin),server=createGuestServer(new GuestService(store));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('port');const base=`http://127.0.0.1:${address.port}/api/guest/social/`;
    const request=(path:string,body:unknown,cookie='',requestOrigin=origin)=>fetch(base+path,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
    try{expect((await request('profile',{username:'Pilot',avatar:DEFAULT_AVATAR})).status).toBe(401);const {token,guest:a}=guest(store),cookie=`rg_guest=${token}`;
      expect((await request('profile',{username:'Pilot',avatar:DEFAULT_AVATAR},cookie,'https://evil.example')).status).toBe(403);
      expect((await request('profile',{username:'Pilot',avatar:DEFAULT_AVATAR},cookie)).status).toBe(200);
      const response=await request('publish',{...input,score:9999999,player:'forged'},cookie),run=await response.json();expect(response.status).toBe(200);expect(run.score).toBe(score);expect(run.pilot.id).toBe(a.id);
      const board=await (await fetch(base+'board?chapter=0&rig=fan')).json();expect(board.rows).toHaveLength(1);expect(board.rows[0].you).toBe(false);expect((await fetch(base+'ghost?id='+run.id)).status).toBe(200);expect((await fetch(base+'ghost?id=missing')).status).toBe(404);
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();}
  });
});
