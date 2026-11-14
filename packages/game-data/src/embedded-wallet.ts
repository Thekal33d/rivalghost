export interface EmbeddedChallenge {nonce:string;accountId:string;origin:string;expiresAt:number}
export function embeddedLoginMessage(c:EmbeddedChallenge):string {
 return `RivalGhost embedded wallet login\nNetwork: testnet\nOrigin: ${c.origin}\nAccount: ${c.accountId}\nNonce: ${c.nonce}\nExpires: ${c.expiresAt}`;
}
