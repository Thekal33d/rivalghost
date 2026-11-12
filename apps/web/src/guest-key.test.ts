import {it,expect} from "vitest";
import {guestAuthMessage} from "@rivalghost/game-data";
import {signGuestChallenge} from "./guest-key";
it("signs an origin-bound proof using a non-exportable browser key",async()=>{
  const pair=await crypto.subtle.generateKey("Ed25519",false,["sign","verify"]),publicKey=Buffer.from(await crypto.subtle.exportKey("raw",pair.publicKey)).toString("hex");
  const key={privateKey:pair.privateKey,publicKey},origin="http://localhost:5173",c={publicKey,origin,nonce:"a".repeat(64),expiresAt:61000};
  const signature=await signGuestChallenge(key,c,origin,1000);
  expect(await crypto.subtle.verify("Ed25519",pair.publicKey,Buffer.from(signature,"hex"),new TextEncoder().encode(guestAuthMessage(c)))).toBe(true);
  await expect(crypto.subtle.exportKey("pkcs8",pair.privateKey)).rejects.toThrow();
  await expect(signGuestChallenge(key,c,"https://evil.example",1000)).rejects.toThrow();
  await expect(signGuestChallenge(key,c,origin,61000)).rejects.toThrow();
  await expect(signGuestChallenge(key,{...c,publicKey:"b".repeat(64)},origin,1000)).rejects.toThrow();
});
