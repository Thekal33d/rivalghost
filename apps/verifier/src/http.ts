import {createServer,type ServerResponse,type IncomingMessage} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {ReplayVerificationService,type ReplaySubmission} from "./service.js";
import {RpcUnavailableError} from "@rivalghost/contracts-client";
import {ReplayStorageError} from "./replay-store.js";

const LIMIT=128*1024;
function send(res:ServerResponse,status:number,body:unknown) {res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(body));}
async function body(req:IncomingMessage):Promise<unknown> {
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>LIMIT)throw new Error("Body too large");chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
/** Internal authenticated service. Its credential must NEVER be shipped in the web bundle. */
export function createVerifierServer(service:ReplayVerificationService,token:string) {
  if(token.length<32)throw new Error("Verifier service token must contain at least 32 characters");
  const expected=Buffer.from(`Bearer ${token}`);
  let windowStart=Date.now(),requests=0,busy=false;
  const server=createServer(async(req,res)=>{
    if(req.method==="GET" && req.url==="/healthz"){send(res,200,{status:"ready",network:"testnet",service:"rivalghost-verifier"});return;}
    const auth=Buffer.from(req.headers.authorization??"");
    if(auth.length!==expected.length || !timingSafeEqual(auth,expected)){send(res,401,{error:"Service authentication required"});return;}
    if(req.method!=="POST"||req.url!=="/verify"){send(res,404,{error:"Route not found"});return;}
    if(Date.now()-windowStart>=60000){windowStart=Date.now();requests=0;}
    if(++requests>30 || busy){send(res,429,{error:"Verifier busy; retry this challenge",retryAfterSeconds:2});return;}
    if(req.headers["content-type"]?.split(";")[0]!=="application/json"){send(res,415,{error:"JSON required"});return;}
    if(Number(req.headers["content-length"]??0)>LIMIT){send(res,413,{error:"Replay request too large"});return;}
    busy=true;
    try {
      let submission:ReplaySubmission;
      try {
        const input=await body(req) as ReplaySubmission;
        if(!input||typeof input.challengeId!=="string"||typeof input.playerId!=="string"||!input.replay)throw new Error("Invalid submission");
        submission={challengeId:input.challengeId,playerId:input.playerId,replay:input.replay};
      }catch{send(res,400,{error:"Invalid replay request"});return;}
      const certificate=await service.verifyAndIssue(submission,Date.now());
      send(res,200,{certificate,status:"verified",settled:false});
    }catch(error){
      const unavailable=error instanceof RpcUnavailableError || error instanceof ReplayStorageError;
      send(res,unavailable?503:422,{error:unavailable?"Verification temporarily unavailable; retry this challenge":"Replay or challenge rejected",settled:false});
    }finally{busy=false;}
  });
  server.requestTimeout=10000;server.headersTimeout=5000;server.timeout=15000;server.maxHeadersCount=30;
  return server;
}
