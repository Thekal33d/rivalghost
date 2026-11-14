/** Password-encrypted owner key. Only encrypted bytes persist; unlocked keys live in memory. */
export interface WalletBackup {format:'rivalghost-device-wallet';version:1;network:'testnet';accountId:string;kdf:'PBKDF2-SHA256';iterations:600000;salt:string;iv:string;ciphertext:string}
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
const bytes=(s:string)=>Uint8Array.from(s.match(/../g)??[],h=>parseInt(h,16));
const encoder=new TextEncoder();
function aad(v:WalletBackup){return encoder.encode(JSON.stringify([v.format,v.version,v.network,v.accountId,v.kdf,v.iterations,v.salt,v.iv]));}
export function parseBackup(text:string):WalletBackup {
 if(text.length>4096)throw new Error('Recovery file is too large.');
 let v:WalletBackup;try{v=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('This file could not be read as a recovery file. Finish saving the download in Files or Downloads, then select the .json file.');}
 if(!v||typeof v!=='object'||Array.isArray(v)||v.format!=='rivalghost-device-wallet')throw new Error('This is not a RivalGhost recovery file. Choose the rivalghost-testnet-… .json download. Your saved account is unchanged.');
 if(v.version!==1||v.network!=='testnet')throw new Error('This recovery file uses an unsupported version or network. Your saved account is unchanged.');
 if(v.kdf!=='PBKDF2-SHA256'||v.iterations!==600000)throw new Error('This recovery file has unsupported encryption settings. Your saved account is unchanged.');
 for(const [field,length] of [['accountId',64],['salt',32],['iv',24],['ciphertext',128]] as const){
  if(typeof v[field]!=='string'||v[field].length!==length||!/^[a-f0-9]+$/.test(v[field]))throw new Error(`Recovery file is incomplete or damaged (${field}). Finish saving the original download, then select it again. Your saved account is unchanged.`);
 }
 return {format:v.format,version:v.version,network:v.network,accountId:v.accountId,kdf:v.kdf,iterations:v.iterations,salt:v.salt,iv:v.iv,ciphertext:v.ciphertext};
}
/** Read before resetting the picker: mobile file providers may still be resolving the selected file. */
export async function readBackupFile(file:File):Promise<WalletBackup>{
 if(file.size>4096)throw new Error('Recovery file is too large. Choose the RivalGhost .json download.');
 let data:ArrayBuffer;
 try{data=await file.arrayBuffer();}catch{throw new Error('The file could not be opened. Save it in Files or Downloads first, then select it again. Your saved account is unchanged.');}
 if(!data.byteLength)throw new Error('The selected file is empty. Finish saving the download, then select it again.');
 if(data.byteLength>4096)throw new Error('Recovery file is too large.');
 let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw new Error('Choose the original RivalGhost .json download; this file is not readable text.');}
 return parseBackup(text);
}

async function wrappingKey(password:string,v:WalletBackup){
 if(!password||password.length>1024)throw new Error('Enter your recovery password (up to 1024 characters).');
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(v.salt),iterations:v.iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function createBackup(password:string):Promise<WalletBackup>{
 if(password.length<12||password.length>1024)throw new Error('Use a recovery password of at least 12 characters (maximum 1024).');
 const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const v:WalletBackup={format:'rivalghost-device-wallet',version:1,network:'testnet',accountId:hex(await crypto.subtle.exportKey('raw',pair.publicKey)),kdf:'PBKDF2-SHA256',iterations:600000,salt:hex(crypto.getRandomValues(new Uint8Array(16)).buffer),iv:hex(crypto.getRandomValues(new Uint8Array(12)).buffer),ciphertext:''};
 const raw=new Uint8Array(await crypto.subtle.exportKey('pkcs8',pair.privateKey));
 try{v.ciphertext=hex(await crypto.subtle.encrypt({name:'AES-GCM',iv:bytes(v.iv),additionalData:aad(v)},await wrappingKey(password,v),raw));}finally{raw.fill(0);}
 return parseBackup(JSON.stringify(v));
}
export async function decryptBackup(input:WalletBackup,password:string):Promise<CryptoKey>{
 const v=parseBackup(JSON.stringify(input)),wrapping=await wrappingKey(password,v);let raw:Uint8Array<ArrayBuffer>;
 try{raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(v.iv),additionalData:aad(v)},wrapping,bytes(v.ciphertext)));}catch{throw new Error('Wrong password or damaged recovery file.');}
 try{
  const privateKey=await crypto.subtle.importKey('pkcs8',raw,'Ed25519',false,['sign']);
  const publicKey=await crypto.subtle.importKey('raw',bytes(v.accountId),'Ed25519',false,['verify']);
  const probe=encoder.encode('RivalGhost recovery key check');
  if(!await crypto.subtle.verify('Ed25519',publicKey,await crypto.subtle.sign('Ed25519',privateKey,probe),probe))throw new Error('Recovery key does not match its account.');
  return privateKey;
 }finally{raw.fill(0);}
}
async function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const q=indexedDB.open('rivalghost.device-wallet',1);q.onupgradeneeded=()=>q.result.createObjectStore('vault');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onblocked=()=>reject(new Error('Wallet storage is busy in another tab.'));});}
export async function readVault():Promise<WalletBackup|null>{const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('vault','readonly'),q=t.objectStore('vault').get('owner');let result:WalletBackup|null=null;q.onsuccess=()=>{try{result=q.result?parseBackup(JSON.stringify(q.result)):null;}catch(e){reject(e);}};t.oncomplete=()=>{d.close();resolve(result);};t.onabort=()=>{d.close();reject(t.error);};});}
export async function saveVault(v:WalletBackup){parseBackup(JSON.stringify(v));const d=await db();return new Promise<void>((resolve,reject)=>{const t=d.transaction('vault','readwrite'),s=t.objectStore('vault'),q=s.get('owner');let conflict=false;q.onsuccess=()=>{if(q.result&&q.result.accountId!==v.accountId){conflict=true;t.abort();}else if(!q.result)s.put(v,'owner');};t.oncomplete=()=>{d.close();resolve();};t.onabort=()=>{d.close();reject(new Error(conflict?'A different wallet is saved here. Restore in another browser profile to keep both wallets safe.':'Wallet could not be saved.'));};});}
let unlocked:{accountId:string;key:CryptoKey}|null=null;
export function lockWallet(){unlocked=null;}
export function walletUnlocked(accountId?:string){return !!unlocked&&(!accountId||unlocked.accountId===accountId);}
export async function unlockWallet(v:WalletBackup,password:string){const key=await decryptBackup(v,password);unlocked={accountId:v.accountId,key};}
export async function ownerSign(accountId:string,message:Uint8Array<ArrayBuffer>){if(!unlocked||unlocked.accountId!==accountId)throw new Error('Unlock your device wallet in Pilot Identity first.');return hex(await crypto.subtle.sign('Ed25519',unlocked.key,message));}
