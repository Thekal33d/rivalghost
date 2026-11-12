import {
  expeditionReplayHash,
  simulateExpedition,
  sha256Hex,
  type ExpeditionReplay,
  replayHash,
  resultHash,
  simulateArena,
  type ReplayInput,
} from "@rivalghost/sim";
import {
  competitionHash,
  validateMission,
  type CompetitionMission,
  signSettlementCertificate,
  type SettlementCertificate,
} from "@rivalghost/game-data";

export const VERIFIER_SERVICE_NAME = "rivalghost-verifier";

export interface StoredChallenge {
  contractId?:string;
  mission?:CompetitionMission | null;
  settled?:boolean;
  id: string;
  crownId: string;
  playerId: string;
  seed: number;
  rulesVersion: number;
  loadoutHash: string;
  expiresAtMs: number;
}

export interface VerifiedReplay {
  contractId?:string;
  challengeId: string;
  crownId: string;
  playerId: string;
  rulesVersion: number;
  seed: number;
  loadoutHash: string;
  replayHash: string;
  finalStateHash: string;
  score: number;
  expiresAtMs: number;
}

/**
 * Turns a verified replay into an expiring Ed25519 certificate. The private
 * key stays in the verifier process; callers only receive its public result.
 */
export async function issueSettlementCertificate(
  verified: VerifiedReplay,
  issuedAtMs: number,
  signingKey: CryptoKey,
  verifierKeyVersion = 1,
): Promise<SettlementCertificate> {
  if (issuedAtMs >= verified.expiresAtMs) {
    throw new Error("Challenge expired before its certificate could be issued");
  }

  return signSettlementCertificate({
    certificateVersion: verified.rulesVersion===2?2:1,
    ...(verified.rulesVersion===2?{contractId:verified.contractId}:{}),
    challengeId: verified.challengeId,
    crownId: verified.crownId,
    playerId: verified.playerId,
    rulesVersion: verified.rulesVersion,
    seed: verified.seed,
    loadoutHash: verified.loadoutHash,
    replayHash: verified.replayHash,
    finalStateHash: verified.finalStateHash,
    score: verified.score,
    issuedAtMs,
    expiresAtMs: verified.expiresAtMs,
    verifierKeyVersion,
  }, signingKey);
}

/**
 * Re-runs a submitted input log against authoritative Challenge fields.
 * Signing and persistence are deliberately separate so this function remains
 * deterministic and easy to exercise in tests and a future HTTP worker.
 */
export async function verifyReplay(
  challenge: StoredChallenge,
  playerId: string,
  replay: ReplayInput | ExpeditionReplay,
  nowMs: number,
): Promise<VerifiedReplay> {
  if(challenge.settled)throw new Error("Challenge already settled");
  if (nowMs >= challenge.expiresAtMs) throw new Error("Challenge has expired");
  if (playerId !== challenge.playerId) throw new Error("Replay player does not match challenge");
  if (replay.seed !== challenge.seed) throw new Error("Replay seed does not match challenge");
  if (replay.rulesVersion !== challenge.rulesVersion) throw new Error("Replay rules version does not match challenge");

  let score:number, inputHash:string, stateHash:string;
  if(challenge.rulesVersion===2) {
    if(!challenge.mission || !challenge.contractId)throw new Error("Unsupported rules: missing v2 mission or deployment");
    validateMission(challenge.mission);
    const flight=replay as ExpeditionReplay;
    if(flight.chapter!==challenge.mission.chapter || flight.rig!==challenge.mission.rig)throw new Error("Replay mission does not match challenge");
    if(await competitionHash(challenge.seed,challenge.mission)!==challenge.loadoutHash)throw new Error("Challenge mission hash is invalid");
    const result=simulateExpedition(flight);
    score=result.score;
    inputHash=await expeditionReplayHash(flight);
    stateHash=await sha256Hex(new TextEncoder().encode(JSON.stringify(result)));
  } else if(challenge.rulesVersion===1) {
    const legacy=replay as ReplayInput;
    const result=simulateArena(legacy);
    score=result.score;inputHash=await replayHash(legacy);stateHash=await resultHash(result);
  } else throw new Error("Unsupported rules version");
  return {
    ...(challenge.rulesVersion===2?{contractId:challenge.contractId}:{}),
    challengeId: challenge.id,
    crownId: challenge.crownId,
    playerId,
    rulesVersion: challenge.rulesVersion,
    seed: challenge.seed,
    loadoutHash: challenge.loadoutHash,
    replayHash: inputHash,
    finalStateHash: stateHash,
    score,
    expiresAtMs: challenge.expiresAtMs,
  };
}
