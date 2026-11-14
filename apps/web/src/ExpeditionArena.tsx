import { useEffect, useRef, useState } from "react";
import { type TrailId,REPAIR_NAMES,CHAPTERS, DISTRICTS, flightSector, grazeTarget, EXPEDITION_TICKS } from "@rivalghost/game-data";
import { createExpedition, expeditionReplayHash, type ExpeditionConfig, type ExpeditionReplay, type ExpeditionResult, type ExpeditionSnapshot } from "@rivalghost/sim";
import { drawExpedition } from "./expedition-art";
import {flightView,worldPoint,screenDirection} from "./flight-view";
import {Icon,Keycap} from "./Brand";

export interface FlightReport { result:ExpeditionResult; replay:ExpeditionReplay; hash:string }
interface Props { trail?:TrailId|null;restorationStage?:number;jobLabel?:string; reservationExpires?:number; pilotName?:string; ghostLabel?:string; config:ExpeditionConfig; sound:boolean; ghost?:ExpeditionReplay; onFinish:(report:FlightReport)=>void; onExit:()=>void; onSound:()=>void }
const keysOfMovement=new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);

export function ExpeditionArena({config,sound,ghost,onFinish,onExit,onSound,reservationExpires,pilotName,ghostLabel="BEST",trail,restorationStage=0,jobLabel}:Props) {
  const [wallClock,setWallClock]=useState(Date.now);
  useEffect(()=>{if(!reservationExpires)return;const timer=setInterval(()=>setWallClock(Date.now()),1000);return()=>clearInterval(timer);},[reservationExpires]);
  const reservedSeconds=reservationExpires?Math.max(0,Math.ceil((reservationExpires-wallClock)/1000)):0;
  const stageRef=useRef<HTMLElement>(null);
  const [wide,setWide]=useState(false),[fullError,setFullError]=useState("");
  const canvasRef=useRef<HTMLCanvasElement>(null),soundRef=useRef(sound),pulseRef=useRef(false),pauseRef=useRef(false);
  soundRef.current=sound;
  const [hud,setHud]=useState<ExpeditionSnapshot>(()=>createExpedition(config).snapshot());
  const [count,setCount]=useState(3),[paused,setPaused]=useState(false),[ghostScore,setGhostScore]=useState<number|null>(null);
  const togglePause=()=>{pauseRef.current=!pauseRef.current;setPaused(pauseRef.current);};
  useEffect(()=>{
    const canvas=canvasRef.current,c=canvas?.getContext("2d");if(!canvas||!c)return;
    let view=flightView(360,640),pixelRatio=1;
    const resize=()=>{const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;pixelRatio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*pixelRatio);canvas.height=Math.round(r.height*pixelRatio);view=flightView(r.width,r.height);setWide(view.landscape);};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
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
    const point=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect(),p=worldPoint(view,e.clientX-r.left,e.clientY-r.top-(e.pointerType==="touch"?35:0));pointer.x=p.x;pointer.y=p.y;};
    const down=(e:PointerEvent)=>{wakeAudio();pointer.active=true;point(e);canvas.setPointerCapture(e.pointerId);};
    const up=()=>{pointer.active=false;};
    const keyDown=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(k==="escape"&&!e.repeat){e.preventDefault();pauseRef.current=!pauseRef.current;setPaused(pauseRef.current);keys.clear();up();}if(keysOfMovement.has(k)||k===" "){e.preventDefault();keys.add(k);wakeAudio();}};
    const keyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const direction=(s:ExpeditionSnapshot)=>{
      if(pointer.active){const dx=pointer.x-s.player.x,dy=pointer.y-s.player.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return 0;return [3,4,5,6,7,8,1,2][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];}
      const x=Number(keys.has("d")||keys.has("arrowright"))-Number(keys.has("a")||keys.has("arrowleft"));
      const y=Number(keys.has("s")||keys.has("arrowdown"))-Number(keys.has("w")||keys.has("arrowup"));
      return screenDirection(({"0,-1":1,"1,-1":2,"1,0":3,"1,1":4,"0,1":5,"-1,1":6,"-1,0":7,"-1,-1":8} as Record<string,number>)[`${x},${y}`]??0,view.landscape);
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
          if(e.type==="damage"&&e.tick%6===0)tone(210,.025);
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
      const s=session.snapshot(),g=past?.snapshot();c.setTransform(pixelRatio,0,0,pixelRatio,0,0);drawExpedition(c,s,session.events.slice(-160),reduced,g,view,ghostLabel,trail,restorationStage);
      if(s.tick-lastHud>=6||s.finished){setHud(s);setGhostScore(g?.score??null);lastHud=s.tick;}
      if(s.finished){void finish();return;}frame=requestAnimationFrame(loop);
    };
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",point);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("lostpointercapture",up);
    window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp);window.addEventListener("blur",blur);window.addEventListener("focus",focus);document.addEventListener("visibilitychange",visibility);
    frame=requestAnimationFrame(loop);
    return()=>{observer.disconnect();if(document.fullscreenElement===stageRef.current)void document.exitFullscreen().catch(()=>{});disposed=true;cancelAnimationFrame(frame);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",point);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp);window.removeEventListener("blur",blur);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",visibility);if(audio)void audio.close().catch(()=>{});};
  },[config,ghost,onFinish,ghostLabel,trail,restorationStage]);
  const seconds=Math.ceil((EXPEDITION_TICKS-hud.tick)/60),chapter=CHAPTERS[config.chapter],district=DISTRICTS[config.chapter];
  const boss=hud.foes.find(f=>f.kind==="boss"),hp=boss?Math.ceil(100*boss.hp/boss.maxHp):0,sector=flightSector(hud.tick),target=grazeTarget(config.chapter,config.rulesVersion??2);
  const sectorAge=hud.tick-(sector===0?0:sector===1?1200:2400);
  const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stageRef.current?.requestFullscreen();setFullError("");}catch{setFullError("Fullscreen is unavailable here. The arena already fits this window.");}};
  return <section ref={stageRef} className={`arena-stage expedition-stage immersive-flight ${wide?"flight-wide":"flight-portrait"} ${hud.surge>0?"is-surge":""} ${reservationExpires?"has-reservation":""}`} aria-label="Ghost Signal arena">
    <header className="flight-topbar">
      <div className="hud-left">
        <button className="hud-round flight-pause" onClick={togglePause} aria-label={paused?"Resume flight":"Pause flight"}><Icon name={paused?"play":"pause"} size={20}/></button>
        <div className="flight-identity"><small>{pilotName?`@${pilotName}`:"GHOST SIGNAL"} · {String(chapter.id+1).padStart(2,"0")}</small><b>{chapter.name}</b><span className="hud-route" aria-label={`Sector ${sector+1} of 3`}>{[0,1,2].map(n=><i key={n} className={n<=sector?"on":""}/>)}<em>{district.route[sector]}</em></span></div>
      </div>
      <div className="flight-score"><small>SCORE</small><strong>{hud.score.toLocaleString()}</strong><em className={hud.combo>1?"is-live":""}>×{Math.max(1,hud.combo)}</em></div>
      <div className="hud-right">
        <div className="flight-clock"><Icon name="clock" size={20}/><strong>{seconds.toString().padStart(2,"0")}</strong><small>SEC</small></div>
        <button className="hud-round flight-sound" aria-pressed={sound} onClick={onSound} aria-label={sound?"Sound is on, turn off":"Sound is off, turn on"}><Icon name={sound?"soundOn":"soundOff"} size={18}/></button>
        <button className="hud-round flight-expand" onClick={()=>void fullscreen()} aria-label="Toggle fullscreen"><Icon name="expand" size={18}/></button>
        <button className="hud-round flight-exit" onClick={onExit} aria-label="Exit flight to hangar"><Icon name="close" size={18}/></button>
      </div>
    </header>
    <div className="arena-window">
      <canvas ref={canvasRef} className="arena-canvas" aria-label={wide?"Landscape flight. Move with WASD/arrows or drag. Guns fire right. Space activates Pulse.":"Portrait flight. Move with WASD/arrows or drag. Guns fire up. Space activates Pulse."}/>
      <div className="flight-location"><span>{district.route[sector]}</span><small>{restorationStage>0?REPAIR_NAMES[restorationStage]+" / ":""}{district.name}{config.chapter===3?` / TIDE ${Math.floor(hud.tick/360)%2===0?(wide?"↓":"→"):(wide?"↑":"←")}`:""}</small></div>
      {jobLabel&&<div className="job-flight-objective">{jobLabel}</div>}
      {boss&&<div className={`boss-readout phase-${boss.phase}`}>
        <div><span>{chapter.boss}</span><b>{hp}% <small>PHASE {boss.phase}</small></b></div>
        <div className="boss-health" role="progressbar" aria-label={`${chapter.boss} health`} aria-valuemin={0} aria-valuemax={boss.maxHp} aria-valuenow={boss.hp}><i style={{transform:`scaleX(${boss.hp/boss.maxHp})`}}/></div>
        <small>{boss.phase===2?"ARMOR BROKEN / ATTACKS ACCELERATING":"BREAK THE SIGNAL"} · {boss.hp} / {boss.maxHp} HP</small>
      </div>}
      {count===0&&!paused&&sectorAge<150&&<div className="sector-banner" key={sector}><small>{sector===2?"BOSS CONTACT":`SECTOR 0${sector+1}`}</small><h2>{sector===2?chapter.boss:district.route[sector]}</h2><p>{sector===2?"Stay on target. Watch the warning lanes.":district.cue}</p></div>}
      {count>0&&<div className="launch-countdown"><span>{chapter.name} / {district.name}</span><strong key={count}>{count}</strong><small>{wide?"FLY RIGHT / WASD TO STEER":"FLY UP / DRAG TO STEER"} · SPACE / TAP TO PULSE</small><p>{district.twist}</p></div>}
      {paused&&<div className="flight-paused"><span>FLIGHT PAUSED · {chapter.name}</span><h2>HOLD YOUR<br/>FLIGHT LINE.</h2><dl className="pause-stats"><div><dt>SCORE</dt><dd>{hud.score.toLocaleString()}</dd></div><div><dt>CHAIN</dt><dd>×{Math.max(1,hud.combo)}</dd></div><div><dt>SEC LEFT</dt><dd>{seconds}</dd></div><div><dt>COURIERS</dt><dd>{hud.rescues}/3</dd></div></dl><p className="pause-twist"><Icon name="bolt" size={16}/><span><b>{district.name}</b> · {district.twist}</span></p><button className="pause-resume" onClick={togglePause}><Icon name="play" size={22}/>RESUME FLIGHT<Keycap>ESC</Keycap></button><button className="pause-exit" onClick={onExit}><Icon name="home" size={18}/>RETURN TO HANGAR</button></div>}
      {reservationExpires&&<p className="pit-flight-timer">{reservedSeconds>0?`ENTRY HELD / ${Math.floor(reservedSeconds/60)}:${String(reservedSeconds%60).padStart(2,'0')} · pauses still count`:'ENTRY EXPIRED / check outcome in Crown Pit'}</p>}
      {fullError&&<button className="fullscreen-note" onClick={()=>setFullError("")}>{fullError} ×</button>}
    </div>
    <footer className="flight-dashboard">
      <div className="flight-vitals"><span><Icon name={hud.player.shield>0?"shield":"person"} size={16}/>HULL <b>{hud.player.health}%</b>{hud.player.shield>0&&<em>SHIELD</em>}</span><meter aria-label="Hull health" min="0" max="100" low={30} high={60} optimum={100} value={hud.player.health}/></div>
      <div className="flight-loadout"><small><Icon name="spread" size={14}/>{config.rig.toUpperCase()} LV {hud.weapon}</small><i>{[0,1,2].map(n=><span key={n} className={n<hud.weapon?"lit":""}/>)}</i></div>
      <div className="flight-charge"><small><Icon name="bolt" size={14}/>{hud.surge>0?`SURGE ×2 · ${(hud.surge/60).toFixed(1)}s`:`GRAZE → SURGE ${hud.charge}/${target}`}</small><div>{Array.from({length:target},(_,i)=><i key={i} className={hud.surge>0||i<hud.charge?"charged":""}/>)}</div></div>
      <div className="flight-rescues"><small>COURIERS <b>{hud.rescues} / 3</b></small><span className="courier-icons" aria-hidden="true">{[0,1,2].map(n=><Icon key={n} name="person" size={16} className={n<hud.rescues?"on":""}/>)}</span>{ghostScore!==null&&<span className="ghost-gap">{ghostLabel} {hud.score-ghostScore>=0?"+":""}{(hud.score-ghostScore).toLocaleString()}</span>}</div>
      <p className="flight-key-hint">{wide?<><Keycap>WASD</Keycap><Keycap>DRAG</Keycap></>:<Keycap>DRAG</Keycap>}<span>MOVE</span><Keycap>ESC</Keycap><span>PAUSE</span></p>
      <div className="pulse-group"><span className="pulse-label"><b>{hud.pulseCooldown>0?`PULSE ${Math.ceil(hud.pulseCooldown/60)}s`:"PULSE READY"}</b><small><Keycap>SPACE</Keycap>{hud.pulseCooldown>0?"RECHARGING":"CLEAR FIRE"}</small></span>
      <button className="pulse-button" disabled={hud.pulseCooldown>0||count>0||paused} onClick={()=>{pulseRef.current=true;}} aria-label={hud.pulseCooldown>0?`Pulse recharging, ${Math.ceil(hud.pulseCooldown/60)} seconds`:"Fire Pulse to clear nearby fire"}><Icon name="bolt" size={34}/></button></div>
    </footer>
  </section>;
}
