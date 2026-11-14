// Executes actual raw and optimized Wasm against a small deterministic host double.
// This checks compiler-output behavior, not NEAR VM metering or deployment compatibility.
import {readFile} from 'node:fs/promises';
import {createHash,createPublicKey,createPrivateKey,sign,verify} from 'node:crypto';
import assert from 'node:assert/strict';
import {economyCertificateMessage,encodeEconomyCertificate,economyIntentMessage} from '../packages/game-data/dist/index.js';
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
 const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.alloc(32,7)]),format:'der',type:'pkcs8'});
 const publicKey=Array.from(createPublicKey(privateKey).export({format:'der',type:'spki'}).subarray(-32));
 const actors=['hound.testnet','moth.testnet','alice.testnet','bob.testnet'];
 const init={operator:'operator.testnet',hound:actors[0],moth:actors[1],verifier:publicKey};
 const pilot=actor=>call('get_pilot',{actor});
 const world=()=>call('get_world',{});
 const conservation=async()=>{
  const w=await world();let total=w.reserve+w.crowns.reduce((s,c)=>s+(c?.bounty??0),0);
  for(const actor of actors){const p=await pilot(actor);if(p)total+=p.cr+(p.run?.kind===0?10:p.run?.kind===3?8:0);}
  assert.equal(total,100100,'CR conservation');return w;
 };
 const action=async(actor,op,a=0,b=0,extra={})=>{const p=await pilot(actor);const intent={actor,op,a,b,nonce:p.nonce+1,epoch:p.session_epoch,deadline:timestamp+300000,signature:[],...extra};return call('execute',{intent},actor);};
 const cert=async(actor,changes={})=>{
  const r=(await pilot(actor))?.run;
  const c={actor,run_id:r?.id??await call('next_sequence',{}),kind:r?.kind??4,slot:r?.slot??0,chapter:r?.chapter??0,seed:r?.seed??313,stage:r?.stage??0,bonus:r?.bonus??false,day:r?.day??Math.floor(timestamp/86400000),score:14000,kills:12,rescues:2,pulses:0,replay_hash:Array(32).fill(1),final_hash:Array(32).fill(2),issued:timestamp,expires:r?.expires??timestamp+300000,key_version:1,signature:[],...changes};
  c.signature=Array.from(sign(null,Buffer.from(economyCertificateMessage('rivalghost.testnet',c)),privateKey));return c;
 };
 const settle=async(actor,changes={})=>call('settle',{certificate:encodeEconomyCertificate(await cert(actor,changes))},'relay.testnet');
 await reject('get_world',{});
 await reject('new',init,'attacker.testnet');
 await call('new',init,'rivalghost.testnet');
 await reject('new',init,'rivalghost.testnet');
 for(const actor of actors.slice(2))await call('join',{},actor);
 assert.equal((await call('join',{},actors[2])).cr,100);
 assert.equal((await conservation()).reserve,99200);
 for(const actor of actors.slice(0,2))await reject('execute',{intent:{actor,nonce:1,epoch:0,deadline:timestamp+300000,op:5,a:3,b:0,signature:[]}},actor);
 for(const rawInput of ['', '{}false','[]','null','{"actor":"INVALID!"}','{"actor":"alice.testnet","extra":1}','['.repeat(9)+']'.repeat(9),' '.repeat(8193)])await reject('get_pilot',{},caller,timestamp,{rawInput});
 await reject('join',{},actors[2],timestamp,{deposit:1});
 // Attested jobs, mission binding, single claim and rollover.
 await action(actors[2],1,1,0);
 // MOTH's narrow focus control cannot rewrite an already-reserved job or any other world field.
 const beforeFocus=await world(),heldBefore=await pilot(actors[2]);
 for(const [args,who]of [[{slot:2},'attacker.testnet'],[{slot:3},actors[1]],[{slot:0},actors[1]]])await reject('set_focus',args,who);
 await reject('set_focus',{slot:2,paused:false},actors[1]);
 await reject('set_focus',{slot:2},actors[1],timestamp,{deposit:1});
 const bytesBefore=[...storage.values()].reduce((n,b)=>n+b.length,0);
 assert.equal(await call('set_focus',{slot:2},actors[1]),2);
 assert.deepEqual(await world(),{...beforeFocus,focus:2});assert.deepEqual(await pilot(actors[2]),heldBefore);
 assert.equal([...storage.values()].reduce((n,b)=>n+b.length,0),bytesBefore,'Focus must not grow contract storage');
 await call('set_focus',{slot:1},actors[1]);
 const valid=await cert(actors[2]);
 for(const changes of [{actor:actors[3]},{run_id:valid.run_id+1},{kind:2},{chapter:1},{stage:1},{bonus:!valid.bonus},{day:valid.day+1},{seed:valid.seed+1},{expires:valid.expires-1},{issued:timestamp+1},{key_version:2}]){
  await reject('settle',{certificate:encodeEconomyCertificate(await cert(actors[2],changes))},'relay.testnet');
 }
 const forged={...valid,score:99999};await reject('settle',{certificate:encodeEconomyCertificate(forged)});
 await settle(actors[2]);assert.equal((await pilot(actors[2])).salvage,5);
 await reject('settle',{certificate:encodeEconomyCertificate(valid)});
 let p=await pilot(actors[2]);await reject('execute',{intent:{actor:actors[2],op:1,a:1,b:0,nonce:p.nonce+1,epoch:0,deadline:timestamp+300000,signature:[]}},actors[2]);
 await action(actors[2],1,2,0);await settle(actors[2]);
 await action(actors[2],1,3,0);assert.equal((await pilot(actors[0])).cr,92);await settle(actors[2]);
 assert.equal((await pilot(actors[2])).cr,108);assert.equal((await pilot(actors[2])).salvage,13);
 await conservation();
 // Craft, equip, escrow, unauthorized purchase/cancel and exact fee transfer.
 await action(actors[2],4,0);await action(actors[2],5,0);await action(actors[2],6,0,20);
 let w=await world(),listing=w.listings[0];assert.equal((await pilot(actors[2])).equipped,3);
 p=await pilot(actors[3]);await reject('execute',{intent:{actor:actors[3],op:7,a:listing.id,b:0,nonce:p.nonce+1,epoch:0,deadline:timestamp+300000,signature:[]}},actors[3]);
 await action(actors[3],8,listing.id);assert.equal((await pilot(actors[3])).items[0],1);assert.equal((await pilot(actors[2])).cr,123);assert.equal((await conservation()).reserve,99205);
 await action(actors[3],6,0,1);listing=(await world()).listings[0];await action(actors[3],7,listing.id);assert.equal((await pilot(actors[3])).items[0],1);
 // MOTH inventory and CR transfers, restoration burns.
 await action(actors[2],2,5);assert.equal((await pilot(actors[1])).cr,595);await action(actors[3],3,7);assert.equal((await pilot(actors[1])).cr,602);
 await action(actors[3],9,0);assert.equal((await world()).districts[0],1);await conservation();
 // Native-only session grant, domain-bound intents, nonce replay protection and revocation.
 await call('set_session',{public_key:publicKey,until:timestamp+3600000},actors[3]);
 p=await pilot(actors[3]);let intent={actor:actors[3],nonce:p.nonce+1,epoch:p.session_epoch,deadline:timestamp+300000,op:5,a:0,b:0,signature:[]};
 intent.signature=Array.from(sign(null,Buffer.from(economyIntentMessage('rivalghost.testnet',intent)),privateKey));
 await reject('execute',{intent:{...intent,a:3}},'relay.testnet');
 const otherDomain={...intent,signature:Array.from(sign(null,Buffer.from(economyIntentMessage('other.testnet',intent)),privateKey))};await reject('execute',{intent:otherDomain},'relay.testnet');
 await call('execute',{intent},'relay.testnet');await reject('execute',{intent},'relay.testnet');
 await call('set_session',{public_key:[],until:0},actors[3]);await reject('execute',{intent:{...intent,nonce:intent.nonce+1}},'relay.testnet');
 // Crown win, loss, timeout, one defense and returned round bounty.
 await call('seed_crown',{certificate:encodeEconomyCertificate(await cert(actors[0],{slot:0}))},actors[0]);
 await action(actors[2],10,0);const before=(await pilot(actors[2])).cr;await settle(actors[2],{score:15000});assert.equal((await pilot(actors[2])).cr,before+30);
 await action(actors[2],11,0);await action(actors[3],10,0);await settle(actors[3],{score:15000});assert.equal((await world()).crowns[0].bounty,28);
 await action(actors[3],10,0);timestamp=(await pilot(actors[3])).run.expires;await call('expire',{actor:actors[3]});assert.equal((await world()).crowns[0].bounty,36);await conservation();
 await action(actors[0],10,0);await settle(actors[0],{score:16000});assert.equal((await world()).crowns[0].holder,actors[0]);
 const cp=(await world()).crowns[0];timestamp=cp.expires;await call('close_crown',{slot:0});assert.equal((await world()).crowns[0],null);await conservation();
 // Commission escrow refunds when its day ends; no repeated claims and no permanent storage growth.
 timestamp=86400000-1000;await action(actors[3],1,3,0);timestamp=86400000;await call('expire',{actor:actors[3]});assert.equal((await world()).commission_spent,0);await conservation();
 const sizes=[];
 for(let i=0;i<10;i++){
  timestamp=(i+2)*86400000;await action(actors[3],1,1,0);await settle(actors[3]);await conservation();
  sizes.push([...storage].reduce((n,[k,v])=>n+k.length/2+v.length,0));
 }
 assert.equal(new Set(sizes).size,1,'Repeated daily jobs grew retained storage');
 // Pause blocks new spending but permits completion of already reserved runs.
 await action(actors[3],1,2,0);await call('configure',{paused:true,verifier:publicKey,focus:2});await reject('set_focus',{slot:1},actors[1]);
 p=await pilot(actors[3]);await reject('execute',{intent:{actor:actors[3],nonce:p.nonce+1,epoch:p.session_epoch,deadline:timestamp+300000,op:2,a:0,b:0,signature:[]}},actors[3]);
 await settle(actors[3]);await conservation();
 console.log(JSON.stringify({artifact:file.pathname.split('/').slice(-2).join('/'),rejectedCalls:rejected,retainedKeyValueBytes:sizes[0],cyclesWithoutGrowth:10}));
 return {world:await world(),storage:[...storage].map(([k,v])=>[k,v.toString('hex')]).sort()};
}
const raw=await exercise(new URL('../target/wasm32-unknown-unknown/release/rivalghost_economy.wasm',import.meta.url));
const optimized=await exercise(new URL('../target/near/rivalghost_economy.wasm',import.meta.url));
assert.deepEqual(optimized,raw);console.log('Economy v3 raw/optimized parity: conserved CR, jobs, crafting, market, repairs, NPC wallets, Crown payouts, sessions, pause and bounded storage.');
