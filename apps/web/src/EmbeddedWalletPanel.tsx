import {withOperation,operationStage} from './operation-state';
import {useEffect,useState} from 'react';
import {createBackup,readBackupFile,readVault,saveVault,unlockWallet,lockWallet,walletUnlocked,type WalletBackup} from './device-vault';
import {loginWallet,authorizeWallet,recoverAuthorization} from './embedded-wallet-client';
import {chainHttp,recoverChainAction} from './chain-client';
import {getOrCreatePilotKey,readPilotKey} from './guest-key';
export function EmbeddedWalletPanel({connected,accountId,onChanged}:{connected:boolean;accountId?:string;onChanged:()=>void}){
 const [recovery,setRecovery]=useState<{name:string;backup:WalletBackup}|null>(null),[recoveryPassword,setRecoveryPassword]=useState('');
 const [enabled,setEnabled]=useState(false),[vault,setVault]=useState<WalletBackup|null>(null),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[downloaded,setDownloaded]=useState(false),[saved,setSaved]=useState(false),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[balance,setBalance]=useState<number>(),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let alive=true;void Promise.all([chainHttp('embedded/config'),readVault()]).then(([c,v])=>{if(alive){setEnabled(c.enabled);setVault(v);setSaved(!!v&&localStorage.getItem("rivalghost.backup.saved."+v.accountId)==="yes");setLoaded(true);}}).catch(e=>{if(alive)setMessage(e.message);});return()=>{alive=false;};},[]);
 useEffect(()=>{let alive=true;void Promise.all([chainHttp('chain/config'),readPilotKey()]).then(([c,k])=>{if(!alive)return;const p=c.pilot;setReady(connected&&!!k&&p?.session_until>Date.now()&&p.session_key.map((n:number)=>n.toString(16).padStart(2,'0')).join('')===k.publicKey);setBalance(p?.cr);}).catch(()=>{if(alive)setReady(false);});return()=>{alive=false;};},[connected,revision]);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1),timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
 async function run(fn:()=>Promise<void>,title="Updating your account"){setBusy(true);setMessage('');try{await withOperation(title,async()=>{operationStage('Working securely in this browser…');await fn();});setRevision(n=>n+1);}catch(e){setMessage(e instanceof Error?e.message:'This account action could not finish. Please try again.');}finally{setBusy(false);setPassword('');setConfirm('');setRecoveryPassword('');}}
 function download(){if(!vault)return;const url=URL.createObjectURL(new Blob([JSON.stringify(vault,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`rivalghost-testnet-${vault.accountId.slice(0,12)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setDownloaded(true);setMessage('Finish saving the download in Files or Downloads, then tick the confirmation below and sign in. You do not need to upload it here.');}
 async function connect(){if(!vault)throw new Error('Create or restore an account first.');if(!saved)throw new Error('Save your encrypted recovery file first.');if(!walletUnlocked(vault.accountId))await unlockWallet(vault,password);await saveVault(vault);await loginWallet(vault.accountId);onChanged();localStorage.removeItem('rivalghost.pilot-profile.v1');window.dispatchEvent(new Event('rivalghost:identity'));setMessage('You’re signed in. Enable game purchases below when you’re ready.');}
 if(loaded&&!enabled)return null;
 const unlocked=walletUnlocked(vault?.accountId),matches=!connected||accountId===vault?.accountId;
 return <div className="near-auth-panel device-wallet-panel" tabIndex={-1}>
  <p className="eyebrow">YOUR GAME ACCOUNT</p>
  <p>Create an account on this device, or restore one using your recovery file. You’ll need both the file and your password to sign in on another device.</p>
  <p className="pilot-disclosure">Your password cannot be reset. Save your encrypted recovery file and password somewhere safe.</p>
  {message&&<p role="status" className="pilot-status">{message}</p>}
  {!loaded&&<p role="status">Checking your saved account…</p>}
  {vault&&<p className="pilot-status">{connected?'SIGNED IN':'ACCOUNT SAVED ON THIS DEVICE'}<small>{vault.accountId}</small></p>}
  {loaded&&!recovery&&(!vault||!unlocked)&&<label className="device-wallet-field">Recovery password<input type="password" autoComplete={vault?'current-password':'new-password'} value={password} maxLength={1024} onChange={e=>setPassword(e.target.value)} disabled={busy} placeholder={vault?'Enter recovery password':'At least 12 characters'}/></label>}
  {loaded&&!vault&&!recovery&&<>
   <label className="device-wallet-field">Confirm recovery password<input type="password" autoComplete="new-password" value={confirm} maxLength={1024} onChange={e=>setConfirm(e.target.value)} disabled={busy}/></label>
   <button className="pilot-save" disabled={busy||!enabled} onClick={()=>void run(async()=>{if(password!==confirm)throw new Error('Passwords do not match.');const v=await createBackup(password);await saveVault(v);await unlockWallet(v,password);setVault(v);setSaved(false);setMessage('Download your recovery file before signing in.');},'Creating your account')}>CREATE ACCOUNT</button>
  </>}

  {vault&&!connected&&!recovery&&<p className="device-backup-next">{saved?'Your recovery copy is marked saved. Sign in below.':'Download your recovery file, save it in Files or Downloads, then tick the confirmation below. You do not need to upload the file to finish signup on this device.'}</p>}
  {recovery&&<div className="device-wallet-recovery">
   <p>Selected backup: <strong>{recovery.name}</strong></p>
   <label className="device-wallet-field">Backup password<input type="password" autoComplete="current-password" value={recoveryPassword} maxLength={1024} onChange={e=>setRecoveryPassword(e.target.value)} disabled={busy} placeholder="Original password for this backup" aria-describedby="backup-password-help"/></label>
   <p id="backup-password-help">Use the password you chose when you created this account. Selecting a file does not unlock it. Keep this password private.</p>
   <button className="pilot-save" disabled={busy||!recoveryPassword} onClick={()=>void run(async()=>{const v=recovery.backup;await unlockWallet(v,recoveryPassword);await saveVault(v);setVault(v);localStorage.setItem("rivalghost.backup.saved."+v.accountId,"yes");setSaved(true);setRecovery(null);setMessage('Recovery file verified. Sign in below.');},'Restoring your account')}>RESTORE ACCOUNT</button>
   <button className="text-button" disabled={busy} onClick={()=>{setRecovery(null);setRecoveryPassword('');setMessage('');}}>CANCEL RESTORE</button>
  </div>}
  {vault&&<>
   <button className="text-button" disabled={busy} onClick={download}>DOWNLOAD RECOVERY FILE</button>
   {(!saved||downloaded)&&!connected&&<label className="device-wallet-field"><span><input type="checkbox" disabled={!downloaded||busy} checked={saved} onChange={e=>{if(e.target.checked)localStorage.setItem("rivalghost.backup.saved."+vault.accountId,"yes");setSaved(e.target.checked);}}/> I saved my recovery file and password.</span></label>}
   {!matches&&<p role="status">You’re signed in to a different account. Sign out before using this saved account.</p>}
   {!connected?(!recovery&&<button className="pilot-save" disabled={busy||!saved||!enabled||!!recovery} onClick={()=>void run(connect,'Signing you in')}>SIGN IN</button>):<>
    {!unlocked&&matches&&<button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await unlockWallet(vault,password);setMessage('Account unlocked for this visit.');},'Unlocking your account')}>UNLOCK ACCOUNT</button>}
    {unlocked&&<button className="text-button" disabled={busy} onClick={()=>{lockWallet();setRevision(n=>n+1);}}>LOCK ACCOUNT</button>}
   </>}
  </>}
  {loaded&&!connected&&!recovery&&<details className="device-restore-options"><summary>{vault?'RESTORE A RECOVERY FILE (OPTIONAL)':'ALREADY HAVE AN ACCOUNT? RESTORE IT'}</summary>
   <p>{vault?'Your account is already saved here. Use this only to restore a backup; normal signup continues with the download confirmation and Sign in button.':'Choose the recovery file saved from your other device. You will enter its original password next.'}</p>
   <label className="device-wallet-field">Choose recovery file<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const input=e.currentTarget,file=input.files?.[0];if(file)void run(async()=>{try{const backup=await readBackupFile(file);if(vault&&backup.accountId!==vault.accountId)throw new Error('A different account is saved here. Use another browser profile to restore this account.');setRecovery({name:file.name,backup});setMessage('File selected. Enter the password used when this backup was created, then restore your account.');}finally{input.value='';}},'Checking your recovery file');}}/></label>
  </details>}
  {connected&&<>
   <p className="eyebrow">{ready?'GAME SESSION ACTIVE':'ENABLE GAME PURCHASES'}</p>
   <p>{ready?`This browser can use your items and ${balance??0} CR.`:'Allow this browser to spend game CR, trade cosmetics and enter flights for 12 hours. This cannot transfer NEAR tokens. Enabling purchases here ends the purchasing session on your other browsers.'}</p>
   {!ready&&<button className="pilot-save" disabled={busy||!enabled||!unlocked||!matches||!saved} onClick={()=>void run(async()=>{const key=await getOrCreatePilotKey();await authorizeWallet(key.publicKey);setMessage('Game purchases enabled. Open Workshop or Crown Pit.');},'Enabling game purchases')}>ENABLE GAME PURCHASES</button>}
   <button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await recoverAuthorization();setMessage('Game purchases enabled.');},'Checking your purchase permissions')}>CHECK PURCHASE SETUP</button>
   <button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await recoverChainAction();setMessage('Game action confirmed.');},'Checking your pending game action')}>CHECK PENDING GAME ACTION</button>
  </>}
  <p className="pilot-disclosure">Powered by NEAR testnet. Creating an account here does not import balances from an existing NEAR Auth account.</p>
  {busy&&<p role="status">Working securely… Please keep this tab open.</p>}
 </div>;
}
