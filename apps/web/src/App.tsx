import {Workshop,JobReceipt,WORK_PENDING,type JobLaunch} from './Workshop';
import {repairStage,type TrailId} from '@rivalghost/game-data';
import { useCallback, useEffect, useState } from "react";
import { CAMPAIGN_ACTS, CHAPTERS, DISTRICTS, RIGS, dailySignal, type ChapterId, type Rig, type SocialProfile } from "@rivalghost/game-data";
import type { ExpeditionConfig, ExpeditionReplay } from "@rivalghost/sim";
import { ExpeditionArena, type FlightReport } from "./ExpeditionArena";
import { GuestPilot } from "./GuestPilot";
import {PilotStudio,Leaderboard,ShareFlight,GhostInvitation} from "./SocialHub";
import {cachedIdentity,IDENTITY_KEY,socialRequest,type SharedGhost} from "./social-client";
import {CrownPit,PitSettlement,PIT_PENDING,type PitLaunch} from "./CrownPit";
import { Pilot } from "./Pilot";
import { PROFILE_KEY, callsign, emptyProfile, flightKey, isUnlocked, medalCount, parseProfile, recordFlight } from "./flight-profile";

type Mode="story"|"daily";
interface Flight { config:ExpeditionConfig; mode:Mode; dailyKey?:string; ghost?:ExpeditionReplay; rival?:SharedGhost; pit?:PitLaunch;job?:JobLaunch;commission?:boolean;stage?:number;trail?:TrailId|null }
const JOBS_LABEL=(kind:string)=>kind==="recovery"?"MOTH / DESTROY 12 ENEMIES":kind==="courier"?"MOTH / RESCUE 2 COURIERS":"HOUND / 12,000 POINTS · NO PULSE";
const number=(n:number)=>n.toLocaleString();
const chapterNumber=(id:number)=>String(id+1).padStart(2,"0");
const medalNames=["Break the signal","Rescue 2 couriers","Clear without hull damage"];

export default function App() {
  const [screen,setScreen]=useState<"lobby"|"run"|"result"|"profile"|"board"|"pit"|"workshop">("lobby");
  const [trail,setTrail]=useState<TrailId|null>(null),[districts,setDistricts]=useState<number[]>(Array(10).fill(0));
  const updateWorld=useCallback((trail:TrailId|null,districts:number[])=>{setTrail(trail);setDistricts(districts);},[]);
  useEffect(()=>{void socialRequest("workshop").then(v=>updateWorld(v.pilot?.equipped??null,v.districts)).catch(()=>{});},[updateWorld]);
  const [identity,setIdentity]=useState<SocialProfile|null>(cachedIdentity),[invitation,setInvitation]=useState<SharedGhost|null>(null),[socialNotice,setSocialNotice]=useState("");
  const saveIdentity=(pilot:SocialProfile)=>{setIdentity(pilot);try{localStorage.setItem(IDENTITY_KEY,JSON.stringify(pilot));}catch{setSocialNotice("Your profile is saved on this server, but this browser could not cache it.");}};
  useEffect(()=>{let active=true;void socialRequest("social/me").then(data=>{if(active&&data.profile)saveIdentity(data.profile);}).catch(()=>{});const id=new URLSearchParams(location.search).get("ghost");if(id){void socialRequest("social/ghost?id="+encodeURIComponent(id)).then(run=>{if(active)setInvitation(run);}).catch(e=>{if(active)setSocialNotice(e.message);});}return()=>{active=false;};},[]);
  const [mode,setMode]=useState<Mode>("story"),[chapterId,setChapterId]=useState<ChapterId>(0),[rig,setRig]=useState<Rig>("fan");
  const [sound,setSound]=useState(false),[help,setHelp]=useState(false),[saveError,setSaveError]=useState(false);
  const [profile,setProfile]=useState(()=>{try{return parseProfile(localStorage.getItem(PROFILE_KEY));}catch{return emptyProfile();}});
  const [day,setDay]=useState(()=>dailySignal());
  const [flight,setFlight]=useState<Flight|null>(null),[report,setReport]=useState<FlightReport|null>(null);
  const [newBest,setNewBest]=useState(false),[earned,setEarned]=useState(0);
  const chapter=CHAPTERS[mode==="daily"?day.chapter:chapterId];
  const bests=mode==="story"?profile.bests:profile.daily.key===day.key?profile.daily.bests:{};
  const best=bests[flightKey(chapter.id,rig,3)];
  useEffect(()=>{window.scrollTo(0,0);},[screen]);
  useEffect(()=>{if(screen==="run")return;setDay(dailySignal());const id=setInterval(()=>setDay(dailySignal()),30000);return()=>clearInterval(id);},[screen]);

  const launch=()=>{
    if(screen==="result"&&(flight?.job||flight?.commission)){setScreen("workshop");return;}
    if(screen==="result"&&flight?.pit){setScreen("pit");return;}
    if(screen==="result"&&flight?.rival){setFlight({...flight});setScreen("run");return;}
    if(mode==="story"&&!isUnlocked(profile,chapter.id))return;
    const config={rulesVersion:3 as const,chapter:chapter.id,rig,seed:mode==="daily"?day.seed:chapter.seed};
    const ghost=best?.replay.seed===config.seed?best.replay:undefined;
    setFlight({config,mode,trail,stage:repairStage(districts[config.chapter]),dailyKey:mode==="daily"?day.key:undefined,ghost});setHelp(false);setScreen("run");
  };
  const finish=useCallback((next:FlightReport)=>{
    if(!flight)return;
    const key=flightKey(next.result.chapter,next.result.rig,next.result.rulesVersion);
    const old=flight.dailyKey?(profile.daily.key===flight.dailyKey?profile.daily.bests[key]:undefined):profile.bests[key];
    setNewBest(!flight.job&&!flight.commission&&(!old||next.result.score>old.score));
    const updated=recordFlight(profile,next.result,next.replay,flight.dailyKey);
    if(flight.rival||flight.pit||flight.job||flight.commission){updated.medals=profile.medals;updated.attempts=profile.attempts;}
    setEarned(flight.dailyKey||flight.rival||flight.pit||flight.job||flight.commission?0:updated.medals[next.result.chapter]&~profile.medals[next.result.chapter]);
    if(flight.job||flight.commission){updated.bests=profile.bests;}
    setProfile(updated);try{localStorage.setItem(PROFILE_KEY,JSON.stringify(updated));setSaveError(false);}catch{setSaveError(true);}
    if(flight.job){try{localStorage.setItem(WORK_PENDING,JSON.stringify({ticket:flight.job.id,replay:next.replay}));}catch{setSocialNotice("Keep this result open until the workshop confirms your cargo.");}}
    if(flight.pit){try{localStorage.setItem(PIT_PENDING,JSON.stringify({id:flight.pit.attempt.id,replay:next.replay}));}catch{setSocialNotice("Keep this result open until the local ledger confirms it; this browser could not save its retry recording.");}}
    setReport(next);setScreen("result");
  },[flight,profile]);
  const download=()=>{
    if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report.replay,null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download=`rivalghost-chapter-${report.result.chapter+1}-${report.result.rig}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const raceGhost=(run:SharedGhost)=>{setInvitation(run);setScreen("lobby");};
  const launchRival=()=>{if(!invitation)return;const run=invitation;setChapterId(run.replay.chapter);setRig(run.replay.rig);setMode(run.mode);setFlight({config:{rulesVersion:3,chapter:run.replay.chapter,rig:run.replay.rig,seed:run.replay.seed},mode:run.mode,dailyKey:run.mode==="daily"?run.day:undefined,ghost:run.replay,rival:run});setInvitation(null);setScreen("run");};
  const launchPit=(pit:PitLaunch)=>{setFlight({config:pit.target.replay,mode:"story",ghost:pit.target.replay,pit});setScreen("run");};
  const launchJob=(job:JobLaunch)=>{setFlight({config:job.config,mode:"story",job,stage:job.stage,trail});setScreen("run");};
  const raceCommission=(ghost:ExpeditionReplay)=>{setFlight({config:ghost,mode:"story",ghost,commission:true,trail,stage:repairStage(districts[ghost.chapter])});setScreen("run");};
  const result=report?.result;
  const playedChapter=result?CHAPTERS[result.chapter]:chapter;

  return <main className={`game-shell screen-${screen}`}>
    <header className="masthead"><a className="wordmark" href="#" onClick={e=>{e.preventDefault();setScreen("lobby");}} aria-label="RivalGhost hangar"><span className="brand-emblem">R↗</span>RIVAL<span>GHOST</span></a><div className="header-tools"><GuestPilot username={identity?.username}/><span className="build-label">{callsign(profile)} / {medalCount(profile)} {medalCount(profile)===1?"MEDAL":"MEDALS"}</span><button className="sound-button" aria-pressed={sound} onClick={()=>setSound(s=>!s)}>SOUND {sound?"ON ♪":"OFF"}</button></div></header>
    {screen!=="run"&&<nav className="social-nav" aria-label="Game navigation"><button aria-current={screen==="lobby"?"page":undefined} onClick={()=>setScreen("lobby")}>FLIGHT DECK</button><button aria-current={screen==="board"?"page":undefined} onClick={()=>setScreen("board")}>LEADERBOARD <span>↗</span></button><button aria-current={screen==="pit"?"page":undefined} onClick={()=>setScreen("pit")}>CROWN PIT <span>♛</span></button><button aria-current={screen==="workshop"?"page":undefined} onClick={()=>setScreen("workshop")}>WORKSHOP <span>✳</span></button><button className="profile-nav" aria-current={screen==="profile"?"page":undefined} onClick={()=>setScreen("profile")}><span className="nav-avatar"><Pilot avatar={identity?.avatar}/></span><span>{identity?`@${identity.username}`:"YOUR PILOT"}<small>CUSTOMIZE →</small></span></button></nav>}
    {socialNotice&&screen!=="run"&&<p className="social-error" role="status">{socialNotice}<button className="text-button" onClick={()=>setSocialNotice("")}>DISMISS</button></p>}
    {screen==="profile"&&<><PilotStudio identity={identity} profile={profile} onSave={saveIdentity}/>{report&&flight&&!flight.job&&!flight.commission&&<ShareFlight key={report.hash} replay={report.replay} mode={flight.mode} day={flight.dailyKey} identity={identity} onProfile={()=>setScreen("profile")}/>}</>}
    {screen==="workshop"&&<Workshop onFly={launchJob} onRace={raceCommission} onWorld={updateWorld}/>}
    {screen==="pit"&&<CrownPit onFly={launchPit} onProfile={()=>setScreen("profile")}/>}
    {screen==="board"&&<Leaderboard identity={identity} profile={profile} initialChapter={chapterId} day={day.key} onRace={raceGhost} onProfile={()=>setScreen("profile")} onPlay={()=>setScreen("lobby")}/>}
    {saveError&&<p role="status" className="save-notice">This browser couldn’t save your flight. Progress stays available here until you close or reload. You can download the replay from the result.</p>}

    {screen==="lobby"&&<>
      {invitation&&<GhostInvitation run={invitation} onRace={launchRival} onClose={()=>{setInvitation(null);const url=new URL(location.href);url.searchParams.delete("ghost");history.replaceState(null,"",url);}}/>}
      <div className="mode-switch" aria-label="Game mode"><button aria-pressed={mode==="story"} onClick={()=>setMode("story")}>GHOST SIGNAL <small>STORY / {CHAPTERS.length} CHAPTERS</small></button><button aria-pressed={mode==="daily"} onClick={()=>setMode("daily")}>DAILY SIGNAL <small>EXPERT / {day.key}</small></button></div>
      <div className="lobby-grid campaign-lobby">
        <section className="intro-panel"><p className="eyebrow"><span className="tiny-star">✳</span>{mode==="story"?"YOUR BEST FLIGHT. THEIR DEADLIEST WEAPON.":"ONE SIGNAL. A NEW LINE EVERY DAY."}</p><h1>STEAL YOUR<br/><em>GHOST</em><br/>BACK.</h1><p className="intro-copy">{mode==="story"?"Someone turned your flight recorder into a weapon. Ten districts. Follow the signal. Free the pilots behind the ghosts.":"The Ghost Engine changed its pattern. Same seed for today’s runs. How clean can you fly?"}</p><div className="launch-block"><button className="primary-button" onClick={launch}>{mode==="story"?`FLY CHAPTER ${chapterNumber(chapter.id)}`:"FLY TODAY’S SIGNAL"}<span>↗</span></button><p>60 seconds · {rig.toUpperCase()} rig · Free local play</p></div><div className="personal-best"><span>BEST / THIS RIG</span><strong>{best?number(best.score):"MAKE YOUR MARK"}</strong>{best&&<small>GHOST READY</small>}</div></section>
        <section className="hangar" aria-label={`${chapter.name} mission`}><div className="hangar-top"><span>INCOMING / HOUND</span><span>{mode==="daily"?"DAILY FREQUENCY":`CHAPTER ${chapterNumber(chapter.id)}`}</span></div><div className="rival-name" aria-hidden="true">GHOST</div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="rival-portrait"><Pilot rival/></div><div className="rival-quote">{chapter.id===0?"“THAT SIGNAL KNOWS YOU.”":chapter.id===1?"“STAY OUT OF THE RED.”":"“MAKE IT REGRET IT.”"}<span>↙</span></div><div className="pilot-tag">ENCRYPTED TRANSMISSION / HOUND</div><div className="target-panel"><div><small>{chapter.district.toUpperCase()}</small><strong className="chapter-title">{chapter.name}</strong></div><span className="chapter-number">{chapterNumber(chapter.id)}</span></div></section>
      </div>

      {mode==="story"&&<section className="campaign-map" aria-label="Story chapters">
        <div className="section-caption"><h2>FOLLOW THE SIGNAL.</h2><span>{profile.medals.filter(mask=>mask&1).length} / {CHAPTERS.length} CLEARED · {medalCount(profile)} / {CHAPTERS.length*3} MEDALS</span></div>
        {CAMPAIGN_ACTS.map((act,i)=><div className="campaign-act" key={act.name}>
          <h3><span>ACT {i+1}</span>{act.name}</h3>
          <div className="chapter-track">{CHAPTERS.slice(act.start,act.end).map(c=><button key={c.id} disabled={!isUnlocked(profile,c.id)} aria-pressed={chapterId===c.id} onClick={()=>setChapterId(c.id)}>
            <span className="chapter-index">{chapterNumber(c.id)}</span><span><b>{c.name}</b><small>{isUnlocked(profile,c.id)?c.district:`CLEAR ${chapterNumber(c.id-1)} TO UNLOCK`}</small></span>
            <span className="medal-dots" aria-label={`${[1,2,4].filter(bit=>profile.medals[c.id]&bit).length} of 3 medals`}>{[1,2,4].map(bit=><i key={bit} className={profile.medals[c.id]&bit?"won":""}/>)}</span>
          </button>)}</div>
        </div>)}
      </section>}
      <section className="mission-brief"><div><p className="eyebrow">{mode==="daily"?"DAILY BRIEF / LOCAL RECORD":"MISSION BRIEF"}</p><h2>{chapter.objective}</h2></div><p>{chapter.briefing}</p></section>
      <section className="district-brief"><span>CHAPTER TWIST / {DISTRICTS[chapter.id].name}</span><p>{DISTRICTS[chapter.id].twist}</p><small>{DISTRICTS[chapter.id].route.join(" → ")}</small></section>
      <section className="rig-section" aria-label="Choose a ship rig"><div className="section-caption"><h2>YOUR SHIP. YOUR LINE.</h2><span>ALL RIGS FREE / POWER RESETS EACH RUN</span></div><div className="rig-grid">{RIGS.map(r=><button key={r.id} aria-pressed={rig===r.id} onClick={()=>setRig(r.id)}><span className={`rig-icon rig-${r.id}`} aria-hidden="true">{r.id==="needle"?"↑":r.id==="fan"?"↖↑↗":"◇"}</span><div><b>{r.name}</b><small>{r.title}</small><p>{r.description}</p></div><span className="rig-check">{rig===r.id?"✓":"+"}</span></button>)}</div><button className="loadout-launch" onClick={launch}>LAUNCH {rig.toUpperCase()} / {mode==="daily"?"DAILY SIGNAL":`CHAPTER ${chapterNumber(chapter.id)}`} ↗</button></section>
      <section className="mechanics-strip" aria-label="Flight tactics"><div><span className="mechanic-number">01</span><p><b>BREAK FORMATION</b><small>Rescue couriers. Catch cells to evolve your guns.</small></p></div><div><span className="mechanic-number">02</span><p><b>TURN DANGER INTO POWER</b><small>{chapter.id===7?3:4} grazes → Surge. Chain kills up to ×5.</small></p></div><div><span className="mechanic-number">03</span><p><b>MAKE AN EXIT</b><small>Space / tap Pulse clears nearby fire.</small></p></div></section>
      <footer className="lobby-footer"><span>BEST GHOSTS & MEDALS SAVED ON THIS DEVICE</span><button className="text-button" aria-expanded={help} onClick={()=>setHelp(v=>!v)}>{help?"CLOSE FLIGHT MANUAL −":"FLIGHT MANUAL +"}</button></footer>
      {help&&<aside className="flight-manual"><h2>Don’t just survive. Make a better flight.</h2><p>Drag, WASD, or arrows to steer and aim. Your guns fire right in landscape and up in portrait. The white center is your vulnerable core; wings are cosmetic. Pass near bullets while moving to charge a repeatable Surge. Keep killing to maintain your chain. Hull damage breaks your chain and Surge.</p><p>Gold cells upgrade your gun every two pickups, up to level three. Mint courier pods give 500 points and repair 15 hull. Guard also regains its shield. Pulse clears nearby bullets and damages nearby enemies; it recharges every eight seconds. Yellow lane warnings turn into damaging red beams.</p><p>Defeat the boss and survive the short extraction to clear a chapter. Earn separate medals for clearing, rescuing two couriers, and clearing without hull damage. Your best replay returns as a pale, non-colliding ghost. Daily records are separate from story progression. Escape or Pause stops a flight; switching windows pauses it automatically. These are local records, not verified leaderboards or on-chain rewards.</p></aside>}
    </>}

    {screen==="run"&&flight&&<ExpeditionArena trail={flight.trail??trail} restorationStage={flight.stage??0} jobLabel={flight.job?JOBS_LABEL(flight.job.kind):undefined} reservationExpires={flight.pit?.attempt.expires} pilotName={identity?.username} ghostLabel={flight.commission?"COMMISSION":flight.pit?flight.pit.target.holderName:flight.rival?`@${flight.rival.pilot.username}`:undefined} config={flight.config} sound={sound} ghost={flight.ghost} onFinish={finish} onExit={()=>setScreen(flight.pit?"pit":flight.job||flight.commission?"workshop":"lobby")} onSound={()=>setSound(s=>!s)}/>}

    {screen==="result"&&result&&report&&flight&&<section className={`result-layout campaign-result ${result.cleared?"result-win":""}`}><div className="result-art"><span className="result-stamp">{flight.pit?"CROWN / LOCAL RESULT":result.cleared?"SIGNAL / BROKEN":result.health===0?"FLIGHT / LOST":"SIGNAL / STILL ACTIVE"}</span><Pilot rival={!result.cleared&&!flight.rival} avatar={flight.rival&&!result.cleared?flight.rival.pilot.avatar:identity?.avatar}/><p>{result.cleared?"“YOUR GHOST. YOUR RULES.”":"“YOU GOT OUT ONCE. YOU’LL FIND THE LINE.”"}</p><div className="story-reveal"><small>{result.cleared?"TRANSMISSION RECOVERED":"CHANNEL STILL OPEN"}</small><p>{result.cleared?playedChapter.ending:result.rescues>0?`${result.rescues} courier${result.rescues===1?" is":"s are"} safe. ${playedChapter.transmission}`:playedChapter.transmission}</p></div></div><div className="result-detail"><p className="eyebrow">{newBest?"✳ NEW BEST / GHOST READY":`${playedChapter.name} / ${result.rig.toUpperCase()}`}</p><h1>{flight.pit?(result.score>flight.pit.target.score?<>GHOST.<br/><em>OUTSCORED.</em></>:<>CROWN.<br/><em>STILL HELD.</em></>):result.cleared?<>GHOST.<br/><em>RECLAIMED.</em></>:<>FIND A<br/><em>NEW LINE.</em></>}</h1><div className="final-score">{number(result.score)}<small>POINTS</small></div><p className="score-gap">{flight.job?"Your cargo depends on the job objective. The receipt below confirms the reward.":flight.commission?"Practice against HOUND’s acquired ghost. No entry cost or reward.":flight.pit?`You finished ${Math.abs(result.score-flight.pit.target.score).toLocaleString()} points ${result.score>flight.pit.target.score?"ahead":result.score===flight.pit.target.score?"apart":"behind"} against ${flight.pit.target.holderName}. The receipt below confirms the credit result.`:flight.rival?`${result.score>flight.rival.score?"GHOST BEATEN":result.score===flight.rival.score?"DEAD HEAT":"GHOST STILL AHEAD"} / @${flight.rival.pilot.username} · ${Math.abs(result.score-flight.rival.score).toLocaleString()} points ${result.score>flight.rival.score?"ahead":result.score===flight.rival.score?"apart":"behind"}. Post your flight to send back a rematch.`:result.cleared?(flight.mode==="daily"?"Today’s signal is down. Your best ghost is ready for a rematch.":result.chapter<CHAPTERS.length-1?`${CHAPTERS[result.chapter+1].name} unlocked. The signal goes deeper.`:"Ghost Signal complete. Chase the remaining medals or take on the daily signal."):result.health===0?"Try pulsing before a cluster reaches you. Rescue pods repair your hull.":"The boss held the signal. Line up beneath it and collect cells to strengthen your gun."}</p><dl className="result-stats"><div><dt>RESCUES</dt><dd>{result.rescues}/3</dd></div><div><dt>MAX CHAIN</dt><dd>×{result.maxCombo}</dd></div><div><dt>SURGES</dt><dd>{result.surges}</dd></div></dl>{flight.mode==="story"&&!flight.rival&&!flight.pit&&!flight.job&&!flight.commission&&<div className="medal-results" aria-label="Chapter medals">{medalNames.map((name,i)=><p key={name} className={profile.medals[result.chapter]&(1<<i)?"earned":""}><span>{profile.medals[result.chapter]&(1<<i)?"◆":"◇"}</span>{name}{Boolean(earned&(1<<i))&&<b>NEW</b>}</p>)}</div>}<button className="primary-button" onClick={launch}>{flight.job||flight.commission?"BACK TO THE WORKSHOP":flight.pit?"CHOOSE YOUR NEXT CROWN":flight.rival?`REMATCH @${flight.rival.pilot.username}`:"RACE MY BEST GHOST"} <span>↻</span></button>{!flight.rival&&!flight.pit&&!flight.job&&!flight.commission&&result.cleared&&flight.mode==="story"&&result.chapter<CHAPTERS.length-1&&<button className="next-chapter" onClick={()=>{setChapterId((result.chapter+1) as ChapterId);setScreen("lobby");}}>NEXT / {CHAPTERS[result.chapter+1].name} →</button>}<div className="result-actions"><button className="text-button" onClick={()=>setScreen("lobby")}>← HANGAR / CHANGE RIG</button><button className="text-button" onClick={download}>SAVE REPLAY ↓</button></div>{flight.pit&&<PitSettlement key={flight.pit.attempt.id} id={flight.pit.attempt.id} replay={report.replay} onPit={()=>setScreen("pit")}/>}{flight.job&&<JobReceipt ticket={flight.job.id} replay={report.replay} onDone={()=>{}}/>}{!flight.job&&!flight.commission&&<ShareFlight key={report.hash} replay={report.replay} mode={flight.mode} day={flight.dailyKey} identity={identity} onProfile={()=>setScreen("profile")}/>}<button className="text-button" onClick={()=>setScreen("board")}>VIEW LEADERBOARD →</button>{flight.rival&&<p className="replay-note">Rival challenges save a best flight; campaign medals and unlocks come from story flights.</p>}<p className="replay-note">LOCAL RULES V{result.rulesVersion} {report.hash?` / ${report.hash.slice(0,12).toUpperCase()}`:""}</p></div></section>}
  </main>;
}
