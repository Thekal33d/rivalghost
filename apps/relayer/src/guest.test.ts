import {describe,it,expect} from "vitest";
import {generateKeyPairSync,sign} from "node:crypto";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {guestAuthMessage,type GuestChallenge} from "@rivalghost/game-data";
import {GuestStore} from "./guest-store.js";
import {GuestService,type GuestProvisioner} from "./guest-service.js";
import {createGuestServer} from "./guest-http.js";
const origin="http://localhost:5173";
function pilot(){const pair=generateKeyPairSync("ed25519");const publicKey=pair.publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("hex");return {publicKey,proof:(c:GuestChallenge)=>sign(null,Buffer.from(guestAuthMessage(c)),pair.privateKey).toString("hex")};}
function login(store:GuestStore){const key=pilot(),c=store.challenge(key.publicKey,"test");return store.authenticate(c.nonce,key.publicKey,key.proof(c));}
describe("guest identity and sponsorship boundaries",()=>{
  it("consumes one-use proofs and stores only session hashes",()=>{
    const store=new GuestStore(":memory:",origin);try{
      const key=pilot(),c=store.challenge(key.publicKey,"test"),signed=store.authenticate(c.nonce,key.publicKey,key.proof(c));
      expect(store.session(signed.token)).toEqual(signed.guest);expect(store.db.prepare("SELECT hash FROM sessions").get()!.hash).not.toBe(signed.token);
      expect(()=>store.authenticate(c.nonce,key.publicKey,key.proof(c))).toThrow();store.logout(signed.token);expect(store.session(signed.token)).toBeNull();
    }finally{store.close();}
  });
  it("rejects forged, wrong-origin and expired proofs; a failed proof cannot be retried",()=>{
    let now=1000;const store=new GuestStore(":memory:",origin,()=>now);try{
      const key=pilot(),c=store.challenge(key.publicKey,"test");expect(()=>store.authenticate(c.nonce,key.publicKey,"0".repeat(128))).toThrow();expect(()=>store.authenticate(c.nonce,key.publicKey,key.proof(c))).toThrow();
      const wrong=store.challenge(key.publicKey,"test");expect(()=>store.authenticate(wrong.nonce,key.publicKey,key.proof({...wrong,origin:"https://attacker.example"}))).toThrow();
      const expired=store.challenge(key.publicKey,"test");now=expired.expiresAt;expect(()=>store.authenticate(expired.nonce,key.publicKey,key.proof(expired))).toThrow();
    }finally{store.close();}
  });
  it("expires sessions and rotates old tokens when the same pilot reconnects",()=>{
    let now=1000;const store=new GuestStore(":memory:",origin,()=>now);try{
      const key=pilot(),c=store.challenge(key.publicKey,"test"),first=store.authenticate(c.nonce,key.publicKey,key.proof(c));
      const next=store.challenge(key.publicKey,"test"),second=store.authenticate(next.nonce,key.publicKey,key.proof(next));
      expect(second.guest.id).toBe(first.guest.id);expect(store.session(first.token)).toBeNull();now+=12*60*60*1000;expect(store.session(second.token)).toBeNull();
    }finally{store.close();}
  });
  it("defaults to local identity without creating a chain account",async()=>{
    const store=new GuestStore(":memory:",origin);try{const {guest}=login(store),service=new GuestService(store);expect(service.configured).toBe(false);await expect(service.provision(guest)).rejects.toThrow("not configured");expect(store.guest(guest.id)?.accountId).toBeNull();}finally{store.close();}
  });
  it("deduplicates concurrent setup and resumes an uncertain grant without changing identity",async()=>{
    const store=new GuestStore(":memory:",origin);let grants=0,accounts=0;const existing=new Set<string>();
    const provider:GuestProvisioner={reserveYocto:10n,accountId:()=>"g.testnet",ensureAccount:async(id)=>{if(!existing.has(id)){accounts++;existing.add(id);}},ensureGrant:async()=>{if(++grants===1)throw new Error("uncertain receipt");}};
    try{const {guest}=login(store),service=new GuestService(store,provider,100n,10);
      const first=service.provision(guest);expect(service.provision(guest)).toBe(first);await expect(first).rejects.toThrow("uncertain");expect(store.guest(guest.id)?.state).toBe("pending");
      const ready=await service.provision(guest);expect(ready.state).toBe("ready");expect(accounts).toBe(1);expect(grants).toBe(2);await service.provision(guest);expect(grants).toBe(2);
    }finally{store.close();}
  });
  it("persists reserved spending across restarts and blocks the provider before budget overflow",async()=>{
    const dir=await mkdtemp(join(tmpdir(),"rivalghost-guest-")),path=join(dir,"guests.sqlite");let calls=0;
    const provider:GuestProvisioner={reserveYocto:10n,accountId:()=>"g.testnet",ensureAccount:async()=>{calls++;throw new Error("timeout");},ensureGrant:async()=>{}};
    let store=new GuestStore(path,origin);try{
      const {guest,token}=login(store);await expect(new GuestService(store,provider,10n,10).provision(guest)).rejects.toThrow("timeout");store.close();store=new GuestStore(path,origin);
      expect(store.session(token)?.id).toBe(guest.id);await expect(new GuestService(store,provider,10n,10).provision(guest)).rejects.toThrow("budget");expect(calls).toBe(1);
    }finally{store.close();await rm(dir,{recursive:true,force:true});}
  });
  it("enforces daily attempt limits even when funds remain",()=>{const store=new GuestStore(":memory:",origin);try{store.reserve("one",1n,100n,1);expect(()=>store.reserve("two",1n,100n,1)).toThrow("budget");}finally{store.close();}});
  it("protects HTTP sessions, keeps provisioning disabled and binds verification to authenticated identity",async()=>{
    const store=new GuestStore(":memory:",origin);let seenPlayer:string|null=null;
    const server=createGuestServer(new GuestService(store),{verify:async(guest)=>{seenPlayer=guest.accountId;return {status:"verified",settled:false};}});
    await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const address=server.address();if(!address||typeof address==="string")throw new Error("port");const base=`http://127.0.0.1:${address.port}/api/guest/`;
    const post=(path:string,body:unknown,cookie="",requestOrigin=origin)=>fetch(base+path,{method:"POST",headers:{Origin:requestOrigin,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(body)});
    try{
      expect((await post("challenge",{},"","https://evil.example")).status).toBe(403);expect((await post("provision",{})).status).toBe(401);expect((await post("verify",{})).status).toBe(401);
      const key=pilot(),c=await (await post("challenge",{publicKey:key.publicKey})).json();const response=await post("session",{nonce:c.nonce,publicKey:key.publicKey,signature:key.proof(c)});
      expect(response.status).toBe(200);const cookie=response.headers.get("set-cookie")!;expect(cookie).toContain("HttpOnly");expect(cookie).toContain("SameSite=Strict");const signed=await response.json();expect(signed.token).toBeUndefined();expect(signed.onlineAvailable).toBe(false);
      expect((await (await fetch(base+"me",{headers:{Cookie:cookie}})).json()).guest.id).toBe(signed.guest.id);
      expect((await post("provision",{},cookie)).status).toBe(503);expect((await post("verify",{challengeId:"0",replay:{}},cookie)).status).toBe(503);
      store.setProvisioning(signed.guest.id,"actual.testnet","ready");const verified=await post("verify",{challengeId:"0",replay:{},playerId:"forged.testnet"},cookie);expect(verified.status).toBe(200);expect(seenPlayer).toBe("actual.testnet");
      expect((await post("verify",{padding:"x".repeat(130*1024)},cookie)).status).toBe(413);
      await post("logout",{},cookie);expect((await post("verify",{},cookie)).status).toBe(401);
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();}
  });
});
