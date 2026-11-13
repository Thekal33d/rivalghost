import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({oauth:{loginWithRedirect:vi.fn(),handleRedirectCallback:vi.fn(),getTokenSilently:vi.fn(),logout:vi.fn()},chain:vi.fn()}));
vi.mock('@auth0/auth0-spa-js',()=>({Auth0Client:class {constructor(){return mocks.oauth;}}}));
vi.mock('./chain-client',()=>({chainHttp:mocks.chain}));
let values:Map<string,string>,request:ReturnType<typeof vi.fn>;
const config={enabled:true,domain:'login.testnet.fast-auth.com',clientId:'test',signingAudience:'auth0.jwt.fast-auth.testnet',callbackUrl:'http://localhost:3000'};
const challenge={id:'a'.repeat(32),nonce:'b'.repeat(64),recipient:'http://localhost:3000',callbackUrl:'http://localhost:3000',expiresAt:Date.now()+600000,message:'Sign in to RivalGhost'};
beforeEach(()=>{
 vi.resetModules();vi.resetAllMocks();values=new Map();
 vi.stubGlobal('sessionStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
 vi.stubGlobal('location',{origin:'http://localhost:3000',pathname:'/',search:''});vi.stubGlobal('history',{replaceState:vi.fn()});
 request=vi.fn(async(path:string)=>({ok:true,json:async()=>path.endsWith('/config')?config:path.endsWith('/begin')?challenge:{authMethod:'near'}}));vi.stubGlobal('fetch',request);
 mocks.oauth.getTokenSilently.mockResolvedValue('approved-token');
});
afterEach(()=>vi.unstubAllGlobals());
it('uses the approved signing scope without a second silent login and completes once across duplicate callback handlers',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');
 const [a,b]=await Promise.all([api.finishNearLogin(),api.finishNearLogin()]);
 expect(a).toEqual(b);expect(a.economyAuthorized).toBe(false);expect(mocks.oauth.handleRedirectCallback).toHaveBeenCalledTimes(1);
 expect(mocks.oauth.getTokenSilently).toHaveBeenCalledWith({cacheMode:'cache-only',authorizationParams:{audience:config.signingAudience,scope:'transaction:sign'}});
 expect(request.mock.calls.filter(([url])=>url.endsWith('/complete'))).toHaveLength(1);expect(values.has('rivalghost.near-login.v1')).toBe(false);
});
it('never sends an empty signing token to the sponsor and leaves a visible error after callback cleanup',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');mocks.oauth.getTokenSilently.mockResolvedValue(undefined);
 await expect(api.finishNearLogin()).rejects.toThrow('approved signing token');expect(request.mock.calls.some(([url])=>url.endsWith('/complete'))).toBe(false);expect(values.get('rivalghost.auth.error')).toContain('approved signing token');
});
it('allows a fresh attempt after a failed callback instead of reusing the rejected promise',async()=>{
 const api=await import('./near-auth-client');await api.beginNearLogin('signin');mocks.oauth.handleRedirectCallback.mockRejectedValueOnce(new Error('Invalid state'));
 await expect(api.finishNearLogin()).rejects.toThrow('NEAR sign-in callback: Invalid state');
 await api.beginNearLogin('signin');await expect(api.finishNearLogin()).resolves.toMatchObject({authMethod:'near'});expect(mocks.oauth.handleRedirectCallback).toHaveBeenCalledTimes(2);
});
it('does not create a delegated authorization or open OAuth for an unauthenticated browser',async()=>{
 mocks.chain.mockResolvedValue({guest:null});const api=await import('./near-auth-client');await expect(api.beginEconomySession('a'.repeat(64))).rejects.toThrow('Complete step 1');expect(mocks.chain).toHaveBeenCalledTimes(1);expect(request).not.toHaveBeenCalled();expect(mocks.oauth.loginWithRedirect).not.toHaveBeenCalled();
});
it('binds a signed-in authorization return to its delegated flow and reports game-session completion',async()=>{
 mocks.chain.mockImplementation(async(path:string)=>path==='me'?{authMethod:'near',guest:{accountId:'a'.repeat(64)}}:path.endsWith('/begin')?{id:'flow-id',payload:[1,2,3]}:{settled:true,transactionHash:'receipt'});
 const api=await import('./near-auth-client');await api.beginEconomySession('b'.repeat(64));
 expect(mocks.oauth.loginWithRedirect.mock.calls[0][0].authorizationParams.delegateAction).toEqual([1,2,3]);
 expect(await api.finishNearLogin()).toMatchObject({settled:true,economyAuthorized:true});expect(mocks.chain).toHaveBeenLastCalledWith('chain/session/complete',{id:'flow-id',jwt:'approved-token'});
});
