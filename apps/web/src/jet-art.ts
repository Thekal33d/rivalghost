import type {Rig} from '@rivalghost/game-data';

/** One authored silhouette shared by SVG loadouts and the live canvas. Facing right. */
export const JET_WINGS='M48 38 32 8 48 11 83 38 86 62 48 89 32 92 48 62Z';
export const JET_BODY='M23 40 65 35 99 40 126 50 99 60 65 65 23 60 32 50Z';
export const JET_PANELS='M42 16 52 19 72 35 56 33ZM42 84 52 81 72 65 56 67Z';
export const JET_COCKPIT='M74 42 98 44 109 50 98 56 74 58 67 50Z';
export const JET_COLOR:Record<Rig,string>={needle:'#F3ECDC',fan:'#7DF5C0',guard:'#FFD166'};
let paths:Path2D[]|undefined;
export function drawJet(c:CanvasRenderingContext2D,x:number,y:number,rig:Rig,tick:number,ghost=false){
 paths??=[JET_WINGS,JET_BODY,JET_PANELS,JET_COCKPIT].map(p=>new Path2D(p));
 c.save();c.translate(x,y);c.rotate(-Math.PI/2);c.scale(.52,rig==='needle'?.43:rig==='guard'?.59:.52);c.translate(-70,-50);
 c.lineJoin='round';c.strokeStyle=ghost?'#B79CFF':'#0B1418';c.lineWidth=4;
 if(ghost){c.globalAlpha=.48;c.setLineDash([5,4]);c.fillStyle='#B79CFF22';for(const p of paths.slice(0,2)){c.fill(p);c.stroke(p);}c.restore();return;}
 const tail=13+(tick%6)*1.3;
 c.fillStyle='#FFD166';c.beginPath();c.moveTo(28,43);c.lineTo(8-tail,50);c.lineTo(28,57);c.fill();
 c.fillStyle='#FFF3C4';c.beginPath();c.moveTo(28,46);c.lineTo(10,50);c.lineTo(28,54);c.fill();
 c.fillStyle=JET_COLOR[rig];for(const p of paths.slice(0,2)){c.fill(p);c.stroke(p);}
 c.fillStyle='#E4FFF1';c.fill(paths[2]);c.fillStyle='#0B1418';c.fill(paths[3]);c.stroke(paths[3]);
 c.fillStyle='#A7D8CE';c.beginPath();c.moveTo(77,45);c.lineTo(97,47);c.lineTo(101,50);c.lineTo(76,50);c.closePath();c.fill();
 c.strokeStyle='#28766A';c.lineWidth=2;c.beginPath();c.moveTo(40,44);c.lineTo(62,43);c.moveTo(40,56);c.lineTo(62,57);c.stroke();
 c.fillStyle='#FF6B4A';c.fillRect(46,29,8,5);c.fillRect(46,66,8,5);c.restore();
}
export function drawPatrol(c:CanvasRenderingContext2D,x:number,y:number,kind:string,hit:boolean){
 c.save();c.translate(x,y);
 if(kind==='turret'){c.strokeStyle='#FF6B4A';c.lineWidth=1;c.globalAlpha=.4;c.beginPath();c.arc(0,0,24,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.fillStyle=hit?'#FFF3C4':'#A1493C';c.strokeStyle='#0B1418';c.lineWidth=2.5;c.beginPath();for(let n=0;n<16;n++){const a=n*Math.PI/8,r=n%2?11:20;n?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();c.fillStyle='#FFAD7C';c.beginPath();c.arc(0,0,8,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#F3ECDC';c.beginPath();c.arc(-2,-2,2,0,Math.PI*2);c.fill();c.restore();return;}
 c.rotate(Math.PI/2);const large=kind==='weaver';c.scale(large?1.25:1,large?1.25:1);
 c.fillStyle=hit?'#FFF3C4':large?'#B79CFF':'#FF6B4A';c.strokeStyle='#0B1418';c.lineWidth=2.5;c.lineJoin='round';
 c.beginPath();c.moveTo(23,0);c.lineTo(8,-12);c.lineTo(-7,-13);c.lineTo(-15,-22);c.lineTo(-25,-18);c.lineTo(-18,-7);c.lineTo(-25,0);c.lineTo(-18,7);c.lineTo(-25,18);c.lineTo(-15,22);c.lineTo(-7,13);c.lineTo(8,12);c.closePath();c.fill();c.stroke();
 c.fillStyle='#0B1418';c.beginPath();c.moveTo(14,0);c.lineTo(1,-6);c.lineTo(-10,-5);c.lineTo(-12,0);c.lineTo(-10,5);c.lineTo(1,6);c.closePath();c.fill();c.fillStyle='#F3ECDC';c.beginPath();c.ellipse(0,0,4,3,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#F3ECDC';c.globalAlpha=.45;c.lineWidth=2;c.beginPath();c.moveTo(-12,-15);c.lineTo(-6,-9);c.lineTo(7,-8);c.stroke();c.restore();
}
