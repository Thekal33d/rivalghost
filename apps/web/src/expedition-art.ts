import { CHAPTERS, DISTRICTS } from "@rivalghost/game-data";
import type { CombatEvent, ExpeditionSnapshot, Foe } from "@rivalghost/sim";
import { ship } from "./arena-art";
import {drawDistrict} from "./district-art";
import {applyFlightView,type FlightView} from "./flight-view";

const ink="#14282e",cream="#fff0d0",mint="#a1e7bf",gold="#f7cc64",coral="#ff785b";
function label(c:CanvasRenderingContext2D,text:string,x:number,y:number,color=cream,size=12,landscape=false) {
  c.save();c.translate(x,y);if(landscape)c.rotate(-Math.PI/2);x=0;y=0;
  c.font=`800 ${size}px 'Barlow Condensed',sans-serif`;c.textAlign="center";
  c.lineWidth=4;c.strokeStyle=ink;c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();
}
function boss(c:CanvasRenderingContext2D,f:Foe,color:string,chapter:number,hit:boolean) {
  c.save();c.translate(f.x,f.y);c.strokeStyle=ink;c.lineWidth=3;
  c.fillStyle=hit?cream:f.phase===2 ? coral : color;
  // Distinct armor silhouettes; the simulation's vulnerable core stays constant.
  if(chapter===1||chapter===5){for(const x of [-40,40]){c.beginPath();c.moveTo(x,-43);c.lineTo(x+16,0);c.lineTo(x,43);c.lineTo(x-16,0);c.closePath();c.fill();c.stroke();}}
  else if(chapter===3||chapter===4){for(const x of [-43,43]){c.fillRect(x-12,-35,24,68);c.strokeRect(x-12,-35,24,68);c.fillStyle=ink;c.fillRect(x-7,-23,14,5);c.fillRect(x-7,17,14,5);c.fillStyle=hit?cream:color;}}
  else if(chapter===6||chapter===7){c.beginPath();c.arc(0,0,49,0,Math.PI*2);c.fill();c.stroke();for(const x of [-48,48]){c.fillRect(x-6,-38,12,76);c.strokeRect(x-6,-38,12,76);}}
  else if(chapter===8||chapter===9){c.beginPath();c.moveTo(-48,-22);c.lineTo(-37,-55);c.lineTo(-17,-34);c.lineTo(0,-62);c.lineTo(17,-34);c.lineTo(37,-55);c.lineTo(48,-22);c.closePath();c.fill();c.stroke();}
  c.beginPath();c.moveTo(-52,-30);c.lineTo(-27,-12);c.lineTo(0,-40);c.lineTo(27,-12);c.lineTo(52,-30);c.lineTo(46,26);c.lineTo(24,20);c.lineTo(0,39);c.lineTo(-24,20);c.lineTo(-46,26);c.closePath();c.fill();c.stroke();
  c.fillStyle=ink;c.fillRect(-24,-9,48,23);
  c.fillStyle=cream;c.fillRect(-19,-3,12,5);c.fillRect(7,-3,12,5);
  c.fillStyle=mint;c.fillRect(-5,17,10,7);
  for(const x of [-40,40]) {c.fillStyle=ink;c.fillRect(x-5,14,10,22);c.fillStyle=coral;c.fillRect(x-3,31,6,7);}
  c.restore();
}

export function drawExpedition(c:CanvasRenderingContext2D,s:ExpeditionSnapshot,events:readonly CombatEvent[],reduced:boolean,ghost:ExpeditionSnapshot|undefined,view:FlightView) {
  const t=s.tick;
  c.save();c.fillStyle=DISTRICTS[s.chapter].sky;c.fillRect(0,0,view.width,view.height);applyFlightView(c,view);
  drawDistrict(c,s,reduced);
  const text=(value:string,x:number,y:number,color=cream,size=12)=>label(c,value,x,y,color,size,view.landscape);
  const recent=events.filter(e=>t-e.tick<52 && t>=e.tick);
  c.save();
  if(!reduced && recent.some(e=>e.type==="hit"&&t-e.tick<12)) c.translate(Math.sin(t*4)*3,Math.cos(t*3)*3);
  for(const h of s.hazards) {
    const age=t-h.born,active=age>=55;
    c.fillStyle=active?"#ff785b66":"#f7cc6419";c.strokeStyle=active?coral:gold;c.lineWidth=active?3:1;c.setLineDash(active?[]:[6,8]);
    if(h.axis==="blast"){
      c.beginPath();c.arc(h.x,h.y!,38,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
      c.beginPath();c.arc(h.x,h.y!,active?22:Math.max(3,38-age*.6),0,Math.PI*2);c.stroke();text(active?"IMPACT":"!",h.x,h.y!+5,active?cream:gold,18);
    }else if(h.axis==="horizontal"){
      c.fillRect(0,h.y!-18,360,36);c.strokeRect(0,h.y!-18,360,36);c.setLineDash([]);if(active){c.fillStyle=cream;c.fillRect(0,h.y!-4,360,8);}else text("!",180,h.y!+7,gold,26);
    }else{
      c.fillRect(h.x-18,0,36,640);c.strokeRect(h.x-18,0,36,640);c.setLineDash([]);if(active){c.fillStyle=cream;c.fillRect(h.x-4,0,8,640);}else text("!",h.x,420,gold,26);
    }
  }
  for(const p of s.pickups) {
    c.save();c.translate(p.x,p.y);
    if(p.kind==="rescue") {
      c.strokeStyle=mint;c.lineWidth=2;c.fillStyle="#23453d";c.fillRect(-13,-13,26,27);c.strokeRect(-13,-13,26,27);
      c.beginPath();c.arc(0,-23,18,Math.PI,0);c.lineTo(0,-12);c.closePath();c.fillStyle=mint;c.fill();
      c.fillStyle=cream;c.beginPath();c.arc(0,-4,4,0,Math.PI*2);c.fill();c.fillRect(-5,2,10,7);
      text("RESCUE",0,31,mint,11);
    } else {
      c.rotate(Math.PI/4);c.fillStyle=gold;c.fillRect(-8,-8,16,16);c.strokeStyle=ink;c.lineWidth=2;c.strokeRect(-8,-8,16,16);c.rotate(-Math.PI/4);
      c.fillStyle=ink;c.fillRect(-4,-1,8,2);c.fillRect(-1,-4,2,8);
    }
    c.restore();
  }
  for(const f of s.foes) {
    const impact=recent.some(e=>e.type==="damage"&&e.targetId===f.id&&t-e.tick<5);
    if(f.kind==="boss") boss(c,f,CHAPTERS[s.chapter].color,s.chapter,impact&&!reduced);
    else {ship(c,f.x,f.y,f.kind==="dart" ? "skitter" : f.kind==="weaver" ? "lance" : "bulwark",t);}
    if(f.kind==="boss"&&f.hp<f.maxHp*.5){c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.moveTo(f.x-26,f.y-20);c.lineTo(f.x-9,f.y-6);c.lineTo(f.x-18,f.y+6);c.stroke();}
    if(impact){c.strokeStyle=gold;c.lineWidth=2;for(let i=0;i<4;i++){const a=i*Math.PI/2;c.beginPath();c.moveTo(f.x+Math.cos(a)*20,f.y+Math.sin(a)*20);c.lineTo(f.x+Math.cos(a)*29,f.y+Math.sin(a)*29);c.stroke();}}
    if(f.kind!=="boss" && f.hp<f.maxHp){c.fillStyle=ink;c.fillRect(f.x-16,f.y-27,32,3);c.fillStyle=coral;c.fillRect(f.x-16,f.y-27,32*f.hp/f.maxHp,3);}
  }
  for(const b of s.bolts) {
    if(b.friendly) {
      c.fillStyle=s.surge>0 ? gold : mint;c.fillRect(b.x-2,b.y-8,s.weapon===3 ? 4 : 3,14);
      c.fillStyle="#a1e7bf44";c.fillRect(b.x-3,b.y+6,6,10);
    } else {
      c.fillStyle=b.grazed ? "#8bad9466" : "#ff785b33";c.beginPath();c.arc(b.x,b.y,9,0,Math.PI*2);c.fill();
      c.fillStyle=b.grazed ? "#91b49a" : coral;c.beginPath();c.arc(b.x,b.y,5,0,Math.PI*2);c.fill();c.fillStyle=cream;c.fillRect(b.x-1,b.y-2,2,4);
    }
  }
  if(ghost && ghost.player.health>0 && ghost.tick>60) {
    c.globalAlpha=.35;c.strokeStyle=cream;c.lineWidth=1;c.setLineDash([3,3]);
    c.beginPath();c.moveTo(ghost.player.x,ghost.player.y-20);c.lineTo(ghost.player.x+18,ghost.player.y+15);c.lineTo(ghost.player.x,ghost.player.y+8);c.lineTo(ghost.player.x-18,ghost.player.y+15);c.closePath();c.stroke();c.setLineDash([]);
    text("BEST",ghost.player.x,ghost.player.y+30,cream,10);c.globalAlpha=1;
  }
  if(s.player.health>0) {
    const p=s.player;
    if(p.shield){c.strokeStyle=mint;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,29,0,Math.PI*2);c.stroke();}
    c.strokeStyle=s.surge>0?gold:"#82bdad88";c.lineWidth=1;c.setLineDash([3,5]);c.strokeRect(p.x-23,p.y-23,46,46);c.setLineDash([]);
    c.globalAlpha=p.invulnerable>0 && !reduced && t%8<4 ? .35 : 1;
    ship(c,p.x,p.y,"player",reduced ? 0 : t);
    if(s.weapon>=2){c.fillStyle=gold;c.fillRect(p.x-15,p.y-3,3,8);c.fillRect(p.x+12,p.y-3,3,8);}
    c.fillStyle=cream;c.fillRect(p.x-3,p.y-3,6,6);c.globalAlpha=1;
  }
  for(const e of recent) {
    const age=t-e.tick;
    if(e.type==="damage") {
      // Coalesce a rapid volley into a single readable actual-damage number per target.
      const bucket=Math.floor(e.tick/12);
      const grouped=recent.filter(v=>v.type==="damage"&&v.targetId===e.targetId&&Math.floor(v.tick/12)===bucket);
      if(grouped[0]===e&&age<32)text(`−${grouped.reduce((n,v)=>n+v.value,0)}`,e.x+(view.landscape?-22-age*.5:35),e.y-(view.landscape?20:age*.7),gold,17);
    } else if(e.type==="pulse") {
      c.strokeStyle=mint;c.globalAlpha=Math.max(0,1-age/40);c.lineWidth=5;c.beginPath();c.arc(e.x,e.y,reduced ? 150 : Math.min(180,age*10),0,Math.PI*2);c.stroke();c.globalAlpha=1;
    } else if(e.type==="kill" || e.type==="hit") {
      c.globalAlpha=1-age/52;
      for(let i=0;i<(reduced?4:12);i++){const angle=i*Math.PI/6;c.fillStyle=i%2?coral:gold;c.fillRect(e.x+Math.cos(angle)*age,e.y+Math.sin(angle)*age,Math.max(1,6-age/10),Math.max(1,6-age/10));}
      c.globalAlpha=1;if(e.type==="kill")text(`+${e.value}`,e.x,e.y-15-age*.4,gold,13);
    } else if(["rescue","upgrade","graze","shield"].includes(e.type)) {
      const message=e.type==="rescue" ? "COURIER SAFE +500" : e.type==="upgrade" ? `WEAPON UP / LV ${e.value}` : e.type==="shield" ? "SHIELD SAVED YOU" : "+100 GRAZE";
      text(message,Math.max(90,Math.min(270,e.x)),e.y-25-age*.4,e.type==="upgrade"?gold:mint,14);
    }
  }
  c.restore();
  if(s.surge>0){c.strokeStyle=gold;c.lineWidth=4;c.strokeRect(2,2,356,636);text("SURGE / DOUBLE KILL SCORE",180,610,gold,17);}
  if(s.combo>1) text(`CHAIN ×${s.combo}`,306,68,gold,15);


  if(s.bossDefeated)text("SIGNAL BROKEN / EXTRACTING",180,70,mint,18);
  c.textAlign="left";c.restore();
}
