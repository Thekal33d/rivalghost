import {describe,it,expect,vi} from 'vitest';
import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {PublicKey,KeyType,Account,KeyPair} from 'near-api-js';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {guestAuthMessage,encodeNearLogin,DEFAULT_AVATAR} from '@rivalghost/game-data';
import {GuestStore} from './guest-store.js';
import {GuestService} from './guest-service.js';
import {SocialService} from './social.js';
import {EconomyService} from './economy.js';
import {NearAuthService,authCallbackUrl,AUTH_DOMAIN,AUTH_AUDIENCE,AUTH_CLIENT,checkJwt,checkIdentityJwt} from './near-auth.js';
import {AuthNetwork,AuthRelay} from './near-auth-network.js';
import {createGuestServer} from './guest-http.js';
const origin='http://localhost:5173';
function setup(){
 let now=Date.now(),calls=0,ownership=true,corrupt=false;
 const store=new GuestStore(':memory:',origin,()=>now),pair=generateKeyPairSync('ed25519');
 const raw=pair.publicKey.export({type:'spki',format:'der'}).subarray(-32),key=new PublicKey({keyType:KeyType.ED25519,data:raw}).toString();
 const network={deriveKey:async()=>key,ownsImplicitAccount:async()=>ownership};
 const relay={async sign(_jwt:string,payload:number[]){calls++;const signature=sign(null,createHash('sha256').update(Buffer.from(payload)).digest(),pair.privateKey);if(corrupt)signature[0]^=1;return Buffer.from(JSON.stringify({scheme:'Ed25519',signature:[...signature]})).toString('base64');}};
 const exchange=vi.fn(async(code:string)=>code);
 const service=new NearAuthService(store,network,relay,async token=>JSON.parse(token),()=>now,async token=>JSON.parse(token),exchange);
 const proof=(flow:ReturnType<typeof service.begin>)=>JSON.stringify({sub:'test-subject',fatxn:[...encodeNearLogin(flow.challenge)]});
 const guest=()=>{const kp=generateKeyPairSync('ed25519'),publicKey=kp.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('hex'),c=store.challenge(publicKey,'test');return {...store.authenticate(c.nonce,publicKey,sign(null,Buffer.from(guestAuthMessage(c)),kp.privateKey).toString('hex')),kp};};
 return {store,service,network,relay,proof,guest,key,exchange,account:raw.toString('hex'),calls:()=>calls,advance:(n:number)=>now+=n,denyOwnership:()=>ownership=false,corrupt:()=>corrupt=true};
}
describe('NEAR Auth identity boundary',()=>{
 it('uses the exact shared testnet sample callback and a same-origin hosted callback',()=>{expect(authCallbackUrl('http://localhost:3000')).toBe('http://localhost:3000');expect(authCallbackUrl('https://game.example')).toBe('https://game.example/auth/callback');});
 it('binds encoding to the NEP-413 domain and validates nonce length',()=>{const c={id:'x',nonce:'00'.repeat(32),message:'m',recipient:'r',callbackUrl:'c',expiresAt:0};expect(Buffer.from(encodeNearLogin(c)).toString('hex')).toBe('9d010080010000006d'+'00'.repeat(32)+'0100000072010100000063');expect(()=>encodeNearLogin({...c,nonce:'00'})).toThrow();});
 it('uses real RS256 issuer/audience verification, rejecting altered and wrong-audience tokens',async()=>{
  const pair=await generateKeyPair('RS256'),jwk=await exportJWK(pair.publicKey),keys=createLocalJWKSet({keys:[{...jwk,kid:'test'}]});
  const token=await new SignJWT({fatxn:[]}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(`https://${AUTH_DOMAIN}/`).setAudience(AUTH_AUDIENCE).setSubject('subject').setIssuedAt().setExpirationTime('1m').sign(pair.privateKey);
  expect((await checkJwt(token,keys)).sub).toBe('subject');await expect(checkJwt(token.slice(0,-8)+'AAAAAAAA',keys)).rejects.toThrow();
  const wrong=await new SignJWT({}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(`https://${AUTH_DOMAIN}/`).setAudience('wrong').setSubject('subject').setIssuedAt().setExpirationTime('1m').sign(pair.privateKey);await expect(checkJwt(wrong,keys)).rejects.toThrow();
 });
 it('links the existing pilot without replacing its profile or balance, and disables old device recovery',async()=>{
  const x=setup();try{const g=x.guest(),social=new SocialService(x.store),economy=new EconomyService(x.store);economy.join(g.guest);social.saveProfile(g.guest,{username:'TestPilot',avatar:DEFAULT_AVATAR});const before=economy.view(g.guest).balance;
   const flow=x.service.begin('link',g.token,'test'),result=await x.service.complete(flow.challenge.id,flow.binding,g.token,x.proof(flow));
   expect(result.guest.id).toBe(g.guest.id);expect(result.guest.accountId).toBe(x.account);expect(economy.view(result.guest).balance).toBe(before);expect(social.profile(result.guest.id)?.username).toBe('TestPilot');expect(x.store.session(g.token)).toBeNull();expect(x.store.authMethod(result.token)).toBe('near');
   const c=x.store.challenge(g.guest.publicKey,'test');expect(()=>x.store.authenticate(c.nonce,c.publicKey,sign(null,Buffer.from(guestAuthMessage(c)),g.kp.privateKey).toString('hex'))).toThrow('NEAR Auth');
   const second=x.service.begin('signin','','other'),returned=await x.service.complete(second.challenge.id,second.binding,'',x.proof(second));expect(returned.guest.id).toBe(g.guest.id);expect(economy.view(returned.guest).balance).toBe(before);expect(x.store.session(result.token)).not.toBeNull();
  }finally{x.store.close();}
 });
 it('rejects wrong-browser binding, altered messages, duplicate completion and linking conflicts before another charge',async()=>{
  const x=setup();try{const f=x.service.begin('signin','','test');await expect(x.service.complete(f.challenge.id,'f'.repeat(64),'',x.proof(f))).rejects.toThrow();await expect(x.service.complete(f.challenge.id,f.binding,'',JSON.stringify({sub:'test',fatxn:[]}))).rejects.toThrow();expect(x.calls()).toBe(0);
   await x.service.complete(f.challenge.id,f.binding,'',x.proof(f));await expect(x.service.complete(f.challenge.id,f.binding,'',x.proof(f))).rejects.toThrow('already');expect(x.calls()).toBe(1);
   const g=x.guest(),link=x.service.begin('link',g.token,'other');await expect(x.service.complete(link.challenge.id,link.binding,g.token,x.proof(link))).rejects.toThrow('already has');expect(x.calls()).toBe(1);expect(x.store.guest(g.guest.id)?.accountId).toBeNull();
  }finally{x.store.close();}
 });
 it('rejects expired or cancelled flows and stale local sessions',async()=>{
  const x=setup();try{const g=x.guest(),link=x.service.begin('link',g.token,'test');x.store.logout(g.token);await expect(x.service.complete(link.challenge.id,link.binding,g.token,x.proof(link))).rejects.toThrow('session changed');
   const f=x.service.begin('signin','','test');x.service.cancel(f.challenge.id,f.binding,'');await expect(x.service.complete(f.challenge.id,f.binding,'',x.proof(f))).rejects.toThrow();const expired=x.service.begin('signin','','test');x.advance(600001);await expect(x.service.complete(expired.challenge.id,expired.binding,'',x.proof(expired))).rejects.toThrow('expired');expect(x.calls()).toBe(0);
  }finally{x.store.close();}
 });
 it.each(['ownership','signature'])('never issues a session with invalid %s',async kind=>{const x=setup();try{if(kind==='ownership')x.denyOwnership();else x.corrupt();const f=x.service.begin('signin','','test');await expect(x.service.complete(f.challenge.id,f.binding,'',x.proof(f))).rejects.toThrow();expect(x.store.db.prepare('SELECT count(*) n FROM sessions').get()!.n).toBe(0);}finally{x.store.close();}});
 it('single-flights duplicate completions and preserves no-spend disabled mode',async()=>{const x=setup();try{const f=x.service.begin('signin','','test');const results=await Promise.allSettled([x.service.complete(f.challenge.id,f.binding,'',x.proof(f)),x.service.complete(f.challenge.id,f.binding,'',x.proof(f))]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(x.calls()).toBe(1);const disabled=new NearAuthService(x.store,x.network);expect(disabled.status().enabled).toBe(false);expect(()=>disabled.begin('signin','','test')).toThrow('sponsor');}finally{x.store.close();}});
 it('requires the HTTP flow cookie and exact Origin, then rotates into a game session',async()=>{
  const x=setup(),server=createGuestServer(new GuestService(x.store),undefined,undefined,x.service);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('port');const base=`http://127.0.0.1:${address.port}/api/guest/`;
  const post=(path:string,body:unknown,cookie='',originHeader=origin)=>fetch(base+'near-auth/'+path,{method:'POST',headers:{Origin:originHeader,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
  try{const unauth=await fetch(base+'chain/session/begin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({publicKey:'a'.repeat(64)})});expect(unauth.status).toBe(401);expect((await unauth.json()).error).toContain('Sign in with NEAR');
   expect((await post('begin',{mode:'signin'},'','https://evil.example')).status).toBe(403);const start=await post('begin',{mode:'signin'}),c=await start.json(),cookie=start.headers.get('set-cookie')!.split(';')[0];expect(cookie.startsWith('rg_near_flow=')).toBe(true);
   const q=new URL(c.authorizationUrl).searchParams,proof={id:c.id,code:JSON.stringify({sub:'test',nonce:q.get('nonce')}),state:q.get('state')};expect((await post('complete',proof)).status).toBe(400);const done=await post('complete',proof,cookie);expect(done.status).toBe(200);expect((await done.json()).authMethod).toBe('near');const session=done.headers.get('set-cookie')!.split(';')[0];expect((await(await fetch(base+'me',{headers:{Cookie:session}})).json()).authMethod).toBe('near');
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));x.store.close();}
 });
 it('fails closed on unknown RPC errors',async()=>{const n=new AuthNetwork(),k=KeyPair.fromRandom('ed25519').getPublicKey();vi.spyOn(n,'assertNetwork').mockResolvedValue();vi.spyOn(n.rpc,'viewAccount').mockRejectedValue(new Error('timeout'));await expect(n.ownsImplicitAccount(Buffer.from(k.data).toString('hex'),k.toString())).rejects.toThrow('timeout');});
 it('reserves sponsored spending before submission and never refunds an uncertain send',async()=>{
  const x=setup(),n=new AuthNetwork();vi.spyOn(n,'assertNetwork').mockResolvedValue();vi.spyOn(n.rpc,'viewGasPrice').mockResolvedValue({gas_price:'100000000'});const send=vi.spyOn(Account.prototype,'signAndSendTransaction').mockRejectedValue(new Error('uncertain'));
  try{const relay=new AuthRelay(x.store,n,{accountId:'sponsor.testnet',privateKey:KeyPair.fromRandom('ed25519').toString(),dailyBudget:300000000000000n*1000000000n+1n,maxDailyRequests:1,gasPriceCap:1000000000n});await expect(relay.sign('token',[1],'one')).rejects.toThrow('uncertain');await expect(relay.sign('token',[1],'two')).rejects.toThrow('allowance');expect(send).toHaveBeenCalledTimes(1);expect(send.mock.calls[0][0].receiverId).toBe('fast-auth.testnet');expect(x.store.db.prepare('SELECT count(*) n FROM auth_signing_reservations').get()!.n).toBe(1);
  }finally{send.mockRestore();x.store.close();}
 });
});

describe('OIDC identity login with separate economy consent',()=>{
 it('requests only identity, keeps PKCE verifier server-side, checks it at exchange and never signs or funds a login',async()=>{
  const x=setup();try{
   const f=x.service.beginIdentity('signin','','oidc'),q=new URL(f.challenge.authorizationUrl).searchParams;
   expect(q.has('audience')).toBe(false);expect(q.has('nep413')).toBe(false);expect(q.get('scope')).toBe('openid');expect(q.get('code_challenge_method')).toBe('S256');
   const privateChallenge=JSON.parse(String(x.store.db.prepare('SELECT challenge FROM near_login_flows WHERE id=?').get(f.challenge.id)!.challenge));
   expect(q.get('code_challenge')).toBe(createHash('sha256').update(privateChallenge.verifier).digest('base64url'));expect(JSON.stringify(f.challenge)).not.toContain(privateChallenge.verifier);
   const code=JSON.stringify({sub:'oidc-subject',nonce:q.get('nonce')}),result=await x.service.completeIdentity(f.challenge.id,f.binding,'',code,q.get('state'));
   expect(x.exchange).toHaveBeenCalledWith(code,privateChallenge.verifier,authCallbackUrl(origin));expect(result.guest.accountId).toBe(x.account);expect(x.store.authMethod(result.token)).toBe('near');expect(x.calls()).toBe(0);
   expect(String(x.store.db.prepare('SELECT challenge FROM near_login_flows WHERE id=?').get(f.challenge.id)!.challenge)).not.toContain(privateChallenge.verifier);
   await expect(x.service.completeIdentity(f.challenge.id,f.binding,'',code,q.get('state'))).rejects.toThrow('already');expect(x.exchange).toHaveBeenCalledTimes(1);
  }finally{x.store.close();}
 });
 it.each(['cookie','state','nonce','ownership','expiry','cancel'])('rejects invalid %s without issuing an identity session',async kind=>{
  const x=setup();try{
   const f=x.service.beginIdentity('signin','','oidc'),q=new URL(f.challenge.authorizationUrl).searchParams;
   if(kind==='ownership')x.denyOwnership();if(kind==='expiry')x.advance(600001);if(kind==='cancel')x.service.cancel(f.challenge.id,f.binding,'');
   const code=JSON.stringify({sub:'subject',nonce:kind==='nonce'?'wrong':q.get('nonce')});
   await expect(x.service.completeIdentity(f.challenge.id,kind==='cookie'?'f'.repeat(64):f.binding,'',code,kind==='state'?'wrong':q.get('state'))).rejects.toThrow();
   expect(x.store.db.prepare('SELECT count(*) n FROM sessions').get()!.n).toBe(0);expect(x.calls()).toBe(0);
   if(['cookie','state','expiry','cancel'].includes(kind))expect(x.exchange).not.toHaveBeenCalled();
  }finally{x.store.close();}
 });
 it('single-flights a code exchange and refuses legacy message proof for an OIDC flow',async()=>{
  const x=setup();try{
   const f=x.service.beginIdentity('signin','','oidc'),q=new URL(f.challenge.authorizationUrl).searchParams;
   await expect(x.service.complete(f.challenge.id,f.binding,'','unused')).rejects.toThrow('current login flow');
   const complete=()=>x.service.completeIdentity(f.challenge.id,f.binding,'',JSON.stringify({sub:'subject',nonce:q.get('nonce')}),q.get('state'));
   const results=await Promise.allSettled([complete(),complete()]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(x.exchange).toHaveBeenCalledTimes(1);
  }finally{x.store.close();}
 });
 it('verifies real ID-token signatures, client audience, nonce claim, issuer and authorized party',async()=>{
  const pair=await generateKeyPair('RS256'),jwk=await exportJWK(pair.publicKey),keys=createLocalJWKSet({keys:[{...jwk,kid:'oidc'}]});
  const token=(payload:Record<string,unknown>={nonce:'one-time'},aud:string|string[]=AUTH_CLIENT,iss=`https://${AUTH_DOMAIN}/`)=>new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'oidc'}).setIssuer(iss).setAudience(aud).setSubject('subject').setIssuedAt().setExpirationTime('1m').sign(pair.privateKey);
  expect((await checkIdentityJwt(await token(),keys)).nonce).toBe('one-time');
  await expect(checkIdentityJwt(await token({},AUTH_CLIENT),keys)).rejects.toThrow();
  await expect(checkIdentityJwt(await token({nonce:'n'},AUTH_AUDIENCE),keys)).rejects.toThrow();
  await expect(checkIdentityJwt(await token({nonce:'n'},AUTH_CLIENT,'https://wrong.example/'),keys)).rejects.toThrow();
  await expect(checkIdentityJwt(await token({nonce:'n',azp:'other'}),keys)).rejects.toThrow();
  await expect(checkIdentityJwt(await token({nonce:'n'},[AUTH_CLIENT,'other']),keys)).rejects.toThrow();
  const valid=await token();await expect(checkIdentityJwt(valid.slice(0,-12)+'AAAAAAAAAAAA',keys)).rejects.toThrow();
 });
 it('preserves a linked pilot and rejects account collisions without merging identities',async()=>{
  const x=setup();try{
   const g=x.guest(),f=x.service.beginIdentity('link',g.token,'oidc'),q=new URL(f.challenge.authorizationUrl).searchParams;
   const result=await x.service.completeIdentity(f.challenge.id,f.binding,g.token,JSON.stringify({sub:'subject',nonce:q.get('nonce')}),q.get('state'));
   expect(result.guest.id).toBe(g.guest.id);expect(x.store.session(g.token)).toBeNull();
   const other=x.guest(),f2=x.service.beginIdentity('link',other.token,'other'),q2=new URL(f2.challenge.authorizationUrl).searchParams;
   await expect(x.service.completeIdentity(f2.challenge.id,f2.binding,other.token,JSON.stringify({sub:'subject',nonce:q2.get('nonce')}),q2.get('state'))).rejects.toThrow('another pilot');
   expect(x.store.guest(other.guest.id)?.accountId).toBeNull();
  }finally{x.store.close();}
 });
});
