import {isIP} from 'node:net';
import {ChainError} from './chain-relay.js';
import type {ChainEconomy} from './chain-economy.js';
import type {ChainSessionAuth} from './chain-auth.js';
import {NearAuthService,NearAuthError} from './near-auth.js';
import type {NearCompute} from './near-compute.js';
import {WorkshopError} from './workshop.js';
import {createServer,type IncomingMessage,type ServerResponse} from "node:http";
import {SocialService,SocialError} from "./social.js";
import {EconomyService,EconomyError,simulateEconomyWeek} from "./economy.js";
import {GuestService} from "./guest-service.js";
import type {Guest} from "./guest-store.js";
export interface VerificationGateway {verify(guest:Guest,submission:{challengeId:string;replay:unknown}):Promise<unknown>}
const token=(req:IncomingMessage)=>req.headers.cookie?.split(";").map(s=>s.trim()).find(s=>s.startsWith("rg_guest="))?.slice(9)??"";
function send(res:ServerResponse,status:number,body:unknown,cookie?:string){res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(cookie?{"Set-Cookie":cookie}:{})});res.end(JSON.stringify(body));}
async function json(req:IncomingMessage){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>128*1024)throw new Error("Request too large");chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
// Only the local reverse proxy may supply this header; Caddy overwrites it.
export function proxyClientIp(remote:string|undefined,header:string|string[]|undefined,trust:boolean){
  return trust&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote??'')&&typeof header==='string'&&isIP(header)?header:remote??'unknown';
}
export function createGuestServer(service:GuestService,gateway?:VerificationGateway,compute?:NearCompute,nearAuth?:NearAuthService,chain?:{economy:ChainEconomy;auth:ChainSessionAuth},options:{trustLoopbackProxy?:boolean}={}){
  const store=service.store,social=new SocialService(store),secure=store.origin.startsWith("https:");
  const cookie=(value:string,age=43200)=>`rg_guest=${value}; HttpOnly; SameSite=Strict; Path=/api/guest; Max-Age=${age}${secure?"; Secure":""}`;
  let economy:EconomyService|undefined;
  const pit=()=>economy??(economy=new EconomyService(store));
  const server=createServer(async(req,res)=>{
    try {
    const session=token(req),guest=store.session(session),clientIp=proxyClientIp(req.socket.remoteAddress,req.headers['x-rivalghost-client-ip'],options.trustLoopbackProxy===true);
    if(req.method==='GET'&&req.url==='/api/guest/health'){store.db.prepare('SELECT 1').get();send(res,200,{ok:true});return;}
    const authBinding=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('rg_near_flow='))?.slice(13)??'';
    const authCookie=(value:string)=>`rg_near_flow=${value}; HttpOnly; SameSite=Strict; Path=/api/guest/near-auth; Max-Age=600${secure?'; Secure':''}`;
    if(req.method==='GET'&&req.url==='/api/guest/chain/config'){send(res,200,chain?await chain.economy.status(guest):{enabled:false,mode:'local-demo'});return;}
    if(req.method==='GET'&&req.url==='/api/guest/near-auth/config'){send(res,200,nearAuth?.status()??{enabled:false});return;}
    if(req.method==="GET"&&req.url==="/api/guest/me"){send(res,200,{guest,onlineAvailable:service.configured,authMethod:store.authMethod(session)});return;}
    if(req.method==="GET"&&req.url==="/api/guest/compute"){store.rate("compute-read",60);send(res,200,{...(compute?.status()??{enabled:false,dailyLimit:0,callsToday:0,source:"local"}),stake:await compute?.stake()??{state:"not-configured"}});return;}
    if(req.method==="GET"&&req.url==="/api/guest/workshop"){store.rate("workshop-read",180);send(res,200,await (chain?.economy??pit()).workshop(guest));return;}
    if(req.method==="GET"&&req.url==="/api/guest/economy"){store.rate("pit-read-global",180);store.rate("pit-read-ip:"+clientIp,60);send(res,200,await (chain?.economy??pit()).view(guest));return;}
    if(req.method==="GET"&&req.url?.startsWith("/api/guest/social/")){
      store.rate("social-read-global",300);store.rate("social-read-ip:"+clientIp,90);
      const url=new URL(req.url,store.origin);
      if(url.pathname==="/api/guest/social/me"){send(res,200,{profile:guest?social.profile(guest.id):null});return;}
      if(url.pathname==="/api/guest/social/board"){send(res,200,social.board(url.searchParams,guest));return;}
      if(url.pathname==="/api/guest/social/ghost"){const run=social.challenge(url.searchParams.get("id")??"");send(res,run?200:404,run??{error:"This ghost link has expired or does not exist."});return;}
      send(res,404,{error:"Route not found"});return;
    }
    if(req.method!=="POST"||req.headers.origin!==store.origin){send(res,403,{error:"Use RivalGhost from its configured origin"});return;}
    if(req.headers["content-type"]?.split(";")[0]!=="application/json"){send(res,415,{error:"JSON required"});return;}
    if(Number(req.headers["content-length"]??0)>128*1024){send(res,413,{error:"Request too large"});return;}
      store.rate("requests-global",120);store.rate("requests-ip:"+clientIp,30);
      const input=await json(req);
      if(!input||typeof input!=="object")throw new Error("Invalid guest request");
      if(req.url==="/api/guest/challenge") {send(res,200,store.challenge(input.publicKey,clientIp));return;}
      if(req.url==="/api/guest/session") {
        if(typeof input.nonce!=="string"||typeof input.publicKey!=="string"||typeof input.signature!=="string")throw new Error("Invalid guest proof");
        const signed=store.authenticate(input.nonce,input.publicKey,input.signature);send(res,200,{guest:signed.guest,onlineAvailable:service.configured},cookie(signed.token));return;
      }
      if(req.url?.startsWith('/api/guest/near-auth/')){
        if(!nearAuth){send(res,503,{error:'NEAR Auth sponsorship is not configured.'});return;}
        if(req.url.endsWith('/begin')){const flow=nearAuth.beginIdentity(input.mode,session,clientIp);send(res,200,flow.challenge,authCookie(flow.binding));return;}
        if(typeof input.id!=='string')throw new NearAuthError('Invalid login request.');
        if(req.url.endsWith('/cancel')){nearAuth.cancel(input.id,authBinding,session);send(res,200,{ok:true},authCookie(''));return;}
        if(req.url.endsWith('/complete')){req.setTimeout(90000);const signed=await nearAuth.completeIdentity(input.id,authBinding,session,input.code,input.state);send(res,200,{guest:signed.guest,authMethod:'near',onlineAvailable:service.configured},cookie(signed.token));return;}
        send(res,404,{error:'Auth route not found'});return;
      }
      if(!guest){send(res,401,{error:req.url?.startsWith('/api/guest/chain/')?"Sign in with NEAR before authorizing a game session or using the on-chain economy.":"Reconnect your saved pilot"});return;}
      if(req.url?.startsWith('/api/guest/chain/')){
        if(!chain){send(res,503,{error:'On-chain economy is not enabled'});return;}
        if(store.authMethod(session)!=='near')throw new NearAuthError('Sign in with NEAR before using the on-chain economy.');
        req.setTimeout(90000);
        if(req.url.endsWith('/session/begin')){send(res,200,await chain.auth.begin(guest,session,input.publicKey));return;}
        if(req.url.endsWith('/session/complete')){send(res,200,await chain.auth.complete(guest,session,input.id,input.jwt));return;}
        if(req.url.endsWith('/execute')){send(res,200,await chain.economy.execute(guest,input.intent,input.requestId));return;}
        if(req.url.endsWith('/settle')){send(res,200,await chain.economy.settle(guest,input.id,input.replay));return;}
        send(res,404,{error:'Unknown chain route'});return;
      }
      if(chain&&['/api/guest/workshop/action','/api/guest/economy/join','/api/guest/economy/start','/api/guest/economy/settle','/api/guest/economy/defend'].includes(req.url??''))throw new ChainError('A signed on-chain action is required. Refresh the game client.');
      if(req.url==="/api/guest/workshop/action"){send(res,200,pit().work(guest,input));return;}
      if(req.url==="/api/guest/economy/join"){send(res,200,pit().join(guest));return;}
      if(req.url==="/api/guest/economy/start"){send(res,200,pit().start(guest,input.crown));return;}
      if(req.url==="/api/guest/economy/settle"){send(res,200,pit().settle(guest,input.id,input.replay));return;}
      if(req.url==="/api/guest/economy/defend"){send(res,200,pit().defend(guest,input.crown));return;}
      if(req.url==="/api/guest/economy/lab"){store.rate("pit-lab-global",3);send(res,200,simulateEconomyWeek());return;}
      if(req.url==="/api/guest/social/profile"){send(res,200,{profile:social.saveProfile(guest,input)});return;}
      if(req.url==="/api/guest/social/publish"){send(res,200,social.publish(guest,input));return;}
      if(req.url==="/api/guest/social/rival"){send(res,200,social.follow(guest,input.id,input.follow));return;}
      if(req.url==="/api/guest/logout"){store.logout(session);send(res,200,{ok:true},cookie("",0));return;}
      if(req.url==="/api/guest/provision"){
        if(store.authMethod(session)==="near"){send(res,409,{error:"NEAR Auth account provisioning uses a separate flow."});return;}
        if(!service.configured){send(res,503,{error:"Online rivalry is not available yet. Your local pilot is saved."});return;}
        try{send(res,200,{guest:await service.provision(guest),onlineAvailable:true});}catch{send(res,503,{error:"Account setup is pending or sponsorship is paused. Keep playing locally and retry later."});}return;
      }
      if(req.url==="/api/guest/verify") {
        if(!gateway||guest.state!=="ready"||!guest.accountId){send(res,503,{error:"Online competition is not ready"});return;}
        if(typeof input.challengeId!=="string"||!input.replay)throw new Error("Invalid replay submission");
        try{send(res,200,await gateway.verify(guest,{challengeId:input.challengeId,replay:input.replay}));}catch{send(res,503,{error:"Replay verification is unavailable or rejected. No settlement was claimed."});}return;
      }
      send(res,404,{error:"Route not found"});
    }catch(error){send(res,error instanceof Error&&/Too many attempts/.test(error.message)?429:400,{error:error instanceof ChainError||error instanceof NearAuthError||error instanceof WorkshopError||error instanceof SocialError||error instanceof EconomyError?error.message:error instanceof Error&&/attempts|capacity|proof|public key/.test(error.message)?error.message:"Invalid guest request",...(error instanceof ChainError&&error.transactionHash?{transactionHash:error.transactionHash}:{})});}
  });server.requestTimeout=10000;server.headersTimeout=5000;server.timeout=20000;server.maxHeadersCount=30;
  let stopped=false,thinking=false;
  const heartbeat=setInterval(()=>{if(chain){if(!thinking){thinking=true;void chain.economy.tick().catch(()=>console.error('On-chain NPC tick pending or rejected; no local economic fallback.')).finally(()=>{thinking=false;});}return;}try{economy?.tick();if(economy&&compute&&!thinking){thinking=true;const world=economy.workshop(null);void compute.decide(world.moth.stock,world.districts.filter(n=>n>=60).length).then(d=>{if(!stopped)economy?.setFocus(d.focus);}).catch(()=>{}).finally(()=>{thinking=false;});}}catch{console.error('HOUND tick failed; no partial economy write committed.');}},15000);heartbeat.unref();server.on('close',()=>{stopped=true;clearInterval(heartbeat);});return server;
}
