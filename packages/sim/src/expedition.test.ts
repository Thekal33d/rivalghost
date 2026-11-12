import { describe, expect, it } from "vitest";
import { CHAPTERS, RIGS, type ChapterId, type Rig } from "@rivalghost/game-data";
import { createExpedition, encodeExpedition, expeditionReplayHash, simulateExpedition, validateExpedition, type ExpeditionSnapshot } from "./expedition.js";

// A deterministic input-only pilot: no state mutation, invincibility, or debug shortcuts.
function pilot(a:ExpeditionSnapshot) {
  const p=a.player;
  const pickups=a.pickups.filter(v=>v.y>200 && v.y<610).sort((a,b)=>(a.kind==="rescue"?-100:0)+Math.abs(a.y-p.y)-(b.kind==="rescue"?-100:0)-Math.abs(b.y-p.y));
  const foe=a.foes.find(f=>f.kind==="boss")??a.foes.find(f=>f.y>0);
  const target=pickups[0]??{x:foe?.x??180,y:490};
  let best=Infinity,input=0;
  const moves=[[0,0],[0,-4],[3,-3],[4,0],[3,3],[0,4],[-3,3],[-4,0],[-3,-3]];
  for(let d=0;d<9;d++) {
    const [dx,dy]=moves[d];let cost=0;
    for(const f of [4,8,12]) {
      const x=Math.max(20,Math.min(340,p.x+dx*f)),y=Math.max(210,Math.min(610,p.y+dy*f));
      cost+=(Math.abs(x-target.x)+Math.abs(y-target.y))*.04;
      for(const b of a.bolts) if(!b.friendly) {const dist=Math.max(Math.abs(x-b.x-b.vx*f),Math.abs(y-b.y-b.vy*f));if(dist<22)cost+=(22-dist)*15;}
      for(const h of a.hazards)if(a.tick-h.born+f>=40 && (h.axis==="horizontal"?Math.abs(y-h.y!)<27:h.axis==="blast"?Math.hypot(x-h.x,y-h.y!)<48:Math.abs(x-h.x)<27))cost+=200;
      for(const e of a.foes)if(Math.abs(e.x-x)<28 && Math.abs(e.y-y)<35)cost+=300;
    }
    if(cost<best){best=cost;input=d;}
  }
  if(a.pulseCooldown===0 && a.bolts.some(b=>!b.friendly && Math.abs(b.x-p.x)<70 && Math.abs(b.y-p.y)<100))input|=16;
  return input;
}
function fly(chapter:ChapterId,rig:Rig,active=true,rulesVersion:2|3=2) {
  const game=createExpedition({chapter,rig,rulesVersion,seed:CHAPTERS[chapter].seed});
  while(!game.snapshot().finished)game.step(active ? pilot(game.snapshot()) : 0);
  return game;
}

describe("Ghost Signal rules v2",()=>{
  it("preserves the original three v2 outcomes and replay hashes",async()=>{
    const fixtures=[[5610, 20, 12, 0, 70, 30, 8, 3600, "0f771e6f351ea04a4b007d061cdb33e9e74f275e95c62a383ffbacbc75350bf1"], [6080, 23, 14, 2, 84, 16, 8, 3600, "0e56b34675aab59ef0e6e46fa8bec12f8b964972c8ece820ab1b9142f8362b69"], [9780, 24, 33, 6, 112, 0, 6, 2851, "905cf0d806bdef002de8f2d51d126f1475d4afc312d6305bef2780f9c7a6d6b0"]];
    for(let c=0;c<3;c++) {
      const game=createExpedition({chapter:c as ChapterId,seed:CHAPTERS[c].seed,rig:"fan"});
      while(!game.snapshot().finished){const t=game.snapshot().tick;game.step(Math.floor(t/90)%9|(t%480===0?16:0));}
      const [score,kills,grazes,surges,damageTaken,health,pulses,durationTicks,hash]=fixtures[c];
      expect(game.result()).toMatchObject({score,kills,grazes,surges,damageTaken,health,pulses,durationTicks});
      expect(await expeditionReplayHash(game.replay())).toBe(hash);
    }
  });

  it("replays active movement, pickups, upgrades, bosses and pulses identically",async()=>{
    const game=fly(2,"fan");
    const replay=game.replay(), result=game.result();
    expect(simulateExpedition(replay)).toEqual(result);
    expect(result).toMatchObject({cleared:true,rescues:3,weapon:3,maxCombo:5,health:100});
    expect(result.surges).toBeGreaterThan(1);
    expect(result.durationTicks).toBeLessThan(3600);
    expect(result.pulses).toBeGreaterThan(0);
    expect(await expeditionReplayHash(replay)).toHaveLength(64);
    expect(await expeditionReplayHash({...replay,rig:"needle"})).not.toBe(await expeditionReplayHash(replay));
    expect(await expeditionReplayHash({...replay,chapter:1})).not.toBe(await expeditionReplayHash(replay));
    const pulses=game.events.filter(e=>e.type==="pulse");
    for(let i=1;i<pulses.length;i++)expect(pulses[i].tick-pulses[i-1].tick).toBeGreaterThanOrEqual(480);
  });
  it("every chapter can be cleared with every rig through normal inputs",()=>{
    for(const chapter of CHAPTERS)for(const rig of RIGS) {
      const game=fly(chapter.id,rig.id);
      expect(game.result().cleared,`${chapter.name}/${rig.id}`).toBe(true);
      expect(simulateExpedition(game.replay())).toEqual(game.result());
    }
    const idle=fly(2,"fan",false).result();
    expect(idle.cleared).toBe(false);
    expect(idle.health).toBe(0);
  });
  it("rejects malformed actions, lengths, rig, chapter and version",()=>{
    const replay=encodeExpedition({seed:3,chapter:0,rig:"needle"},Array(3600).fill(0));
    for(const input of [-1,9,15,25,32,1.5])expect(()=>validateExpedition({...replay,runs:[{input,ticks:3600}]})).toThrow();
    expect(()=>validateExpedition({...replay,runs:[{input:0,ticks:3599}]})).toThrow();
    expect(()=>validateExpedition({...replay,runs:[{input:0,ticks:1800},{input:0,ticks:1800}]})).toThrow();
    expect(()=>validateExpedition({...replay,rig:"hacked" as Rig})).toThrow();
    expect(()=>validateExpedition({...replay,chapter:10 as ChapterId})).toThrow();
    expect(()=>validateExpedition({...replay,rulesVersion:1 as 2})).toThrow();
    expect(()=>validateExpedition({...replay,seed:NaN})).toThrow();
  });
  it("keeps snapshots isolated and holds score after death",()=>{
    const game=createExpedition({seed:1021,chapter:2,rig:"needle"});
    const a=game.snapshot();a.player.health=999;
    expect(game.snapshot().player.health).toBe(100);
    while(!game.snapshot().finished)game.step(0);
    const score=game.result().score;
    for(let i=0;i<4000;i++)game.step(16);
    expect(game.result().score).toBe(score);
    expect(game.snapshot().tick).toBe(3600);
  });
});


describe("local chapter remix v3",()=>{
  it("clears every chapter with every rig and reproduces each expanded replay",()=>{
    for(const chapter of CHAPTERS)for(const rig of RIGS){
      const game=fly(chapter.id,rig.id,true,3);
      expect(game.result().cleared,`${chapter.name}/${rig.id}`).toBe(true);
      expect(simulateExpedition(game.replay())).toEqual(game.result());
    }
  });
  it("reports actual boss damage without inventing overkill numbers",()=>{
    const game=fly(0,"needle",true,3),arrival=game.events.find(e=>e.type==="boss")!;
    const hits=game.events.filter(e=>e.type==="damage"&&e.tick>=arrival.tick);
    const ids=[...new Set(hits.map(e=>e.targetId))];
    expect(ids.some(id=>hits.filter(e=>e.targetId===id).reduce((sum,e)=>sum+e.value,0)===105)).toBe(true);
    expect(hits.every(e=>e.value>0&&e.targetId!==undefined)).toBe(true);
  });
  it("emits distinct warned freight and strike hazards only in the new rules",()=>{
    for(const [chapter,axis] of [[4,"horizontal"],[6,"blast"]] as const){
      const game=createExpedition({chapter,seed:CHAPTERS[chapter].seed,rig:"guard",rulesVersion:3});let found=false;
      while(!game.snapshot().finished){const s=game.snapshot();if(s.hazards.some(h=>h.axis===axis&&s.tick-h.born<55))found=true;game.step(pilot(s));}
      expect(found).toBe(true);
    }
  });
});
