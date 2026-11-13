import {Auth0Client} from '@auth0/auth0-spa-js';
import {encodeNearLogin,type NearLoginChallenge} from '@rivalghost/game-data';
// Compatibility bridge for NEAR Auth upstream bef019a: published SDK 1.4.x lacks NEP-413.
// https://github.com/Peersyst/fast-auth/blob/bef019afd049c6637dd21be6629050762b943c18/packages/providers/javascript/src/provider.ts
const PENDING='rivalghost.near-login.v1';
interface Config {enabled:boolean;domain:string;clientId:string;signingAudience:string;callbackUrl:string}
let client:Auth0Client|undefined,finishing:Promise<unknown>|undefined;
export async function authRequest(path:string,body?:unknown){
 const response=await fetch('/api/guest/near-auth/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error??'NEAR sign-in is unavailable.');return data;
}
async function setup(){const c:Config=await authRequest('config');if(!c.enabled)throw new Error('NEAR sign-in is waiting for its testnet sponsor. Keep playing locally.');
 if(c.domain!=='login.testnet.fast-auth.com'||c.signingAudience!=='auth0.jwt.fast-auth.testnet'||![location.origin,location.origin+'/auth/callback'].includes(c.callbackUrl))throw new Error('Sign-in configuration does not match this game.');
 client??=new Auth0Client({domain:c.domain,clientId:c.clientId,cacheLocation:'memory',authorizationParams:{redirect_uri:c.callbackUrl}});return {client,c};}
export async function beginNearLogin(mode:'link'|'signin'){
 sessionStorage.removeItem('rivalghost.auth.error');
 const {client,c}=await setup(),challenge:NearLoginChallenge=await authRequest('begin',{mode});
 sessionStorage.setItem(PENDING,JSON.stringify({challenge,returnTo:location.pathname+location.search}));
 await client.loginWithRedirect({authorizationParams:{audience:c.signingAudience,scope:'transaction:sign',nep413:Array.from(encodeNearLogin(challenge)),redirect_uri:c.callbackUrl}});
}
async function finish(){
 const pending=JSON.parse(sessionStorage.getItem(PENDING)??'null');if(!pending?.challenge?.id)throw new Error('No pending login in this browser. Start again from the hangar.');
 const {client,c}=await setup();await client.handleRedirectCallback();
 const jwt=await client.getTokenSilently({authorizationParams:{audience:c.signingAudience}});
 const result=pending.economy?await(await import('./chain-client')).chainHttp('chain/session/complete',{id:pending.challenge.id,jwt}):await authRequest('complete',{id:pending.challenge.id,jwt});
 sessionStorage.removeItem('rivalghost.auth.error');sessionStorage.removeItem(PENDING);history.replaceState({},'',typeof pending.returnTo==='string'&&pending.returnTo.startsWith('/')&&!pending.returnTo.startsWith('//')&&!pending.returnTo.startsWith('/auth/')?pending.returnTo:'/');
 return result;
}
export function finishNearLogin(){return finishing??=finish().catch(e=>{sessionStorage.setItem('rivalghost.auth.error',e instanceof Error?e.message:'Sign-in could not finish.');sessionStorage.removeItem(PENDING);history.replaceState({},'','/');throw e;});}
export async function clearNearLogin(){sessionStorage.removeItem(PENDING);if(client)await client.logout({openUrl:false});}

export async function beginEconomySession(publicKey:string){
 const {client,c}=await setup();const flow=await(await import('./chain-client')).chainHttp('chain/session/begin',{publicKey});
 sessionStorage.setItem(PENDING,JSON.stringify({economy:true,challenge:{id:flow.id},returnTo:location.pathname+location.search}));
 await client.loginWithRedirect({authorizationParams:{audience:c.signingAudience,scope:'transaction:sign',delegateAction:flow.payload,redirect_uri:c.callbackUrl}});
}
