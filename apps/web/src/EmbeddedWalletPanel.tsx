import {withOperation,operationStage} from './operation-state';
import {useEffect,useState} from 'react';
import {createBackup,parseBackup,readVault,saveVault,unlockWallet,lockWallet,walletUnlocked,type WalletBackup} from './device-vault';
import {loginWallet,authorizeWallet,recoverAuthorization} from './embedded-wallet-client';
import {chainHttp,recoverChainAction} from './chain-client';
import {getOrCreatePilotKey,readPilotKey} from './guest-key';
export function EmbeddedWalletPanel({connected,accountId,onChanged}:{connected:boolean;accountId?:string;onChanged:()=>void}){
 const [recovery,setRecovery]=useState<{name:string;backup:WalletBackup}|null>(null),[recoveryPassword,setRecoveryPassword]=useState('');
 const [enabled,setEnabled]=useState(false),[vault,setVault]=useState<WalletBackup|null>(null),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[downloaded,setDownloaded]=useState(false),[saved,setSaved]=useState(false),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[balance,setBalance]=useState<number>(),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let alive=true;void Promise.all([chainHttp('embedded/config'),readVault()]).then(([c,v])=>{if(alive){setEnabled(c.enabled);setVault(v);setSaved(!!v&&localStorage.getItem("rivalghost.backup.saved."+v.accountId)==="yes");setLoaded(true);}}).catch(e=>{if(alive)setMessage(e.message);});return()=>{alive=false;};},[]);
 useEffect(()=>{let alive=true;void Promise.all([chainHttp('chain/config'),readPilotKey()]).then(([c,k])=>{if(!alive)return;const p=c.pilot;setReady(connected&&!!k&&p?.session_until>Date.now()&&p.session_key.map((n:number)=>n.toString(16).padStart(2,'0')).join('')===k.publicKey);setBalance(p?.cr);}).catch(()=>{if(alive)setReady(false);});return()=>{alive=false;};},[connected,revision]);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1),timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
 async function run(fn:()=>Promise<void>,title="Updating your device wallet"){setBusy(true);setMessage('');try{await withOperation(title,async()=>{operationStage('Working securely in this browser…');await fn();});setRevision(n=>n+1);}catch(e){setMessage(e instanceof Error?e.message:'Wallet action could not finish.');}finally{setBusy(false);setPassword('');setConfirm('');setRecoveryPassword('');}}
 function download(){if(!vault)return;const url=URL.createObjectURL(new Blob([JSON.stringify(vault,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`rivalghost-testnet-${vault.accountId.slice(0,12)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setDownloaded(true);}
 async function connect(){if(!vault)throw new Error('Create or restore a wallet first.');if(!saved)throw new Error('Save your encrypted recovery file first.');if(!walletUnlocked(vault.accountId))await unlockWallet(vault,password);await saveVault(vault);await loginWallet(vault.accountId);onChanged();localStorage.removeItem('rivalghost.pilot-profile.v1');window.dispatchEvent(new Event('rivalghost:identity'));setMessage('Device wallet connected. Authorize your game session below.');}
 if(loaded&&!enabled)return null;
 const unlocked=walletUnlocked(vault?.accountId),matches=!connected||accountId===vault?.accountId;
 return <div className="near-auth-panel device-wallet-panel" tabIndex={-1}>
  <p className="eyebrow">DEVICE WALLET / NEAR TESTNET</p>
  <p>Create a wallet here. Keep its encrypted recovery file and password to use it on another device. This creates a separate account from NEAR Auth; existing balances stay with their original account.</p>
  <p className="pilot-disclosure">Your recovery password cannot be reset. Keep the file and password somewhere safe. Testnet only.</p>
  {message&&<p role="status" className="pilot-status">{message}</p>}
  {!loaded&&<p role="status">Checking wallet storage…</p>}
  {vault&&<p className="pilot-status">{connected?'CONNECTED WALLET':'WALLET SAVED ON THIS DEVICE'}<small>{vault.accountId}</small></p>}
  {loaded&&!recovery&&(!vault||!unlocked)&&<label className="device-wallet-field">Recovery password<input type="password" autoComplete={vault?'current-password':'new-password'} value={password} maxLength={1024} onChange={e=>setPassword(e.target.value)} disabled={busy} placeholder={vault?'Enter recovery password':'At least 12 characters'}/></label>}
  {loaded&&!vault&&!recovery&&<>
   <label className="device-wallet-field">Confirm recovery password<input type="password" autoComplete="new-password" value={confirm} maxLength={1024} onChange={e=>setConfirm(e.target.value)} disabled={busy}/></label>
   <button className="pilot-save" disabled={busy||!enabled} onClick={()=>void run(async()=>{if(password!==confirm)throw new Error('Passwords do not match.');const v=await createBackup(password);await saveVault(v);await unlockWallet(v,password);setVault(v);setSaved(false);setMessage('Download your recovery file before connecting.');},'Creating your encrypted wallet')}>CREATE DEVICE WALLET</button>
  </>}
  {loaded&&!connected&&<label className="device-wallet-field">Restore encrypted recovery file<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file){setRecovery(null);void run(async()=>{if(file.size>4096)throw new Error('Recovery file is too large.');const backup=parseBackup(await file.text());if(vault&&backup.accountId!==vault.accountId)throw new Error('A different wallet is saved here. Use another browser profile to restore it.');setRecovery({name:file.name,backup});setMessage('File selected. Enter the password used when this backup was created, then restore your wallet.');});}}}/></label>}
  {recovery&&<div className="device-wallet-recovery">
   <p>Selected backup: <strong>{recovery.name}</strong></p>
   <label className="device-wallet-field">Backup password<input type="password" autoComplete="current-password" value={recoveryPassword} maxLength={1024} onChange={e=>setRecoveryPassword(e.target.value)} disabled={busy} placeholder="Original password for this backup" aria-describedby="backup-password-help"/></label>
   <p id="backup-password-help">Use the password you chose when you created this wallet. Selecting a file does not unlock it. Keep this password private.</p>
   <button className="pilot-save" disabled={busy||!recoveryPassword} onClick={()=>void run(async()=>{const v=recovery.backup;await unlockWallet(v,recoveryPassword);await saveVault(v);setVault(v);localStorage.setItem("rivalghost.backup.saved."+v.accountId,"yes");setSaved(true);setRecovery(null);setMessage('Recovery file verified. Connect your wallet below.');},'Restoring your encrypted wallet')}>RESTORE WALLET</button>
   <button className="text-button" disabled={busy} onClick={()=>{setRecovery(null);setRecoveryPassword('');setMessage('');}}>CANCEL RESTORE</button>
  </div>}
  {vault&&<>
   <button className="text-button" disabled={busy} onClick={download}>DOWNLOAD ENCRYPTED BACKUP</button>
   {(!saved||downloaded)&&!connected&&<label className="device-wallet-field"><span><input type="checkbox" disabled={!downloaded||busy} checked={saved} onChange={e=>{if(e.target.checked)localStorage.setItem("rivalghost.backup.saved."+vault.accountId,"yes");setSaved(e.target.checked);}}/> I saved my recovery file and password.</span></label>}
   {!matches&&<p role="status">The connected account belongs to a different wallet. Sign out before restoring this wallet.</p>}
   {!connected?<button className="pilot-save" disabled={busy||!saved||!enabled||!!recovery} onClick={()=>void run(connect,'Connecting your device wallet')}>CONNECT DEVICE WALLET</button>:<>
    {!unlocked&&matches&&<button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await unlockWallet(vault,password);setMessage('Wallet unlocked for this visit.');},'Unlocking your wallet')}>UNLOCK WALLET</button>}
    {unlocked&&<button className="text-button" disabled={busy} onClick={()=>{lockWallet();setRevision(n=>n+1);}}>LOCK WALLET</button>}
   </>}
  </>}
  {connected&&<>
   <p className="eyebrow">{ready?'GAME SESSION ACTIVE':'AUTHORIZE GAME SESSION'}</p>
   <p>{ready?`This browser can use your on-chain items and ${balance??0} CR.`:'Authorize this browser for 12 hours to spend game CR, trade cosmetics and enter flights. It cannot transfer NEAR. Authorizing here replaces any other browser’s game session.'}</p>
   {!ready&&<button className="pilot-save" disabled={busy||!enabled||!unlocked||!matches||!saved} onClick={()=>void run(async()=>{const key=await getOrCreatePilotKey();await authorizeWallet(key.publicKey);setMessage('Game session confirmed on NEAR. Open Workshop or Crown Pit.');},'Authorizing your game session')}>AUTHORIZE GAME SESSION</button>}
   <button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await recoverAuthorization();setMessage('Wallet authorization confirmed.');},'Recovering your wallet authorization')}>RECOVER WALLET AUTHORIZATION</button>
   <button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await recoverChainAction();setMessage('Game transaction confirmed.');},'Recovering your game transaction')}>RECOVER GAME TRANSACTION</button>
  </>}
  {busy&&<p role="status">Working securely… Please keep this tab open.</p>}
 </div>;
}
