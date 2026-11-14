import {describe,it,expect} from 'vitest';
import {walkthroughPosition} from './walkthrough-position';
describe('walkthrough viewport safety',()=>{
 it('keeps short-phone controls reachable when the results target is below the fold',()=>{
  for(const [vw,vh] of [[320,568],[390,600],[390,844],[844,390],[1440,900]])for(const top of [-2000,100,900,2400]){
   const p=walkthroughPosition({top,left:20,width:300,height:80},{w:360,h:280},vw,vh);
   expect(p.top).toBeGreaterThanOrEqual(16);expect(p.top+280).toBeLessThanOrEqual(vh-16);
   expect(p.left).toBeGreaterThanOrEqual(16);expect(p.left+p.width).toBeLessThanOrEqual(vw-16);
  }
 });
 it('clamps a card taller than the viewport for a scrollable sheet',()=>{
  expect(walkthroughPosition(null,{w:360,h:800},320,568)).toEqual({left:16,top:16,width:288});
 });
});
