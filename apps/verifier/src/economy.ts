import {economyCertificateMessage,hexBytes,type ChainRun,type EconomyCertificate} from '@rivalghost/game-data';
import {validateExpedition,simulateExpedition,expeditionReplayHash,sha256Hex,type ExpeditionReplay} from '@rivalghost/sim';

/** Caller must obtain the run and verifier version from finalized chain state.
 * Repair stage is visual-only in simulation v3, but remains frozen and signed.
 */
export async function verifyEconomyReplay(contract:string,actor:string,run:ChainRun,replay:ExpeditionReplay,now:number,keyVersion:number,key:CryptoKey):Promise<EconomyCertificate>{
 if(run.expires<=now||run.started>now||run.kind<0||run.kind>4)throw new Error('Run is not active');
 if(run.kind>0&&run.kind<4&&run.day!==Math.floor(now/86400000))throw new Error('Job day ended');
 validateExpedition(replay);
 if(replay.rulesVersion!==3||replay.chapter!==run.chapter||replay.seed!==run.seed||replay.rig!=='fan')throw new Error('Replay does not match the on-chain mission');
 const result=simulateExpedition(replay);
 const cert:EconomyCertificate={actor,run_id:run.id,kind:run.kind,slot:run.slot,chapter:run.chapter,seed:run.seed,stage:run.stage,bonus:run.bonus,day:run.day,
  score:result.score,kills:result.kills,rescues:result.rescues,pulses:result.pulses,replay_hash:hexBytes(await expeditionReplayHash(replay)),final_hash:hexBytes(await sha256Hex(new TextEncoder().encode(JSON.stringify(result)))),issued:now,expires:run.expires,key_version:keyVersion,signature:[]};
 cert.signature=Array.from(new Uint8Array(await crypto.subtle.sign('Ed25519',key,new TextEncoder().encode(economyCertificateMessage(contract,cert)))));return cert;
}
