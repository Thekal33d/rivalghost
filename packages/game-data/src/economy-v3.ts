/** Version 3 economic protocol. CR and salvage are game assets, never NEAR. */
export const ECONOMY_ACTION = {job:1,sell:2,buy:3,craft:4,equip:5,list:6,cancel:7,purchase:8,repair:9,enter:10,defend:11,cancelJob:12} as const;
export interface ChainRun {id:number;kind:number;slot:number;chapter:number;seed:number;stage:number;bonus:boolean;day:number;started:number;expires:number}
export interface ChainPilot {cr:number;salvage:number;items:number[];equipped:number;day:number;claims:number;nonce:number;session_key:number[];session_until:number;session_epoch:number;run:ChainRun|null;last_run:number;last_won:boolean;last_hash:number[]}
export interface ChainCrown {holder:string;score:number;bounty:number;chapter:number;seed:number;replay_hash:number[];expires:number;lock:string|null;defended:boolean}
export interface ChainListing {id:number;seller:string;item:number;price:number}
export interface ChainWorld {version:3;total_cr:100100;reserve:number;player_count:number;operator:string;hound:string;moth:string;verifier:number[];key_version:number;paused:boolean;districts:number[];focus:number;stock:number;moth_spent:number;hound_spent:number;commission_spent:number;crowns:(ChainCrown|null)[];listings:ChainListing[]}
export interface EconomyIntent {actor:string;nonce:number;epoch:number;deadline:number;op:number;a:number;b:number;signature:number[]}
export interface EconomyCertificate {actor:string;run_id:number;kind:number;slot:number;chapter:number;seed:number;stage:number;bonus:boolean;day:number;score:number;kills:number;rescues:number;pulses:number;replay_hash:number[];final_hash:number[];issued:number;expires:number;key_version:number;signature:number[]}
function integer(n:number){if(!Number.isSafeInteger(n)||n<0)throw new Error('Expected a safe unsigned integer');return n;}
function account(s:string){if(!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(s)||s.length<2||s.length>64)throw new Error('Invalid account');return s;}
function domain(kind:string,contract:string,actor:string){if(!contract.endsWith('.testnet'))throw new Error('Testnet contract required');return [kind,'near:testnet',account(contract),account(actor)];}
export function bytesHex(bytes:number[]){if(bytes.length!==32||bytes.some(n=>!Number.isInteger(n)||n<0||n>255))throw new Error('Expected 32 bytes');return bytes.map(n=>n.toString(16).padStart(2,'0')).join('');}
export function hexBytes(hex:string){if(!/^[a-f0-9]{64}$/.test(hex))throw new Error('Expected 32-byte hex');return Array.from(hex.match(/../g)!,h=>parseInt(h,16));}
export function economyIntentMessage(contract:string,i:EconomyIntent){return [...domain('RIVALGHOST-ACTION-v3',contract,i.actor),...[i.nonce,i.epoch,i.deadline,i.op,i.a,i.b].map(integer)].join('|');}
export function economyCertificateMessage(contract:string,c:EconomyCertificate){return [...domain('RIVALGHOST-RESULT-v3',contract,c.actor),...[c.run_id,c.kind,c.slot,c.chapter,c.seed,c.stage,c.bonus?1:0,c.day,c.score,c.kills,c.rescues,c.pulses].map(integer),bytesHex(c.replay_hash),bytesHex(c.final_hash),...[c.issued,c.expires,c.key_version].map(integer)].join('|');}
/** Strict Borsh wire format, max 512 bytes. Signature message is independently domain-separated text. */
export function encodeEconomyCertificate(c:EconomyCertificate):number[]{
 const data:number[]=[];
 const int=(n:number,size:number)=>{integer(n);let x=BigInt(n);if(x>=1n<<BigInt(size*8))throw new Error('Integer overflow');for(let j=0;j<size;j++){data.push(Number(x&255n));x>>=8n;}};
 const actor=new TextEncoder().encode(account(c.actor));int(actor.length,4);data.push(...actor);
 int(c.run_id,8);int(c.kind,1);int(c.slot,1);int(c.chapter,1);int(c.seed,4);int(c.stage,1);int(c.bonus?1:0,1);int(c.day,8);int(c.score,8);
 for(const n of [c.kills,c.rescues,c.pulses])int(n,4);
 for(const hash of [c.replay_hash,c.final_hash]){bytesHex(hash);data.push(...hash);}
 int(c.issued,8);int(c.expires,8);int(c.key_version,4);
 if(c.signature.length!==64||c.signature.some(n=>!Number.isInteger(n)||n<0||n>255))throw new Error('Invalid signature');
 int(64,4);data.push(...c.signature);if(data.length>512)throw new Error('Certificate too large');return data;
}
