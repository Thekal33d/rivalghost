import { CHAPTERS } from "@rivalghost/game-data";
import type { CombatEvent, ExpeditionSnapshot, Foe } from "@rivalghost/sim";
import { ship } from "./arena-art";

const ink="#14282e",cream="#fff0d0",mint="#a1e7bf",gold="#f7cc64",coral="#ff785b";
function label(c:CanvasRenderingContext2D,text:string,x:number,y:number,color=cream,size=12) {
  c.font=`800 ${size}px 'Barlow Condensed',sans-serif`;c.textAlign="center";
  c.lineWidth=4;c.strokeStyle=ink;c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);
}
function boss(c:CanvasRenderingContext2D,f:Foe,color:string) {
  c.save();c.translate(f.x,f.y);c.strokeStyle=ink;c.lineWidth=3;
  c.fillStyle=f.phase===2 ? coral : color;
  c.beginPath();c.moveTo(-52,-30);c.lineTo(-27,-12);c.lineTo(0,-40);c.lineTo(27,-12);c.lineTo(52,-30);c.lineTo(46,26);c.lineTo(24,20);c.lineTo(0,39);c.lineTo(-24,20);c.lineTo(-46,26);c.closePath();c.fill();c.stroke();
  c.fillStyle=ink;c.fillRect(-24,-9,48,23);
  c.fillStyle=cream;c.fillRect(-19,-3,12,5);c.fillRect(7,-3,12,5);
  c.fillStyle=mint;c.fillRect(-5,17,10,7);
  for(const x of [-40,40]) {c.fillStyle=ink;c.fillRect(x-5,14,10,22);c.fillStyle=coral;c.fillRect(x-3,31,6,7);}
  c.restore();
}

export function drawExpedition(c:CanvasRenderingContext2D,s:ExpeditionSnapshot,events:readonly CombatEvent[],reduced:boolean,ghost?:ExpeditionSnapshot) {
  const t=s.tick,scroll=reduced ? 0 : t;
  const palettes=[['#17343b','#24474a'],['#34353e','#4b4448'],['#283b39','#3d5048'],['#183d46','#275561'],['#3d3530','#58463a'],['#30364c','#454e65'],['#443137','#614047'],['#2e3d31','#45553c'],['#443b2b','#605339'],['#303e44','#4d6063']];
  const [background,structure]=palettes[s.chapter];
  c.fillStyle=background;c.fillRect(0,0,360,640);
  // District architecture is cosmetic; all damage below comes from the simulation.
  for(let i=0;i<9;i++) {
    const y=(i*98+scroll*.9)%800-100;
    c.fillStyle=structure;c.fillRect(0,y,38,72);c.fillRect(322,y,38,72);
    c.strokeStyle="#69807433";c.lineWidth=1;c.beginPath();c.moveTo(38,y+35);c.lineTo(322,y+35);c.stroke();
    c.fillStyle="#a9956944";c.fillRect(15,y+9,10,26);c.fillRect(335,y+9,10,26);
    c.fillStyle="#d4b977";c.fillRect(31,y+44,3,12);c.fillRect(326,y+44,3,12);
  }
  for(let i=0;i<24;i++){c.fillStyle="#83a79a55";c.fillRect(40+(i*83)%280,(i*137+scroll*(i%3+1)*.4)%640,1,3);}
  const recent=events.filter(e=>t-e.tick<52 && t>=e.tick);
  c.save();
  if(!reduced && recent.some(e=>e.type==="hit"&&t-e.tick<12)) c.translate(Math.sin(t*4)*3,Math.cos(t*3)*3);
  for(const h of s.hazards) {
    const age=t-h.born,active=age>=55;
    c.fillStyle=active ? "#ff785b66" : "#f7cc6419";c.fillRect(h.x-18,0,36,640);
    c.strokeStyle=active ? coral : gold;c.lineWidth=active ? 3 : 1;c.setLineDash(active ? [] : [6,8]);
    c.strokeRect(h.x-18,0,36,640);c.setLineDash([]);
    if(active){c.fillStyle=cream;c.fillRect(h.x-4,0,8,640);}else label(c,"!",h.x,420,gold,26);
  }
  for(const p of s.pickups) {
    c.save();c.translate(p.x,p.y);
    if(p.kind==="rescue") {
      c.strokeStyle=mint;c.lineWidth=2;c.fillStyle="#23453d";c.fillRect(-13,-13,26,27);c.strokeRect(-13,-13,26,27);
      c.beginPath();c.arc(0,-23,18,Math.PI,0);c.lineTo(0,-12);c.closePath();c.fillStyle=mint;c.fill();
      c.fillStyle=cream;c.beginPath();c.arc(0,-4,4,0,Math.PI*2);c.fill();c.fillRect(-5,2,10,7);
      label(c,"RESCUE",0,31,mint,11);
    } else {
      c.rotate(Math.PI/4);c.fillStyle=gold;c.fillRect(-8,-8,16,16);c.strokeStyle=ink;c.lineWidth=2;c.strokeRect(-8,-8,16,16);c.rotate(-Math.PI/4);
      c.fillStyle=ink;c.fillRect(-4,-1,8,2);c.fillRect(-1,-4,2,8);
    }
    c.restore();
  }
  for(const f of s.foes) {
    if(f.kind==="boss") boss(c,f,CHAPTERS[s.chapter].color);
    else {ship(c,f.x,f.y,f.kind==="dart" ? "skitter" : f.kind==="weaver" ? "lance" : "bulwark",t);}
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
    label(c,"BEST",ghost.player.x,ghost.player.y+30,cream,10);c.globalAlpha=1;
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
    if(e.type==="pulse") {
      c.strokeStyle=mint;c.globalAlpha=Math.max(0,1-age/40);c.lineWidth=5;c.beginPath();c.arc(e.x,e.y,reduced ? 150 : Math.min(180,age*10),0,Math.PI*2);c.stroke();c.globalAlpha=1;
    } else if(e.type==="kill" || e.type==="hit") {
      c.globalAlpha=1-age/52;
      for(let i=0;i<(reduced?4:12);i++){const angle=i*Math.PI/6;c.fillStyle=i%2?coral:gold;c.fillRect(e.x+Math.cos(angle)*age,e.y+Math.sin(angle)*age,Math.max(1,6-age/10),Math.max(1,6-age/10));}
      c.globalAlpha=1;if(e.type==="kill")label(c,`+${e.value}`,e.x,e.y-15-age*.4,gold,13);
    } else if(["rescue","upgrade","graze","shield"].includes(e.type)) {
      const text=e.type==="rescue" ? "COURIER SAFE +500" : e.type==="upgrade" ? `WEAPON UP / LV ${e.value}` : e.type==="shield" ? "SHIELD SAVED YOU" : "+100 GRAZE";
      label(c,text,Math.max(90,Math.min(270,e.x)),e.y-25-age*.4,e.type==="upgrade"?gold:mint,14);
    }
  }
  c.restore();
  const bossState=s.foes.find(f=>f.kind==="boss");
  if(bossState){c.fillStyle=ink;c.fillRect(40,13,280,29);c.fillStyle=coral;c.fillRect(44,36,272*bossState.hp/bossState.maxHp,3);label(c,`${CHAPTERS[s.chapter].boss} / PHASE ${bossState.phase}`,180,29,cream,12);}
  if(s.surge>0){c.strokeStyle=gold;c.lineWidth=4;c.strokeRect(2,2,356,636);label(c,"SURGE / DOUBLE KILL SCORE",180,610,gold,17);}
  if(s.combo>1) label(c,`CHAIN ×${s.combo}`,306,68,gold,15);
  if(t<120)label(c,"DRAG / WASD TO MOVE",180,375,mint,17);
  if(t>=2400 && t<2510)label(c,"SIGNAL SPIKE / BOSS INBOUND",180,335,gold,20);
  if(s.bossDefeated)label(c,"SIGNAL BROKEN / EXTRACTING",180,70,mint,18);
  c.textAlign="left";
}
