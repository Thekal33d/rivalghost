import { useEffect, useRef, useState } from "react";
import { CHAPTERS, EXPEDITION_TICKS } from "@rivalghost/game-data";
import { createExpedition, expeditionReplayHash, type ExpeditionConfig, type ExpeditionReplay, type ExpeditionResult, type ExpeditionSnapshot } from "@rivalghost/sim";
import { drawExpedition } from "./expedition-art";

export interface FlightReport { result:ExpeditionResult; replay:ExpeditionReplay; hash:string }
interface Props { config:ExpeditionConfig; sound:boolean; ghost?:ExpeditionReplay; onFinish:(report:FlightReport)=>void }
const keysOfMovement=new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);

export function ExpeditionArena({config,sound,ghost,onFinish}:Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null),soundRef=useRef(sound),pulseRef=useRef(false),pauseRef=useRef(false);
  soundRef.current=sound;
  const [hud,setHud]=useState<ExpeditionSnapshot>(()=>createExpedition(config).snapshot());
  const [count,setCount]=useState(3),[paused,setPaused]=useState(false),[ghostScore,setGhostScore]=useState<number|null>(null);
  const togglePause=()=>{pauseRef.current=!pauseRef.current;setPaused(pauseRef.current);};
  useEffect(()=>{
    const canvas=canvasRef.current,c=canvas?.getContext("2d");if(!canvas||!c)return;
    const scale=Math.min(devicePixelRatio||1,2);canvas.width=360*scale;canvas.height=640*scale;c.scale(scale,scale);
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const session=createExpedition(config);
    const past=ghost ? createExpedition(ghost) : null;
    const pastInputs=ghost?.runs.flatMap(r=>Array(r.ticks).fill(r.input)) ?? [];
    const keys=new Set<string>();const pointer={active:false,x:180,y:540};
    let audio:AudioContext|null=null,frame=0,disposed=false,done=false,seen=0;
    let last=performance.now(),accumulator=0,focused=!document.hidden,lastHud=-10;
    let begins=last+1800;
    pauseRef.current=false;setPaused(false);
    const wakeAudio=()=>{if(!soundRef.current)return;try{audio??=new AudioContext();void audio.resume().catch(()=>{});}catch{/* Optional sound. */}};
    const tone=(hz:number,length:number)=>{
      if(!soundRef.current||audio?.state!=="running")return;
      const o=audio.createOscillator(),g=audio.createGain();o.type="triangle";o.frequency.setValueAtTime(hz,audio.currentTime);o.frequency.exponentialRampToValueAtTime(hz*.5,audio.currentTime+length);
      g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);
    };
    const point=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)*360/r.width;pointer.y=(e.clientY-r.top)*640/r.height-(e.pointerType==="touch"?45:0);};
    const down=(e:PointerEvent)=>{wakeAudio();pointer.active=true;point(e);canvas.setPointerCapture(e.pointerId);};
    const up=()=>{pointer.active=false;};
    const keyDown=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(k==="escape"&&!e.repeat){e.preventDefault();pauseRef.current=!pauseRef.current;setPaused(pauseRef.current);keys.clear();up();}if(keysOfMovement.has(k)||k===" "){e.preventDefault();keys.add(k);wakeAudio();}};
    const keyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const direction=(s:ExpeditionSnapshot)=>{
      if(pointer.active){const dx=pointer.x-s.player.x,dy=pointer.y-s.player.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return 0;return [3,4,5,6,7,8,1,2][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];}
      const x=Number(keys.has("d")||keys.has("arrowright"))-Number(keys.has("a")||keys.has("arrowleft"));
      const y=Number(keys.has("s")||keys.has("arrowdown"))-Number(keys.has("w")||keys.has("arrowup"));
      return ({"0,-1":1,"1,-1":2,"1,0":3,"1,1":4,"0,1":5,"-1,1":6,"-1,0":7,"-1,-1":8} as Record<string,number>)[`${x},${y}`]??0;
    };
    const advance=(now:number,neutral:boolean)=>{
      if(done)return;
      if(pauseRef.current){if(last<begins)begins+=now-last;last=now;return;}
      if(now<begins){last=now;return;}
      accumulator+=now-Math.max(last,begins);last=now;
      while(accumulator>=1000/60) {
        const s=session.snapshot();if(s.finished)break;
        accumulator-=1000/60;
        const pulse=!neutral&&(pulseRef.current||keys.has(" "));
        session.step(neutral?0:direction(s)|(pulse?16:0));pulseRef.current=false;
        if(past&&!past.snapshot().finished)past.step(pastInputs[s.tick]??0);
        for(const e of session.events.slice(seen)) {
          if(e.type==="kill")tone(160,.06);
          if(e.type==="hit")tone(65,.15);
          if(e.type==="graze")tone(780,.06);
          if(e.type==="rescue"||e.type==="upgrade")tone(1100,.15);
          if(e.type==="pulse"||e.type==="surge")tone(320,.3);
          if(e.type==="boss")tone(90,.5);
        }
        seen=session.events.length;
      }
    };
    const blur=()=>{advance(performance.now(),!focused);focused=false;keys.clear();up();pulseRef.current=false;pauseRef.current=true;setPaused(true);};
    const focus=()=>{focused=true;};
    const visibility=()=>document.hidden?blur():focus();
    const finish=async()=>{done=true;const replay=session.replay();let hash="";try{hash=await expeditionReplayHash(replay);}catch{/* Local play still works. */}if(!disposed)onFinish({result:session.result(),replay,hash});};
    const loop=(now:number)=>{
      if(done||disposed)return;
      advance(now,!focused||document.hidden);setCount(Math.max(0,Math.ceil((begins-now)/600)));
      const s=session.snapshot(),g=past?.snapshot();drawExpedition(c,s,session.events.slice(-70),reduced,g);
      if(s.tick-lastHud>=6||s.finished){setHud(s);setGhostScore(g?.score??null);lastHud=s.tick;}
      if(s.finished){void finish();return;}frame=requestAnimationFrame(loop);
    };
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",point);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("lostpointercapture",up);
    window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp);window.addEventListener("blur",blur);window.addEventListener("focus",focus);document.addEventListener("visibilitychange",visibility);
    frame=requestAnimationFrame(loop);
    return()=>{disposed=true;cancelAnimationFrame(frame);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",point);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp);window.removeEventListener("blur",blur);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",visibility);if(audio)void audio.close().catch(()=>{});};
  },[config,ghost,onFinish]);
  const seconds=Math.ceil((EXPEDITION_TICKS-hud.tick)/60), chapter=CHAPTERS[config.chapter];
  return <section className={`arena-stage expedition-stage ${hud.surge>0?"is-surge":""}`} aria-label="Ghost Signal arena">
    <div className="arena-hud"><div><small>SCORE / ×{Math.max(1,hud.combo)}</small><strong>{hud.score.toLocaleString()}</strong></div><div className="arena-clock"><strong>{seconds.toString().padStart(2,"0")}</strong><small>SECONDS</small></div><div><small>WEAPON</small><strong>LV {hud.weapon}</strong></div></div>
    <div className="arena-window"><canvas ref={canvasRef} className="arena-canvas" aria-label="Move with drag or WASD/arrows. Press Space or Pulse to clear nearby fire."/>
      {count>0&&<div className="launch-countdown"><span>{chapter.name}</span><strong key={count}>{count}</strong><small>MOVE TO AIM / SPACE TO PULSE</small></div>}
      {paused&&<div className="flight-paused"><span>FLIGHT PAUSED</span><h2>TAKE A<br/>BREATH.</h2><button onClick={togglePause}>RESUME FLIGHT →</button><small>ESC TO RESUME</small></div>}
    </div>
    <div className="arena-bottom"><div className="hull"><small>HULL {hud.player.health}% {hud.player.shield?"+ SHIELD":""}</small><meter min="0" max="100" value={hud.player.health}/></div><div className="surge-meter"><small>{hud.surge>0?`SURGE ×2 / ${(hud.surge/60).toFixed(1)}s`:`GRAZE ${hud.charge}/4`}</small><div>{[0,1,2,3].map(i=><i key={i} className={hud.surge>0||i<hud.charge?"charged":""}/>)}</div></div></div>
    <div className="flight-controls"><span>RESCUED <b>{hud.rescues}/3</b>{ghostScore!==null&&<small>VS BEST {hud.score-ghostScore>=0?"+":""}{(hud.score-ghostScore).toLocaleString()}</small>}<button className="pause-button" onClick={togglePause}>{paused?"RESUME":"PAUSE Ⅱ"}</button></span><button className="pulse-button" disabled={hud.pulseCooldown>0||count>0||paused} onClick={()=>{pulseRef.current=true;}}>{hud.pulseCooldown>0?`PULSE ${Math.ceil(hud.pulseCooldown/60)}s`:"PULSE ↯"}<small>SPACE / TAP</small></button></div>
  </section>;
}
