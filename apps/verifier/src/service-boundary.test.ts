import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {NearRpcViews} from "@rivalghost/contracts-client";
import {competitionHash} from "@rivalghost/game-data";
import {createExpedition,expeditionReplayHash} from "@rivalghost/sim";
import {NearChallengeSource} from "./challenge-source.js";
import {ReplayVerificationService} from "./service.js";
import {FileReplayStore} from "./replay-store.js";
import {createVerifierServer} from "./http.js";
const mission={revision:1,chapter:0,rig:"fan"} as const;
const flight=createExpedition({seed:313,chapter:0,rig:"fan"});while(!flight.snapshot().finished)flight.step(0);
const replay=flight.replay();
async function setup(){
  const key=await crypto.subtle.generateKey("Ed25519",true,["sign","verify"]);
  const stored={id:"0",crownId:"0",playerId:"player.testnet",contractId:"game.testnet",seed:313,rulesVersion:2,mission,loadoutHash:await competitionHash(313,mission),expiresAtMs:Date.now()+120000,settled:false};
  return {key,stored,source:{getChallenge:async()=>stored}};
}
describe("verification service boundaries",()=>{
  it("reads authoritative mission fields and the matching Crown at one finalized block",async()=>{
    const {stored}=await setup();const requests:any[]=[];
    const rpc=new NearRpcViews("https://rpc.example.test",async(_url,init)=>{
      const r=JSON.parse(String(init?.body));requests.push(r);
      const value=r.params.method_name==="get_challenge"?{id:0,crown_id:0,challenger:stored.playerId,seed:313,rules_version:2,mission,loadout_hash:stored.loadoutHash,expires_at_ms:stored.expiresAtMs,settled:false}:{id:0,active:true,active_challenge_id:0,seed:313,rules_version:2,loadout_hash:stored.loadoutHash};
      return new Response(JSON.stringify({result:{result:[...new TextEncoder().encode(JSON.stringify(value))],block_hash:"final-block"}}));
    });
    expect(await new NearChallengeSource(rpc,"game.testnet").getChallenge("0")).toEqual(stored);
    expect(requests[1].params.block_id).toBe("final-block");
  });
  it("stores canonical bytes, deduplicates writes, and refuses overflow or mismatched hashes",async()=>{
    const dir=await mkdtemp(join(tmpdir(),"rivalghost-store-"));
    try{
      const store=new FileReplayStore(dir),hash=await expeditionReplayHash(replay);
      await Promise.all([store.put(hash,replay),store.put(hash,replay)]);
      expect(JSON.parse((await store.get(hash))!)).toEqual(replay);
      await expect(store.put("a".repeat(64),replay)).rejects.toThrow("hash");
      await expect(new FileReplayStore(join(dir,"full"),1).put(hash,replay)).rejects.toThrow("stored");
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it("never signs if persistence fails or the challenge expires during storage",async()=>{
    const {source,key,stored}=await setup();
    const submission={challengeId:"0",playerId:stored.playerId,replay};
    const failing=new ReplayVerificationService(source,key.privateKey,1,{put:async()=>{throw new Error("disk full");}});
    await expect(failing.verifyAndIssue(submission,Date.now())).rejects.toThrow("disk full");
    const expired=new ReplayVerificationService(source,key.privateKey,1,{put:async()=>{}},()=>stored.expiresAtMs);
    await expect(expired.verifyAndIssue(submission,Date.now())).rejects.toThrow("expired");
  });
  it("authenticates real HTTP requests and returns verification without claiming settlement",async()=>{
    const {source,key,stored}=await setup();let writes=0;
    const server=createVerifierServer(new ReplayVerificationService(source,key.privateKey,1,{put:async()=>{writes++;}}),"test-only-service-token-with-32-characters");
    await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("Missing port");
    const url=`http://127.0.0.1:${address.port}`;
    const headers={"Content-Type":"application/json",Authorization:"Bearer test-only-service-token-with-32-characters"};
    try{
      expect((await fetch(url+"/verify",{method:"POST"})).status).toBe(401);
      expect((await fetch(url+"/verify",{method:"POST",headers,body:"{"})).status).toBe(400);
      const result=await fetch(url+"/verify",{method:"POST",headers,body:JSON.stringify({challengeId:"0",playerId:stored.playerId,replay,score:999999999})});
      expect(result.status).toBe(200);const data=await result.json();
      expect(data.status).toBe("verified");expect(data.settled).toBe(false);expect(data.certificate.score).toBe(flight.result().score);expect(writes).toBe(1);
      const oversized=await fetch(url+"/verify",{method:"POST",headers,body:JSON.stringify({padding:"x".repeat(130*1024)})});
      expect(oversized.status).toBe(413);
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
});
