import {embeddedLoginMessage,type EmbeddedChallenge} from '@rivalghost/game-data';
import {chainHttp} from './chain-client';
import {ownerSign,walletUnlocked} from './device-vault';
import {sdkDelegate,type DelegateFlow} from './near-sdk';
const PENDING='rivalghost.embedded.authorization.v1';
export async function loginWallet(accountId:string){
 const c=await chainHttp('embedded/begin',{accountId}) as EmbeddedChallenge;
 if(c.accountId!==accountId||c.origin!==location.origin||!/^([a-f0-9]{64})$/.test(c.nonce)||c.expiresAt<=Date.now()||c.expiresAt>Date.now()+65000)throw new Error('Wallet challenge does not match this site.');
 const signature=await ownerSign(accountId,new TextEncoder().encode(embeddedLoginMessage(c)));
 return chainHttp('embedded/complete',{nonce:c.nonce,signature});
}
export async function authorizeWallet(deviceKey:string){
 const me=await chainHttp('me'),actor=me.guest?.accountId;
 if(me.authMethod!=='embedded'||!actor)throw new Error('Connect your device wallet first.');
 if(localStorage.getItem(PENDING))throw new Error('Recover the pending authorization before starting another.');
 if(!walletUnlocked(actor))throw new Error('Unlock your wallet in Pilot Identity first.');
 const flow=await chainHttp('chain/session/begin',{publicKey:deviceKey}) as DelegateFlow;
 await sdkDelegate(flow,actor,deviceKey);
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(flow.payload)));
 const signature=await ownerSign(actor,digest);
 const pending={id:flow.id,signature,actor};localStorage.setItem(PENDING,JSON.stringify(pending));
 return recoverAuthorization();
}
export async function recoverAuthorization(){
 const pending=JSON.parse(localStorage.getItem(PENDING)??'null'),me=await chainHttp('me');
 if(!pending)throw new Error('No pending wallet authorization.');
 if(me.authMethod!=='embedded'||pending.actor!==me.guest?.accountId)throw new Error('Reconnect the wallet that approved this authorization.');
 try{const result=await chainHttp('chain/session/embedded',{id:pending.id,signature:pending.signature});localStorage.removeItem(PENDING);return result;}
 catch(e){if(e instanceof Error&&/Authorization expired|different session|NEAR rejected|This transaction failed/.test(e.message))localStorage.removeItem(PENDING);throw e;}
}
