import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {certificateMessage} from "@rivalghost/game-data";
import {toContractCertificate} from "@rivalghost/contracts-client";
import {verifyReplay} from "./index.js";
const fixture=JSON.parse(readFileSync(new URL("../../../fixtures/expedition-v2-settlement.json",import.meta.url),"utf8"));
describe("shared TypeScript-to-Rust settlement fixture",()=>{
  it("reproduces the live-game result and validates the exact certificate Rust settles",async()=>{
    expect(await verifyReplay(fixture.challenge,fixture.challenge.playerId,fixture.replay,1002)).toEqual(fixture.verified);
    expect(toContractCertificate(fixture.certificate)).toEqual(fixture.contractCertificate);
    const key=await crypto.subtle.importKey("jwk",fixture.publicKey,"Ed25519",false,["verify"]);
    expect(await crypto.subtle.verify("Ed25519",key,Uint8Array.from(fixture.certificate.signature),certificateMessage(fixture.certificate))).toBe(true);
  });
});
