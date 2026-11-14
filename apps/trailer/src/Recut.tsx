import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {Audio,Video} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {Hound,Moth,Ship,Icon,LogoMark} from './BrandAssets';
import './recut.css';
import aiDecision from './ai-decision.json';
loadFont({family:'Barlow Condensed',url:staticFile('fonts/BarlowCondensed-BlackItalic.ttf'),weight:'900',style:'italic'});
loadFont({family:'Chakra Petch',url:staticFile('fonts/ChakraPetch-SemiBold.ttf'),weight:'600'});
const C={paper:'#F3ECDC',ink:'#11272D',mint:'#7DF5C0',coral:'#FF6B4A',gold:'#FFD166',violet:'#B79CFF'};
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};
const p=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],clamp);
const ease=(v:number)=>1-Math.pow(1-v,4);
const snap=(f:number)=>spring({frame:Math.max(0,f),fps:30,config:{damping:22,stiffness:220,mass:.8}});
function Type({children,size=170,color=C.ink,style={}}:{children:React.ReactNode;size?:number;color?:string;style?:React.CSSProperties}){return <div className="v2-type" style={{fontSize:size,color,...style}}>{children}</div>}
function Caption({children,color=C.ink,style={}}:{children:React.ReactNode;color?:string;style?:React.CSSProperties}){return <div className="v2-caption" style={{color,...style}}>{children}</div>}
function Edge({section,dark=false}:{section:string;dark?:boolean}){return <div className="v2-edge" style={{color:dark?C.paper:C.ink}}><b>RIVALGHOST</b><span>{section}</span></div>}
function Footer(){return <div className="v2-legal">NEAR TESTNET · GAME CREDITS HAVE NO CASH VALUE</div>}
function Grain(){return <svg className="v2-grain" width="100%" height="100%"><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="13"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#paper)" opacity=".035"/></svg>}
function Chase(){const f=useCurrentFrame(),u=ease(p(f,0,65)),g=ease(p(f,28,91));return <AbsoluteFill className="v2-paper"><Edge section="A GOOD RUN DOESN’T STAY YOURS."/>
 <div style={{position:'absolute',left:105,top:185}}><Caption>ONE PERFECT FLIGHT.</Caption><Type size={205}>A NEW<br/><span style={{color:'#A33925'}}>OBSESSION.</span></Type></div>
 <svg viewBox="0 0 1920 1080" style={{position:'absolute',inset:0}}><path d="M-80 930 C400 1030 570 600 1020 730 S1590 940 2050 410" fill="none" stroke={C.ink} strokeWidth="118"/><path d="M-80 930 C400 1030 570 600 1020 730 S1590 940 2050 410" fill="none" stroke={C.mint} strokeWidth="5" strokeDasharray="14 18" strokeDashoffset={-f*9}/></svg>
 <div style={{position:'absolute',left:850+u*480,top:650-u*210,width:380,transform:`rotate(${-12-u*14}deg)`}}><Ship/></div>
 <div style={{position:'absolute',left:430+g*560,top:765-g*90,width:350,transform:'rotate(-8deg)',opacity:p(f,28,38)}}><Ship ghost/></div>
 <div className="v2-stamp" style={{right:110,top:215,transform:`rotate(8deg) scale(${.8+.2*snap(f-22)})`}}>FLIGHT<br/>RECORDED <span>↗</span></div>
 <Caption style={{position:'absolute',bottom:65,right:110}}>YOUR GHOST IS OUT THERE.</Caption><Grain/>
 </AbsoluteFill>}
function RivalReveal(){const f=useCurrentFrame();return <AbsoluteFill style={{background:C.coral,overflow:'hidden'}}><Edge section="AND HE’S ALREADY WAITING."/>
 <div style={{position:'absolute',top:135,left:-20,opacity:.22,transform:`translateX(${-f*.7}px)`}}><Type size={470}>HOUND</Type></div>
 <div style={{position:'absolute',width:835,left:930,top:30,transform:`translateY(${(1-snap(f))*150}px) rotate(${-7+2*p(f,0,112)}deg)`}}><Hound/></div>
 <div style={{position:'absolute',left:105,top:315}}><Caption>MEET YOUR NEXT BAD IDEA.</Caption><Type size={205}>TAKE HIS<br/><span style={{color:C.paper}}>CROWN.</span></Type><div className="v2-underline" style={{width:550*ease(p(f,12,35))}}/></div>
 <Caption style={{position:'absolute',left:110,bottom:100}}>A RIVAL WITH HIS OWN TREASURY.</Caption><Grain/></AbsoluteFill>}
function LogoBeat(){const f=useCurrentFrame();return <AbsoluteFill style={{background:C.mint,justifyContent:'center',overflow:'hidden'}}>
 <div style={{position:'absolute',inset:0,background:C.coral,clipPath:`polygon(0 0,${100*(1-ease(p(f,0,10)))}% 0,${100*(1-ease(p(f,0,10)))-14}% 100%,0 100%)`}}/>
 <div style={{paddingLeft:105,transform:`translateX(${(1-snap(f-2))*-50}px)`,opacity:1}}><Type size={290}>RIVALGHOST</Type><Caption style={{marginTop:40,letterSpacing:10}}>YOUR GHOST. THEIR PROBLEM.</Caption></div><Grain/></AbsoluteFill>}
function Footage({name,trim=0}:{name:string;trim?:number}){return <Video src={staticFile(`footage/${name}.mp4`)} trimBefore={trim} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
function GameBeat({name,title,kicker,trim=0}:{name:string;title:string;kicker:string;trim?:number}){const f=useCurrentFrame();return <AbsoluteFill className="v2-dark"><Footage name={name} trim={trim}/>
 <div className="v2-game-top"><span>REPLAY FOOTAGE</span><span>60 SECONDS TO MAKE YOUR MARK</span></div>
 <div className="v2-game-caption" style={{transform:`translateY(${(1-ease(p(f,0,8)))*90}px)`}}><Type color={C.paper} size={title.length>24?66:83}>{title}</Type><Caption color={C.mint}>{kicker}</Caption></div>
 </AbsoluteFill>}
function GameplayRun(){return <><Sequence durationInFrames={169}><GameBeat name="surge" title="FLIRT WITH DANGER." kicker="GRAZE → SURGE"/></Sequence><Sequence from={169} durationInFrames={56}><GameBeat name="rescue" title="BRING THEM HOME." kicker="CHAIN KILLS. RESCUE COURIERS."/></Sequence><Sequence from={225} durationInFrames={113}><GameBeat name="boss" title="BREAK THE BOSS." kicker="MAKE EVERY SHOT COUNT." trim={35}/></Sequence></>}
function Coin({size=104}:{size?:number}){return <div style={{width:size,height:size,borderRadius:'50%',background:C.gold,border:`${size*.06}px solid ${C.ink}`,boxShadow:`inset 0 0 0 ${size*.055}px ${C.gold},inset 0 0 0 ${size*.075}px ${C.ink}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Barlow Condensed',fontWeight:900,fontStyle:'italic',fontSize:size*.4,color:C.ink}}>CR</div>}
function City({lit=false}:{lit?:boolean}){return <svg viewBox="0 0 600 300" width="100%"><path d="M0 290V145h75V80h90v130h45V110h90V35h90v115h40V95h85v95h85v100Z" fill={C.ink}/>{Array.from({length:48},(_,i)=><rect key={i} x={22+(i%12)*47} y={210-Math.floor(i/12)*40} width="16" height="20" fill={lit?i%3?C.gold:C.mint:'#39504D'}/>)}<path d="M0 290H600" stroke={C.ink} strokeWidth="10"/></svg>}
const steps=[{word:'SALVAGE.',copy:'FLY JOBS. BRING SOMETHING BACK.',value:'+4 SALVAGE',detail:'RECOVERY JOB · BEFORE BONUSES'},{word:'TRADE.',copy:'MOTH BUYS WHAT YOU FIND.',value:'+5 CR',detail:'EXAMPLE PRICE · CHANGES WITH STOCK'},{word:'CRAFT.',copy:'YOUR SHIP. YOUR SIGNATURE.',value:'AFTERGLOW',detail:'4 SALVAGE + 4 CR · COSMETIC TRAIL'},{word:'SELL.',copy:'MAKE IT. LIST IT. PASS IT ON.',value:'20 CR',detail:'EXAMPLE LISTING · SELLER SETS THE PRICE'},{word:'REBUILD.',copy:'BRING YOUR CITY BACK TO LIFE.',value:'STREETS RELIT',detail:'30 SALVAGE · SHARED DISTRICT PROGRESS'}];
function EconomyRun(){const f=useCurrentFrame(),starts=[0,56,113,169,225],idx=starts.reduce((n,start,i)=>f>=start?i:n,0),local=f-starts[idx],n=steps[idx],travel=idx===0?0:idx-1+ease(p(local,0,12));return <AbsoluteFill className="v2-paper"><Edge section="EVERY FLIGHT FUELS THE NEXT."/>
 <div style={{position:'absolute',left:105,top:157}}><Caption>THE PLAYER ECONOMY / 0{idx+1}</Caption><Type size={160}>{n.word}</Type><Caption style={{marginTop:25}}>{n.copy}</Caption></div>
 <div style={{position:'absolute',left:850,right:0,top:365,height:475,overflow:'hidden'}}><div style={{position:'absolute',left:70-travel*900,top:35,display:'flex',gap:300,alignItems:'center'}}>
 {steps.map((_,i)=><div key={i} style={{position:'relative',width:600,height:370,flexShrink:0,opacity:i===idx?1:.18}}>
 {i===0?<><div style={{width:420,transform:'rotate(-10deg)'}}><Ship/></div>{[0,1,2,3].map(k=><div key={k} style={{position:'absolute',left:240+k*70,top:250-(k%2)*30,width:50,height:50,background:C.gold,border:`5px solid ${C.ink}`,transform:'rotate(45deg)'}}/>)}</>:i===1?<><div style={{position:'absolute',left:40,top:0,width:350,color:C.ink}}><Moth/></div><div style={{position:'absolute',left:420,top:90,transform:`translateY(${-Math.sin(p(local,12,36)*Math.PI)*70}px)`}}><Coin size={150}/></div><Type size={65} style={{position:'absolute',left:60,top:330}}>MOTH’S EXCHANGE</Type></>:i===2?<><svg viewBox="0 0 600 350" width="600"><path d="M0 250Q110 80 290 195" fill="none" stroke={C.mint} strokeWidth="32"/><path d="M0 250Q110 80 290 195" fill="none" stroke={C.ink} strokeWidth="3"/></svg><div style={{position:'absolute',left:220,top:80,width:350,transform:'rotate(-10deg)'}}><Ship/></div></>:i===3?<><div style={{position:'absolute',top:0,left:60,width:440,background:C.ink,color:C.paper,border:`5px solid ${C.ink}`,transform:'rotate(-5deg)',padding:30}}><Caption color={C.mint}>PILOT MARKET</Caption><div style={{width:230,margin:'0 auto'}}><Ship/></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><Type size={60} color={C.gold}>20 CR</Type><Icon name="person" size={65}/></div></div></>:<div style={{paddingTop:60}}><City lit={local>=18}/></div>}
 </div>)}
 </div></div>
 <div style={{position:'absolute',left:110,top:570,borderLeft:`8px solid ${C.coral}`,padding:'15px 25px',width:720}}><Type size={idx===4?95:112} color={idx===1||idx===3?'#8D4C00':C.ink}>{idx===1?`+${Math.round(5*p(local,12,32))} CR`:n.value}</Type><Caption style={{fontSize:20,marginTop:20}}>{n.detail}</Caption></div>
 <div className="v2-route">{steps.map((s,i)=><span key={i} style={{color:i===idx?C.ink:'#7D8A83',borderColor:i===idx?C.coral:'transparent'}}>{s.word.slice(0,-1)}{i<4?'  ↗':''}</span>)}</div><div className="v2-diagram">ECONOMY ILLUSTRATION · EXAMPLE VALUES</div><Grain/>
 </AbsoluteFill>}
function CrownRun(){const f=useCurrentFrame(),win=f>=113&&f<225,miss=f>=225;return <AbsoluteFill style={{background:C.ink,overflow:'hidden'}}><Edge section="THE CROWN PIT / OUTCOME ILLUSTRATION" dark/>
 <div style={{position:'absolute',inset:0,background:C.coral,clipPath:'polygon(0 0,41% 0,33% 100%,0 100%)'}}/>
 <div style={{position:'absolute',width:740,left:-100,top:150,transform:`rotate(-8deg) translateY(${(1-snap(f))*80}px)`}}><Hound/></div>
 <div style={{position:'absolute',left:840,top:180}}><Caption color={C.gold}>HOUND HAS A SCORE TO SETTLE.</Caption><Type size={140} color={C.paper}>{win?<>BEAT HIM.<br/><span style={{color:C.gold}}>TAKE IT ALL.</span></>:miss?<>MISS?<br/><span style={{color:C.gold}}>THE POT GROWS.</span></>:<>TEN CREDITS.<br/><span style={{color:C.gold}}>ONE CROWN.</span></>}</Type></div>
 <div style={{position:'absolute',left:840,top:600,width:950,height:250,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
 <div style={{textAlign:'center'}}><Type size={90} color={C.gold}>{win?'ENTRY BACK':miss?'+8 CR':'10 CR'}</Type><Caption color={C.paper}>{win?'PLUS THE BOUNTY':miss?'TO THE BOUNTY':'YOUR ENTRY'}</Caption></div>
 <div style={{position:'absolute',left:250+(win?1-ease(p((f-(miss?225:win?113:0)),18,75)):ease(p((f-(miss?225:win?113:0)),18,75)))*290,top:-65-Math.sin(p((f-(miss?225:win?113:0)),18,75)*Math.PI)*45,transform:`rotate(${((f-(miss?225:win?113:0)))*2}deg)`}}><Coin size={85}/></div>
 <div style={{border:`3px solid ${C.gold}`,padding:'30px 40px',minWidth:300,textAlign:'center'}}><Type size={90} color={C.paper}>{miss?'+2 CR':win?'YOU WIN':'BOUNTY'}</Type><Caption color={C.gold}>{miss?'TO THE HOLDER':win?'CROWN TAKEN':'BEAT THE GHOST'}</Caption></div>
 </div>
 <Caption color={C.paper} style={{position:'absolute',left:80,bottom:115,background:C.ink,padding:'12px 20px',fontSize:22}}>HOUND / RULE-BASED RIVAL</Caption><Caption color="#A6B6B2" style={{position:'absolute',left:840,bottom:150,fontSize:23}}>{miss?'LOSE, TIE OR EXPIRE: ENTRY STAYS IN THE ECONOMY.':'THE PURSE IS GAME CREDITS. NO CASH VALUE.'}</Caption><Footer/>
 </AbsoluteFill>}
function AIFocus(){const f=useCurrentFrame(),settled=f>=32;return <AbsoluteFill style={{background:C.mint,overflow:'hidden'}}>
 <Edge section="THE CITY HAS A MIND / NEAR AI CLOUD"/>
 <div style={{position:'absolute',left:45,top:265,width:650,height:650,borderRadius:'50%',background:C.ink}}/>
 <div style={{position:'absolute',left:40,top:190,width:690,transform:`translateY(${(1-ease(p(f,0,18)))*65}px)`}}><Moth/></div>
 <div style={{position:'absolute',left:120,bottom:158,background:C.paper,border:`4px solid ${C.ink}`,padding:'16px 30px',transform:'rotate(-4deg)'}}><Type size={70}>MOTH’S NEXT MOVE.</Type></div>
 <div style={{position:'absolute',left:790,top:190,right:100}}><Caption style={{fontSize:32}}>NEAR AI PICKS. NEAR CONFIRMS.</Caption><Type size={142}>RECOVERY.<br/>REWARDED.</Type>
 <div style={{marginTop:45,padding:'25px 32px',background:C.paper,border:`4px solid ${C.ink}`,boxShadow:`9px 9px 0 ${C.ink}`}}>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><Type size={105}>+1 SALVAGE</Type><div style={{fontSize:62,transform:`scale(${settled?snap(f-32):0})`}}>✓</div></div>
 <Caption style={{fontSize:26,margin:'20px 0 0'}}>NEW MATCHING JOBS · CONFIRMED ON NEAR</Caption></div>
 <Caption style={{fontSize:24,marginTop:40}}>4 DECISIONS / DAY · DEVELOPER-FUNDED</Caption></div>
 <div style={{position:'absolute',left:110,bottom:55,fontSize:20,letterSpacing:1}}>LIVE DECISION, VISUALIZED · TESTNET RECEIPT {aiDecision.transactionHash.slice(0,8)}…</div><Grain/>
 </AbsoluteFill>}

function ProofBeat(){const f=useCurrentFrame();return <AbsoluteFill style={{background:C.gold}}><Edge section="BUILT ON NEAR"/>
 <div style={{position:'absolute',left:110,top:205,transform:`translateY(${(1-ease(p(f,0,10)))*75}px)`}}><Caption>ONE FINITE ECONOMY.</Caption><Type size={265}>100,100 <span style={{fontSize:120}}>CR</span></Type><Caption style={{fontSize:34,marginTop:30}}>FIXED SUPPLY. NO MINTING.</Caption></div>
 <div style={{position:'absolute',left:110,right:110,bottom:175,display:'flex',borderTop:`4px solid ${C.ink}`,paddingTop:45,gap:80}}><Caption style={{fontSize:29}}>REPLAY-VERIFIED REWARDS</Caption><Caption style={{fontSize:29}}>COSMETIC PURCHASES</Caption><Caption style={{fontSize:29}}>ZERO COMBAT ADVANTAGE</Caption></div><Grain/>
 </AbsoluteFill>}
function End(){const f=useCurrentFrame();return <AbsoluteFill className="v2-paper"><Edge section="PLAY FREE IN YOUR BROWSER"/>
 <div style={{position:'absolute',left:110,top:245}}><Caption>YOUR GHOST. THEIR PROBLEM.</Caption><Type size={235}>RIVALGHOST</Type><div style={{display:'inline-flex',alignItems:'center',gap:60,background:C.coral,padding:'22px 35px',marginTop:35,transform:`translateY(${(1-snap(f))*45}px)`}}><Type size={66}>RIVALGHOST.XYZ</Type><span style={{fontSize:60}}>↗</span></div></div>
 <div style={{position:'absolute',width:470,right:80,bottom:110,transform:`translateX(${(1-ease(p(f,0,32)))*520}px) rotate(-13deg)`}}><Ship/></div>
 <div style={{position:'absolute',left:110,bottom:165}}><Caption>NEAR TESTNET · GAME CREDITS HAVE NO CASH VALUE</Caption></div>
 <div className="v2-credit">MUSIC: “EXIT THE PREMISES” — KEVIN MACLEOD · INCOMPETECH.COM<br/>CC BY 4.0 · CREATIVECOMMONS.ORG/LICENSES/BY/4.0/ · EXCERPT, FADES & LEVEL EDIT</div><Grain/>
 </AbsoluteFill>}
export function Recut(){return <AbsoluteFill className="v2">
 <Sequence durationInFrames={112}><Chase/></Sequence><Sequence from={112} durationInFrames={113}><RivalReveal/></Sequence><Sequence from={225} durationInFrames={56}><LogoBeat/></Sequence><Sequence from={281} durationInFrames={338}><GameplayRun/></Sequence><Sequence from={619} durationInFrames={337}><EconomyRun/></Sequence><Sequence from={956} durationInFrames={338}><CrownRun/></Sequence><Sequence from={1294} durationInFrames={169}><AIFocus/></Sequence><Sequence from={1463} durationInFrames={112}><ProofBeat/></Sequence><Sequence from={1575} durationInFrames={165}><End/></Sequence>
 <Audio src={staticFile('audio/recut-music.wav')}/>
 </AbsoluteFill>}
