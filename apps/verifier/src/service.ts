import type { SettlementCertificate } from "@rivalghost/game-data";
import type { ReplayInput } from "@rivalghost/sim";
import {
  issueSettlementCertificate,
  verifyReplay,
  type StoredChallenge,
} from "./index.js";

export interface ChallengeSource {
  getChallenge(challengeId: string): Promise<StoredChallenge | null>;
}

export interface ReplaySubmission {
  challengeId: string;
  playerId: string;
  replay: ReplayInput;
}

/**
 * Application boundary for an HTTP route or queue worker. It knows no wallet
 * key and no CR balance: those remain respectively in the signer and contract.
 */
export class ReplayVerificationService {
  constructor(
    private readonly challenges: ChallengeSource,
    private readonly signingKey: CryptoKey,
    private readonly verifierKeyVersion = 1,
  ) {}

  async verifyAndIssue(
    submission: ReplaySubmission,
    nowMs: number,
  ): Promise<SettlementCertificate> {
    const challenge = await this.challenges.getChallenge(submission.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    const verified = await verifyReplay(
      challenge,
      submission.playerId,
      submission.replay,
      nowMs,
    );
    return issueSettlementCertificate(
      verified,
      nowMs,
      this.signingKey,
      this.verifierKeyVersion,
    );
  }
}
