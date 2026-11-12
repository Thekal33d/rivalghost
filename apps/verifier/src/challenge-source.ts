import {NearRpcViews,type Challenge,type Crown} from "@rivalghost/contracts-client";
import type {ChallengeSource} from "./service.js";
import type {StoredChallenge} from "./index.js";

/** Reads challenge and Crown from the same finalized block, never browser metadata. */
export class NearChallengeSource implements ChallengeSource {
  constructor(private readonly rpc:NearRpcViews,readonly contractId:string) {
    if(!/^[a-z0-9][a-z0-9._-]*\.testnet$/.test(contractId))throw new Error("A testnet contract is required");
  }
  async getChallenge(id:string):Promise<StoredChallenge|null> {
    if(!/^(0|[1-9][0-9]*)$/.test(id)||!Number.isSafeInteger(Number(id)))throw new Error("Invalid challenge id");
    const snapshot=await this.rpc.viewWithBlock<Challenge|null>(this.contractId,"get_challenge",{challenge_id:Number(id)});
    const c=snapshot.value;
    if(!c)return null;
    if(c.id!==Number(id)||!Number.isSafeInteger(c.crown_id)||!Number.isSafeInteger(c.expires_at_ms))throw new Error("Invalid stored challenge");
    const {value:crown}=await this.rpc.viewWithBlock<Crown|null>(this.contractId,"get_crown",{crown_id:c.crown_id},snapshot.blockHash);
    if(!crown || !crown.active || crown.active_challenge_id!==c.id || crown.seed!==c.seed || crown.rules_version!==c.rules_version || crown.loadout_hash!==c.loadout_hash)throw new Error("Challenge no longer owns its Crown lock");
    return {id,crownId:String(c.crown_id),contractId:this.contractId,playerId:c.challenger,seed:c.seed,rulesVersion:c.rules_version,mission:c.mission,loadoutHash:c.loadout_hash,expiresAtMs:c.expires_at_ms,settled:c.settled};
  }
}
