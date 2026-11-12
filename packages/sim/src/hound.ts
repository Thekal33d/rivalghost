import {createExpedition,simulateExpedition,type ExpeditionSnapshot,type ExpeditionConfig} from './expedition.js';
export type HoundStyle='chaser'|'rescuer'|'ace';
export const HOUND_STYLES:HoundStyle[]=['chaser','rescuer','ace'];
/** Input-only controller. No writes to game state, future RNG, target scores or health. */
export function houndInput(a:ExpeditionSnapshot,style:HoundStyle):number {
  const p=a.player,foe=a.foes.find(f=>f.kind==='boss')??a.foes.find(f=>f.y>0);
  const drops=a.pickups.filter(v=>v.y>210&&v.y<600).sort((a,b)=>Math.abs(a.y-p.y)-Math.abs(b.y-p.y));
  const target=style==='chaser'?{x:foe?.x??180,y:530}:drops[0]??{x:foe?.x??180,y:490};
  const moves=[[0,0],[0,-4],[3,-3],[4,0],[3,3],[0,4],[-3,3],[-4,0],[-3,-3]];
  let best=Infinity,input=0;
  for(let d=0;d<9;d++){
    const [dx,dy]=moves[d];let cost=0;
    for(const f of (style==='ace'?[4,8,12]:[4,8])){
      const x=Math.max(20,Math.min(340,p.x+dx*f)),y=Math.max(210,Math.min(610,p.y+dy*f));
      cost+=(Math.abs(x-target.x)+Math.abs(y-target.y))*.04;
      for(const b of a.bolts)if(!b.friendly){const dist=Math.max(Math.abs(x-b.x-b.vx*f),Math.abs(y-b.y-b.vy*f));if(dist<22)cost+=(22-dist)*(style==='chaser'?3:15);}
      for(const h of a.hazards)if(a.tick-h.born+f>=40&&(h.axis==='horizontal'?Math.abs(y-h.y!)<27:h.axis==='blast'?Math.hypot(x-h.x,y-h.y!)<48:Math.abs(x-h.x)<27))cost+=200;
      for(const e of a.foes)if(Math.abs(e.x-x)<28&&Math.abs(e.y-y)<35)cost+=300;
    }
    if(cost<best){best=cost;input=d;}
  }
  if(a.pulseCooldown===0&&a.bolts.some(b=>!b.friendly&&Math.abs(b.x-p.x)<70&&Math.abs(b.y-p.y)<100))input|=16;
  return input;
}
export function flyHound(config:ExpeditionConfig,style:HoundStyle){
  const game=createExpedition(config);let input=0;
  while(!game.snapshot().finished){const a=game.snapshot();if(a.tick%(style==='chaser'?12:style==='rescuer'?6:1)===0)input=houndInput(a,style);game.step(input);}
  const replay=game.replay(),result=simulateExpedition(replay);
  if(result.score!==game.result().score)throw new Error('HOUND replay did not reproduce');
  return {style,replay,result};
}
