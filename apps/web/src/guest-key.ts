import {guestAuthMessage,type GuestChallenge} from "@rivalghost/game-data";
export interface PilotKey {privateKey:CryptoKey;publicKey:string}
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function database():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open("rivalghost.pilot-key",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("keys");
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error("Pilot storage is busy in another tab"));
  });
}
export async function readPilotKey():Promise<PilotKey|null>{
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction("keys","readonly"),request=transaction.objectStore("keys").get("pilot");
    request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error);transaction.oncomplete=()=>db.close();transaction.onabort=()=>{db.close();reject(transaction.error??new Error("Pilot storage unavailable"));};
  });
}
export async function getOrCreatePilotKey():Promise<PilotKey>{
  const existing=await readPilotKey();if(existing)return existing;
  const pair=await crypto.subtle.generateKey("Ed25519",false,["sign","verify"]);
  const candidate={privateKey:pair.privateKey,publicKey:hex(await crypto.subtle.exportKey("raw",pair.publicKey))};
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction("keys","readwrite"),store=transaction.objectStore("keys"),request=store.get("pilot");let chosen:PilotKey;
    request.onsuccess=()=>{chosen=request.result??candidate;if(!request.result)store.put(candidate,"pilot");};
    transaction.oncomplete=()=>{db.close();resolve(chosen);};transaction.onabort=()=>{db.close();reject(transaction.error);};transaction.onerror=()=>reject(transaction.error);
  });
}
export async function signGuestChallenge(key:PilotKey,challenge:GuestChallenge,origin:string,now=Date.now()):Promise<string>{
  if(challenge.publicKey!==key.publicKey||challenge.origin!==origin||challenge.expiresAt<=now||challenge.expiresAt>now+65000)throw new Error("Guest challenge does not match this browser");
  if(key.privateKey.extractable||key.privateKey.type!=="private"||key.privateKey.algorithm.name!=="Ed25519")throw new Error("Invalid pilot key");
  return hex(await crypto.subtle.sign("Ed25519",key.privateKey,new TextEncoder().encode(guestAuthMessage(challenge))));
}
