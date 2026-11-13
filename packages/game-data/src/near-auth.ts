/** NEP-413 encoding, matching NEAR Auth upstream bef019afd049c6637dd21be6629050762b943c18.
 * Published SDK 1.4.x omits this documented flow. Keep the compatibility bridge isolated.
 * https://github.com/near/NEPs/blob/master/neps/nep-0413.md */
export interface NearLoginChallenge {id:string;nonce:string;message:string;recipient:string;callbackUrl:string;expiresAt:number}
export function encodeNearLogin(c:NearLoginChallenge):Uint8Array {
  if(!/^[a-f0-9]{64}$/.test(c.nonce))throw new Error('Invalid login nonce');
  const chunks:Uint8Array[]=[];
  const u32=(n:number)=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);chunks.push(b);};
  const str=(s:string)=>{const b=new TextEncoder().encode(s);u32(b.length);chunks.push(b);};
  u32(2**31+413);str(c.message);chunks.push(Uint8Array.from(c.nonce.match(/../g)!,h=>parseInt(h,16)));str(c.recipient);
  chunks.push(new Uint8Array([1]));str(c.callbackUrl);
  const out=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let offset=0;for(const b of chunks){out.set(b,offset);offset+=b.length;}
  if(out.length>1000)throw new Error('Login message is too long');return out;
}
