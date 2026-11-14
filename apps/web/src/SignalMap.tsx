import type {CSSProperties} from "react";
import { CAMPAIGN_ACTS, CHAPTERS, DISTRICTS, type ChapterId, type Rig } from "@rivalghost/game-data";
import { ArcadeButton, Icon, Keycap, MedalDiamonds, Ship, Hound } from "./Brand";
import { RIG_COLORS, useEnterToLaunch } from "./FlightDeck";

const ROUTE=[[11,79],[24,57],[12,32],[42,23],[53,52],[43,79],[73,81],[87,62],[74,42],[88,17]];
const PHONE_ROUTE=ROUTE.map((_,i)=>[i%2?73:27,7+i*9.4]);
const pad = (n: number) => String(n + 1).padStart(2, "0");

export function SignalMap({ selected, onSelect, unlocked, medals, rig, onLaunch, cleared, medalTotal }: {
  selected: ChapterId; onSelect: (id: ChapterId) => void; unlocked: (id: number) => boolean; medals: number[];
  rig: Rig; onLaunch: () => void; cleared: number; medalTotal: number;
}) {
  useEnterToLaunch(onLaunch);
  const chapter = CHAPTERS[selected], district = DISTRICTS[selected], mask = medals[selected] ?? 0;
  const objectives = [
    { icon: "target" as const, text: `Defeat ${chapter.boss}`, tag: "BOSS", done: Boolean(mask & 1) },
    { icon: "person" as const, text: `Bring ${chapter.medalRescues} couriers home`, done: Boolean(mask & 2) },
    { icon: "shield" as const, text: "Clear without hull damage", done: Boolean(mask & 4) },
  ];
  return <div className="signal-map">
    <section className="map-board" aria-label="Story chapters">
      <div className="map-board-head"><h1>FOLLOW THE SIGNAL.</h1><span>{cleared} / {CHAPTERS.length} CLEARED · {medalTotal} / {CHAPTERS.length * 3} MEDALS</span></div>
      <div className="map-route-stage">
        <div className="map-act-labels">{CAMPAIGN_ACTS.map((act,i)=><h2 key={act.name}><small>ACT {i+1}</small>{act.name}</h2>)}</div>
        {[ROUTE,PHONE_ROUTE].map((points,version)=><svg className={`map-connections ${version?'phone-route':'desktop-route'}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" key={version}>{points.slice(0,-1).map(([x,y],i)=><g key={i} className={medals[i]&1?'route-cleared':selected===i?'route-next':''}><line className="route-track" x1={x} y1={y} x2={points[i+1][0]} y2={points[i+1][1]}/><line className="route-signal" x1={x} y1={y} x2={points[i+1][0]} y2={points[i+1][1]}/></g>)}</svg>)}
        <ol className="map-route-nodes">{CHAPTERS.map(c=>{const open=unlocked(c.id),current=selected===c.id,last=c.id===CHAPTERS.length-1;return <li key={c.id} style={{'--x':`${ROUTE[c.id][0]}%`,'--y':`${ROUTE[c.id][1]}%`,'--mx':`${PHONE_ROUTE[c.id][0]}%`,'--my':`${PHONE_ROUTE[c.id][1]}%`} as CSSProperties} className={`map-node${current?' is-current':''}${open?'':' is-locked'}${medals[c.id]&1?' is-cleared':''}${last?' is-finale':''}`}>
          <button disabled={!open} aria-pressed={current} aria-label={`Chapter ${pad(c.id)}, ${c.name}${open?'':', locked'}${current?', selected':''}`} onClick={()=>onSelect(c.id)}>{last?<Icon name="crown" size={24}/>:!open?<Icon name="lock" size={14}/>:null}<span>{pad(c.id)}</span></button>
          <b>{c.name}</b>{current&&<span className="map-you">YOU</span>}<MedalDiamonds mask={medals[c.id]??0}/>{last&&<Hound className="map-final-rival"/>}
        </li>;})}</ol>
      </div>
    </section>

    <aside className="map-brief" aria-label={`${chapter.name} mission brief`}>
      <div className="map-brief-head">
        <div><small>MISSION BRIEF · {chapter.district.toUpperCase()}</small><h2>{chapter.name}</h2></div>
        <span className="map-brief-num">{pad(chapter.id)}</span>
      </div>
      <p className="map-brief-copy">{chapter.briefing}</p>
      <ul className="map-objectives">
        {objectives.map(o => <li key={o.text} className={o.done ? "done" : ""}><Icon name={o.icon} size={20}/><span>{o.text}</span>{o.tag && <em>{o.tag}</em>}{o.done && <Icon name="check" size={16} className="objective-check"/>}</li>)}
      </ul>
      <div className="map-twist">
        <small><Icon name="bolt" size={16}/>CHAPTER TWIST</small>
        <b>{district.name}</b>
        <p>{district.twist}</p>
        <ol>{district.route.map((r, i) => <li key={r}><span>{i + 1}</span>{r}</li>)}</ol>
      </div>
      <div className="map-medal-summary"><MedalDiamonds mask={mask}/><span>{[1,2,4].filter(bit=>mask&bit).length} / 3 MEDALS EARNED</span></div>
      <div className="map-launch">
        <span className="map-launch-meta"><Icon name="clock" size={18}/>60S</span>
        <span className="map-launch-meta"><Ship color={RIG_COLORS[rig]} className="map-launch-ship"/>{rig.toUpperCase()}</span>
        <ArcadeButton onClick={onLaunch} disabled={!unlocked(selected)}><Icon name="play" size={26}/>LAUNCH<Keycap>ENTER</Keycap></ArcadeButton>
      </div>
    </aside>
  </div>;
}
