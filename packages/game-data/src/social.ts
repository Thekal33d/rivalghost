export const PILOT_PALETTES=[{id:'mint',name:'Afterglow',armor:'#9ddfbb',shade:'#519d88'},{id:'coral',name:'Hotshot',armor:'#ed866a',shade:'#ab5142'},{id:'gold',name:'Sunrunner',armor:'#e9c16d',shade:'#ac8140'},{id:'ice',name:'Cloudbreak',armor:'#a9c8df',shade:'#617e9e'}] as const;
export const PILOT_HELMETS=['crest','antenna','halo'] as const;
export const PILOT_BADGES=['bolt','star','wings'] as const;
export interface PilotAvatar {palette:typeof PILOT_PALETTES[number]['id'];helmet:typeof PILOT_HELMETS[number];badge:typeof PILOT_BADGES[number]}
export interface SocialProfile {id:string;username:string;avatar:PilotAvatar}
export const DEFAULT_AVATAR:PilotAvatar={palette:'mint',helmet:'crest',badge:'bolt'};
export function validateUsername(value:unknown):string {
  if(typeof value!=='string'||!/^[a-zA-Z0-9_]{3,16}$/.test(value.trim()))throw new Error('Use 3–16 letters, numbers or underscores.');
  return value.trim();
}
export function validateAvatar(value:unknown):PilotAvatar {
  const a=value as PilotAvatar;
  if(!a||!PILOT_PALETTES.some(p=>p.id===a.palette)||!PILOT_HELMETS.includes(a.helmet)||!PILOT_BADGES.includes(a.badge))throw new Error('Choose an available avatar style.');
  return {palette:a.palette,helmet:a.helmet,badge:a.badge};
}
