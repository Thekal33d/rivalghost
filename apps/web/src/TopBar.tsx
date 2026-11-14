import type { PilotAvatar } from "@rivalghost/game-data";
import { Icon, LogoMark, Wordmark, type IconName } from "./Brand";
import { Pilot } from "./Pilot";

export type Screen = "lobby" | "map" | "run" | "result" | "profile" | "board" | "pit" | "workshop";

const TABS: { id: Screen; label: string; icon: IconName }[] = [
  { id: "lobby", label: "FLIGHT DECK", icon: "home" },
  { id: "map", label: "SIGNAL MAP", icon: "map" },
  { id: "board", label: "RIVALS", icon: "trophy" },
  { id: "pit", label: "CROWN PIT", icon: "crown" },
  { id: "workshop", label: "WORKSHOP", icon: "wrench" },
];

export function TopBar({ screen, onNav, locked={}, medals, maxMedals, rank, username, avatar, sound, onSound, onHelp }: {
  screen: Screen; onNav: (s: Screen) => void; medals: number; maxMedals: number; rank: string;
  locked?:Partial<Record<Screen,string>>;
  username?: string; avatar?: PilotAvatar; sound: boolean; onSound: () => void; onHelp?: () => void;
}) {
  const go = (s: Screen) => (e: React.MouseEvent) => { e.preventDefault(); onNav(s); };
  return <header className="top-bar">
    <div className="top-bar-left">
      <a className="top-brand" href="#" onClick={go("lobby")} aria-label="RivalGhost flight deck"><LogoMark size={46}/><Wordmark/></a>
      <nav className="top-tabs" aria-label="Game navigation">
        {TABS.map(t => <a key={t.id} href="#" className={`top-tab ${locked[t.id]?"is-locked":""}`} title={locked[t.id]} aria-label={locked[t.id]?`${t.label} locked: ${locked[t.id]}`:undefined} aria-current={screen === t.id || (t.id === "lobby" && screen === "result") ? "page" : undefined} onClick={go(t.id)}>
          <Icon name={locked[t.id]?"lock":t.icon} size={24}/><span>{t.label}</span>
        </a>)}
      </nav>
    </div>
    <div className="top-bar-right">
      <span className="medal-count" aria-label={`${medals} of ${maxMedals} medals`}><span className="medal-count-icon"><Icon name="medal" size={16}/></span><b>{medals}</b><small>/ {maxMedals}</small></span>
      <a href="#" className="pilot-chip" aria-current={screen === "profile" ? "page" : undefined} onClick={go("profile")}>
        <span className="pilot-chip-avatar"><Pilot avatar={avatar}/></span>
        <span className="pilot-chip-text"><b>{username ? `@${username}` : rank}</b><small>CUSTOMIZE</small></span>
      </a>
      {onHelp && <button className="round-button top-help" aria-label="Show tips for this screen" title="Show tips for this screen" onClick={onHelp}><Icon name="help" size={20}/></button>}
      <button className="round-button" aria-pressed={sound} aria-label={sound ? "Sound is on, turn off" : "Sound is off, turn on"} onClick={onSound}><Icon name={sound ? "soundOn" : "soundOff"} size={20}/></button>
    </div>
  </header>;
}
