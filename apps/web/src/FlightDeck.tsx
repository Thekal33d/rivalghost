import type {Feature} from './player-journey';
import { useEffect, useState } from "react";
import { CHAPTERS, RIGS, type Rig } from "@rivalghost/game-data";
import { ArcadeButton, EnemyDart, Hound, Icon, Keycap, Ship } from "./Brand";

type Chapter = typeof CHAPTERS[number];
export const RIG_COLORS: Record<Rig, string> = { needle: "#F3ECDC", fan: "#7DF5C0", guard: "#FFD166" };
/** Relative feel for each rig, read from RIGS cadence/damage and Guard's shield. */
const RIG_STATS: Record<Rig, [number, number, number]> = { needle: [3, 1, 1], fan: [1, 3, 1], guard: [2, 1, 3] };
const STAT_ICONS = ["bolt", "spread", "shield"] as const;
const STAT_LABELS = ["Power", "Spread", "Defense"];
/** Enter launches when focus is not on another control. */
export function useEnterToLaunch(onLaunch: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat || document.querySelector("dialog[open]")) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button,a,input,select,textarea,summary,[contenteditable]")) return;
      e.preventDefault(); onLaunch();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onLaunch]);
}
const MEDALS = ["CLEAR", "RESCUE 2", "NO HULL DAMAGE"];
/** HOUND speaks its own chapter transmission when it has one. */
function houndLine(chapter: Chapter) {
  const line = chapter.transmission as string;
  return line.startsWith("HOUND:") ? line.slice(6).trim() : "That signal knows you.";
}
/** Time left until the UTC-midnight daily reset, refreshed each second while shown. */
function useDailyReset(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!active) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [active]);
  const d = new Date(now), next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const left = Math.max(0, next - now), sec = Math.floor(left / 1000);
  const text = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(n => String(n).padStart(2, "0")).join(":");
  return { text, fraction: left / 86_400_000 };
}

export function FlightDeck({ dailyUnlocked=true,rigUnlocked=()=>true,onLocked,mode, onMode, chapter, medals, rig, onRig, best, ghostReady, locked, grazes, onLaunch, onMap, onManual, manualOpen, dailyKey, cleared }: {
  dailyUnlocked?:boolean;rigUnlocked?:(rig:Rig)=>boolean;onLocked?:(feature:Feature)=>void;
  mode: "story" | "daily"; onMode: (m: "story" | "daily") => void; chapter: Chapter; medals: number;
  rig: Rig; onRig: (r: Rig) => void; best?: number; ghostReady: boolean; locked: boolean; grazes: number;
  onLaunch: () => void; onMap: () => void; onManual: () => void; manualOpen: boolean; dailyKey: string; cleared: number;
}) {
  useEnterToLaunch(onLaunch);
  const daily = mode === "daily";
  const reset = useDailyReset(daily);
  const held = Math.round((CHAPTERS.length - cleared) / CHAPTERS.length * 100);
  const meter = daily ? { label: "NEW SIGNAL IN", value: reset.text, pct: reset.fraction * 100 } : { label: "SIGNAL HELD", value: `${held}%`, pct: held };
  return <div className="flight-deck">
    <section className="deck-stage" aria-label={`${chapter.name} mission`}>
      <div className="deck-lane deck-lane-top" aria-hidden="true"/><div className="deck-lane deck-lane-bottom" aria-hidden="true"/>
      <div className="deck-streaks" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <i key={i}/>)}</div>

      <div className="deck-headline">
        <p className="deck-eyebrow"><Icon name="ghost" size={18}/>{daily ? "ONE SIGNAL. A NEW LINE EVERY DAY." : "YOUR BEST FLIGHT. THEIR DEADLIEST WEAPON."}</p>
        <h1>STEAL YOUR<br/><em>GHOST</em> BACK.</h1>
        <div className="deck-modes" role="group" aria-label="Game mode">
          <button className="mode-pill" aria-pressed={!daily} onClick={() => onMode("story")}><Icon name="map" size={18}/><span>STORY</span><small>{CHAPTERS.length} CHAPTERS</small></button>
          <button className="mode-pill" aria-pressed={daily} aria-label={dailyUnlocked?undefined:"Daily signal locked: clear 2 story chapters"} onClick={() => dailyUnlocked?onMode("daily"):onLocked?.("daily")}><Icon name="clock" size={18}/><span>DAILY</span><small>{dailyUnlocked?`EXPERT · ${dailyKey}`:"CLEAR 2 CHAPTERS"}</small></button>
        </div>
      </div>

      <div className="deck-scene" aria-hidden="true">
        <div className="deck-ghost"><Ship ghost/><span>{best !== undefined ? <>YOUR GHOST · <b>{best.toLocaleString()}</b></> : "NO GHOST YET"}</span></div>
        <Ship className="deck-ship" color={RIG_COLORS[rig]}/>
        <div className="deck-shots"><i/><i/><i/></div>
        <i className="deck-orb deck-orb-1"/><i className="deck-orb deck-orb-2"/>
        <EnemyDart className="deck-dart"/>
      </div>

      <div className="deck-rival">
        <div className="deck-rival-head"><span><Icon name="crown" size={24}/><b>HOUND</b></span><small>{daily ? "DAILY EXPERT" : "INCOMING"}</small></div>
        <div className="deck-rival-meter"><span>{meter.label}</span><b>{meter.value}</b></div>
        <div className="deck-rival-bar" role="progressbar" aria-label={daily ? "Time until the next daily signal" : `HOUND holds ${held}% of the signal`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(meter.pct)}><i style={{ width: `${meter.pct}%` }}/></div>
        <div className="deck-rival-ring" aria-hidden="true"/><div className="deck-rival-ring deck-rival-ring-late" aria-hidden="true"/>
        <div className="deck-rival-glow" aria-hidden="true"/>
        <Hound className="deck-hound"/>
        <p className="deck-quote">“{houndLine(chapter)}”</p>
      </div>

      <div className="deck-chapter">
        <div className="deck-mission">
          <div className="deck-chapter-card">
            <span className="deck-chapter-num">{String(chapter.id + 1).padStart(2, "0")}</span>
            <span className="deck-chapter-text"><small>{daily ? `DAILY FREQUENCY · ${dailyKey}` : chapter.district.toUpperCase()}</small><b>{chapter.name}</b></span>
          </div>
          <p className="deck-objective"><Icon name="target" size={16}/>{daily ? "Same seed for every pilot today. One clean line wins." : chapter.objective}</p>
          {!daily && <ul className="deck-medals" aria-label="Chapter medals">{MEDALS.map((m, i) => <li key={m} className={medals & (1 << i) ? "won" : ""}><Icon name="medal" size={12}/>{m}</li>)}</ul>}
        </div>
        {!daily && <ArcadeButton tone="steel" size="sm" onClick={onMap}><Icon name="map" size={20}/>SIGNAL MAP</ArcadeButton>}
      </div>

      <ul className="deck-tactics" aria-label="Flight tactics">
        <li><Icon name="person" size={18}/>RESCUE</li>
        <li><Icon name="bolt" size={18}/>{grazes} GRAZES = SURGE</li>
        <li><Icon name="star" size={18}/>CHAIN ×5</li>
        <li><Keycap>SPACE</Keycap>PULSE</li>
        <li><button className="link-button" aria-expanded={manualOpen} onClick={onManual}>FLIGHT MANUAL</button></li>
      </ul>
    </section>

    <aside className="deck-loadout" aria-label="Choose a ship rig">
      <div className="deck-loadout-head"><h2>PICK YOUR RIG</h2><span>UNLOCK THROUGH PLAY</span></div>
      {RIGS.map(r => <button key={r.id} className="rig-card" aria-pressed={rig === r.id} aria-label={rigUnlocked(r.id)?undefined:`${r.name} locked: clear ${r.id==='needle'?1:2} story chapters`} onClick={() => rigUnlocked(r.id)?onRig(r.id):onLocked?.(r.id as Feature)}>
        {rig === r.id && <span className="rig-equipped"><Icon name="check" size={12}/>EQUIPPED</span>}
        <span className="rig-portrait"><Ship color={RIG_COLORS[r.id]}/></span>
        <span className="rig-info">
          <b>{r.name}</b><small>{rigUnlocked(r.id)?r.title.toUpperCase():`LOCKED · CLEAR ${r.id==='needle'?1:2} CHAPTER${r.id==='needle'?'':'S'}`}</small>
          <span className="rig-stats">{RIG_STATS[r.id].map((v, i) => <span key={i} className="rig-stat" title={STAT_LABELS[i]}>
            <Icon name={STAT_ICONS[i]} size={14}/><span className="rig-stat-label" aria-hidden="true">{STAT_LABELS[i]}</span><span className="sr-only">{STAT_LABELS[i]} {v} of 3</span>
            {[0, 1, 2].map(n => <i key={n} className={n < v ? "on" : ""}/>)}
          </span>)}</span>
        </span>
      </button>)}
      <div className="deck-best"><span><Icon name="trophy" size={20}/>BEST · {rig.toUpperCase()}</span><b>{best !== undefined ? best.toLocaleString() : "MAKE YOUR MARK"}</b>{ghostReady && <small>GHOST READY</small>}</div>
      <div className="deck-launch">
        <ArcadeButton size="xl" onClick={onLaunch} disabled={locked} aria-label={daily?"Fly today’s signal":`Fly chapter ${String(chapter.id+1).padStart(2,"0")}, 60 seconds, free`}><Icon name="play" size={56}/><span className="launch-text">{locked ? "LOCKED" : "FLY"}<small>{daily ? "TODAY’S SIGNAL" : `CHAPTER ${String(chapter.id + 1).padStart(2, "0")}`} · 60S · FREE</small></span></ArcadeButton>
      </div>
      <p className="deck-enter"><Keycap>ENTER</Keycap>TO LAUNCH</p>
    </aside>
  </div>;
}
