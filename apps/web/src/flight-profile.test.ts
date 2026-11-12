import { describe,expect,it } from "vitest";
import { createExpedition } from "@rivalghost/sim";
import { emptyProfile,parseProfile,recordFlight,isUnlocked,medalCount } from "./flight-profile";

describe("local campaign progression",()=>{
  const game=createExpedition({seed:313,chapter:0,rig:"fan"});
  while(!game.snapshot().finished)game.step(0);
  const result=game.result(),replay=game.replay();
  it("unlocks the next chapter only on a clear and preserves the previous profile",()=>{
    const initial=emptyProfile();const next=recordFlight(initial,result,replay);
    expect(result.cleared).toBe(true);
    expect(isUnlocked(next,1)).toBe(true);expect(isUnlocked(next,2)).toBe(false);
    expect(medalCount(next)).toBe(1);expect(initial.medals).toEqual([0,0,0]);
    expect(next.bests['0:fan'].score).toBe(result.score);
    expect(parseProfile(JSON.stringify(next))).toEqual(next);
  });
  it("separates daily records from story medals and expires old daily bests",()=>{
    const initial=emptyProfile();
    const dayOne=recordFlight(initial,{...result,chapter:2},{...replay,chapter:2},"2026-11-12");
    expect(dayOne.medals).toEqual([0,0,0]);expect(dayOne.bests).toEqual({});
    const dayTwo=recordFlight(dayOne,{...result,chapter:2,rig:"guard"},{...replay,chapter:2,rig:"guard"},"2026-11-13");
    expect(Object.keys(dayTwo.daily.bests)).toEqual(["2:guard"]);
  });
  it("recovers from broken saves and refuses invalid ghosts",()=>{
    expect(parseProfile("{broken")).toEqual(emptyProfile());
    const p=parseProfile(JSON.stringify({version:2,medals:[900,-1,null],bests:{'0:fan':{score:100,replay:{...replay,rulesVersion:1}}}}));
    expect(p.medals).toEqual([0,0,0]);expect(p.bests).toEqual({});
  });
});
