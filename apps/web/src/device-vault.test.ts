import {it,expect} from 'vitest';
import {createBackup,decryptBackup,parseBackup,unlockWallet,ownerSign,lockWallet,walletUnlocked} from './device-vault';
it('round-trips an encrypted backup into a non-exportable signing key',async()=>{
 const v=await createBackup('a sufficiently long test password'),key=await decryptBackup(v,'a sufficiently long test password');
 expect(v.ciphertext).toHaveLength(128);expect(key.extractable).toBe(false);
 await expect(crypto.subtle.exportKey('pkcs8',key)).rejects.toThrow();
 const publicKey=await crypto.subtle.importKey('raw',Buffer.from(v.accountId,'hex'),'Ed25519',false,['verify']);
 await unlockWallet(v,'a sufficiently long test password');const message=new TextEncoder().encode('test authorization');
 const sig=await ownerSign(v.accountId,message);expect(await crypto.subtle.verify('Ed25519',publicKey,Buffer.from(sig,'hex'),message)).toBe(true);
 await expect(ownerSign('00'.repeat(32),message)).rejects.toThrow('Unlock');lockWallet();expect(walletUnlocked()).toBe(false);await expect(ownerSign(v.accountId,message)).rejects.toThrow('Unlock');
});
it('rejects wrong passwords, tampering, account swaps, wrong networks and malicious KDF parameters',async()=>{
 const v=await createBackup('another strong test password');
 await expect(decryptBackup(v,'wrong password')).rejects.toThrow('Wrong password');
 await expect(decryptBackup({...v,ciphertext:(v.ciphertext[0]==='0'?'1':'0')+v.ciphertext.slice(1)},'another strong test password')).rejects.toThrow();
 await expect(decryptBackup({...v,accountId:'00'.repeat(32)},'another strong test password')).rejects.toThrow();
 for(const change of [{network:'mainnet'},{iterations:1},{iterations:1e12},{salt:'invalid'},{ciphertext:'ff'.repeat(10000)}])expect(()=>parseBackup(JSON.stringify({...v,...change}))).toThrow();
 await expect(createBackup('short')).rejects.toThrow('12');
});
