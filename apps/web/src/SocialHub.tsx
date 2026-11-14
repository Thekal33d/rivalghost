import {useEffect,useState,type ReactNode} from 'react';
import {CHAPTERS,RIGS,PILOT_PALETTES,PILOT_HELMETS,PILOT_BADGES,DEFAULT_AVATAR,type SocialProfile,type ChapterId,type Rig} from '@rivalghost/game-data';
import type {ExpeditionReplay} from '@rivalghost/sim';
import {Pilot} from './Pilot';
import {ResponsiveDetails} from './ResponsiveDetails';
import {ArcadeButton,Icon} from './Brand';
import {callsign,medalCount,flightKey,type FlightProfile} from './flight-profile';
import {socialRequest,saveIdentity,ensurePilotSession,publishOnce,autoPostEnabled,setAutoPost,ghostLink,type Board,type SharedGhost} from './social-client';

export function PilotStudio({identity,profile,onSave,account}:{identity:SocialProfile|null;profile:FlightProfile;onSave:(p:SocialProfile)=>void;account?:ReactNode}){
  const [name,setName]=useState(identity?.username??''),[avatar,setAvatar]=useState(identity?.avatar??{...DEFAULT_AVATAR});
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[autoPost,setAutoPostState]=useState(autoPostEnabled);
  async function save(){setBusy(true);setNotice('');setError('');try{const pilot=await saveIdentity(name,avatar);onSave(pilot);setName(pilot.username);setNotice('Pilot saved. Your name and look now appear on your shared scores.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const HELMET_ICONS={crest:'bolt',antenna:'map',halo:'target'} as const,BADGE_ICONS={bolt:'bolt',star:'star',wings:'wings'} as const;
  return <section className="pilot-studio" aria-label="Customize your pilot">
    <div className="pilot-pass-wrap"><div className="pilot-pass"><span className="pilot-pass-shine" aria-hidden="true"/><div className="pilot-pass-top"><span>RIVALGHOST / PILOT LICENSE</span><Icon name="bolt" size={22}/></div><div className="license-portrait"><Pilot avatar={avatar}/></div><span className="license-rank">{callsign(profile)}</span><h1>{name||'YOUR NAME'}</h1><div className="license-stats"><span><Icon name="medal" size={20}/><b>{medalCount(profile)}</b>MEDALS</span><span><Icon name="map" size={20}/><b>{profile.medals.filter(m=>m&1).length}</b>/ 10 CHAPTERS</span></div><p>One pilot. A hundred rivalries.</p></div></div>
    <ResponsiveDetails title="Your callsign & look" label="CUSTOMIZE MY PILOT"><form className="pilot-workshop" onSubmit={e=>{e.preventDefault();void save();}}>
      <div className="pilot-col">
        <p className="deck-eyebrow pilot-eyebrow"><Icon name="target" size={18}/>MAKE YOURSELF RECOGNIZABLE.</p><h1>WHO’S ON<br/><em>THEIR SIX?</em></h1>
        <div className="pilot-field"><label className="username-label" htmlFor="pilot-username">CALLSIGN</label><div className="username-input"><span>@</span><input id="pilot-username" value={name} onChange={e=>{setName(e.target.value);setNotice('');}} placeholder="Your callsign" minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" required autoComplete="off" autoCapitalize="off" spellCheck={false} aria-describedby="username-help"/></div><p id="username-help" className="studio-help">3–16 letters, numbers or underscores. Unique on this server.</p></div>
        <fieldset><legend>01 / ARMOR COLOR</legend><div className="palette-options">{PILOT_PALETTES.map(p=><button type="button" key={p.id} aria-pressed={avatar.palette===p.id} onClick={()=>{setAvatar(a=>({...a,palette:p.id}));setNotice('');}}><i style={{background:`radial-gradient(circle at 35% 30%, #fff8, ${p.armor} 55%, ${p.shade})`}}/>{p.name}</button>)}</div></fieldset>
        {error&&<p className="social-error" role="alert">{error}</p>}{notice&&<p className="social-success" role="status">{notice}</p>}
        <ArcadeButton size="md" disabled={busy}><Icon name="check" size={24}/>{busy?'SAVING PILOT…':'SAVE MY PILOT'}</ArcadeButton>
      </div>
      <div className="pilot-col">
        <fieldset><legend>02 / HELMET</legend><div className="style-options">{PILOT_HELMETS.map(h=><button type="button" key={h} aria-pressed={avatar.helmet===h} onClick={()=>{setAvatar(a=>({...a,helmet:h}));setNotice('');}}><Icon name={HELMET_ICONS[h as keyof typeof HELMET_ICONS]??'star'} size={26}/>{h.toUpperCase()}</button>)}</div></fieldset>
        <fieldset><legend>03 / FLIGHT INSIGNIA</legend><div className="style-options">{PILOT_BADGES.map(b=><button type="button" key={b} aria-pressed={avatar.badge===b} onClick={()=>{setAvatar(a=>({...a,badge:b}));setNotice('');}}><Icon name={BADGE_ICONS[b as keyof typeof BADGE_ICONS]??'star'} size={26}/>{b.toUpperCase()}</button>)}</div></fieldset>
        <label className="autopost-toggle"><input type="checkbox" checked={autoPost} onChange={e=>{setAutoPost(e.target.checked);setAutoPostState(e.target.checked);}}/><span><b>AUTO-POST MY SCORES</b>Finished story, daily and rival flights go to the Rivals board.</span></label>
        <p className="studio-help">All styles are free and cosmetic. Your username and avatar become public when saved here{autoPost?', and your finished flights post to the board automatically':'; scores are posted only when you choose'}. Keep this browser’s site data to retain access.</p>
      </div>
    </form></ResponsiveDetails>
    {account&&<div className="pilot-account-panel">{account}</div>}
  </section>;
}
export function ShareFlight({replay,mode,day,identity,onProfile,autoPost=false,postKey}:{replay:ExpeditionReplay;mode:'story'|'daily';day?:string;identity:SocialProfile|null;onProfile:()=>void;autoPost?:boolean;postKey?:string}){
  const [shared,setShared]=useState<SharedGhost|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
  const auto=autoPost&&autoPostEnabled();
  const key=postKey||`${mode}:${day??''}:${replay.chapter}:${replay.rig}:${replay.seed}:${JSON.stringify(replay).length}`;
  async function post(){setBusy(true);setError('');try{setShared(await publishOnce(key,replay,mode,day));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  useEffect(()=>{if(auto&&identity&&!shared)void post();// Post once when the result opens or a username arrives.
  },[auto,identity?.id]);
  async function copy(){try{await navigator.clipboard.writeText(ghostLink(shared!.id));setCopied(true);}catch{setError('Copy the challenge address below to share it.');}}
  return <div className="share-flight"><span className="eyebrow">{shared?'POSTED TO RIVALS':busy?'POSTING TO RIVALS…':auto?'YOUR NEXT RIVAL STARTS HERE':'GIVE SOMEONE A SCORE TO CHASE.'}</span><h3>YOUR GHOST. THEIR PROBLEM.</h3><p>{auto?'Finished flights post to the leaderboard automatically, and each one comes with a link that challenges a friend on the same chapter, rig and seed.':'Post this flight to the board and send its ghost to a rival. They fly the same chapter, rig and seed.'}</p>
    {!identity?<button className="social-primary" onClick={onProfile}>{auto?'CHOOSE A USERNAME TO AUTO-POST →':'CHOOSE A USERNAME TO POST →'}</button>:!shared?(auto&&busy?<p className="social-success" role="status">Posting your score… the server is re-checking your replay.</p>:<button className="social-primary" disabled={busy} onClick={()=>void post()}>{busy?'CHECKING YOUR REPLAY…':error&&auto?'RETRY POSTING ↻':'POST SCORE + CREATE CHALLENGE ↗'}</button>):<><p className="social-success" role="status">Posted as @{shared.pilot.username} · {shared.score.toLocaleString()} points · replay checked</p><label className="share-link-label">CHALLENGE LINK<input readOnly value={ghostLink(shared.id)} onFocus={e=>e.target.select()}/></label><button className="social-primary" onClick={()=>void copy()}>{copied?'LINK COPIED ✓':'COPY “BEAT MY GHOST” LINK ↗'}</button>{['localhost','127.0.0.1'].includes(location.hostname)&&<small className="local-link-note">This is a local preview address. Friends can open these links once the same service is hosted publicly.</small>}</>}
    {error&&<p className="social-error" role="alert">{error}</p>}<small>Public score + replay. Off-chain; no rewards or gas fees. Shared flights expire after 30 days; daily links expire at UTC midnight.{autoPost&&' Turn auto-posting off on the Pilot screen.'}</small>
  </div>;
}
export function Leaderboard({identity,profile,initialChapter,day,onRace,onProfile,onPlay}:{identity:SocialProfile|null;profile:FlightProfile;initialChapter:ChapterId;day:string;onRace:(g:SharedGhost)=>void;onProfile:()=>void;onPlay:()=>void}){
  const [mode,setMode]=useState<'story'|'daily'>('story'),[chapter,setChapter]=useState<ChapterId>(initialChapter),[rig,setRig]=useState<Rig>('fan'),[scope,setScope]=useState('all'),[refresh,setRefresh]=useState(0);
  const [board,setBoard]=useState<Board|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const selected=mode==='daily'?2:chapter,best=(mode==='daily'?(profile.daily.key===day?profile.daily.bests:{}):profile.bests)[flightKey(selected,rig,3)];
  useEffect(()=>{let active=true;setLoading(true);setError('');void socialRequest(`social/board?mode=${mode}&chapter=${selected}&rig=${rig}&scope=${scope}`).then(data=>{if(active)setBoard(data);}).catch(e=>{if(active){setError(e.message);setBoard(null);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[mode,selected,rig,scope,refresh,identity?.id,day]);
  async function race(id:string){setBusy(true);setError('');try{onRace(await socialRequest('social/ghost?id='+id));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function follow(id:string,value:boolean){if(!identity){onProfile();return;}setBusy(true);setError('');try{await ensurePilotSession();await socialRequest('social/rival',{id,follow:value});setRefresh(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const pad=(n:number)=>String(n+1).padStart(2,'0'),step=(d:number)=>setChapter(c=>((c+d+CHAPTERS.length)%CHAPTERS.length) as ChapterId);
  const rows=board?.rows??[],podium=[rows[1],rows[0],rows[2]];
  const local=['localhost','127.0.0.1'].includes(location.hostname);
  return <section className="leaderboard-page rivals" aria-label="Leaderboard">
    <aside className="rivals-side">
      <p className="deck-eyebrow"><Icon name="target" size={18}/>THE NEXT SCORE HAS A FACE.</p>
      <h1>FIND YOUR<br/><em>NEXT RIVAL.</em></h1>
      <div className="deck-modes" role="group" aria-label="Board mode"><button className="mode-pill" aria-pressed={mode==='story'} onClick={()=>setMode('story')}><Icon name="map" size={18}/><span>STORY</span></button><button className="mode-pill" aria-pressed={mode==='daily'} onClick={()=>setMode('daily')}><Icon name="clock" size={18}/><span>DAILY</span><small>{day.slice(5)}</small></button></div>
      <div className="rivals-filters panel">
        <div className="filter-group"><span className="filter-label">CHAPTER</span><div className="stepper"><button className="round-button" aria-label="Previous chapter" disabled={mode==='daily'} onClick={()=>step(-1)}><Icon name="chevronLeft" size={18}/></button><output aria-live="polite"><b>{pad(selected)}</b> {CHAPTERS[selected].name}</output><button className="round-button" aria-label="Next chapter" disabled={mode==='daily'} onClick={()=>step(1)}><Icon name="chevronRight" size={18}/></button></div></div>
        <div className="filter-group" role="group" aria-label="Rig"><span className="filter-label">RIG</span><div className="segmented">{RIGS.map((r,i)=><button key={r.id} aria-pressed={rig===r.id} onClick={()=>setRig(r.id)}><Icon name={(['spread','bolt','shield'] as const)[i]} size={15}/>{r.name}</button>)}</div></div>
        <div className="filter-row"><label className="filter-group"><span className="filter-label">SHOW</span><select value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Everyone</option><option value="rivals">My rivals + me</option></select></label><button className="round-button" aria-label="Refresh leaderboard" onClick={()=>setRefresh(n=>n+1)}><Icon name="refresh" size={18}/></button></div>
      </div>
      <p className="trust-badges"><span><Icon name="check" size={14}/>REPLAY-CHECKED</span><span><Icon name="shield" size={14}/>OFF-CHAIN</span></p>
      <p className="board-footnote">Scores are re-simulated by this server. They are not NEAR settlements or proof of human play.{local?' You are viewing the local development server; a public community needs hosting.':''}</p>
    </aside>
    <div className="rivals-main">
      <div className="board-caption"><span>{board?board.total:0} PILOT{board?.total===1?'':'S'} · TOP 20 · {mode==='daily'?'TODAY / UTC':'LAST 30 DAYS'}</span><b>{board?.yourRank?`YOUR RANK / #${board.yourRank}`:'YOUR NEXT FLIGHT COULD START THIS.'}</b></div>
      {error&&<p className="social-error" role="alert">{error}</p>}
      {scope==='rivals'&&board&&board.rivals?.length>0&&<div className="rival-roster"><span>YOUR RIVALS / ALL CHAPTERS</span><div>{board.rivals.map(p=><button key={p.id} disabled={busy} onClick={()=>void follow(p.id,false)} aria-label={`Remove ${p.username} from rivals`}>@{p.username} <Icon name="close" size={14}/></button>)}</div></div>}
      {loading?<p className="board-loading" role="status">Tuning into the leaderboard…</p>:board&&rows.length===0&&<div className="board-hero"><h2>{scope==='rivals'?'BUILD YOUR RIVAL LIST.':'THE FIRST LINE IS YOURS.'}</h2>{scope==='rivals'&&<p>Add pilots from Everyone to follow their scores here.</p>}<div className="board-hero-actions"><ArcadeButton size="sm" onClick={onPlay}><Icon name="play" size={18}/>FLY {CHAPTERS[selected].name}</ArcadeButton>{best&&<ArcadeButton tone="steel" size="sm" onClick={()=>document.getElementById('share-flight')?.scrollIntoView({behavior:'smooth'})}><Icon name="trophy" size={18}/>POST BEST FLIGHT</ArcadeButton>}</div></div>}
      {!loading&&<ol className="podium" aria-label="Top three">{podium.map((row,i)=>{const place=[2,1,3][i];return <li key={place} className={`podium-slot podium-${place}`}>
        {place===1&&<Icon name="crown" size={30} className="podium-crown"/>}
        <span className={`podium-avatar${row?'':' is-open'}`}>{row?<Pilot avatar={row.pilot.avatar}/>:<Icon name="ghost" size={34}/>}</span>
        <span className="podium-name">{row?`@${row.pilot.username}`:'OPEN SLOT'}</span>
        {row&&<span className="podium-score">{row.score.toLocaleString()}</span>}
        <span className="podium-block" aria-label={`Place ${place}`}>{place}</span>
      </li>;})}</ol>}
      {!loading&&rows.length>0&&<ol className="board-rows">{rows.map(row=><li key={row.pilot.id} className={row.you?'board-you':''}><span className="board-rank">{String(row.rank).padStart(2,'0')}</span><div className="board-avatar"><Pilot avatar={row.pilot.avatar}/></div><div className="board-pilot"><b>@{row.pilot.username}</b><small>{row.you?'YOU':row.following?'ON YOUR RIVAL LIST':'PILOT'} · REPLAY CHECKED</small></div><strong className="board-score">{row.score.toLocaleString()}<small>POINTS</small></strong><div className="board-actions"><button disabled={busy} onClick={()=>void race(row.id)}>{row.you?'RACE YOUR GHOST':'CHASE GHOST'}</button>{!row.you&&<button className="follow-button" aria-pressed={row.following} disabled={busy} onClick={()=>void follow(row.pilot.id,!row.following)}>{row.following?'RIVAL ADDED':'+ ADD RIVAL'}</button>}</div></li>)}</ol>}
    </div>
    {best&&<div id="share-flight" className="rivals-share"><ShareFlight key={`${mode}-${selected}-${rig}-${best.score}`} replay={best.replay} mode={mode} day={mode==='daily'?day:undefined} identity={identity} onProfile={onProfile}/></div>}
  </section>;
}
export function GhostInvitation({run,onRace,onClose}:{run:SharedGhost;onRace:()=>void;onClose:()=>void}){
  return <section className="ghost-invitation" aria-label="Ghost challenge"><div className="invite-avatar"><Pilot avatar={run.pilot.avatar}/></div><div><p className="eyebrow">A FLIGHT TO ANSWER.</p><h2>@{run.pilot.username} left you a ghost.</h2><p>{CHAPTERS[run.replay.chapter].name} · {run.rig.toUpperCase()} · SAME SEED</p><strong>{run.score.toLocaleString()} <small>POINTS TO BEAT</small></strong><p>Race their recorded flight. This is an asynchronous challenge, not live multiplayer.</p><button className="social-primary" onClick={onRace}>TAKE THE CHALLENGE ↗</button><button className="text-button" onClick={onClose}>MAYBE LATER</button></div></section>;
}
