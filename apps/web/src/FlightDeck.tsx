import type {Feature} from './player-journey';
import { useEffect } from "react";
import { CHAPTERS, RIGS, type Rig } from "@rivalghost/game-data";
import { ArcadeButton, EnemyDart, Hound, Icon, Keycap, MedalDiamonds, Ship } from "./Brand";

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
const QUOTES = ["“THAT SIGNAL KNOWS YOU.”", "“STAY OUT OF THE RED.”", "“MAKE IT REGRET IT.”"];

export function FlightDeck({ dailyUnlocked=true,rigUnlocked=()=>true,onLocked,mode, onMode, chapter, medals, rig, onRig, best, ghostReady, locked, grazes, onLaunch, onMap, onManual, manualOpen, dailyKey }: {
  dailyUnlocked?:boolean;rigUnlocked?:(rig:Rig)=>boolean;onLocked?:(feature:Feature)=>void;
  mode: "story" | "daily"; onMode: (m: "story" | "daily") => void; chapter: Chapter; medals: number;
  rig: Rig; onRig: (r: Rig) => void; best?: number; ghostReady: boolean; locked: boolean; grazes: number;
  onLaunch: () => void; onMap: () => void; onManual: () => void; manualOpen: boolean; dailyKey: string;
}) {
  useEnterToLaunch(onLaunch);
  const daily = mode === "daily";
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
        <div className="deck-ghost"><Ship ghost/><span>YOUR GHOST</span></div>
        <Ship className="deck-ship" color={RIG_COLORS[rig]}/>
        <div className="deck-shots"><i/><i/><i/></div>
        <i className="deck-orb deck-orb-1"/><i className="deck-orb deck-orb-2"/>
        <EnemyDart className="deck-dart"/>
      </div>

      <div className="deck-rival">
        <div className="deck-rival-head"><span><Icon name="crown" size={24}/><b>HOUND</b></span><small>INCOMING</small></div>
        <div className="deck-rival-bar" aria-hidden="true"><i/></div>
        <div className="deck-rival-ring" aria-hidden="true"/><div className="deck-rival-ring deck-rival-ring-late" aria-hidden="true"/>
        <div className="deck-rival-glow" aria-hidden="true"/>
        <Hound className="deck-hound"/>
        <p className="deck-quote">{QUOTES[Math.min(chapter.id, 2)]}</p>
      </div>

      <div className="deck-chapter">
        <div className="deck-chapter-card">
          <span className="deck-chapter-num">{String(chapter.id + 1).padStart(2, "0")}</span>
          <span className="deck-chapter-text"><small>{daily ? "DAILY FREQUENCY" : chapter.district.toUpperCase()}</small><b>{chapter.name}</b>{!daily && <MedalDiamonds mask={medals}/>}</span>
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
            <Icon name={STAT_ICONS[i]} size={15}/><span className="sr-only">{STAT_LABELS[i]} {v} of 3</span>
            {[0, 1, 2].map(n => <i key={n} className={n < v ? "on" : ""}/>)}
          </span>)}</span>
        </span>
      </button>)}
      <div className="deck-best"><span><Icon name="trophy" size={20}/>BEST · {rig.toUpperCase()}</span><b>{best !== undefined ? best.toLocaleString() : "MAKE YOUR MARK"}</b>{ghostReady && <small>GHOST READY</small>}</div>
      <div className="deck-launch">
        <ArcadeButton size="xl" onClick={onLaunch} disabled={locked}><Icon name="play" size={56}/><span className="launch-text">{locked ? "LOCKED" : "60S · FREE"}<small>{daily ? "FLY TODAY’S SIGNAL" : `FLY CHAPTER ${String(chapter.id + 1).padStart(2, "0")}`}</small></span></ArcadeButton>
      </div>
      <p className="deck-enter"><Keycap>ENTER</Keycap>TO LAUNCH</p>
    </aside>
  </div>;
}
