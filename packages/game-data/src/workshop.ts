export const RECIPES = [
  {id:'afterglow',name:'Afterglow',salvage:4,fee:4,color:'#ff705e',description:'A coral ribbon with diamond sparks.'},
  {id:'ion',name:'Ion Wake',salvage:9,fee:6,color:'#75e5c1',description:'Twin mint contrails from the rebuilt city.'},
  {id:'sunflare',name:'Sunflare',salvage:12,fee:8,color:'#f6c85f',description:'A golden comet tail. Made from your recoveries.'},
] as const;
export type TrailId=typeof RECIPES[number]['id'];
export const JOBS=[
  {id:'recovery',name:'MOTH / Recovery line',goal:'Destroy 12 enemies',salvage:4,credits:0},
  {id:'courier',name:'MOTH / Bring them home',goal:'Rescue 2 couriers',salvage:6,credits:0},
  {id:'commission',name:'HOUND / Buy your ghost',goal:'Score 12,000 points without using Pulse',salvage:2,credits:8},
] as const;
export type JobId=typeof JOBS[number]['id'];
export const repairStage=(salvage:number)=>salvage>=60?3:salvage>=30?2:salvage>=10?1:0;
export const REPAIR_NAMES=['BLACKOUT','SIGNAL RETURNING','STREETS RELIT','DISTRICT REBORN'] as const;
