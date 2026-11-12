import {DISTRICTS,flightSector} from '@rivalghost/game-data';
import type {ExpeditionSnapshot} from '@rivalghost/sim';
const line=(c:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number)=>{c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
/** Authored vector environments. Scenery never adds invisible collision objects. */
export function drawDistrict(c:CanvasRenderingContext2D,s:ExpeditionSnapshot,reduced:boolean){
  const d=DISTRICTS[s.chapter],sector=flightSector(s.tick),t=reduced?0:s.tick;
  c.fillStyle=d.sky;c.fillRect(-900,-900,2160,2440);
  c.fillStyle=d.floor;c.globalAlpha=.22+sector*.08;c.fillRect(24,-900,312,2440);c.globalAlpha=1;
  c.strokeStyle=d.accent;c.lineWidth=1;
  // Perspective-like floor strips and parallax structures extend through panoramic margins.
  for(let i=-8;i<17;i++){
    const y=i*105+(t*(sector===2?.8:.5))%105;
    c.fillStyle=d.floor;
    if(d.terrain==='relay'||d.terrain==='choir'){
      for(const x of [-70,12,310,390]){c.fillRect(x,y,36,65);c.fillStyle=d.accent;c.globalAlpha=.45;c.fillRect(x+9,y+12,18,3);c.fillRect(x+15,y+25,5,25);c.globalAlpha=1;c.fillStyle=d.floor;}
      c.globalAlpha=.2;line(c,32,y+25,328,y+25);c.globalAlpha=1;
      if(d.terrain==='choir'){c.globalAlpha=.22;for(const x of [45,315]){c.beginPath();c.arc(x,y+30,25+(t/3)%35,0,Math.PI*2);c.stroke();}c.globalAlpha=1;}
    }else if(d.terrain==='glass'){
      for(const x of [-25,300]){c.beginPath();c.moveTo(x,y);c.lineTo(x+55,y+20);c.lineTo(x+65,y+80);c.lineTo(x+15,y+65);c.closePath();c.fill();c.globalAlpha=.5;c.stroke();line(c,x+15,y+65,x+55,y+20);c.globalAlpha=1;}
      c.globalAlpha=.12;line(c,35,y+65,325,y+10);c.globalAlpha=1;
    }else if(d.terrain==='engine'||d.terrain==='crown'){
      for(const x of [-6,366]){c.fillRect(x-36,y,72,75);c.save();c.translate(x,y+35);c.rotate(reduced?0:t*.006*(x<0?1:-1));c.strokeStyle=d.accent;c.globalAlpha=.4;c.beginPath();c.arc(0,0,29,0,Math.PI*2);c.stroke();for(let n=0;n<8;n++){c.rotate(Math.PI/4);c.fillStyle=d.accent;c.fillRect(13,-3,24,6);}c.restore();}
      if(d.terrain==='crown'){c.fillStyle=d.accent;c.globalAlpha=.15;c.fillRect(60,y,240,4);c.globalAlpha=1;}
    }else if(d.terrain==='water'||d.terrain==='mirror'){
      for(let n=0;n<4;n++){c.globalAlpha=.12+n*.03;c.beginPath();for(let x=-300;x<700;x+=12){const yy=y+n*21+Math.sin((x+t*.5)/35)*5;x===-300?c.moveTo(x,yy):c.lineTo(x,yy);}c.stroke();}c.globalAlpha=1;
      for(const x of (sector===1&&d.terrain==="water"?[-110,390]:[-30,312])){c.fillStyle=d.floor;c.fillRect(x,y,78,48);c.fillStyle=d.accent;c.globalAlpha=.3;c.fillRect(x+8,y+10,60,3);if(d.terrain==='mirror'){c.globalAlpha=.12;c.fillRect(360-x-78,y+50,78,45);}c.globalAlpha=1;}
    }else if(d.terrain==='rail'){
      for(const x of [-12,350]){c.fillStyle='#82715c';c.fillRect(x,y,22,4);c.fillStyle=d.floor;c.fillRect(x-22,y+8,58,83);c.fillStyle=d.accent;c.globalAlpha=.3;c.fillRect(x-16,y+17,46,6);c.globalAlpha=1;}
      for(const x of [31,39,321,329]){c.globalAlpha=.35;line(c,x,-500,x,1200);c.globalAlpha=1;}
    }else if(d.terrain==='ash'){
      for(const x of [-10,330]){c.save();c.translate(x,y);c.rotate(x<0?-.18:.18);c.fillStyle=d.floor;c.fillRect(-18,-10,45,84);c.fillStyle='#bd6c48';c.globalAlpha=.4;c.fillRect(3,20,4,45);c.globalAlpha=1;c.restore();}
    }else if(d.terrain==='dawn'){
      c.globalAlpha=.12;for(const x of [-55,350]){c.beginPath();c.arc(x,y,70,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
    }
  }
  // Larger district landmarks replace the approach architecture deeper into a flight.
  if(sector===1){
    c.save();c.globalAlpha=.22;c.strokeStyle=d.accent;c.fillStyle=d.floor;c.lineWidth=2;
    const y=reduced?260:(t*.7)%900-100;
    if(d.terrain==='rail'){for(const x of [70,290]){line(c,x,0,360-x,640);line(c,x+7,0,367-x,640);}}
    else if(d.terrain==='glass'){for(const x of [12,348]){c.beginPath();c.moveTo(x,y-100);c.lineTo(180,y);c.lineTo(x,y+100);c.stroke();}}
    else if(d.terrain==='water'||d.terrain==='mirror'){for(let r=40;r<220;r+=35){c.beginPath();c.ellipse(180,y,r,r*.35,0,0,Math.PI*2);c.stroke();}}
    else if(d.terrain==='ash'){c.fillStyle='#b76746';c.fillRect(-80,y,520,100);for(let i=0;i<7;i++){c.beginPath();c.arc(i*65-20,y+50,65,0,Math.PI*2);c.fill();}}
    else{c.fillRect(-40,y,440,28);for(let x=-20;x<400;x+=50){c.beginPath();c.moveTo(x,y);c.lineTo(x+25,y+28);c.lineTo(x+50,y);c.stroke();}}
    c.restore();
  }
  if(sector===2){
    c.save();c.translate(180,105);c.strokeStyle=d.accent;c.fillStyle=d.floor;c.globalAlpha=.24;c.lineWidth=3;
    if(d.terrain==='rail'||d.terrain==='relay'){for(const x of [-135,135]){c.fillRect(x-20,-90,40,180);for(let y=-70;y<=70;y+=35)c.strokeRect(x-14,y,28,18);}}
    else if(d.terrain==='glass'||d.terrain==='mirror'){for(const x of [-125,125]){c.beginPath();c.moveTo(x,-80);c.lineTo(x+35,0);c.lineTo(x,80);c.lineTo(x-35,0);c.closePath();c.fill();c.stroke();}}
    else{for(const r of [85,110,140]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}for(let i=0;i<12;i++){c.save();c.rotate(i*Math.PI/6+(reduced?0:t*.001));c.fillRect(110,-4,35,8);c.restore();}}
    c.restore();
  }
  // A visible route change at 20 seconds, then the boss district at 40 seconds.
  if(sector>0){c.fillStyle=d.accent;c.globalAlpha=sector===2?.08:.04;c.fillRect(-900,-900,2160,2440);c.globalAlpha=1;}
  if(d.terrain==='dawn'){
    const sunrise=s.bossDefeated?.38:.03+Math.max(0,s.tick-1800)/1800*.12;
    c.fillStyle='#f2c38e';c.globalAlpha=sunrise;c.fillRect(-900,-900,2160,2440);c.globalAlpha=1;
    c.fillStyle='#f3cd92';c.globalAlpha=.22;c.beginPath();c.arc(180,-20,85+(s.bossDefeated?35:0),0,Math.PI*2);c.fill();c.globalAlpha=1;
  }
  const weather=d.terrain==='ash'?'ash':d.terrain==='water'?'rain':'dust';
  for(let i=0;i<(reduced?10:38);i++){
    const x=-70+(i*83)%510,y=(i*137+t*(weather==='rain'?4:.5+(i%3)*.3))%850-100;
    c.fillStyle=weather==='ash'?(i%3===0?'#dd8b5c':'#876a64'):d.accent;c.globalAlpha=weather==='dust'?.18:.35;
    c.fillRect(x+(weather==='ash'?Math.sin((t+i*17)/70)*15:0),y,weather==='ash'?3:1,weather==='rain'?16:3);
  }c.globalAlpha=1;
  // Faint lane edges make the logical flying area legible even on ultrawide screens.
  c.strokeStyle=d.accent;c.globalAlpha=.18;line(c,10,0,10,640);line(c,350,0,350,640);c.globalAlpha=1;
}
