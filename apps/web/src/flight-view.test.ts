import {it,expect} from 'vitest';
import {flightView,worldPoint,screenDirection} from './flight-view';
it('maps portrait and landscape pointer input to the same simulation point without stretching',()=>{
  for(const [width,height] of [[390,690],[1440,750],[2560,900],[740,300]]){
    const view=flightView(width,height),x=180,y=540;
    const screenX=view.x+(view.landscape?640-y:x)*view.scale;
    const screenY=view.y+(view.landscape?x:y)*view.scale;
    expect(worldPoint(view,screenX,screenY)).toEqual({x,y});
    expect(view.x).toBeGreaterThanOrEqual(0);expect(view.y).toBeGreaterThanOrEqual(0);
  }
});
it('maps desktop arrow directions to screen movement while preserving neutral input',()=>{
  expect(screenDirection(0,true)).toBe(0);
  expect([1,3,5,7].map(d=>screenDirection(d,true))).toEqual([7,1,3,5]);
  expect([1,2,3,4,5,6,7,8].map(d=>screenDirection(d,false))).toEqual([1,2,3,4,5,6,7,8]);
});
