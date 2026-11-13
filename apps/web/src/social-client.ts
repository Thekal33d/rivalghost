import {DEFAULT_AVATAR,validateAvatar,validateUsername,type SocialProfile,type PilotAvatar} from '@rivalghost/game-data';
import type {ExpeditionReplay} from '@rivalghost/sim';
import {getOrCreatePilotKey,signGuestChallenge} from './guest-key';
export interface SharedGhost {id:string;pilot:SocialProfile;mode:'story'|'daily';day:string;chapter:number;rig:string;score:number;replay:ExpeditionReplay}
export interface BoardRow {rank:number;id:string;pilot:SocialProfile;score:number;following:boolean;you:boolean}
export interface Board {rivals:SocialProfile[];rows:BoardRow[];yourRank:number|null;total:number;day:string;retentionDays:number}
export const IDENTITY_KEY='rivalghost.pilot-profile.v1';
export function cachedIdentity():SocialProfile|null{try{const p=JSON.parse(localStorage.getItem(IDENTITY_KEY)??'null');return p&&/^[a-f0-9]{64}$/.test(p.id)?{id:p.id,username:validateUsername(p.username),avatar:validateAvatar(p.avatar)}:null;}catch{return null;}}
export async function socialRequest(path:string,body?:unknown){
  let response:Response;
  try{response=await fetch('/api/guest/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});}catch{throw new Error('The game service is unavailable. Your local progress is safe.');}
  let data;try{data=await response.json();}catch{throw new Error('The game service is unavailable. Keep flying and try again later.');}
  if(!response.ok)throw new Error(data.error??'The request could not be completed.');return data;
}
export async function ensurePilotSession(){
  const current=await socialRequest('me');
  if(current.authMethod==='near'&&current.guest)return;
  const key=await getOrCreatePilotKey();
  if(current.guest?.publicKey===key.publicKey)return;
  const challenge=await socialRequest('challenge',{publicKey:key.publicKey});
  const signature=await signGuestChallenge(key,challenge,location.origin);
  await socialRequest('session',{nonce:challenge.nonce,publicKey:key.publicKey,signature});
}
export async function saveIdentity(username:string,avatar:PilotAvatar):Promise<SocialProfile>{
  validateUsername(username);validateAvatar(avatar);await ensurePilotSession();return (await socialRequest('social/profile',{username,avatar})).profile;
}
export async function publishFlight(replay:ExpeditionReplay,mode:'story'|'daily',day?:string):Promise<SharedGhost>{await ensurePilotSession();return socialRequest('social/publish',{replay,mode,day});}
export const blankAvatar=()=>({...DEFAULT_AVATAR});
export const ghostLink=(id:string)=>`${location.origin}/?ghost=${encodeURIComponent(id)}`;
