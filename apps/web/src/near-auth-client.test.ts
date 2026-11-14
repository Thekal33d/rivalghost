import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({provider:{isLoggedIn:vi.fn()},client:{login:vi.fn(),getSigner:vi.fn()},signer:{getSignatureRequest:vi.fn(),requestDelegateActionSignature:vi.fn()},sdk:vi.fn(),account:vi.fn(),delegate:vi.fn(),logout:vi.fn(),chain:vi.fn()}));
vi.mock('./near-sdk',()=>({nearSdk:m.sdk,sdkAccount:m.account,sdkDelegate:m.delegate,logoutSdk:m.logout}));
vi.mock('./chain-client',()=>({chainHttp:m.chain}));
let values:Map<string,string>,request:ReturnType<typeof vi.fn>;
const config={enabled:true,domain:'login.testnet.fast-auth.com',clientId:'np8paqIpMWmNbzT4xAvOOapZBjsOpptl',signingAudience:'auth0.jwt.fast-auth.testnet',callbackUrl:'http://localhost:3000'};
const challenge={id:'a'.repeat(32),proofMode:'oidc',authorizationUrl:'https://login.testnet.fast-auth.com/authorize?scope=openid'};
beforeEach(()=>{
 vi.resetModules();vi.resetAllMocks();values=new Map();
 vi.stubGlobal('sessionStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
 vi.stubGlobal('location',{origin:'http://localhost:3000',pathname:'/',search:'?code=one-use-code&state=bound-state',assign:vi.fn()});vi.stubGlobal('history',{replaceState:vi.fn()});
 request=vi.fn(async(path:string)=>({ok:true,json:async()=>path.endsWith('/config')?config:path.endsWith('/begin')?challenge:{authMethod:'near'}}));vi.stubGlobal('fetch',request);
 m.sdk.mockResolvedValue({client:m.client,provider:m.provider});m.provider.isLoggedIn.mockResolvedValue(true);m.client.getSigner.mockResolvedValue(m.signer);
 m.account.mockResolvedValue({signer:m.signer,publicKey:'ed25519:sdk-key',accountId:'a'.repeat(64)});m.delegate.mockResolvedValue({delegate:'checked'});
 m.signer.getSignatureRequest.mockResolvedValue({signatureRequest:{guardId:'jwt#https://login.testnet.fast-auth.com/',verifyPayload:'approved-token',signPayload:[1,2,3]}});
 m.chain.mockImplementation(async(path:string)=>path==='me'?{authMethod:'near',guest:{accountId:'a'.repeat(64)}}:path.endsWith('/begin')?{id:'flow-id',payload:[1,2,3]}:{settled:true,transactionHash:'receipt'});
});
afterEach(()=>vi.unstubAllGlobals());
it('uses official SDK login and binds the derived key to the independent server PKCE login',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');
 expect(m.client.login).toHaveBeenCalledTimes(1);expect(m.account).toHaveBeenCalledWith(m.client);
 const begin=request.mock.calls.find(([url])=>url.endsWith('/begin')) as unknown as [string,RequestInit];expect(JSON.parse(begin[1].body as string)).toEqual({mode:'signin',expectedPublicKey:'ed25519:sdk-key'});
 expect(location.assign).toHaveBeenCalledWith(challenge.authorizationUrl);
 const [a,b]=await Promise.all([api.finishNearLogin(),api.finishNearLogin()]);expect(a).toEqual(b);expect(a.economyAuthorized).toBe(false);
 const complete=request.mock.calls.filter(([url])=>url.endsWith('/complete'));expect(complete).toHaveLength(1);
 expect(JSON.parse((complete[0] as unknown as [string,RequestInit])[1].body as string)).toEqual({id:challenge.id,code:'one-use-code',state:'bound-state'});
});
it('does not establish a server flow after SDK login is cancelled',async()=>{
 m.client.login.mockRejectedValue(new Error('Popup closed'));const api=await import('./near-auth-client');await expect(api.beginNearLogin('signin')).rejects.toThrow('Popup closed');expect(request.mock.calls.some(([p])=>p.endsWith('/begin'))).toBe(false);
});
it('keeps provider failures visible and permits a fresh login after a failed return',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');vi.stubGlobal('location',{...location,search:'?error=access_denied&error_description=Provider+denied&state=test'});
 await expect(api.finishNearLogin()).rejects.toThrow('Provider denied');expect(values.get('rivalghost.auth.error')).toContain('Provider denied');expect(request.mock.calls.some(([p])=>p.endsWith('/complete'))).toBe(false);
 vi.stubGlobal('location',{...location,search:'?code=fresh&state=fresh'});await api.beginNearLogin('signin');await expect(api.finishNearLogin()).resolves.toMatchObject({authMethod:'near'});
});
it('never treats an old message-signing callback as a new identity login',async()=>{
 values.set('rivalghost.near-login.v1',JSON.stringify({challenge:{id:'old'}}));const api=await import('./near-auth-client');await expect(api.finishNearLogin()).rejects.toThrow('Start a fresh sign-in');expect(request).not.toHaveBeenCalled();
});
it('does not open the SDK or create authorization for an unauthenticated browser',async()=>{
 m.chain.mockResolvedValue({guest:null});const api=await import('./near-auth-client');await expect(api.beginEconomySession('b'.repeat(64))).rejects.toThrow('Complete step 1');expect(m.sdk).not.toHaveBeenCalled();expect(m.chain).toHaveBeenCalledTimes(1);
});
it('rejects an SDK identity different from the verified server pilot before authorization',async()=>{
 m.account.mockResolvedValue({accountId:'f'.repeat(64)});const api=await import('./near-auth-client');await expect(api.beginEconomySession('b'.repeat(64))).rejects.toThrow('differs');expect(m.chain).toHaveBeenCalledTimes(1);
});
it('requests SDK delegate approval and submits its exact approved proof to the restricted relay',async()=>{
 const api=await import('./near-auth-client');await api.beginEconomySession('b'.repeat(64));expect(m.signer.requestDelegateActionSignature).toHaveBeenCalledWith({delegateAction:{delegate:'checked'},redirectUri:config.callbackUrl});
 expect(await api.finishNearLogin()).toMatchObject({settled:true,economyAuthorized:true});expect(m.chain).toHaveBeenLastCalledWith('chain/session/complete',{id:'flow-id',jwt:'approved-token'});
});
it.each(['payload','guard','missing','callback'])('never relays an invalid SDK %s',async kind=>{
 const api=await import('./near-auth-client');await api.beginEconomySession('b'.repeat(64));
 if(kind==='callback')m.provider.isLoggedIn.mockResolvedValue(false);
 else if(kind==='missing')m.signer.getSignatureRequest.mockRejectedValue(new Error('No approved signing token'));
 else m.signer.getSignatureRequest.mockResolvedValue({signatureRequest:{guardId:kind==='guard'?'jwt#wrong':'jwt#https://login.testnet.fast-auth.com/',verifyPayload:'token',signPayload:kind==='payload'?[9]:[1,2,3]}});
 await expect(api.finishNearLogin()).rejects.toThrow();expect(m.chain.mock.calls.some(([p])=>p==='chain/session/complete')).toBe(false);
});
