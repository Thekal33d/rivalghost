import {afterEach,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {sdkDelegate,nearSdk} from './near-sdk';
const require=createRequire(import.meta.url);
const serverRequire=createRequire(new URL('../../relayer/package.json',import.meta.url));
const {DelegateAction,PublicKey,KeyType,actions,encodeDelegateAction}=serverRequire('near-api-js');
const raw=Buffer.alloc(32,7),actor=raw.toString('hex'),deviceKey='11'.repeat(32),key=new PublicKey({keyType:KeyType.ED25519,data:raw});
function fixture(){
 const until=Date.now()+3600000,contractId='game.rivalghost-ops-thekal33d.testnet';
 const descriptor={actor,nonce:'1',maxBlockHeight:'999',publicKey:key.toString(),deviceKey,until};
 const d=new DelegateAction({senderId:actor,receiverId:contractId,nonce:1n,maxBlockHeight:999n,publicKey:key,actions:[actions.functionCall('join',{},20000000000000n,0n),actions.functionCall('set_session',{public_key:[...Buffer.from(deviceKey,'hex')],until},20000000000000n,0n)]});
 return {id:'flow',payload:[...encodeDelegateAction(d)] as number[],contractId,until,descriptor};
}
afterEach(()=>vi.unstubAllGlobals());
it('matches the official frontend delegate encoding to the actual server NEAR 7 encoding',async()=>{
 const f=fixture(),delegate=await sdkDelegate(f,actor,deviceKey);
 expect(delegate.senderId).toBe(actor);expect(delegate.receiverId).toBe(f.contractId);
});
it('rejects changed account, contract, device and encoded payload before opening consent',async()=>{
 const f=fixture();
 for(const flow of [{...f,contractId:'attacker.testnet'},{...f,payload:[1,2,3]},{...f,descriptor:{...f.descriptor,deviceKey:'22'.repeat(32)}},{...f,descriptor:{...f.descriptor,actor:'33'.repeat(32)}}])await expect(sdkDelegate(flow,actor,deviceKey)).rejects.toThrow();
});
it('rejects an untrusted SDK provider configuration before loading SDK code',()=>{
 vi.stubGlobal('location',{origin:'https://rivalghost.xyz'});
 expect(()=>nearSdk({enabled:true,domain:'attacker.example',clientId:'x',signingAudience:'x',callbackUrl:'https://rivalghost.xyz'})).toThrow('configuration');
});
it('the installed official-provider patch retrieves only the exact approved token',async()=>{
 const {JavascriptProvider}=require('@fast-auth-near/javascript-provider');
 const provider=Object.create(JavascriptProvider.prototype);
 const jwt=['e30',Buffer.from(JSON.stringify({fatxn:[1,2,3]})).toString('base64url'),'sig'].join('.');
 provider.options={domain:'login.testnet.fast-auth.com',signingAudience:'auth0.jwt.fast-auth.testnet'};
 provider.client={getTokenSilently:vi.fn(async()=>jwt),getIdTokenClaims:vi.fn(async()=>({sub:'subject'}))};
 expect((await provider.getSignatureRequest()).signatureRequest.signPayload).toEqual([1,2,3]);
 expect(provider.client.getTokenSilently).toHaveBeenCalledWith({cacheMode:'cache-only',authorizationParams:{audience:'auth0.jwt.fast-auth.testnet',scope:'transaction:sign'}});
 provider.client.getTokenSilently.mockResolvedValue(undefined);
 await expect(provider.getSignatureRequest()).rejects.toThrow('approved signing token');
});
