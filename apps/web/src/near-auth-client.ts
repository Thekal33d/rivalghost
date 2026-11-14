import {nearSdk,sdkAccount,sdkDelegate,logoutSdk,type NearSdkConfig,type DelegateFlow} from './near-sdk';
// Official Browser SDK login/signing plus server-held PKCE for the API session.
// https://github.com/Peersyst/fast-auth/blob/bef019afd049c6637dd21be6629050762b943c18/packages/providers/javascript/src/provider.ts
const PENDING='rivalghost.near-login.v1';
type Config=NearSdkConfig;
let finishing:Promise<unknown>|undefined;
export async function authRequest(path:string,body?:unknown){
 const response=await fetch('/api/guest/near-auth/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error??'NEAR sign-in is unavailable.');return data;
}
async function setup(){const c:Config=await authRequest('config');if(!c.enabled)throw new Error('NEAR sign-in is not enabled on this site yet. Keep playing locally.');
 return {...await nearSdk(c),c};}
export async function beginNearLogin(mode:'link'|'signin'){
 sessionStorage.removeItem('rivalghost.auth.error');finishing=undefined;
 const {client}=await setup();await client.login();
 const account=await sdkAccount(client);
 // A browser SDK login is not an API credential. The independent server PKCE
 // handshake binds the verified identity to the same SDK-derived account key.
 const challenge=await authRequest('begin',{mode,expectedPublicKey:account.publicKey});
 const url=new URL(challenge.authorizationUrl);
 if(challenge.proofMode!=='oidc'||url.origin!=='https://login.testnet.fast-auth.com'||url.pathname!=='/authorize'||url.searchParams.has('audience'))throw new Error('Invalid NEAR login configuration.');
 sessionStorage.setItem(PENDING,JSON.stringify({challenge,returnTo:location.pathname}));
 location.assign(url.href);
}
async function finish(){
 const pending=JSON.parse(sessionStorage.getItem(PENDING)??'null');if(!pending?.challenge?.id)throw new Error('No pending login in this browser. Start again from the hangar.');
 let result;
 if(!pending.economy){
  if(pending.challenge.proofMode!=='oidc')throw new Error('Login has been updated. Start a fresh sign-in from the game.');
  const query=new URLSearchParams(location.search);
  if(query.has('error'))throw new Error('NEAR sign-in: '+(query.get('error_description')??query.get('error')));
  result=await authRequest('complete',{id:pending.challenge.id,code:query.get('code'),state:query.get('state')});
 }else{
  const {client,provider,c}=await setup();
  const query=new URLSearchParams(location.search);
  if(query.has('error'))throw new Error('NEAR sign-in: '+(query.get('error_description')??query.get('error')));
  if(!await provider.isLoggedIn())throw new Error('NEAR Auth could not complete the SDK callback. Start a fresh authorization.');
  const signer=await client.getSigner(),{signatureRequest}=await signer.getSignatureRequest();
  if(signatureRequest.guardId!==`jwt#https://${c.domain}/`||typeof signatureRequest.verifyPayload!=='string'||JSON.stringify(Array.from(signatureRequest.signPayload))!==JSON.stringify(pending.challenge.payload))throw new Error('The approved signing request does not match this game session.');
  const jwt=signatureRequest.verifyPayload;
  result=await(await import('./chain-client')).chainHttp('chain/session/complete',{id:pending.challenge.id,jwt});
 }
 sessionStorage.removeItem('rivalghost.auth.error');sessionStorage.removeItem(PENDING);history.replaceState({},'',typeof pending.returnTo==='string'&&pending.returnTo.startsWith('/')&&!pending.returnTo.startsWith('//')&&!pending.returnTo.startsWith('/auth/')?pending.returnTo:'/');
 return {...result,economyAuthorized:!!pending.economy};
}
export function finishNearLogin(){return finishing??=finish().catch(e=>{sessionStorage.setItem('rivalghost.auth.error',e instanceof Error?e.message:'Sign-in could not finish.');sessionStorage.removeItem(PENDING);history.replaceState({},'','/');throw e;});}
export async function clearNearLogin(){sessionStorage.removeItem(PENDING);await logoutSdk();}

export async function beginEconomySession(publicKey:string){
 const me=await(await import('./chain-client')).chainHttp('me');
 if(me.authMethod!=='near'||!me.guest?.accountId)throw new Error('Complete step 1: sign in with NEAR before authorizing a game session.');
 sessionStorage.removeItem('rivalghost.auth.error');finishing=undefined;
 const {client,provider,c}=await setup();
 if(!await provider.isLoggedIn())await client.login();
 const account=await sdkAccount(client);
 if(account.accountId!==me.guest.accountId)throw new Error('The SDK account differs from your signed-in pilot. Sign out and reconnect the intended account.');
 const flow:DelegateFlow=await(await import('./chain-client')).chainHttp('chain/session/begin',{publicKey});
 const delegateAction=await sdkDelegate(flow,account.accountId,publicKey);
 sessionStorage.setItem(PENDING,JSON.stringify({economy:true,challenge:{id:flow.id,payload:flow.payload},returnTo:location.pathname+location.search}));
 await account.signer.requestDelegateActionSignature({delegateAction,redirectUri:c.callbackUrl});
}
