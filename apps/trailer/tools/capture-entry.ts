import {createExpedition,houndInput} from '@rivalghost/sim';
import {CHAPTERS,type ChapterId} from '@rivalghost/game-data';
import {drawExpedition} from '../../web/src/expedition-art';
import {flightView} from '../../web/src/flight-view';
const games=new Map<number, {frames:any[];events:any[]}>();
function load(chapter:number){
 let g=games.get(chapter);if(g)return g;
 const sim=createExpedition({chapter:chapter as ChapterId,rig:'fan',seed:CHAPTERS[chapter].seed,rulesVersion:3});
 const frames=[sim.snapshot()];
 while(!sim.snapshot().finished){sim.step(houndInput(sim.snapshot(),'ace'));frames.push(sim.snapshot());}
 g={frames,events:[...sim.events]};games.set(chapter,g);return g;
}
const canvas=document.querySelector('canvas')!;
(window as any).drawFrame=(chapter:number,tick:number,trail?:any,restoration=0)=>{
 const g=load(chapter), s=g.frames[Math.min(Math.floor(tick),g.frames.length-1)];
 canvas.width=1920;canvas.height=1080;
 const c=canvas.getContext('2d')!;
 // Wider capture gutters keep rotated game labels inside the film's safe area.
 const view={...flightView(1920,1080),scale:2.25,x:240,y:135};
 drawExpedition(c,s,g.events.filter(e=>e.tick<=s.tick),false,undefined,view,'RIVAL',trail,restoration);
 return canvas.toDataURL('image/png').split(',')[1];
};
