import type {FlightProfile} from './flight-profile';
export const JOURNEY_KEY='rivalghost.player-journey.v1';
export interface Journey {version:1;welcomed:boolean;tutorial:'new'|'skipped'|'complete';legacy:boolean}
export const newJourney=():Journey=>({version:1,welcomed:false,tutorial:'new',legacy:false});
export function parseJourney(raw:string|null,profile:FlightProfile,previousWallet=false):Journey{
 if(raw){try{const j=JSON.parse(raw);if(j.version===1&&typeof j.welcomed==='boolean'&&typeof j.legacy==='boolean'&&['new','skipped','complete'].includes(j.tutorial))return j;}catch{/* Repair the journey without changing campaign saves. */}}
 const legacy=previousWallet||profile.attempts.some(n=>n>0)||profile.medals.some(n=>n>0)||Object.keys(profile.bests).length>0;
 return {...newJourney(),legacy,welcomed:legacy};
}
export const FEATURES=[
 {id:'rivals',name:'Rival ghosts',clears:0,flight:true,description:'Race other pilots and share your own flight.',reward:'Finish your first story flight'},
 {id:'workshop',name:'MOTH’s Workshop',clears:1,description:'Fly salvage jobs and meet the city’s mechanic.',reward:'Clear Chapter 01'},
 {id:'needle',name:'Needle rig',clears:1,description:'A precise, hard-hitting alternative to Fan.',reward:'Clear Chapter 01'},
 {id:'daily',name:'Daily signal',clears:2,description:'A fresh expert route with the same seed for every pilot.',reward:'Clear 2 story chapters'},
 {id:'guard',name:'Guard rig',clears:2,description:'A shielded ship for close calls and rescues.',reward:'Clear 2 story chapters'},
 {id:'craft',name:'Craft & equip',clears:2,description:'Turn salvage into your signature cosmetic trail.',reward:'Clear 2 story chapters'},
 {id:'market',name:'Pilot market',clears:3,description:'Trade crafted cosmetics with other pilots.',reward:'Clear 3 story chapters'},
 {id:'pit',name:'Crown Pit',clears:4,description:'Challenge a recorded rival for an on-chain CR purse.',reward:'Clear 4 story chapters'},
 {id:'city',name:'City restoration',clears:5,description:'Donate salvage to bring the districts back to life.',reward:'Clear 5 story chapters'},
 {id:'commission',name:'HOUND commissions',clears:6,description:'Sell a verified flight recording to your rival.',reward:'Clear 6 story chapters'},
 {id:'compute',name:'NPC reactor',clears:7,description:'Discover how NPC decisions and their compute pool work.',reward:'Clear 7 story chapters'},
] as const;
export type Feature=typeof FEATURES[number]['id'];
export function clearedChapters(p:FlightProfile){return p.medals.filter(n=>n&1).length;}
export function featureOpen(id:Feature,p:FlightProfile,j:Journey){const f=FEATURES.find(f=>f.id===id)!;return j.legacy||('flight' in f?p.attempts.some(n=>n>0):clearedChapters(p)>=f.clears);}
export function newlyUnlocked(before:FlightProfile,after:FlightProfile,j:Journey){return FEATURES.filter(f=>!featureOpen(f.id,before,j)&&featureOpen(f.id,after,j));}
export const screenFeature={board:'rivals',workshop:'workshop',pit:'pit'} as const;
