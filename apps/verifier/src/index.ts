import {
  replayHash,
  resultHash,
  simulateArena,
  type ReplayInput,
} from "@rivalghost/sim";

export const VERIFIER_SERVICE_NAME = "rivalghost-verifier";

export interface StoredChallenge {
  id: string;
  crownId: string;
  playerId: string;
  seed: number;
  rulesVersion: number;
  loadoutHash: string;
  expiresAtMs: number;
}

export interface VerifiedReplay {
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
 * Re-runs a submitted input log against authoritative Challenge fields.
 * Signing and persistence are deliberately separate so this function remains
 * deterministic and easy to exercise in tests and a future HTTP worker.
 */
export async function verifyReplay(
  challenge: StoredChallenge,
  playerId: string,
  replay: ReplayInput,
  nowMs: number,
): Promise<VerifiedReplay> {
  if (nowMs >= challenge.expiresAtMs) throw new Error("Challenge has expired");
  if (playerId !== challenge.playerId) throw new Error("Replay player does not match challenge");
  if (replay.seed !== challenge.seed) throw new Error("Replay seed does not match challenge");
  if (replay.rulesVersion !== challenge.rulesVersion) throw new Error("Replay rules version does not match challenge");

  const result = simulateArena(replay);
  return {
    challengeId: challenge.id,
    crownId: challenge.crownId,
    playerId,
    rulesVersion: challenge.rulesVersion,
    seed: challenge.seed,
    loadoutHash: challenge.loadoutHash,
    replayHash: await replayHash(replay),
    finalStateHash: await resultHash(result),
    score: result.score,
    expiresAtMs: challenge.expiresAtMs,
  };
}
