import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({oauth:{loginWithRedirect:vi.fn(),handleRedirectCallback:vi.fn(),getTokenSilently:vi.fn(),logout:vi.fn()},chain:vi.fn()}));
vi.mock('@auth0/auth0-spa-js',()=>({Auth0Client:class {constructor(){return mocks.oauth;}}}));
vi.mock('./chain-client',()=>({chainHttp:mocks.chain}));
let values:Map<string,string>,request:ReturnType<typeof vi.fn>;
const config={enabled:true,domain:'login.testnet.fast-auth.com',clientId:'test',signingAudience:'auth0.jwt.fast-auth.testnet',callbackUrl:'http://localhost:3000'};
const challenge={id:'a'.repeat(32),nonce:'b'.repeat(64),recipient:'http://localhost:3000',callbackUrl:'http://localhost:3000',expiresAt:Date.now()+600000,message:'Sign in to RivalGhost',proofMode:'oidc',authorizationUrl:'https://login.testnet.fast-auth.com/authorize?scope=openid'};
beforeEach(()=>{
 vi.resetModules();vi.resetAllMocks();values=new Map();
 vi.stubGlobal('sessionStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
 vi.stubGlobal('location',{origin:'http://localhost:3000',pathname:'/',search:'?code=one-use-code&state=bound-state',assign:vi.fn()});vi.stubGlobal('history',{replaceState:vi.fn()});
 request=vi.fn(async(path:string)=>({ok:true,json:async()=>path.endsWith('/config')?config:path.endsWith('/begin')?challenge:{authMethod:'near'}}));vi.stubGlobal('fetch',request);
 mocks.oauth.getTokenSilently.mockResolvedValue('approved-token');
});
afterEach(()=>vi.unstubAllGlobals());
it('starts identity-only login and completes the server-held PKCE flow once',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');
 expect(location.assign).toHaveBeenCalledWith(challenge.authorizationUrl);expect(mocks.oauth.loginWithRedirect).not.toHaveBeenCalled();
 const [a,b]=await Promise.all([api.finishNearLogin(),api.finishNearLogin()]);
 expect(a).toEqual(b);expect(a.economyAuthorized).toBe(false);expect(mocks.oauth.handleRedirectCallback).not.toHaveBeenCalled();expect(mocks.oauth.getTokenSilently).not.toHaveBeenCalled();
 const complete=request.mock.calls.filter(([url])=>url.endsWith('/complete'));expect(complete).toHaveLength(1);
 expect(JSON.parse((complete[0] as unknown as [string,RequestInit])[1].body as string)).toEqual({id:challenge.id,code:'one-use-code',state:'bound-state'});
});
it('keeps provider failures visible and permits a fresh login after a failed return',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');
 vi.stubGlobal('location',{...location,search:'?error=access_denied&error_description=Provider+denied&state=test'});
 await expect(api.finishNearLogin()).rejects.toThrow('Provider denied');expect(values.get('rivalghost.auth.error')).toContain('Provider denied');expect(request.mock.calls.some(([url])=>url.endsWith('/complete'))).toBe(false);
 vi.stubGlobal('location',{...location,search:'?code=fresh&state=fresh'});await api.beginNearLogin('signin');await expect(api.finishNearLogin()).resolves.toMatchObject({authMethod:'near'});
});
it('never treats an old message-signing callback as a new identity login',async()=>{
 values.set('rivalghost.near-login.v1',JSON.stringify({challenge:{id:'old'}}));
 const api=await import('./near-auth-client');await expect(api.finishNearLogin()).rejects.toThrow('Start a fresh sign-in');expect(request).not.toHaveBeenCalled();
});
it('does not create a delegated authorization or open OAuth for an unauthenticated browser',async()=>{
 mocks.chain.mockResolvedValue({guest:null});const api=await import('./near-auth-client');await expect(api.beginEconomySession('a'.repeat(64))).rejects.toThrow('Complete step 1');expect(mocks.chain).toHaveBeenCalledTimes(1);expect(request).not.toHaveBeenCalled();expect(mocks.oauth.loginWithRedirect).not.toHaveBeenCalled();
});
it('binds a signed-in authorization return to its delegated flow and reports game-session completion',async()=>{
 mocks.chain.mockImplementation(async(path:string)=>path==='me'?{authMethod:'near',guest:{accountId:'a'.repeat(64)}}:path.endsWith('/begin')?{id:'flow-id',payload:[1,2,3]}:{settled:true,transactionHash:'receipt'});
 const api=await import('./near-auth-client');await api.beginEconomySession('b'.repeat(64));
 expect(mocks.oauth.loginWithRedirect.mock.calls[0][0].authorizationParams.delegateAction).toEqual([1,2,3]);
 expect(await api.finishNearLogin()).toMatchObject({settled:true,economyAuthorized:true});expect(mocks.chain).toHaveBeenLastCalledWith('chain/session/complete',{id:'flow-id',jwt:'approved-token'});
 expect(mocks.oauth.getTokenSilently).toHaveBeenCalledWith({cacheMode:'cache-only',authorizationParams:{audience:config.signingAudience,scope:'transaction:sign'}});
});

it('does not submit delegated authorization when the approved signing token is absent',async()=>{
 mocks.chain.mockImplementation(async(path:string)=>path==='me'?{authMethod:'near',guest:{accountId:'a'.repeat(64)}}:{id:'flow-id',payload:[1,2,3]});
 const api=await import('./near-auth-client');await api.beginEconomySession('b'.repeat(64));mocks.oauth.getTokenSilently.mockResolvedValue(undefined);
 await expect(api.finishNearLogin()).rejects.toThrow('approved signing token');expect(mocks.chain.mock.calls.some(([path])=>path==='chain/session/complete')).toBe(false);
});
