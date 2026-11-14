import {DISTRICTS,flightSector} from '@rivalghost/game-data';
import type {ExpeditionSnapshot} from '@rivalghost/sim';
import type {FlightView} from './flight-view';
const line=(c:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number)=>{c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
/** Screen-space scenery fills panoramic margins; only simulation objects can hurt a pilot. */
export function drawFlightScene(c:CanvasRenderingContext2D,s:ExpeditionSnapshot,view:FlightView,reduced:boolean,restored:number){
 const d=DISTRICTS[s.chapter],w=view.width,h=view.height,t=reduced?0:s.tick,sector=flightSector(s.tick),horizon=h*.82;
 c.save();const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#09171F');sky.addColorStop(.66,d.sky);sky.addColorStop(1,d.floor);c.fillStyle=sky;c.fillRect(0,0,w,h);
 const water=d.terrain==='water'||d.terrain==='mirror',ash=d.terrain==='ash',dawn=d.terrain==='dawn';
 if(dawn){const sun=c.createRadialGradient(w*.78,h*.5,4,w*.78,h*.5,h*.7);sun.addColorStop(0,s.bossDefeated?'#F7CC6470':'#F7CC6428');sun.addColorStop(1,'#F7CC6400');c.fillStyle=sun;c.fillRect(0,0,w,h);}
 // Two skyline depths, varied by chapter. Slow motion conveys travel without masking bullets.
 for(let depth=0;depth<2;depth++){
  const spacing=depth?76:113,offset=(t*(depth?.25:.08))%spacing;
  for(let i=-2;i<Math.ceil(w/spacing)+2;i++){
   const seed=(i+50+s.chapter*13+Math.floor(t*(depth?.25:.08)/spacing))*17,building=48+(seed%9)*15+(sector===2?24:0),x=i*spacing-offset,y=horizon-building;
   c.fillStyle=depth?'#0C2026':d.floor;c.globalAlpha=depth?.88:.65;c.fillRect(x,y,spacing*.72,building);c.fillRect(x+6,y-9,spacing*.55,9);
   c.fillStyle=d.accent;c.globalAlpha=.12+restored*.07;
   for(let row=0;row<6;row++)for(let col=0;col<3;col++)if((seed+row*5+col)%4===0)c.fillRect(x+8+col*12,y+15+row*22,4,3);
  }
 }
 c.globalAlpha=1;c.strokeStyle=d.accent;c.lineWidth=1;
 // Gantry above the lane and broad pools of light reproduce the reference's flight stage.
 const gap=Math.max(140,w/4),gantry=18;
 for(let i=0;i<Math.ceil(w/gap)+1;i++){
  const x=i*gap+gap*.3;const light=c.createLinearGradient(x,gantry,x,horizon);light.addColorStop(0,ash?'#FFAA6338':'#A8F6D638');light.addColorStop(1,'#A8F6D600');c.fillStyle=light;c.beginPath();c.moveTo(x-10,gantry);c.lineTo(x+10,gantry);c.lineTo(x+gap*.45,horizon);c.lineTo(x-gap*.45,horizon);c.closePath();c.fill();
  c.fillStyle='#A1E7BF';c.globalAlpha=.65;c.fillRect(x-10,gantry-2,20,3);c.globalAlpha=1;
 }
 c.strokeStyle='#37515A';c.globalAlpha=.65;for(let x=-20;x<w+24;x+=24){line(c,x,0,x+12,gantry);line(c,x+12,gantry,x+24,0);}line(c,0,gantry,w,gantry);
 c.strokeStyle=ash?'#D88C50':'#B7A567';c.setLineDash([10,10]);line(c,0,gantry+5,w,gantry+5);c.setLineDash([]);c.globalAlpha=1;
 // Distinct landmarks stay in the background for each district.
 c.strokeStyle=d.accent;c.fillStyle=d.floor;c.globalAlpha=.24;
 const landmark=w*(.78-(t*.00005)%1),cy=h*.44;
 if(d.terrain==='glass'||d.terrain==='mirror'){for(let i=0;i<4;i++){const x=landmark+i*78;c.beginPath();c.moveTo(x,horizon);c.lineTo(x-20,cy);c.lineTo(x+6,cy-60);c.lineTo(x+28,horizon);c.closePath();c.fill();c.stroke();}}
 else if(d.terrain==='engine'||d.terrain==='crown'||d.terrain==='choir'){for(const r of [50,78,104]){c.beginPath();c.arc(landmark,cy,r,0,Math.PI*2);c.stroke();}for(let i=0;i<8;i++){const a=i*Math.PI/4+(reduced?0:t*.001);line(c,landmark+Math.cos(a)*78,cy+Math.sin(a)*78,landmark+Math.cos(a)*115,cy+Math.sin(a)*115);}}
 else if(d.terrain==='rail'){for(let i=0;i<3;i++){const x=landmark-i*180;c.fillRect(x-6,cy-70,12,horizon-cy+70);line(c,x-70,cy-60,x+70,cy-60);line(c,x-70,cy-60,x,cy);line(c,x+70,cy-60,x,cy);}line(c,0,cy-60,w,cy-60);line(c,0,cy-50,w,cy-50);}
 else if(ash){for(let i=0;i<4;i++){const x=landmark-i*135;c.fillRect(x,cy-20-i%2*50,24,horizon-cy+20+i%2*50);c.fillStyle='#8c5a43';c.globalAlpha=.12;for(let j=0;j<5;j++){c.beginPath();c.ellipse(x+12-j*14,cy-45-j*30-i%2*50,18+j*8,14+j*5,0,0,Math.PI*2);c.fill();}c.fillStyle=d.floor;c.globalAlpha=.24;}}
 else{c.fillRect(landmark-8,cy,16,horizon-cy);c.beginPath();c.moveTo(landmark-18,cy);c.lineTo(landmark,cy-42);c.lineTo(landmark+18,cy);c.fill();c.beginPath();c.moveTo(0,horizon*.68);c.quadraticCurveTo(w*.4,h*.3,w,horizon*.6);c.stroke();}
 c.globalAlpha=1;
 const floor=c.createLinearGradient(0,horizon,0,h);floor.addColorStop(0,d.floor);floor.addColorStop(1,'#071318');c.fillStyle=floor;c.fillRect(0,horizon,w,h-horizon);
 c.strokeStyle=d.accent;c.globalAlpha=.3;c.lineWidth=1;
 if(water){for(let i=0;i<9;i++){const y=horizon+Math.pow(i/9,1.5)*(h-horizon);c.beginPath();for(let x=0;x<=w;x+=12){const yy=y+Math.sin((x+t*.6)/45+i)*2;x?c.lineTo(x,yy):c.moveTo(x,yy);}c.stroke();}}
 else {const vanish=w*.5;for(let x=-w;x<w*2;x+=w/10)line(c,vanish+(x-vanish)*.1,horizon,x,h);for(let i=0;i<9;i++){const f=((i+(t*.007)%1)/9)**2;line(c,0,horizon+f*(h-horizon),w,horizon+f*(h-horizon));}}
 c.globalAlpha=.7;c.strokeStyle=d.accent;line(c,0,horizon,w,horizon);c.globalAlpha=1;
 for(let i=0;i<(reduced?12:32);i++){const x=(i*137+t*(water?.35:.15))%w,y=(i*89+t*(water?2:.2))%h;c.fillStyle=ash?'#D39165':d.accent;c.globalAlpha=.15;c.fillRect(x,y,ash?2:1,water?9:2);}c.globalAlpha=1;
 if(sector===2){c.fillStyle=d.accent;c.globalAlpha=.035;c.fillRect(0,0,w,h);}
 c.restore();
}
