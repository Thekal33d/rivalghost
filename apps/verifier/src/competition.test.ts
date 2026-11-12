import {describe,it,expect} from "vitest";
import {competitionHash,competitionMessage,certificateMessage} from "@rivalghost/game-data";
import {createExpedition,simulateExpedition} from "@rivalghost/sim";
import {verifyReplay,issueSettlementCertificate,type StoredChallenge} from "./index.js";

const game=createExpedition({seed:313,chapter:0,rig:"fan"});
while(!game.snapshot().finished)game.step(0);
const replay=game.replay();
const mission={revision:1,chapter:0,rig:"fan"} as const;
async function challenge():Promise<StoredChallenge>{return {id:"0",crownId:"0",contractId:"rivalghost.testnet",playerId:"player.testnet",seed:313,rulesVersion:2,mission,loadoutHash:await competitionHash(313,mission),expiresAtMs:121001,settled:false};}

describe("competitive expedition v2",()=>{
  it("uses the same canonical mission hash as Rust",async()=>{
    expect(competitionMessage(313,mission)).toBe("RIVALGHOST-MISSION-v2|1|3600|313|0|fan");
    expect(await competitionHash(313,mission)).toBe("24dbd92929fea14445b2481899ddd7ceddd711aef9224024f25093a8ccdfeaad");
    expect(await competitionHash(313,{...mission,rig:"guard"})).not.toBe(await competitionHash(313,mission));
  });
  it("re-simulates the current game and signs its result for this testnet deployment",async()=>{
    const c=await challenge(),verified=await verifyReplay(c,c.playerId,replay,1002);
    expect(verified.score).toBe(simulateExpedition(replay).score);
    const keys=await crypto.subtle.generateKey("Ed25519",true,["sign","verify"]);
    const cert=await issueSettlementCertificate(verified,1002,keys.privateKey);
    expect(cert.certificateVersion).toBe(2);
    expect(await crypto.subtle.verify("Ed25519",keys.publicKey,Uint8Array.from(cert.signature),certificateMessage(cert))).toBe(true);
    expect(await crypto.subtle.verify("Ed25519",keys.publicKey,Uint8Array.from(cert.signature),certificateMessage({...cert,contractId:"other.testnet"}))).toBe(false);
  });
  it("rejects chapter, rig, seed, version, fingerprint, revision and settled-state mismatches",async()=>{
    const c=await challenge();
    for(const bad of [{...replay,chapter:1 as const},{...replay,rig:"guard" as const},{...replay,seed:314},{...replay,rulesVersion:1 as 2},{...replay,rulesVersion:3 as const}])await expect(verifyReplay(c,c.playerId,bad,1002)).rejects.toThrow();
    for(const bad of [{...c,loadoutHash:"a".repeat(64)},{...c,mission:{...mission,revision:2 as 1}},{...c,settled:true},{...c,contractId:undefined}])await expect(verifyReplay(bad,c.playerId,replay,1002)).rejects.toThrow();
    await expect(verifyReplay({...c,rulesVersion:1},c.playerId,replay,1002)).rejects.toThrow("rules");
  });
});
