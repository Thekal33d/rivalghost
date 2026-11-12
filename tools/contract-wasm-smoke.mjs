// Executes actual raw and optimized Wasm against a small deterministic host double.
// This checks compiler-output behavior, not NEAR VM metering or deployment compatibility.
import {readFile} from 'node:fs/promises';
import {createHash,createPublicKey,verify} from 'node:crypto';
import assert from 'node:assert/strict';
const fixture=JSON.parse(await readFile(new URL('../fixtures/expedition-v2-settlement.json',import.meta.url),'utf8'));
async function exercise(file) {
 const module=await WebAssembly.compile(await readFile(file));let storage=new Map(),timestamp=1000,caller='operator.testnet';
 async function call(method,args,who=caller,now=timestamp) {
  let instance,output;const registers=new Map();const saved=new Map(storage);
  const bytes=(ptr,len)=>Buffer.from(new Uint8Array(instance.exports.memory.buffer,Number(ptr),Number(len)));
  const put=(id,data)=>registers.set(id,Buffer.from(data));
  const key=(ptr,len)=>bytes(ptr,len).toString('hex');
  const host={
   input:r=>put(r,JSON.stringify(args)), current_account_id:r=>put(r,'rivalghost.testnet'),predecessor_account_id:r=>put(r,who),
   block_timestamp:()=>BigInt(now)*1000000n,attached_deposit:p=>new Uint8Array(instance.exports.memory.buffer,Number(p),16).fill(0),
   register_len:r=>registers.has(r)?BigInt(registers.get(r).length):18446744073709551615n,
   read_register:(r,p)=>new Uint8Array(instance.exports.memory.buffer,Number(p),registers.get(r).length).set(registers.get(r)),
   value_return:(n,p)=>{output=bytes(p,n).toString('utf8');},panic_utf8:(n,p)=>{throw new Error(bytes(p,n).toString('utf8'));},
   sha256:(n,p,r)=>put(r,createHash('sha256').update(bytes(p,n)).digest()),
   ed25519_verify:(sn,sp,mn,mp,pn,pp)=>verify(null,bytes(mp,mn),createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),bytes(pp,pn)]),format:'der',type:'spki'}),bytes(sp,sn))?1n:0n,
   storage_has_key:(n,p)=>storage.has(key(p,n))?1n:0n,
   storage_read:(n,p,r)=>{const v=storage.get(key(p,n));if(v){put(r,v);return 1n;}return 0n;},
   storage_write:(kn,kp,vn,vp,r)=>{const k=key(kp,kn),old=storage.get(k);storage.set(k,bytes(vp,vn));if(old){put(r,old);return 1n;}return 0n;},
   storage_remove:(n,p,r)=>{const k=key(p,n),old=storage.get(k);storage.delete(k);if(old){put(r,old);return 1n;}return 0n;},
  };
  instance=await WebAssembly.instantiate(module,{env:host});
  try{instance.exports[method]();return output?JSON.parse(output):null;}catch(error){storage=saved;throw error;}
 }
 const publicKey=Array.from(Buffer.from(fixture.publicKey.x,'base64url'));
 await call('new',{operator:'operator.testnet',verifier_public_key:publicKey});
 await call('create_guest',{account_id:'hound.testnet'});await call('create_guest',{account_id:'player.testnet'});
 const crown=await call('seed_expedition_crown',{seed:{holder:'hound.testnet',score_to_beat:14000,bounty_credits:40,seed:313,ghost_hash:'a'.repeat(64)},mission:fixture.challenge.mission});
 const challenge=await call('start_challenge',{crown_id:crown.id},'player.testnet',1001);
 assert.equal(challenge.loadout_hash,fixture.challenge.loadoutHash);
 const result=await call('settle_challenge',{certificate:fixture.contractCertificate},'relayer.testnet',1002);
 assert.equal(result.challenger_credits,140);assert.equal(result.challenger_won,true);
 await assert.rejects(()=>call('settle_challenge',{certificate:fixture.contractCertificate},'relayer.testnet',1002));
 return {result,crown:await call('get_crown',{crown_id:0}),storage:[...storage.entries()].map(([k,v])=>[k,v.toString('hex')]).sort()};
}
const raw=await exercise(new URL('../target/wasm32-unknown-unknown/release/rivalghost_contract.wasm',import.meta.url));
const optimized=await exercise(new URL('../target/near/rivalghost_contract.wasm',import.meta.url));
assert.deepEqual(optimized,raw);console.log('Raw and optimized Wasm: identical mission binding, signed payout, duplicate rejection and storage.');
