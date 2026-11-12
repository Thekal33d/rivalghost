import { useCallback, useEffect, useState } from "react";
import { ArenaPrototype, type ArenaStats } from "./ArenaPrototype";
import { Pilot } from "./Pilot";

const rivals = [{ name: "PUP", score: 9000, label: "Warm-up" }, { name: "HOUND", score: 14000, label: "The rivalry" }];
function readBest() { try { const n=Number(localStorage.getItem("rivalghost.practice.best")); return Number.isFinite(n) && n>0 ? n : 0; } catch { return 0; } }
const number = (n:number) => n.toLocaleString();

export default function App() {
  const [screen,setScreen]=useState<"lobby"|"run"|"result">("lobby");
  const [rivalIndex,setRivalIndex]=useState(1);
  const [sound,setSound]=useState(false);
  const [help,setHelp]=useState(false);
  const [best,setBest]=useState(readBest);
  const [result,setResult]=useState<ArenaStats|null>(null);
  const [newBest,setNewBest]=useState(false);
  const rival=rivals[rivalIndex];
  useEffect(()=>{window.scrollTo(0,0);},[screen]);
  const finish=useCallback((stats:ArenaStats)=>{
    const previous=readBest();
    setNewBest(stats.score>previous); setBest(Math.max(previous,stats.score));
    try {localStorage.setItem("rivalghost.practice.best",String(Math.max(previous,stats.score)));} catch { /* Storage is optional. */ }
    setResult(stats); setScreen("result");
  },[]);
  const launch=()=>{setHelp(false);setScreen("run");};
  return <main className={`game-shell screen-${screen}`}>
    <header className="masthead">
      <a className="wordmark" href="#" onClick={e=>{e.preventDefault();setScreen("lobby");}} aria-label="RivalGhost lobby"><span className="brand-emblem">R↗</span>RIVAL<span>GHOST</span></a>
      <div className="header-tools"><span className="build-label">ARCADE LAB / 001</span><button className="sound-button" aria-pressed={sound} onClick={()=>setSound(s=>!s)}>SOUND {sound ? "ON ♪" : "OFF"}</button></div>
    </header>
    {screen==="lobby" && <>
      <div className="lobby-grid">
        <section className="intro-panel">
          <p className="eyebrow"><span className="tiny-star">✳</span> SIXTY SECONDS. SOMETHING TO PROVE.</p>
          <h1>FLY CLOSE.<br/>HIT HARD.<br/><em>TAKE OVER.</em></h1>
          <p className="intro-copy">Thread the fire. Charge your Surge.<br/>Give your rival a score to worry about.</p>
          <div className="launch-block"><button className="primary-button" onClick={launch}>LET’S PLAY <span>↗</span></button><p>60-second run · Free local practice · No wallet</p></div>
          <div className="personal-best"><span>YOUR PERSONAL BEST</span><strong>{best ? number(best) : "MAKE YOUR MARK"}</strong></div>
        </section>
        <section className="hangar" aria-label={`${rival.name} practice target`}>
          <div className="hangar-top"><span>MEET YOUR RIVAL</span><span>GHOST DIVISION / 02</span></div>
          <div className="rival-name" aria-hidden="true">{rival.name}</div>
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <div className="rival-portrait"><Pilot rival/></div>
          <div className="rival-quote">{rivalIndex ? "“THAT ALL YOU GOT?”" : "“CATCH ME IF YOU CAN.”"}<span>↙</span></div>
          <div className="pilot-tag">HOUND-CLASS / 02</div>
          <div className="target-panel"><div><small>SCORE TO BEAT</small><strong>{number(rival.score)}<span>PTS</span></strong></div><div className="target-switch" aria-label="Choose practice target">{rivals.map((r,i)=><button key={r.name} aria-pressed={rivalIndex===i} onClick={()=>setRivalIndex(i)}><b>{r.name}</b><small>{r.label}</small></button>)}</div></div>
        </section>
      </div>
      <section className="mechanics-strip" aria-label="How to play">
        <div><span className="mechanic-number">01</span><p><b>FIND YOUR LINE</b><small>Drag or use WASD / arrows. We fire.</small></p></div>
        <div><span className="mechanic-number">02</span><p><b>FLIRT WITH DANGER</b><small>Move close to bullets. Graze for +250.</small></p></div>
        <div><span className="mechanic-number">03</span><p><b>GO FULL SURGE</b><small>4 grazes → 3 seconds of double kill score.</small></p></div>
      </section>
      <footer className="lobby-footer"><span>ONE ARENA. YOUR NEXT BETTER RUN.</span><button className="text-button" onClick={()=>setHelp(v=>!v)} aria-expanded={help}>{help ? "CLOSE FLIGHT MANUAL −" : "FLIGHT MANUAL +"}</button></footer>
      {help && <aside className="flight-manual"><h2>A little danger pays.</h2><p>Your craft fires automatically. Move near a passing bullet without touching its center to earn a graze. Keep moving: sitting next to a bullet doesn’t count. Four grazes unlock one Surge per run. Getting hit clears your charge and ends an active Surge.</p><p>Targets change the score to beat, not the arena difficulty. This is a fixed practice arena; HOUND is a score target, not a live opponent. Leaving the window does not pause a run.</p></aside>}
    </>}
    {screen==="run" && <div className="run-layout">
      <aside className="run-brief"><p className="eyebrow">PRACTICE / FIXED ARENA</p><h1>MAKE<br/>IT <em>COUNT.</em></h1><div className="small-pilot"><Pilot/></div><p className="pilot-label">YOU / ROOKIE ACE</p><p>Stay moving. Pass close.<br/>Make every graze count.</p><button className="text-button" onClick={()=>setScreen("lobby")}>← EXIT RUN</button></aside>
      <ArenaPrototype onFinish={finish} target={rival.score} sound={sound}/>
      <aside className="run-guide"><p className="eyebrow">YOUR RIVAL</p><h2>{rival.name}</h2><strong className="guide-target">{number(rival.score)}</strong><small>POINTS TO BEAT</small><hr/><h3>4 GRAZES.<br/>ONE BIG MOMENT.</h3><p>Fill your charge. Surge doubles takedown points for 3 seconds.</p><div className="keycaps"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div><p className="control-note">Arrows or drag work too.<br/>Auto-fire is on.</p></aside>
    </div>}
    {screen==="result" && result && <section className={`result-layout ${result.score>rival.score ? "result-win" : ""}`}>
      <div className="result-art"><span className="result-stamp">{result.score>rival.score ? "TARGET / TOPPLED" : "REMATCH / READY"}</span><Pilot rival={result.score<=rival.score}/><p>{result.score>rival.score ? "“OKAY. NOW YOU HAVE MY ATTENTION.”" : "“YOU’VE GOT ANOTHER RUN IN YOU.”"}</p></div>
      <div className="result-detail"><p className="eyebrow">{newBest ? "✳ NEW PERSONAL BEST" : "PRACTICE RUN COMPLETE"}</p><h1>{result.score>rival.score ? <>RIVAL.<br/><em>OUTSCORED.</em></> : <>{rival.name}<br/><em>HOLDS ON.</em></>}</h1><div className="final-score">{number(result.score)}<small>POINTS</small></div><p className="score-gap">{result.score>rival.score ? `${number(result.score-rival.score)} above the target. That’s your line to beat.` : `${number(Math.max(0,rival.score-result.score+1))} more points to beat ${rival.name}. ${result.surgeActivations ? "Keep the hull intact. Find a cleaner line." : "Chase four grazes for your Surge."}`}</p><dl className="result-stats"><div><dt>GRAZES</dt><dd>{result.grazes}</dd></div><div><dt>SURGES</dt><dd>{result.surgeActivations}</dd></div><div><dt>TAKEDOWNS</dt><dd>{result.enemiesDestroyed}</dd></div></dl><button className="primary-button" onClick={launch}>RUN IT BACK <span>↻</span></button><button className="text-button result-back" onClick={()=>setScreen("lobby")}>← BACK TO HANGAR</button><p className="replay-note">LOCAL PRACTICE {result.replayHash ? ` / REPLAY ${result.replayHash.slice(0,12).toUpperCase()}` : ""}</p></div>
    </section>}
  </main>;
}
