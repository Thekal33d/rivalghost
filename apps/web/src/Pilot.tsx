/** Original vector character art. Shared silhouettes appear in the arena ships. */
export function Pilot({ rival = false }: { rival?: boolean }) {
  const armor = rival ? "#ec6248" : "#9ddfbb";
  const shade = rival ? "#a93c32" : "#519d88";
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
        <path d="m94 68 10-42 31 30m48 0 30-30 11 43" fill="#f2e7cf"/>
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
    <path d="m130 15 9 17h43l11-17-20 8-13-18-12 18Z" fill="#f7cc64" stroke="#18262b" strokeWidth="4"/>
  </svg>;
}
