import {PILOT_PALETTES,DEFAULT_AVATAR,type PilotAvatar} from "@rivalghost/game-data";
/** Original vector character art. Shared silhouettes appear in the arena ships. */
export function Pilot({ rival = false, avatar=DEFAULT_AVATAR }: { rival?: boolean; avatar?:PilotAvatar }) {
  const palette=PILOT_PALETTES.find(p=>p.id===avatar.palette)??PILOT_PALETTES[0];
  const armor = rival ? "#ec6248" : palette.armor;
  const shade = rival ? "#a93c32" : palette.shade;
  return <svg viewBox="0 0 320 340" fill="none" aria-hidden="true" className="pilot-art">
    <g stroke="#18262b" strokeWidth="7" strokeLinejoin="round">
      <path d="M42 310 53 253 99 225H222L271 251 291 310Z" fill={shade}/>
      <path d="M74 251 106 230 160 254 212 230 252 252 230 328H94Z" fill={armor}/>
      <path d="m117 251 43 27 44-27-11 77h-66Z" fill="#18262b"/>
      <path d="M113 282h94l-8 25h-77Z" fill="#f2e7cf"/>
      <path d="m54 254 43 11-9 45H39Zm212 0-43 11 9 45h49Z" fill="#f2e7cf"/>
      <path d="M71 155 81 85 122 59h76l42 26 11 70-17 72-48 29h-52l-47-29Z" fill={armor}/>
      {rival ? <>
        <path d="m78 112-17-77 58 31Zm162 0 18-77-58 31Z" fill={shade}/>
        <path d="m80 86-8-32 28 17Zm160 0 8-32-28 17Z" fill="#f2e7cf" strokeWidth="3"/>
      </> : <>
        {avatar.helmet==="crest"?<path d="m94 68 10-42 31 30m48 0 30-30 11 43" fill="#f2e7cf"/>:avatar.helmet==="antenna"?<><path d="M85 95 63 48m172 47 22-47"/><circle cx="62" cy="45" r="10" fill="#f7cc64"/><circle cx="258" cy="45" r="10" fill="#f7cc64"/></>:<ellipse cx="160" cy="48" rx="85" ry="23" stroke="#f7cc64" strokeWidth="9"/>}
        <path d="M68 133H48v55h28m174-55h21v55h-28" fill={shade}/>
      </>}
      <path d="m83 116 30-16h94l30 16-13 70-64 25-64-25Z" fill="#18262b"/>
      <path d="m101 128 45 11-6 24-35-8Zm118 0-45 11 6 24 35-8Z" fill={rival ? "#f7cc64" : "#d3f6df"} strokeWidth="3"/>
      <path d="m119 178 41-19 41 19 15 44-56 24-56-24Z" fill="#f2e7cf"/>
      <path d="m145 179 15-6 15 6-15 14Z" fill="#18262b" strokeWidth="3"/>
      <path d="m128 211 32 10 32-10" strokeWidth="5"/>
      <path d="M126 208v13m18-9v15m31-15v15m18-19v13" strokeWidth="4"/>
      <path d="m87 179 22 12m124-12-22 12M115 84h38m14 0h38" strokeWidth="4"/>
      <path d="m72 275 12 3m153-3 12-3" strokeWidth="5"/>
    </g>
    {!rival&&<g fill="#f7cc64" stroke="#18262b" strokeWidth="2">{avatar.badge==="bolt"?<path d="m165 270-18 22h13l-5 20 20-27h-14Z"/>:avatar.badge==="star"?<path d="m160 272 6 12 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2Z"/>:<path d="m137 281 23 9 23-9-5 15-18 9-18-9Z"/>}</g>}
    <path d="m130 15 9 17h43l11-17-20 8-13-18-12 18Z" fill="#f7cc64" stroke="#18262b" strokeWidth="4"/>
  </svg>;
}
