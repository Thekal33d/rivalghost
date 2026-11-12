import { useEffect, useRef, useState } from "react";
import { RULES_VERSION, RUN_TICKS } from "@rivalghost/game-data";
import { createArenaSession, encodeDirections, replayHash, type DirectionCode } from "@rivalghost/sim";
import { drawArena, type Burst } from "./arena-art";

export type ArenaStats = { score: number; health: number; seconds: number; grazes: number; surgeActivations: number; enemiesDestroyed: number; replayHash: string };
const TICK_MS = 1000/60;
const movementKeys = new Set(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"]);

export function ArenaPrototype({ onFinish, target = 14_000, sound = false }: { onFinish: (stats: ArenaStats) => void; target?: number; sound?: boolean }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const audioRef=useRef<AudioContext | null>(null);
  const soundRef=useRef(sound);
  soundRef.current=sound;
  const [hud,setHud]=useState({score:0,health:100,seconds:60,marks:0,surge:0,used:false});
  const [countdown,setCountdown]=useState(3);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const canvas=canvasRef.current;
    const c=canvas?.getContext("2d");
    if(!canvas || !c) return;
    const dpr=Math.min(window.devicePixelRatio || 1,2);
    canvas.width=360*dpr; canvas.height=640*dpr; c.scale(dpr,dpr);
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const session=createArenaSession(3);
    const directions: DirectionCode[]=[];
    const pressed=new Set<string>();
    const pointer={active:false,x:180,y:560};
    const bursts: Burst[]=[];
    let eventsSeen=0, animation=0, disposed=false, finished=false;
    let last=performance.now(), accumulator=0;
    const begins=last+2400;
    let focused=!document.hidden;
    const tone=(frequency:number, duration=.07, kind:OscillatorType="triangle")=>{
      if(!soundRef.current || !audioRef.current || audioRef.current.state!=="running") return;
      const a=audioRef.current, o=a.createOscillator(), g=a.createGain();
      o.type=kind; o.frequency.setValueAtTime(frequency,a.currentTime); o.frequency.exponentialRampToValueAtTime(frequency*.55,a.currentTime+duration);
      g.gain.setValueAtTime(.025,a.currentTime); g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+duration);
    };
    const enableAudio=()=>{
      if(!soundRef.current) return;
      try { audioRef.current ??= new AudioContext(); void audioRef.current.resume().catch(()=>{}); } catch { /* Sound is optional. */ }
    };
    const point=(e:PointerEvent)=>{
      const r=canvas.getBoundingClientRect();
      pointer.x=(e.clientX-r.left)*360/r.width;
      // Keep the craft above the thumb on touch screens.
      pointer.y=(e.clientY-r.top)*640/r.height-(e.pointerType==="touch" ? 45 : 0);
    };
    const down=(e:PointerEvent)=>{enableAudio(); pointer.active=true; point(e); canvas.setPointerCapture(e.pointerId);};
    const up=()=>{pointer.active=false;};
    const keyDown=(e:KeyboardEvent)=>{const key=e.key.toLowerCase(); if(movementKeys.has(key)){e.preventDefault(); pressed.add(key); enableAudio();}};
    const keyUp=(e:KeyboardEvent)=>{pressed.delete(e.key.toLowerCase());};
    const advance=(now:number, neutral:boolean)=>{
      if(now<begins) {last=now; return;}
      accumulator+=now-Math.max(last,begins); last=now;
      while(accumulator>=TICK_MS && session.snapshot().tick<RUN_TICKS) {
        accumulator-=TICK_MS;
        const before=session.snapshot();
        const direction=neutral ? 0 : inputDirection(pressed,pointer,before.player);
        directions.push(direction); session.step(direction);
        const s=session.snapshot();
        for(const e of session.events.slice(eventsSeen)) {
          if(e.type==="enemy-destroyed") {
            const enemy=before.enemies.find(enemy=>enemy.id===e.value);
            bursts.push({x:enemy?.laneX ?? s.lastShot?.targetX ?? 180,y:78,tick:s.tick,color:"#f7cc64"}); tone(180,.045);
          }
          if(e.type==="projectile-grazed") {bursts.push({x:s.player.x,y:s.player.y,tick:s.tick,color:"#a1e7bf",label:"+250 / GRAZE"}); tone(880);}
          if(e.type==="player-damaged") {bursts.push({x:s.player.x,y:s.player.y,tick:s.tick,color:"#ff785b",label:"HIT"}); tone(65,.15,"sawtooth");}
          if(e.type==="surge-started") tone(1400,.4);
        }
        eventsSeen=session.events.length;
        if(bursts.length>60) bursts.splice(0,bursts.length-60);
        if(s.destroyedAtTick!==null) break;
      }
    };
    const loseFocus=()=>{advance(performance.now(),!focused); focused=false; pressed.clear(); up();};
    const gainFocus=()=>{advance(performance.now(),true); focused=true;};
    const visibility=()=>document.hidden ? loseFocus() : gainFocus();
    const finish=async()=>{
      finished=true;
      const s=session.snapshot();
      while(directions.length<RUN_TICKS){ directions.push(0); session.step(0); }
      const replay=encodeDirections(RULES_VERSION,3,directions);
      const result=session.result(replay);
      let hash="";
      try {hash=await replayHash(replay);} catch { /* Practice results remain available without crypto. */ }
      if(!disposed) onFinish({score:result.score, health:result.player.health, seconds:Math.ceil((RUN_TICKS-s.tick)/60), grazes:result.grazes, surgeActivations:result.surgeActivations, enemiesDestroyed:result.enemiesDestroyed, replayHash:hash});
    };
    const loop=(now:number)=>{
      if(disposed || finished) return;
      setCountdown(Math.max(0,Math.ceil((begins-now)/800)));
      advance(now,!focused || document.hidden);
      const s=session.snapshot(); drawArena(c,s,bursts,reduced);
      setHud({score:s.score,health:s.player.health,seconds:Math.ceil((RUN_TICKS-s.tick)/60),marks:Math.min(4,s.grazeMarks),surge:s.surgeTicksRemaining,used:s.surgeActivations>0});
      if(!focused && now>=begins) setMessage("Run is still live. Return to dodge."); else setMessage("");
      if(s.tick>=RUN_TICKS || s.destroyedAtTick!==null){void finish();return;}
      animation=requestAnimationFrame(loop);
    };
    canvas.addEventListener("pointerdown",down); canvas.addEventListener("pointermove",point);
    canvas.addEventListener("pointerup",up); canvas.addEventListener("pointercancel",up); canvas.addEventListener("lostpointercapture",up);
    window.addEventListener("keydown",keyDown); window.addEventListener("keyup",keyUp); window.addEventListener("blur",loseFocus); window.addEventListener("focus",gainFocus); document.addEventListener("visibilitychange",visibility);
    animation=requestAnimationFrame(loop);
    return ()=>{
      disposed=true; cancelAnimationFrame(animation);
      canvas.removeEventListener("pointerdown",down); canvas.removeEventListener("pointermove",point);
      canvas.removeEventListener("pointerup",up); canvas.removeEventListener("pointercancel",up); canvas.removeEventListener("lostpointercapture",up);
      window.removeEventListener("keydown",keyDown); window.removeEventListener("keyup",keyUp); window.removeEventListener("blur",loseFocus); window.removeEventListener("focus",gainFocus); document.removeEventListener("visibilitychange",visibility);
      if(audioRef.current){void audioRef.current.close().catch(()=>{}); audioRef.current=null;}
    };
  },[onFinish]);

  return <section className={`arena-stage ${hud.surge>0 ? "is-surge" : ""}`} aria-label="RivalGhost practice arena">
    <div className="arena-hud"><div><small>YOUR SCORE</small><strong>{hud.score.toLocaleString()}</strong></div><div className="arena-clock"><strong>{hud.seconds.toString().padStart(2,"0")}</strong><small>SECONDS</small></div><div><small>TARGET</small><strong>{target.toLocaleString()}</strong></div></div>
    <div className="arena-window"><canvas ref={canvasRef} className="arena-canvas" aria-label="Drag or use WASD or arrow keys to dodge. Auto-fire is automatic."/>
      {countdown>0 && <div className="launch-countdown"><span>FIND YOUR LINE</span><strong key={countdown}>{countdown}</strong><small>DRAG TO MOVE · AUTO-FIRE ON</small></div>}
      {message && <p className="focus-note">{message}</p>}
    </div>
    <div className="arena-bottom"><div className="hull"><small>HULL {hud.health}%</small><meter min="0" max="100" value={hud.health}/></div><div className="surge-meter"><small>{hud.surge>0 ? `SURGE ×2 · ${(hud.surge/60).toFixed(1)}s` : hud.used ? "SURGE USED" : "GRAZE → SURGE"}</small><div>{[0,1,2,3].map(i=><i key={i} className={hud.surge>0 || (!hud.used && i<hud.marks) ? "charged" : ""}/>)}</div></div></div>
  </section>;
}

function inputDirection(keys:Set<string>, pointer:{active:boolean;x:number;y:number}, player:{x:number;y:number}):DirectionCode {
  if(pointer.active){
    const x=pointer.x-player.x,y=pointer.y-player.y;
    if(Math.abs(x)<3 && Math.abs(y)<3) return 0;
    return ([3,4,5,6,7,8,1,2] as const)[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  }
  const x=Number(keys.has("d")||keys.has("arrowright"))-Number(keys.has("a")||keys.has("arrowleft"));
  const y=Number(keys.has("s")||keys.has("arrowdown"))-Number(keys.has("w")||keys.has("arrowup"));
  return ({"0,-1":1,"1,-1":2,"1,0":3,"1,1":4,"0,1":5,"-1,1":6,"-1,0":7,"-1,-1":8} as Record<string,DirectionCode>)[`${x},${y}`] ?? 0;
}
