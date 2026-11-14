import {Buffer} from 'buffer';
import type {FastAuthClient} from '@fast-auth-near/browser-sdk';
import type {JavascriptProvider} from '@fast-auth-near/javascript-provider';
export interface NearSdkConfig {enabled:boolean;domain:string;clientId:string;signingAudience:string;callbackUrl:string}
export interface DelegateFlow {id:string;payload:number[];contractId:string;until:number;descriptor:{actor:string;nonce:string;maxBlockHeight:string;publicKey:string;deviceKey:string;until:number}}
// Published NEAR SDKs use Buffer in their browser builds. Load them lazily so
// free play does not download the authentication bundle.
let instance:Promise<{provider:JavascriptProvider;client:FastAuthClient<JavascriptProvider>}>|undefined;
export function nearSdk(config:NearSdkConfig){
 if(config.domain!=='login.testnet.fast-auth.com'||config.clientId!=='np8paqIpMWmNbzT4xAvOOapZBjsOpptl'||config.signingAudience!=='auth0.jwt.fast-auth.testnet'||![location.origin,location.origin+'/auth/callback'].includes(config.callbackUrl))throw new Error('Sign-in configuration does not match this game.');
 return instance??=create(config).catch(error=>{instance=undefined;throw error;});
}
async function create(config:NearSdkConfig){
 (globalThis as typeof globalThis & {Buffer:typeof Buffer}).Buffer??=Buffer;
 (globalThis as typeof globalThis & {global:typeof globalThis}).global??=globalThis;
 const [{FastAuthClient},{JavascriptProvider},{connect}]=await Promise.all([import('@fast-auth-near/browser-sdk'),import('@fast-auth-near/javascript-provider'),import('near-api-js')]);
 const provider=new JavascriptProvider({network:'testnet',clientId:config.clientId,domain:config.domain,signingAudience:config.signingAudience});
 const {connection}=await connect({networkId:'testnet',nodeUrl:'https://test.rpc.fastnear.com'});
 return {provider,client:new FastAuthClient(provider,connection,{fastAuthContractId:'fast-auth.testnet',mpcContractId:'v1.signer-prod.testnet'})};
}
export async function sdkAccount(client:FastAuthClient<JavascriptProvider>){
 const signer=await client.getSigner(),raw=await signer.getPublicKey('ed25519');
 // SDK 1.4.2's declaration says PublicKey, but its RPC method returns a string.
 const {PublicKey}=await import('@near-js/crypto');
 const publicKey=PublicKey.fromString(raw.toString());
 if(!publicKey.toString().startsWith('ed25519:')||publicKey.data.length!==32)throw new Error('Unsupported NEAR account key.');
 return {signer,publicKey:publicKey.toString(),accountId:Buffer.from(publicKey.data).toString('hex')};
}
export async function sdkDelegate(flow:DelegateFlow,actor:string,deviceKey:string){
 (globalThis as typeof globalThis & {Buffer:typeof Buffer}).Buffer??=Buffer;
 (globalThis as typeof globalThis & {global:typeof globalThis}).global??=globalThis;
 const {DelegateAction,actionCreators,encodeDelegateAction}=await import('@near-js/transactions');
 const {PublicKey}=await import('@near-js/crypto');
 const d=flow.descriptor;
 if(!d||d.actor!==actor||d.deviceKey!==deviceKey||d.until!==flow.until||flow.contractId!=='game.rivalghost-ops-thekal33d.testnet'||flow.until<=Date.now()||flow.until>Date.now()+12*3600000||!/^\d+$/.test(d.nonce)||!/^\d+$/.test(d.maxBlockHeight))throw new Error('Game authorization does not match this browser.');
 const key=PublicKey.fromString(d.publicKey);
 if(Buffer.from(key.data).toString('hex')!==actor)throw new Error('Game authorization account changed.');
 const delegateAction=new DelegateAction({senderId:actor,receiverId:flow.contractId,nonce:BigInt(d.nonce),maxBlockHeight:BigInt(d.maxBlockHeight),publicKey:key,actions:[actionCreators.functionCall('join',{},20000000000000n,0n),actionCreators.functionCall('set_session',{public_key:[...Buffer.from(deviceKey,'hex')],until:flow.until},20000000000000n,0n)]});
 if(JSON.stringify([...encodeDelegateAction(delegateAction)])!==JSON.stringify(flow.payload))throw new Error('Game authorization payload changed.');
 return delegateAction;
}
export async function logoutSdk(){if(instance){const {provider}=await instance;await provider.logout({openUrl:false});instance=undefined;}}
