import { CHAPTERS, ENCOUNTERS, EXPEDITION_TICKS, EXPEDITION_VERSION, RIGS, type ChapterId, type Rig } from "@rivalghost/game-data";
import { sha256Hex } from "./replay.js";

export interface ExpeditionConfig { seed: number; chapter: ChapterId; rig: Rig }
export interface ExpeditionReplay extends ExpeditionConfig { rulesVersion: 2; runs: { input: number; ticks: number }[] }
export type FoeKind = "dart" | "weaver" | "turret" | "boss";
export interface Foe { id: number; kind: FoeKind; x: number; y: number; origin: number; born: number; hp: number; maxHp: number; phase: number }
export interface Bolt { id: number; x: number; y: number; vx: number; vy: number; damage: number; friendly: boolean; grazed: boolean }
export interface Pickup { id: number; x: number; y: number; kind: "power" | "rescue" }
export interface Hazard { id: number; x: number; born: number }
export interface CombatEvent { tick: number; type: "kill" | "graze" | "hit" | "surge" | "pulse" | "rescue" | "upgrade" | "shield" | "boss"; x: number; y: number; value: number }
const movement = [[0,0],[0,-4],[3,-3],[4,0],[3,3],[0,4],[-3,3],[-4,0],[-3,-3]];
const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
const triangle = (tick:number,span:number) => { const p = ((tick % (span*4)) + span*4) % (span*4); return p < span*2 ? p-span : span*3-p; };

function validateConfig(config:ExpeditionConfig) {
  if(!Number.isInteger(config.seed) || config.seed<0 || config.seed>0xffffffff) throw new Error("Invalid expedition seed");
  if(!CHAPTERS.some(c=>c.id===config.chapter)) throw new Error("Invalid chapter");
  if(!RIGS.some(r=>r.id===config.rig)) throw new Error("Invalid rig");
}
function validInput(input:number) { return Number.isInteger(input) && input>=0 && (input & 15)<=8 && input<=24; }

export function createExpedition(config:ExpeditionConfig) {
  validateConfig(config);
  const {seed,chapter,rig}=config;
  const encounter=ENCOUNTERS[chapter];
  const spec=RIGS.find(r=>r.id===rig)!;
  let random=seed || 0x12345678;
  const rand=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return random>>>0;};
  let tick=0,id=0,score=0,kills=0,rescues=0,grazes=0,surges=0,charge=0,surge=0;
  let combo=0,comboUntil=0,maxCombo=0,pulseCooldown=0,pulses=0,weapon=1,cells=0,damageTaken=0;
  let bossDefeated=false,finished=false,extractionAtTick=EXPEDITION_TICKS;
  let player={x:180,y:540,health:100,invulnerable:0,shield:rig==="guard" ? 1 : 0};
  let foes:Foe[]=[],bolts:Bolt[]=[],pickups:Pickup[]=[],hazards:Hazard[]=[];
  const events:CombatEvent[]=[];
  const inputs:number[]=[];
  const emit=(type:CombatEvent["type"],x:number,y:number,value=0)=>events.push({tick,type,x,y,value});
  const bolt=(x:number,y:number,vx:number,vy:number,friendly=false,damage=10)=>bolts.push({id:++id,x,y,vx,vy,friendly,damage,grazed:false});
  const drop=(x:number,y:number,kind:Pickup["kind"])=>pickups.push({id:++id,x:clamp(x,30,330),y,kind});
  const hurt=()=>{
    if(player.invulnerable>0) return;
    player.invulnerable=55;
    if(player.shield){player.shield=0;emit("shield",player.x,player.y);return;}
    player.health=Math.max(0,player.health-encounter.damage);damageTaken+=encounter.damage;
    combo=0;charge=0;surge=0;emit("hit",player.x,player.y);
  };
  const kill=(foe:Foe)=>{
    if(foe.hp>0) return;
    combo=Math.min(5,combo+1);maxCombo=Math.max(maxCombo,combo);comboUntil=tick+210;kills++;
    const points=(foe.kind==="boss" ? 2500 : foe.kind==="turret" ? 180 : 90)*combo*(surge>0 ? 2 : 1);
    score+=points;emit("kill",foe.x,foe.y,points);
    if(foe.kind==="boss") {bossDefeated=true;extractionAtTick=Math.min(EXPEDITION_TICKS,tick+120);bolts=bolts.filter(b=>b.friendly);hazards=[];}
    else if(kills%3===0) drop(foe.x,foe.y,"power");
  };
  const spawn=(kind:FoeKind,x:number)=>{
    const hp=kind==="boss" ? encounter.hp : kind==="turret" ? 12 : kind==="weaver" ? 6 : 4;
    foes.push({id:++id,kind,x,y:-30,origin:x,born:tick,hp,maxHp:hp,phase:1});
    if(kind==="boss") emit("boss",180,100);
  };

  function step(input:number) {
    if(!validInput(input)) throw new Error("Invalid expedition input");
    if(tick>=EXPEDITION_TICKS) return;
    inputs.push(input);
    if(finished){tick++;return;}
    if(player.invulnerable>0) player.invulnerable--;
    if(pulseCooldown>0) pulseCooldown--;
    if(surge>0) surge--;
    if(tick>comboUntil) combo=0;
    const [dx,dy]=movement[input&15];
    player.x=clamp(player.x+dx,20,340);player.y=clamp(player.y+dy,210,610);

    if((input&16)!==0 && pulseCooldown===0) {
      pulseCooldown=480;pulses++;player.invulnerable=Math.max(player.invulnerable,35);
      bolts=bolts.filter(b=>b.friendly || Math.abs(b.x-player.x)>180 || Math.abs(b.y-player.y)>180);
      for(const foe of foes) if(Math.abs(foe.x-player.x)<180 && Math.abs(foe.y-player.y)<180){foe.hp-=8;kill(foe);}
      emit("pulse",player.x,player.y);
    }
    // Formation entries leave time to read silhouettes before their first attack.
    const interval=encounter.waves;
    if(tick>=90 && tick<2310 && (tick-90)%interval===0) {
      const origin=65+rand()%70;
      for(let n=0;n<3;n++) {
        const wave=Math.floor(tick/interval);
        const x=encounter.formation==="pincer" ? [55,180,305][n] : encounter.formation==="column" ? (wave%2===0?70:150)+n*42 : origin+n*72;
        const kind=encounter.formation==="pincer" ? (n===1?"dart":"weaver") : (wave+n)%3===0?"weaver":"dart";
        spawn(kind,x);
      }
    }
    if(tick===840 || tick===1560 || tick===2100) spawn("turret",80+rand()%200);
    if(tick===420 || tick===1080 || tick===1740) drop(70+rand()%220,80,"rescue");
    if(tick===2400) spawn("boss",180);
    if(encounter.hazardEvery>0 && tick>=600 && tick<2400 && tick%encounter.hazardEvery===180) hazards.push({id:++id,x:50+rand()%260,born:tick});

    for(const foe of foes) {
      if(foe.hp<=0) continue;
      const age=tick-foe.born;
      if(foe.kind==="boss") {
        foe.y=Math.min(108,-30+age*2);foe.x=180+triangle(age,70);
        foe.phase=foe.hp<=foe.maxHp/2 ? 2 : 1;
        const cadence=foe.phase===2 ? 65 : 100;
        if(age>85 && age%cadence===0) {
          const volley=Math.floor(age/cadence);
          const attack=encounter.attack==="remix" ? (["crossfire","aimed","sweep"] as const)[volley%3] : encounter.attack;
          if(attack==="crossfire") {
            for(const vx of [1,2,3]) {bolt(foe.x-42,foe.y+25,vx,5);bolt(foe.x+42,foe.y+25,-vx,5);}
          } else if(attack==="aimed") {
            const aim=clamp(Math.round((player.x-foe.x)/Math.max(1,player.y-foe.y)*5),-2,2);
            for(const spread of [-1,0,1]) bolt(foe.x,foe.y+25,aim+spread,5);
          } else if(attack==="sweep") {
            const sweep=volley%2===0?-2:2;
            for(const spread of [-1,0,1]) {bolt(foe.x-28,foe.y+25,sweep+spread,5);bolt(foe.x+28,foe.y+25,sweep+spread,5);}
          } else for(const vx of [-3,-2,-1,0,1,2,3]) bolt(foe.x,foe.y+25,vx,3+encounter.speed);
          if(foe.phase===2) hazards.push({id:++id,x:clamp(player.x,40,320),born:tick});
        }
      } else {
        foe.y=-30+Math.min(age,120)*2+Math.max(0,age-300)*2;
        foe.x=clamp(foe.origin+(foe.kind==="weaver" ? triangle(age*2,42) : triangle(age,16)),24,336);
        if(age>=75 && age<300 && (age-75)%90===0) {
          const vx=Math.round((player.x-foe.x)/Math.max(1,player.y-foe.y)*4);
          if(foe.kind==="turret") for(const v of [-2,0,2]) bolt(foe.x,foe.y+16,v,4);
          else bolt(foe.x,foe.y+16,clamp(vx,-3,3),4+encounter.speed);
        }
      }
      if(Math.abs(player.x-foe.x)<22 && Math.abs(player.y-foe.y)<24) hurt();
    }
    foes=foes.filter(f=>f.hp>0 && f.y<680);
    const cadence=Math.max(5,spec.cadence-(weapon-1)*2);
    if(tick%cadence===0) {
      const spread=rig==="fan" ? [-2,0,2] : weapon>=2 ? [-1,1] : [0];
      for(const vx of spread) bolt(player.x+vx*4,player.y-20,vx,-10,true,spec.damage);
      if(weapon===3) bolt(player.x,player.y-25,0,-12,true,2);
    }
    for(const b of bolts) {
      b.x+=b.vx;b.y+=b.vy;
      if(b.friendly) {
        const foe=foes.find(f=>f.hp>0 && Math.abs(f.x-b.x)<(f.kind==="boss" ? 48 : 19) && Math.abs(f.y-b.y)<(f.kind==="boss" ? 33 : 18));
        if(foe){foe.hp-=b.damage;b.y=-100;kill(foe);}
      } else {
        const x=Math.abs(player.x-b.x),y=Math.abs(player.y-b.y);
        if(x<=8 && y<=8){hurt();b.y=700;}
        else if((input&15)!==0 && !b.grazed && x<=23 && y<=23) {
          b.grazed=true;grazes++;score+=100;charge++;emit("graze",player.x,player.y,100);
          if(charge>=4){charge=0;surge=180;surges++;emit("surge",player.x,player.y);}
        }
      }
    }
    // Killing the boss can clear bullets while a previously captured iteration is finishing.
    if(bossDefeated) bolts=bolts.filter(b=>b.friendly);
    bolts=bolts.filter(b=>b.y>-40 && b.y<670 && b.x>-30 && b.x<390);
    foes=foes.filter(f=>f.hp>0);
    for(const p of pickups) {
      p.y+=2;
      if(Math.abs(player.x-p.x)<24 && Math.abs(player.y-p.y)<28) {
        if(p.kind==="rescue") {rescues++;score+=500;player.health=Math.min(100,player.health+15);if(rig==="guard")player.shield=1;emit("rescue",p.x,p.y,500);}
        else {cells++;score+=75;const next=Math.min(3,1+Math.floor(cells/2));if(next>weapon){weapon=next;emit("upgrade",p.x,p.y,weapon);}}
        p.y=800;
      }
    }
    pickups=pickups.filter(p=>p.y<670);
    for(const h of hazards) if(tick-h.born>=55 && tick-h.born<85 && Math.abs(player.x-h.x)<18) hurt();
    hazards=hazards.filter(h=>tick-h.born<85);
    tick++;
    if(player.health===0 || tick>=extractionAtTick) finished=true;
  }
  function snapshot() {
    return {tick,player:{...player},score,kills,rescues,grazes,surges,charge,surge,combo,maxCombo,pulseCooldown,pulses,weapon,cells,damageTaken,bossDefeated,finished,
      foes:foes.map(f=>({...f})),bolts:bolts.map(b=>({...b})),pickups:pickups.map(p=>({...p})),hazards:hazards.map(h=>({...h})),chapter,rig};
  }
  function result() {
    if(!finished) throw new Error("Expedition is not complete");
    return {rulesVersion:EXPEDITION_VERSION,seed,chapter,rig,score,kills,rescues,grazes,surges,maxCombo,pulses,weapon,damageTaken,health:player.health,
      cleared:bossDefeated && player.health>0, bossDefeated, durationTicks:tick};
  }
  function replay():ExpeditionReplay {
    if(!finished) throw new Error("Expedition is not complete");
    return encodeExpedition(config,[...inputs,...Array(Math.max(0,EXPEDITION_TICKS-inputs.length)).fill(0)]);
  }
  return {step,snapshot,result,replay,events};
}
export type ExpeditionSnapshot=ReturnType<ReturnType<typeof createExpedition>["snapshot"]>;
export type ExpeditionResult=ReturnType<ReturnType<typeof createExpedition>["result"]>;

export function validateExpedition(replay:ExpeditionReplay) {
  validateConfig(replay);
  if(replay.rulesVersion!==EXPEDITION_VERSION) throw new Error("Unsupported expedition rules version");
  if(!Array.isArray(replay.runs) || replay.runs.length===0 || replay.runs.length>EXPEDITION_TICKS) throw new Error("Invalid expedition runs");
  let total=0,previous=-1;
  for(const run of replay.runs) {
    if(!validInput(run.input) || run.input===previous || !Number.isInteger(run.ticks) || run.ticks<1 || run.ticks>EXPEDITION_TICKS) throw new Error("Invalid expedition input run");
    previous=run.input;total+=run.ticks;
  }
  if(total!==EXPEDITION_TICKS) throw new Error("Expedition must contain 3600 ticks");
}
export function encodeExpedition(config:ExpeditionConfig,inputs:readonly number[]):ExpeditionReplay {
  const runs:ExpeditionReplay["runs"]=[];
  for(const input of inputs){const last=runs.at(-1);if(last?.input===input)last.ticks++;else runs.push({input,ticks:1});}
  const replay={...config,rulesVersion:EXPEDITION_VERSION,runs};validateExpedition(replay);return replay;
}
export function simulateExpedition(replay:ExpeditionReplay) {
  validateExpedition(replay);
  const session=createExpedition(replay);
  for(const run of replay.runs) for(let i=0;i<run.ticks;i++){if(session.snapshot().finished) return session.result();session.step(run.input);}
  return session.result();
}
export function canonicalExpeditionReplayJson(replay:ExpeditionReplay):string {
  validateExpedition(replay);
  const canonical={rulesVersion:replay.rulesVersion,seed:replay.seed,chapter:replay.chapter,rig:replay.rig,runs:replay.runs.map(r=>({input:r.input,ticks:r.ticks}))};
  return JSON.stringify(canonical);
}

export async function expeditionReplayHash(replay:ExpeditionReplay) {
  return sha256Hex(new TextEncoder().encode(canonicalExpeditionReplayJson(replay)));
}
