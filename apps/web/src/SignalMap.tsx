import { CAMPAIGN_ACTS, CHAPTERS, DISTRICTS, type ChapterId, type Rig } from "@rivalghost/game-data";
import { ArcadeButton, Icon, Keycap, MedalDiamonds, Ship } from "./Brand";
import { RIG_COLORS, useEnterToLaunch } from "./FlightDeck";

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
      <div className="map-acts">
        {CAMPAIGN_ACTS.map((act, i) => <div className="map-act" key={act.name}>
          <h2><small>ACT {i + 1}</small>{act.name}</h2>
          <ol className="map-nodes">
            {CHAPTERS.slice(act.start, act.end).map(c => {
              const open = unlocked(c.id), current = selected === c.id;
              return <li key={c.id} className={`map-node${current ? " is-current" : ""}${open ? "" : " is-locked"}${(medals[c.id] ?? 0) & 1 ? " is-cleared" : ""}`}>
                <button disabled={!open} aria-pressed={current} aria-label={`Chapter ${pad(c.id)}, ${c.name}${open ? "" : ", locked"}${current ? ", selected" : ""}`} onClick={() => onSelect(c.id)}>
                  {open ? pad(c.id) : <Icon name="lock" size={26}/>}
                </button>
                <b>{c.name}</b>
                {current && <span className="map-you"><Icon name="person" size={12}/>YOU</span>}
                <MedalDiamonds mask={medals[c.id] ?? 0}/>
              </li>;
            })}
          </ol>
        </div>)}
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
      <div className="map-launch">
        <span className="map-launch-meta"><Icon name="clock" size={18}/>60S</span>
        <span className="map-launch-meta"><Ship color={RIG_COLORS[rig]} className="map-launch-ship"/>{rig.toUpperCase()}</span>
        <ArcadeButton onClick={onLaunch} disabled={!unlocked(selected)}><Icon name="play" size={26}/>LAUNCH<Keycap>ENTER</Keycap></ArcadeButton>
      </div>
    </aside>
  </div>;
}
