import {createServer,type IncomingMessage,type ServerResponse} from "node:http";
import {SocialService,SocialError} from "./social.js";
import {GuestService} from "./guest-service.js";
import type {Guest} from "./guest-store.js";
export interface VerificationGateway {verify(guest:Guest,submission:{challengeId:string;replay:unknown}):Promise<unknown>}
const token=(req:IncomingMessage)=>req.headers.cookie?.split(";").map(s=>s.trim()).find(s=>s.startsWith("rg_guest="))?.slice(9)??"";
function send(res:ServerResponse,status:number,body:unknown,cookie?:string){res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(cookie?{"Set-Cookie":cookie}:{})});res.end(JSON.stringify(body));}
async function json(req:IncomingMessage){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>128*1024)throw new Error("Request too large");chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
export function createGuestServer(service:GuestService,gateway?:VerificationGateway){
  const store=service.store,social=new SocialService(store),secure=store.origin.startsWith("https:");
  const cookie=(value:string,age=43200)=>`rg_guest=${value}; HttpOnly; SameSite=Strict; Path=/api/guest; Max-Age=${age}${secure?"; Secure":""}`;
  const server=createServer(async(req,res)=>{
    try {
    const session=token(req),guest=store.session(session);
    if(req.method==="GET"&&req.url==="/api/guest/me"){send(res,200,{guest,onlineAvailable:service.configured});return;}
    if(req.method==="GET"&&req.url?.startsWith("/api/guest/social/")){
      store.rate("social-read-global",300);store.rate("social-read-ip:"+req.socket.remoteAddress,90);
      const url=new URL(req.url,store.origin);
      if(url.pathname==="/api/guest/social/me"){send(res,200,{profile:guest?social.profile(guest.id):null});return;}
      if(url.pathname==="/api/guest/social/board"){send(res,200,social.board(url.searchParams,guest));return;}
      if(url.pathname==="/api/guest/social/ghost"){const run=social.challenge(url.searchParams.get("id")??"");send(res,run?200:404,run??{error:"This ghost link has expired or does not exist."});return;}
      send(res,404,{error:"Route not found"});return;
    }
    if(req.method!=="POST"||req.headers.origin!==store.origin){send(res,403,{error:"Use RivalGhost from its configured origin"});return;}
    if(req.headers["content-type"]?.split(";")[0]!=="application/json"){send(res,415,{error:"JSON required"});return;}
    if(Number(req.headers["content-length"]??0)>128*1024){send(res,413,{error:"Request too large"});return;}
      store.rate("requests-global",120);store.rate("requests-ip:"+req.socket.remoteAddress,30);
      const input=await json(req);
      if(!input||typeof input!=="object")throw new Error("Invalid guest request");
      if(req.url==="/api/guest/challenge") {send(res,200,store.challenge(input.publicKey,req.socket.remoteAddress??"unknown"));return;}
      if(req.url==="/api/guest/session") {
        if(typeof input.nonce!=="string"||typeof input.publicKey!=="string"||typeof input.signature!=="string")throw new Error("Invalid guest proof");
        const signed=store.authenticate(input.nonce,input.publicKey,input.signature);send(res,200,{guest:signed.guest,onlineAvailable:service.configured},cookie(signed.token));return;
      }
      if(!guest){send(res,401,{error:"Reconnect your saved pilot"});return;}
      if(req.url==="/api/guest/social/profile"){send(res,200,{profile:social.saveProfile(guest,input)});return;}
      if(req.url==="/api/guest/social/publish"){send(res,200,social.publish(guest,input));return;}
      if(req.url==="/api/guest/social/rival"){send(res,200,social.follow(guest,input.id,input.follow));return;}
      if(req.url==="/api/guest/logout"){store.logout(session);send(res,200,{ok:true},cookie("",0));return;}
      if(req.url==="/api/guest/provision"){
        if(!service.configured){send(res,503,{error:"Online rivalry is not available yet. Your local pilot is saved."});return;}
        try{send(res,200,{guest:await service.provision(guest),onlineAvailable:true});}catch{send(res,503,{error:"Account setup is pending or sponsorship is paused. Keep playing locally and retry later."});}return;
      }
      if(req.url==="/api/guest/verify") {
        if(!gateway||guest.state!=="ready"||!guest.accountId){send(res,503,{error:"Online competition is not ready"});return;}
        if(typeof input.challengeId!=="string"||!input.replay)throw new Error("Invalid replay submission");
        try{send(res,200,await gateway.verify(guest,{challengeId:input.challengeId,replay:input.replay}));}catch{send(res,503,{error:"Replay verification is unavailable or rejected. No settlement was claimed."});}return;
      }
      send(res,404,{error:"Route not found"});
    }catch(error){send(res,error instanceof Error&&/Too many attempts/.test(error.message)?429:400,{error:error instanceof SocialError?error.message:error instanceof Error&&/attempts|capacity|proof|public key/.test(error.message)?error.message:"Invalid guest request"});}
  });server.requestTimeout=10000;server.headersTimeout=5000;server.timeout=20000;server.maxHeadersCount=30;return server;
}
