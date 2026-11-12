import { validateExpedition, type ExpeditionReplay, type ExpeditionResult } from "@rivalghost/sim";
import { type ChapterId, type Rig } from "@rivalghost/game-data";

export const PROFILE_KEY="rivalghost.ghost-signal.v2";
export interface BestFlight { score:number; replay:ExpeditionReplay }
export interface FlightProfile { version:2; medals:number[]; attempts:number[]; bests:Record<string,BestFlight>; daily:{key:string;bests:Record<string,BestFlight>} }
export const emptyProfile=():FlightProfile=>({version:2,medals:[0,0,0],attempts:[0,0,0],bests:{},daily:{key:"",bests:{}}});
export const flightKey=(chapter:ChapterId,rig:Rig)=>`${chapter}:${rig}`;
export const isUnlocked=(profile:FlightProfile,chapter:ChapterId)=>chapter===0||Boolean(profile.medals[chapter-1]&1);
export const medalCount=(profile:FlightProfile)=>profile.medals.reduce((sum,mask)=>sum+[1,2,4].filter(bit=>mask&bit).length,0);
export const callsign=(profile:FlightProfile)=>medalCount(profile)>=7?"GHOSTBREAKER":medalCount(profile)>=3?"SIGNAL RUNNER":"ROOKIE ACE";
function cleanBests(value:unknown, daily=false):Record<string,BestFlight> {
  if(!value||typeof value!=="object")return {};
  const clean:Record<string,BestFlight>={};
  for(const [key,entry] of Object.entries(value).slice(0,12)) {
    if(!/^[012]:(needle|fan|guard)$/.test(key)||!entry||typeof entry!=="object")continue;
    const best=entry as BestFlight;
    if(!Number.isSafeInteger(best.score)||best.score<0||best.score>1e9)continue;
    try{validateExpedition(best.replay);if(key!==flightKey(best.replay.chapter,best.replay.rig))continue;if(daily&&best.replay.chapter!==2)continue;clean[key]={score:best.score,replay:best.replay};}catch{/* Ignore obsolete or damaged local ghosts. */}
  }
  return clean;
}
export function parseProfile(raw:string|null):FlightProfile {
  if(!raw)return emptyProfile();
  try{
    const data=JSON.parse(raw);if(data?.version!==2)return emptyProfile();
    const p=emptyProfile();
    for(let i=0;i<3;i++) {
      const medal=data.medals?.[i],attempt=data.attempts?.[i];
      p.medals[i]=Number.isInteger(medal)&&medal>=0&&medal<=7?medal:0;
      p.attempts[i]=Number.isSafeInteger(attempt)&&attempt>=0?Math.min(attempt,100000):0;
    }
    p.bests=cleanBests(data.bests);
    if(/^\d{4}-\d{2}-\d{2}$/.test(data.daily?.key??""))p.daily={key:data.daily.key,bests:cleanBests(data.daily.bests,true)};
    return p;
  }catch{return emptyProfile();}
}
export function recordFlight(profile:FlightProfile,result:ExpeditionResult,replay:ExpeditionReplay,dailyKey?:string):FlightProfile {
  const next:FlightProfile={...profile,medals:[...profile.medals],attempts:[...profile.attempts],bests:{...profile.bests},daily:{key:dailyKey??profile.daily.key,bests:dailyKey&&dailyKey!==profile.daily.key?{}:{...profile.daily.bests}}};
  const key=flightKey(result.chapter,result.rig),bests=dailyKey?next.daily.bests:next.bests;
  if(!bests[key]||result.score>bests[key].score)bests[key]={score:result.score,replay};
  if(!dailyKey){
    next.attempts[result.chapter]++;
    const earned=(result.cleared?1:0)|(result.rescues>=2?2:0)|(result.cleared&&result.damageTaken===0?4:0);
    next.medals[result.chapter]|=earned;
  }
  return next;
}
