import { describe,expect,it } from "vitest";
import { CHAPTERS,RIGS } from "@rivalghost/game-data";
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
    expect(medalCount(next)).toBe(1);expect(initial.medals).toEqual(CHAPTERS.map(()=>0));
    expect(next.bests['0:fan'].score).toBe(result.score);
    expect(parseProfile(JSON.stringify(next))).toEqual(next);
  });
  it("separates daily records from story medals and expires old daily bests",()=>{
    const initial=emptyProfile();
    const dayOne=recordFlight(initial,{...result,chapter:2},{...replay,chapter:2},"2026-11-12");
    expect(dayOne.medals).toEqual(CHAPTERS.map(()=>0));expect(dayOne.bests).toEqual({});
    const dayTwo=recordFlight(dayOne,{...result,chapter:2,rig:"guard"},{...replay,chapter:2,rig:"guard"},"2026-11-13");
    expect(Object.keys(dayTwo.daily.bests)).toEqual(["2:guard"]);
  });
  it("extends a three-chapter save without losing medals, attempts or a ghost",()=>{
    const old={version:2,medals:[7,3,1],attempts:[2,4,1],bests:{"0:fan":{score:result.score,replay}}};
    const migrated=parseProfile(JSON.stringify(old));
    expect(migrated.medals).toEqual([7,3,1,0,0,0,0,0,0,0]);
    expect(migrated.attempts).toEqual([2,4,1,0,0,0,0,0,0,0]);
    expect(migrated.bests).toEqual(old.bests);
    expect(isUnlocked(migrated,3)).toBe(true);
    expect(isUnlocked(migrated,4)).toBe(false);
  });
  it("unlocks ten chapters in order and preserves all thirty rig records",()=>{
    let profile=emptyProfile();
    for(const chapter of CHAPTERS) {
      expect(isUnlocked(profile,chapter.id)).toBe(true);
      for(const rig of RIGS) {
        profile=recordFlight(profile,{...result,chapter:chapter.id,rig:rig.id,cleared:true,rescues:3,damageTaken:0},{...replay,chapter:chapter.id,rig:rig.id});
      }
      for(const locked of CHAPTERS.slice(chapter.id+2))expect(isUnlocked(profile,locked.id)).toBe(false);
    }
    expect(medalCount(profile)).toBe(30);
    expect(Object.keys(profile.bests)).toHaveLength(30);
    expect(parseProfile(JSON.stringify(profile))).toEqual(profile);
    expect(profile.attempts).toEqual(CHAPTERS.map(()=>3));
  });
  it("keeps v2 ghosts and new v3 bests in separate slots without losing medals",()=>{
    const previous=recordFlight(emptyProfile(),result,replay);
    const next=recordFlight(previous,{...result,rulesVersion:3,score:1},{...replay,rulesVersion:3});
    expect(next.bests["0:fan"]).toEqual(previous.bests["0:fan"]);
    expect(next.bests["v3:0:fan"].score).toBe(1);
    expect(parseProfile(JSON.stringify(next))).toEqual(next);
  });
  it("recovers from broken saves and refuses invalid ghosts",()=>{
    expect(parseProfile("{broken")).toEqual(emptyProfile());
    const p=parseProfile(JSON.stringify({version:2,medals:[900,-1,null],bests:{'0:fan':{score:100,replay:{...replay,rulesVersion:1}}}}));
    expect(p.medals).toEqual(CHAPTERS.map(()=>0));expect(p.bests).toEqual({});
  });
});
