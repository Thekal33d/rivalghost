export interface GuestChallenge {nonce:string;publicKey:string;origin:string;expiresAt:number}
/** This proves control of a browser key; it authorizes no on-chain transaction. */
export function guestAuthMessage(c:GuestChallenge):string {
  if(!/^[a-f0-9]{64}$/.test(c.nonce)||!/^[a-f0-9]{64}$/.test(c.publicKey)||!Number.isSafeInteger(c.expiresAt)||new URL(c.origin).origin!==c.origin)throw new Error("Invalid guest challenge");
  return `RIVALGHOST-GUEST-v1|${c.origin}|${c.nonce}|${c.publicKey}|${c.expiresAt}`;
}
export const GUEST_METHODS=["start_challenge","settle_challenge","defend_crown","expire_challenge"] as const;
