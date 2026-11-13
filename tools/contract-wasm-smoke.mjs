// Executes actual raw and optimized Wasm against a small deterministic host double.
// This checks compiler-output behavior, not NEAR VM metering or deployment compatibility.
import {readFile} from 'node:fs/promises';
import {createHash,createPublicKey,createPrivateKey,sign,verify} from 'node:crypto';
import assert from 'node:assert/strict';
const fixture=JSON.parse(await readFile(new URL('../fixtures/expedition-v2-settlement.json',import.meta.url),'utf8'));
async function exercise(file) {
 const module=await WebAssembly.compile(await readFile(file));let storage=new Map(),timestamp=1000,caller='operator.testnet';
 async function call(method,args,who=caller,now=timestamp,options={}) {
  let instance,output;const registers=new Map();const saved=new Map(storage);
  const bytes=(ptr,len)=>Buffer.from(new Uint8Array(instance.exports.memory.buffer,Number(ptr),Number(len)));
  const put=(id,data)=>registers.set(id,Buffer.from(data));
  const key=(ptr,len)=>bytes(ptr,len).toString('hex');
  const host={
   input:r=>put(r,options.rawInput??JSON.stringify(args)), current_account_id:r=>put(r,'rivalghost.testnet'),predecessor_account_id:r=>put(r,who),
   block_timestamp:()=>BigInt(now)*1000000n,attached_deposit:p=>{const data=new Uint8Array(instance.exports.memory.buffer,Number(p),16);data.fill(0);data[0]=options.deposit??0;},
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
 const snapshot=()=>JSON.stringify([...storage.entries()].map(([k,v])=>[k,v.toString('hex')]).sort());
 let rejected=0;
 async function reject(method,args,who=caller,now=timestamp,options={}) {
  const before=snapshot();
  await assert.rejects(()=>call(method,args,who,now,options));
  assert.equal(snapshot(),before,`${method} failure changed storage`);rejected++;
 }
 const publicKey=Array.from(Buffer.from(fixture.publicKey.x,'base64url'));
 const init={operator:'operator.testnet',verifier_public_key:publicKey};
 await reject('get_balance',{account_id:'player.testnet'});
 await reject('new',init,'attacker.testnet');
 await reject('new',{...init,verifier_public_key:[1]},'rivalghost.testnet');
 await call('new',init,'rivalghost.testnet');
 await reject('new',init,'rivalghost.testnet');
 assert.equal(await call('rules_version',{}),1);
 assert.deepEqual(await call('supported_rules_versions',{}),[1,2]);
 assert.equal(await call('operator',{}),'operator.testnet');
 assert.equal(await call('verifier_key_version',{}),1);
 assert.deepEqual(await call('verifier_public_key',{}),publicKey);
 const malformed=['', '{', '[]', 'null', '{"crown_id":-1}', '{"crown_id":1.5}', '{"crown_id":1e0}', '{"crown_id":18446744073709551616}', '{"crown_id":0,"crown_id":1}', '{"crown_id":0,"extra":0}', '{"crown_id":0}false', '{"crown_id":0}'+ ' '.repeat(8192), '['.repeat(9)+']'.repeat(9), '{"crown_id":"\\uD800"}', '{"crown_id":true}'];
 for(const rawInput of malformed)await reject('get_crown',{},caller,1000,{rawInput});
 await reject('create_guest',{account_id:'INVALID!'});
 await reject('create_guest',{account_id:'victim.testnet'},'attacker.testnet');
 await reject('create_guest',{account_id:'victim.testnet'},caller,1000,{deposit:1});
 await call('create_guest',{account_id:'hound.testnet'});
 await call('create_guest',{account_id:'player.testnet'});
 await call('create_guest',{account_id:'other.testnet'});
 await reject('create_guest',{account_id:'player.testnet'});
 assert.equal(await call('has_guest_grant',{account_id:'player.testnet'}),true);
 assert.equal(await call('get_balance',{account_id:'unknown.testnet'}),0);
 // JSON escapes must retain the original meaning and account validation.
 assert.equal(await call('get_balance',{},caller,1000,{rawInput:'{"account_id":"player\\u002etestnet"}'}),100);
 const opening={seed:{holder:'hound.testnet',score_to_beat:14000,bounty_credits:40,seed:313,ghost_hash:'a'.repeat(64)},mission:fixture.challenge.mission};
 await reject('seed_expedition_crown',opening,'attacker.testnet');
 await reject('seed_expedition_crown',{...opening,mission:{...opening.mission,chapter:10}});
 await reject('seed_expedition_crown',{...opening,seed:{...opening.seed,bounty_credits:101}});
 const crown=await call('seed_expedition_crown',opening);
 await reject('start_challenge',{crown_id:crown.id},'hound.testnet',1001);
 await reject('start_challenge',{crown_id:crown.id},'unknown.testnet',1001);
 const challenge=await call('start_challenge',{crown_id:crown.id},'player.testnet',1001);
 await reject('start_challenge',{crown_id:crown.id},'player.testnet',1001);
 await reject('start_challenge',{crown_id:crown.id},'other.testnet',1001);
 await reject('expire_challenge',{challenge_id:challenge.id},caller,1002);
 await reject('close_expired_crown',{crown_id:crown.id},caller,crown.expires_at_ms);
 assert.equal(challenge.loadout_hash,fixture.challenge.loadoutHash);
 for(const mutation of [{score:1},{contract_id:'another.testnet'},{player_id:'other.testnet'},{seed:314},{rules_version:1},{crown_id:4},{challenge_id:1},{verifier_key_version:2},{issued_at_ms:999},{issued_at_ms:1003},{expires_at_ms:1},{signature:[1]},{replay_hash:'A'.repeat(64)},{final_state_hash:'x'.repeat(64)}]) {
  await reject('settle_challenge',{certificate:{...fixture.contractCertificate,...mutation}},'relayer.testnet',1002);
 }
 await reject('settle_challenge',{certificate:fixture.contractCertificate},'relayer.testnet',challenge.expires_at_ms);
 const result=await call('settle_challenge',{certificate:fixture.contractCertificate},'relayer.testnet',1002);
 assert.equal(result.challenger_credits,140);assert.equal(result.challenger_won,true);
 await reject('settle_challenge',{certificate:fixture.contractCertificate},'relayer.testnet',1002);
 assert.equal(await call('get_active_challenge',{account_id:'player.testnet'}),null);
 await reject('defend_crown',{crown_id:0},'hound.testnet',1003);
 await reject('defend_crown',{crown_id:0},'player.testnet',crown.expires_at_ms-119999);
 await call('defend_crown',{crown_id:0},'player.testnet',1003);
 await reject('defend_crown',{crown_id:0},'player.testnet',1004);
 const retainedSizes=[];
 for(let i=0;i<10;i++) {
  const flight=await call('start_challenge',{crown_id:0},'other.testnet',1004+i*120001);
  if(i>0)assert.equal(await call('get_challenge',{challenge_id:flight.id-1}),null);
  await call('expire_challenge',{challenge_id:flight.id},caller,flight.expires_at_ms);
  await reject('expire_challenge',{challenge_id:flight.id},caller,flight.expires_at_ms);
  assert.equal(await call('get_active_challenge',{account_id:'other.testnet'}),null);
  retainedSizes.push([...storage.entries()].reduce((n,[key,value])=>n+key.length/2+value.length,0));
 }
 assert.equal(new Set(retainedSizes).size,1,'repeated flights grew retained storage');
 await call('close_expired_crown',{crown_id:0},caller,crown.expires_at_ms);
 await reject('close_expired_crown',{crown_id:0},caller,crown.expires_at_ms);
 assert.equal(await call('get_balance',{account_id:'player.testnet'}),140);
 assert.equal(await call('get_balance',{account_id:'hound.testnet'}),60);
 assert.equal(await call('get_balance',{account_id:'other.testnet'}),100);
 // Preserve legacy API and demonstrate a signed tie as a loss, never a second grant.
 const legacy=await call('seed_crown',{seed:{...opening.seed,seed:3,bounty_credits:20}},caller,2000000);
 const flight=await call('start_challenge',{crown_id:legacy.id},'other.testnet',2000001);
 const cert={...fixture.contractCertificate,contract_id:null,certificate_version:1,challenge_id:flight.id,crown_id:legacy.id,player_id:'other.testnet',rules_version:1,seed:3,loadout_hash:'0'.repeat(64),score:14000,issued_at_ms:2000002,expires_at_ms:flight.expires_at_ms};
 const message=['RIVALGHOST-CERT-v1',cert.challenge_id,cert.crown_id,cert.player_id,cert.rules_version,cert.seed,cert.loadout_hash,cert.replay_hash,cert.final_state_hash,cert.score,cert.issued_at_ms,cert.expires_at_ms,cert.verifier_key_version].join('|');
 const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.alloc(32,7)]),format:'der',type:'pkcs8'});
 cert.signature=Array.from(sign(null,Buffer.from(message),privateKey));
 const tie=await call('settle_challenge',{certificate:cert},'relayer.testnet',2000002);
 assert.equal(tie.challenger_won,false);assert.equal(tie.holder_credits,42);assert.equal(tie.crown_bounty_credits,28);
 console.log(JSON.stringify({artifact:file.pathname.split('/').slice(-2).join('/'),rejectedCalls:rejected,retainedKeyValueBytes:retainedSizes[0],cyclesWithoutGrowth:10}));

 return {result,crown:await call('get_crown',{crown_id:0}),storage:[...storage.entries()].map(([k,v])=>[k,v.toString('hex')]).sort()};
}
const raw=await exercise(new URL('../target/wasm32-unknown-unknown/release/rivalghost_contract.wasm',import.meta.url));
const optimized=await exercise(new URL('../target/near/rivalghost_contract.wasm',import.meta.url));
assert.deepEqual(optimized,raw);console.log('Raw and optimized Wasm agree: ABI/authentication, signed payouts, rejected-call rollback, expiry/closure and bounded challenge storage.');
