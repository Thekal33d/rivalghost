import { CHAPTERS, RIGS, type ChapterId, type Rig } from "./expedition.js";

/** Immutable competitive catalog revision. Bump this when any v2 physics changes. */
export const COMPETITION_REVISION = 1 as const;
export interface CompetitionMission { revision:1; chapter:ChapterId; rig:Rig }
export function validateMission(mission:CompetitionMission):void {
  if(!mission || mission.revision!==COMPETITION_REVISION || !CHAPTERS.some(c=>c.id===mission.chapter) || !RIGS.some(r=>r.id===mission.rig))throw new Error("Unsupported competitive mission");
}
export function competitionMessage(seed:number,mission:CompetitionMission):string {
  validateMission(mission);
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error("Invalid mission seed");
  return `RIVALGHOST-MISSION-v2|${mission.revision}|3600|${seed}|${mission.chapter}|${mission.rig}`;
}
export async function competitionHash(seed:number,mission:CompetitionMission):Promise<string> {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(competitionMessage(seed,mission)));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
