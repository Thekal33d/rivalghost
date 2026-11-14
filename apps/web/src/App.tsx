import {WalletWelcome,useWalletWelcome} from './WalletWelcome';
import {ProcessFeedback} from './ProcessFeedback';
import {WelcomeBriefing,UnlockGate,JourneyPanel,UnlockRewards} from './Journey';
import {FEATURES,JOURNEY_KEY,parseJourney,featureOpen,newlyUnlocked,screenFeature,unannounced,markSeen,markAnnounced,type Feature,type Journey} from './player-journey';
import {Walkthrough,UnlockCelebration} from './Walkthrough';
import {TOURS,UNLOCK_DESTINATION} from './tours';
import {Workshop,JobReceipt,WORK_PENDING,type JobLaunch} from './Workshop';
import {repairStage,type TrailId} from '@rivalghost/game-data';
import { useCallback, useEffect, useState, useRef } from "react";
import { CHAPTERS, dailySignal, type ChapterId, type Rig, type SocialProfile } from "@rivalghost/game-data";
import type { ExpeditionConfig, ExpeditionReplay } from "@rivalghost/sim";
import { ExpeditionArena, type FlightReport } from "./ExpeditionArena";
import { TopBar, type Screen } from "./TopBar";
import { PilotAccount } from "./GuestPilot";
import { isNearAuthReturn } from "./near-auth-return";
import { FlightDeck } from "./FlightDeck";
import { SignalMap } from "./SignalMap";
import {PilotStudio,Leaderboard,ShareFlight,GhostInvitation} from "./SocialHub";
import {cachedIdentity,IDENTITY_KEY,socialRequest,type SharedGhost} from "./social-client";
import {CrownPit,PitSettlement,PIT_PENDING,type PitLaunch} from "./CrownPit";
import { Pilot } from "./Pilot";
import { PROFILE_KEY, callsign, emptyProfile, flightKey, isUnlocked, medalCount, parseProfile, recordFlight } from "./flight-profile";

type Mode="story"|"daily";
interface Flight { config:ExpeditionConfig; mode:Mode; dailyKey?:string; ghost?:ExpeditionReplay; rival?:SharedGhost; pit?:PitLaunch;job?:JobLaunch;commission?:boolean;guided?:boolean;stage?:number;trail?:TrailId|null }
const JOBS_LABEL=(kind:string)=>kind==="recovery"?"MOTH / DESTROY 12 ENEMIES":kind==="courier"?"MOTH / RESCUE 2 COURIERS":"HOUND / 12,000 POINTS · NO PULSE";
const number=(n:number)=>n.toLocaleString();
const chapterNumber=(id:number)=>String(id+1).padStart(2,"0");
const medalNames=["Break the signal","Rescue 2 couriers","Clear without hull damage"];

export default function App() {
  const walletWelcome=useWalletWelcome();
  const [walletFocus,setWalletFocus]=useState(false);
  const [screen,setScreen]=useState<Screen>(()=>isNearAuthReturn()||Boolean(sessionStorage.getItem("rivalghost.auth.error"))?"profile":"lobby");
  useEffect(()=>{if(screen!=='profile')setWalletFocus(false);},[screen]);
  const [trail,setTrail]=useState<TrailId|null>(null),[districts,setDistricts]=useState<number[]>(Array(10).fill(0));
  const updateWorld=useCallback((trail:TrailId|null,districts:number[])=>{setTrail(trail);setDistricts(districts);},[]);
  useEffect(()=>{void socialRequest("workshop").then(v=>updateWorld(v.pilot?.equipped??null,v.districts)).catch(()=>{});},[updateWorld]);
  const [identity,setIdentity]=useState<SocialProfile|null>(cachedIdentity),[invitation,setInvitation]=useState<SharedGhost|null>(null),[socialNotice,setSocialNotice]=useState("");
  useEffect(()=>{const refresh=()=>setIdentity(cachedIdentity());window.addEventListener('rivalghost:identity',refresh);return()=>window.removeEventListener('rivalghost:identity',refresh);},[]);
  const saveIdentity=(pilot:SocialProfile)=>{setIdentity(pilot);try{localStorage.setItem(IDENTITY_KEY,JSON.stringify(pilot));}catch{setSocialNotice("Your profile is saved on this server, but this browser could not cache it.");}};
  useEffect(()=>{let active=true;void socialRequest("social/me").then(data=>{if(active&&data.profile)saveIdentity(data.profile);}).catch(()=>{});const id=new URLSearchParams(location.search).get("ghost");if(id){void socialRequest("social/ghost?id="+encodeURIComponent(id)).then(run=>{if(active)setInvitation(run);}).catch(e=>{if(active)setSocialNotice(e.message);});}return()=>{active=false;};},[]);
  const [mode,setMode]=useState<Mode>("story"),[chapterId,setChapterId]=useState<ChapterId>(0),[rig,setRig]=useState<Rig>("fan");
  const [sound,setSound]=useState(false),[help,setHelp]=useState(false),[saveError,setSaveError]=useState(false);
  const [profile,setProfile]=useState(()=>{try{return parseProfile(localStorage.getItem(PROFILE_KEY));}catch{return emptyProfile();}});
  const [journey,setJourney]=useState<Journey>(()=>{try{return parseJourney(localStorage.getItem(JOURNEY_KEY),profile,Object.keys(localStorage).some(k=>k.startsWith('rivalghost.backup.saved.')&&localStorage.getItem(k)==='yes'));}catch{return parseJourney(null,profile);}});
  const [welcome,setWelcome]=useState(()=>!journey.welcomed&&!isNearAuthReturn()&&screen==='lobby'),[gate,setGate]=useState<Feature|null>(null),[unlocks,setUnlocks]=useState<ReturnType<typeof newlyUnlocked>>([]);
  useEffect(()=>{try{localStorage.setItem(JOURNEY_KEY,JSON.stringify(journey));}catch{setSaveError(true);}},[journey]);
  const journeyRef=useRef(journey);journeyRef.current=journey;
  const canUse=(feature:Feature)=>featureOpen(feature,profile,journey);
  const allow=(feature:Feature)=>{if(canUse(feature))return true;setGate(feature);return false;};
  const finishTutorial=useCallback(()=>setJourney(j=>({...j,tutorial:'complete'})),[]);
  const skipTutorial=useCallback(()=>setJourney(j=>({...j,tutorial:j.tutorial==='complete'?'complete':'skipped'})),[]);
  const [workshopTab,setWorkshopTab]=useState('jobs');
  const [day,setDay]=useState(()=>dailySignal());
  const [flight,setFlight]=useState<Flight|null>(null),[report,setReport]=useState<FlightReport|null>(null);
  const [newBest,setNewBest]=useState(false),[earned,setEarned]=useState(0);
  const chapter=CHAPTERS[mode==="daily"?day.chapter:chapterId];
  const bests=mode==="story"?profile.bests:profile.daily.key===day.key?profile.daily.bests:{};
  const best=bests[flightKey(chapter.id,rig,3)];
  useEffect(()=>{window.scrollTo(0,0);},[screen]);
  useEffect(()=>{if(screen==="run")return;setDay(dailySignal());const id=setInterval(()=>setDay(dailySignal()),30000);return()=>clearInterval(id);},[screen]);

  const nav=(next:Screen)=>{const feature=screenFeature[next as keyof typeof screenFeature];if(feature&&!allow(feature))return;if(next==="map")setMode("story");setScreen(next);};
  const nextMission=()=>{setGate(null);setMode('story');const next=CHAPTERS.find(c=>isUnlocked(profile,c.id)&&!(profile.medals[c.id]&1));setChapterId(next?.id??0);setScreen('lobby');};
  const startTutorial=()=>{setWelcome(false);setGate(null);setJourney(j=>({...j,welcomed:true}));setFlight({config:{rulesVersion:3,chapter:0,rig:'fan',seed:CHAPTERS[0].seed},mode:'story',guided:true,trail,stage:repairStage(districts[0])});setScreen('run');};
  const showWalletWelcome=walletWelcome.offer&&screen==='lobby'&&!gate;
  const connectFromWelcome=()=>{walletWelcome.dismiss();setWalletFocus(true);setScreen('profile');};
  const launch=()=>{
    if((welcome&&screen==='lobby'&&walletWelcome.checked)||gate||showWalletWelcome)return;
    if(mode==='daily'&&!allow('daily'))return;
    if(rig!=='fan'&&!allow(rig))return;
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
    setUnlocks(newlyUnlocked(profile,updated,journeyRef.current));
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
  const launchRival=()=>{if(!invitation||!allow('rivals'))return;const run=invitation;setChapterId(run.replay.chapter);setRig(run.replay.rig);setMode(run.mode);setFlight({config:{rulesVersion:3,chapter:run.replay.chapter,rig:run.replay.rig,seed:run.replay.seed},mode:run.mode,dailyKey:run.mode==="daily"?run.day:undefined,ghost:run.replay,rival:run});setInvitation(null);setScreen("run");};
  const launchPit=(pit:PitLaunch)=>{if(!allow('pit'))return;setFlight({config:pit.target.replay,mode:"story",ghost:pit.target.replay,pit});setScreen("run");};
  const launchJob=(job:JobLaunch)=>{if(!allow('workshop')||(job.kind==='commission'&&!allow('commission')))return;setFlight({config:job.config,mode:"story",job,stage:job.stage,trail});setScreen("run");};
  const raceCommission=(ghost:ExpeditionReplay)=>{if(!allow('commission'))return;setFlight({config:ghost,mode:"story",ghost,commission:true,trail,stage:repairStage(districts[ghost.chapter])});setScreen("run");};
  const result=report?.result;
  const otherDialog=showWalletWelcome||gate!==null||(welcome&&walletWelcome.checked&&screen==='lobby');
  const screenTour=screen==='lobby'?(mode==='daily'?'daily':'deck'):screen==='workshop'?(workshopTab==='jobs'||journey.tours.includes('workshop')===false?'workshop':`workshop:${workshopTab}`):screen==='result'?'result':['map','board','pit','profile'].includes(screen)?screen:null;
  const pendingUnlocks=journey.legacy?[]:unannounced(profile,journey);
  const resultTourFirst=screen==='result'&&journey.tips&&!journey.tours.includes('result');
  const celebrate=!otherDialog&&screen!=='run'&&!resultTourFirst&&(screen==='result'||screen==='lobby')&&pendingUnlocks.length>0;
  const activeTour=!otherDialog&&!celebrate&&screen!=='run'&&journey.tips&&journey.welcomed&&screenTour&&TOURS[screenTour]&&!journey.tours.includes(screenTour)?TOURS[screenTour]:null;
  const closeTour=useCallback((id:string)=>setJourney(j=>markSeen(j,id)),[]);
  const tipsOff=useCallback((id:string)=>setJourney(j=>({...markSeen(j,id),tips:false})),[]);
  const showTips=()=>{if(!screenTour)return;setJourney(j=>({...j,tips:true,welcomed:true,tours:j.tours.filter(t=>t!==screenTour)}));};
  const goUnlock=(f:Feature)=>{setJourney(j=>markAnnounced(j,pendingUnlocks));const dest=UNLOCK_DESTINATION[f]??'lobby';if(f==='daily')setMode('daily');if(f==='needle'||f==='guard'){setRig(f);setMode('story');}setScreen(dest);};
  const playedChapter=result?CHAPTERS[result.chapter]:chapter;

  return <main className={`game-shell screen-${screen}`}><div className="deck-backdrop" aria-hidden="true"/>
    {screen!=="run"&&<TopBar screen={screen} onNav={nav} locked={Object.fromEntries(Object.entries(screenFeature).filter(([,f])=>!canUse(f)).map(([screen,f])=>[screen,FEATURES.find(x=>x.id===f)!.reward]))} medals={medalCount(profile)} maxMedals={CHAPTERS.length*3} rank={callsign(profile)} username={identity?.username} avatar={identity?.avatar} sound={sound} onSound={()=>setSound(s=>!s)} onHelp={screenTour&&TOURS[screenTour]?showTips:undefined}/>}

    {socialNotice&&screen!=="run"&&<p className="social-error" role="status">{socialNotice}<button className="text-button" onClick={()=>setSocialNotice("")}>DISMISS</button></p>}
    {screen==="profile"&&<><PilotStudio identity={identity} profile={profile} onSave={saveIdentity} account={<PilotAccount focusWallet={walletFocus} username={identity?.username} onDone={()=>setScreen("lobby")}/>}/>{report&&flight&&!flight.job&&!flight.commission&&<ShareFlight key={report.hash} replay={report.replay} mode={flight.mode} day={flight.dailyKey} identity={identity} onProfile={()=>setScreen("profile")}/>}</>}
    {screen==="workshop"&&<Workshop onTab={setWorkshopTab} canUse={canUse} onLocked={setGate} chapterAllowed={id=>isUnlocked(profile,id as ChapterId)} onFly={launchJob} onRace={raceCommission} onWorld={updateWorld}/>}
    {screen==="pit"&&<CrownPit onFly={launchPit} onProfile={()=>setScreen("profile")}/>}
    {screen==="board"&&<Leaderboard identity={identity} profile={profile} initialChapter={chapterId} day={day.key} onRace={raceGhost} onProfile={()=>setScreen("profile")} onPlay={()=>setScreen("lobby")}/>}
    {saveError&&<p role="status" className="save-notice">This browser couldn’t save your flight. Progress stays available here until you close or reload. You can download the replay from the result.</p>}

    {screen==="lobby"&&<>
      {invitation&&<GhostInvitation run={invitation} onRace={launchRival} onClose={()=>{setInvitation(null);const url=new URL(location.href);url.searchParams.delete("ghost");history.replaceState(null,"",url);}}/>}
      <FlightDeck dailyUnlocked={canUse('daily')} rigUnlocked={r=>r==='fan'||canUse(r)} onLocked={setGate} mode={mode} onMode={m=>{if(m==='daily'&&!allow('daily'))return;setMode(m);}} chapter={chapter} medals={profile.medals[chapter.id]??0} rig={rig} onRig={r=>{if(r==='fan'||allow(r))setRig(r);}} best={best?.score} ghostReady={Boolean(best)} locked={mode==="story"&&!isUnlocked(profile,chapter.id)} grazes={chapter.id===7?3:4} onLaunch={launch} onMap={()=>nav("map")} onManual={()=>setHelp(v=>!v)} manualOpen={help} dailyKey={day.key} cleared={profile.medals.filter(m=>m&1).length}/>
      <JourneyPanel profile={profile} journey={journey} onTutorial={()=>setWelcome(true)} onNext={nextMission}/>
      {help&&<aside className="flight-manual" id="flight-manual"><h2>Don’t just survive. Make a better flight.</h2><p>Drag, WASD, or arrows to steer and aim. Your guns fire right in landscape and up in portrait. The white center is your vulnerable core; wings are cosmetic. Pass near bullets while moving to charge a repeatable Surge. Keep killing to maintain your chain. Hull damage breaks your chain and Surge.</p><p>Gold cells upgrade your gun every two pickups, up to level three. Mint courier pods give 500 points and repair 15 hull. Guard also regains its shield. Pulse clears nearby bullets and damages nearby enemies; it recharges every eight seconds. Yellow lane warnings turn into damaging red beams.</p><p>Defeat the boss and survive the short extraction to clear a chapter. Earn separate medals for clearing, rescuing two couriers, and clearing without hull damage. Your best replay returns as a pale, non-colliding ghost. Daily records are separate from story progression. Escape or Pause stops a flight; switching windows pauses it automatically. These are local records, not verified leaderboards or on-chain rewards.</p><p className="manual-footnote">BEST GHOSTS & MEDALS SAVED ON THIS DEVICE</p></aside>}
    </>}
    {screen==="map"&&<SignalMap selected={chapterId} onSelect={setChapterId} unlocked={id=>isUnlocked(profile,id as ChapterId)} medals={profile.medals} rig={rig} onLaunch={launch} cleared={profile.medals.filter(m=>m&1).length} medalTotal={medalCount(profile)}/>}

    {screen==="run"&&flight&&<ExpeditionArena guided={flight.guided} onTutorialComplete={finishTutorial} onTutorialSkip={skipTutorial} trail={flight.trail??trail} restorationStage={flight.stage??0} jobLabel={flight.job?JOBS_LABEL(flight.job.kind):undefined} reservationExpires={flight.pit?.attempt.expires} pilotName={identity?.username} ghostLabel={flight.commission?"COMMISSION":flight.pit?flight.pit.target.holderName:flight.rival?`@${flight.rival.pilot.username}`:undefined} config={flight.config} sound={sound} ghost={flight.ghost} onFinish={finish} onExit={()=>setScreen(flight.pit?"pit":flight.job||flight.commission?"workshop":"lobby")} onSound={()=>setSound(s=>!s)}/>}

    {screen==="result"&&result&&report&&flight&&<section className={`result-layout campaign-result ${result.cleared?"result-win":""}`}><div className="result-art"><span className="result-stamp">{flight.pit?"CROWN / LOCAL RESULT":result.cleared?"SIGNAL / BROKEN":result.health===0?"FLIGHT / LOST":"SIGNAL / STILL ACTIVE"}</span><Pilot rival={!result.cleared&&!flight.rival} avatar={flight.rival&&!result.cleared?flight.rival.pilot.avatar:identity?.avatar}/><p>{result.cleared?"“YOUR GHOST. YOUR RULES.”":"“YOU GOT OUT ONCE. YOU’LL FIND THE LINE.”"}</p><div className="story-reveal"><small>{result.cleared?"TRANSMISSION RECOVERED":"CHANNEL STILL OPEN"}</small><p>{result.cleared?playedChapter.ending:result.rescues>0?`${result.rescues} courier${result.rescues===1?" is":"s are"} safe. ${playedChapter.transmission}`:playedChapter.transmission}</p></div></div><div className="result-detail"><UnlockRewards features={unlocks}/><p className="eyebrow">{newBest?"✳ NEW BEST / GHOST READY":`${playedChapter.name} / ${result.rig.toUpperCase()}`}</p><h1>{flight.pit?(result.score>flight.pit.target.score?<>GHOST.<br/><em>OUTSCORED.</em></>:<>CROWN.<br/><em>STILL HELD.</em></>):result.cleared?<>GHOST.<br/><em>RECLAIMED.</em></>:<>FIND A<br/><em>NEW LINE.</em></>}</h1><div className="final-score">{number(result.score)}<small>POINTS</small></div><p className="score-gap">{flight.job?"Your cargo depends on the job objective. The receipt below confirms the reward.":flight.commission?"Practice against HOUND’s acquired ghost. No entry cost or reward.":flight.pit?`You finished ${Math.abs(result.score-flight.pit.target.score).toLocaleString()} points ${result.score>flight.pit.target.score?"ahead":result.score===flight.pit.target.score?"apart":"behind"} against ${flight.pit.target.holderName}. The receipt below confirms the credit result.`:flight.rival?`${result.score>flight.rival.score?"GHOST BEATEN":result.score===flight.rival.score?"DEAD HEAT":"GHOST STILL AHEAD"} / @${flight.rival.pilot.username} · ${Math.abs(result.score-flight.rival.score).toLocaleString()} points ${result.score>flight.rival.score?"ahead":result.score===flight.rival.score?"apart":"behind"}. Post your flight to send back a rematch.`:result.cleared?(flight.mode==="daily"?"Today’s signal is down. Your best ghost is ready for a rematch.":result.chapter<CHAPTERS.length-1?`${CHAPTERS[result.chapter+1].name} unlocked. The signal goes deeper.`:"Ghost Signal complete. Chase the remaining medals or take on the daily signal."):result.health===0?"Try pulsing before a cluster reaches you. Rescue pods repair your hull.":"The boss held the signal. Line up beneath it and collect cells to strengthen your gun."}</p><dl className="result-stats"><div><dt>RESCUES</dt><dd>{result.rescues}/3</dd></div><div><dt>MAX CHAIN</dt><dd>×{result.maxCombo}</dd></div><div><dt>SURGES</dt><dd>{result.surges}</dd></div></dl>{flight.mode==="story"&&!flight.rival&&!flight.pit&&!flight.job&&!flight.commission&&<div className="medal-results" aria-label="Chapter medals">{medalNames.map((name,i)=><p key={name} className={profile.medals[result.chapter]&(1<<i)?"earned":""}><span>{profile.medals[result.chapter]&(1<<i)?"◆":"◇"}</span>{name}{Boolean(earned&(1<<i))&&<b>NEW</b>}</p>)}</div>}<button className="primary-button" onClick={launch}>{flight.job||flight.commission?"BACK TO THE WORKSHOP":flight.pit?"CHOOSE YOUR NEXT CROWN":flight.rival?`REMATCH @${flight.rival.pilot.username}`:"RACE MY BEST GHOST"} <span>↻</span></button>{!flight.rival&&!flight.pit&&!flight.job&&!flight.commission&&result.cleared&&flight.mode==="story"&&result.chapter<CHAPTERS.length-1&&<button className="next-chapter" onClick={()=>{setChapterId((result.chapter+1) as ChapterId);setScreen("lobby");}}>NEXT / {CHAPTERS[result.chapter+1].name} →</button>}<div className="result-actions"><button className="text-button" onClick={()=>setScreen("lobby")}>← HANGAR / CHANGE RIG</button><button className="text-button" onClick={download}>SAVE REPLAY ↓</button></div>{flight.pit&&<PitSettlement key={flight.pit.attempt.id} id={flight.pit.attempt.id} replay={report.replay} onPit={()=>setScreen("pit")}/>}{flight.job&&<JobReceipt ticket={flight.job.id} replay={report.replay} onDone={()=>{}}/>}{!flight.job&&!flight.commission&&<ShareFlight autoPost postKey={report.hash||undefined} key={report.hash} replay={report.replay} mode={flight.mode} day={flight.dailyKey} identity={identity} onProfile={()=>setScreen("profile")}/>}<button className="text-button" onClick={()=>setScreen("board")}>VIEW LEADERBOARD →</button>{flight.rival&&<p className="replay-note">Rival challenges save a best flight; campaign medals and unlocks come from story flights.</p>}<p className="replay-note">LOCAL RULES V{result.rulesVersion} {report.hash?` / ${report.hash.slice(0,12).toUpperCase()}`:""}</p></div></section>}
  <ProcessFeedback/>
    {showWalletWelcome&&<WalletWelcome onConnect={connectFromWelcome} onPlay={walletWelcome.dismiss}/>}
    {welcome&&walletWelcome.checked&&!showWalletWelcome&&!gate&&screen==='lobby'&&<WelcomeBriefing onStart={startTutorial} onSkip={()=>{setWelcome(false);setJourney(j=>({...j,welcomed:true,tutorial:j.tutorial==='complete'?'complete':'skipped'}));}}/>}
    {gate&&<UnlockGate feature={gate} onClose={()=>setGate(null)} onFlight={nextMission}/>}
    {celebrate&&<UnlockCelebration key={pendingUnlocks.map(f=>f.id).join()} features={pendingUnlocks.map(f=>f.id)} onGo={goUnlock} onClose={()=>setJourney(j=>markAnnounced(j,pendingUnlocks))}/>}
    {activeTour&&<Walkthrough key={activeTour.id} tour={activeTour} onDone={()=>closeTour(activeTour.id)} onTipsOff={()=>tipsOff(activeTour.id)}/>}
  </main>;
}
