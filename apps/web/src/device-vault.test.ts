import {it,expect} from 'vitest';
import {createBackup,decryptBackup,parseBackup,readBackupFile,unlockWallet,ownerSign,lockWallet,walletUnlocked} from './device-vault';
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
 await expect(decryptBackup(v,'')).rejects.toThrow('Enter your recovery password');
 await expect(decryptBackup(v,'wrong password')).rejects.toThrow('Wrong password');
 await expect(decryptBackup({...v,ciphertext:(v.ciphertext[0]==='0'?'1':'0')+v.ciphertext.slice(1)},'another strong test password')).rejects.toThrow();
 await expect(decryptBackup({...v,accountId:'00'.repeat(32)},'another strong test password')).rejects.toThrow();
 for(const change of [{network:'mainnet'},{iterations:1},{iterations:1e12},{salt:'invalid'},{ciphertext:'ff'.repeat(10000)}])expect(()=>parseBackup(JSON.stringify({...v,...change}))).toThrow();
 await expect(createBackup('short')).rejects.toThrow('12');
});

it('reads saved files and UTF-8 BOMs without relaxing authenticated metadata checks',async()=>{
 const v=await createBackup('mobile file test password');
 const text=JSON.stringify(v,null,2);
 expect(new TextEncoder().encode(text)).toHaveLength(445);
 expect(await readBackupFile(new File([text],'account.json'))).toEqual(v);
 expect(await readBackupFile(new File(['\uFEFF'+text],'account.json'))).toEqual(v);
 expect(parseBackup('\uFEFF'+text)).toEqual(v);
 await expect(readBackupFile(new File([],'account.json'))).rejects.toThrow('empty');
 await expect(readBackupFile(new File(['x'.repeat(4097)],'account.json'))).rejects.toThrow('too large');
 await expect(readBackupFile(new File([new Uint8Array([255])],'account.json'))).rejects.toThrow('readable text');
 await expect(readBackupFile(Object.assign(new File(['test'],'account.json'),{arrayBuffer:async()=>{throw new Error('provider denied');}}))).rejects.toThrow('Save it in Files');
});
it('reports only the failed field, without exposing backup contents or accepting coercible data',async()=>{
 const v=await createBackup('invalid file test password');
 for(const [field,value] of Object.entries({format:'other',version:'1',network:'mainnet',iterations:'600000',accountId:'PRIVATE-DATA',salt:['a'.repeat(32)],iv:'a'.repeat(23),ciphertext:'a'.repeat(126)})){
  try{parseBackup(JSON.stringify({...v,[field]:value}));throw new Error('Accepted bad data');}catch(e){expect((e as Error).message).not.toBe('Accepted bad data');expect((e as Error).message).not.toContain('PRIVATE-DATA');}
 }
 expect(()=>parseBackup('{')).toThrow('Finish saving');
 for(const value of [null,[],true,7])expect(()=>parseBackup(JSON.stringify(value))).toThrow('not a RivalGhost');
});
