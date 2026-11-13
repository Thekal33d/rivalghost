import type { CompetitionMission, SettlementCertificate } from "@rivalghost/game-data";

export interface Crown {
  mission?:CompetitionMission | null;
  loadout_hash?:string;
  active_challenge_id?:number | null;
  id: number;
  holder: string;
  score_to_beat: number;
  bounty_credits: number;
  seed: number;
  ghost_hash: string;
  rules_version: number;
  opened_at_ms: number;
  expires_at_ms: number;
  active: boolean;
  defense_used: boolean;
}

export interface Challenge {
  mission?:CompetitionMission | null;
  id: number;
  crown_id: number;
  challenger: string;
  entry_credits: number;
  started_at_ms: number;
  expires_at_ms: number;
  rules_version: number;
  seed: number;
  loadout_hash: string;
  settled: boolean;
}

export interface Settlement {
  challenge_id: number;
  challenger_won: boolean;
  challenger_credits: number;
  holder_credits: number;
  crown_bounty_credits: number;
}

/** Adapts any wallet, relayer, or test double to the small RivalGhost ABI. */
export interface NearContractTransport {
  view<Result>(contractId: string, methodName: string, args: Record<string, unknown>): Promise<Result>;
  change<Result>(contractId: string, methodName: string, args: Record<string, unknown>): Promise<Result>;
}

export class RivalGhostClient {
  constructor(
    readonly contractId: string,
    private readonly transport: NearContractTransport,
  ) {}

  getCrown(crownId: number): Promise<Crown | null> {
    return this.transport.view(this.contractId, "get_crown", { crown_id: assertSafeId(crownId, "crownId") });
  }

  getChallenge(challengeId: number): Promise<Challenge | null> {
    return this.transport.view(this.contractId, "get_challenge", { challenge_id: assertSafeId(challengeId, "challengeId") });
  }

  getActiveChallenge(accountId: string): Promise<Challenge | null> {
    return this.transport.view(this.contractId, "get_active_challenge", { account_id: accountId });
  }

  startChallenge(crownId: number): Promise<Challenge> {
    return this.transport.change(this.contractId, "start_challenge", {
      crown_id: assertSafeId(crownId, "crownId"),
    });
  }

  settleChallenge(certificate: SettlementCertificate): Promise<Settlement> {
    return this.transport.change(this.contractId, "settle_challenge", {
      certificate: toContractCertificate(certificate),
    });
  }

  defendCrown(crownId: number): Promise<Crown> {
    return this.transport.change(this.contractId, "defend_crown", {
      crown_id: assertSafeId(crownId, "crownId"),
    });
  }
}

export function toContractCertificate(certificate: SettlementCertificate): Record<string, unknown> {
  return {
    certificate_version: certificate.certificateVersion,
    ...(certificate.contractId?{contract_id:certificate.contractId}:{}),
    challenge_id: certificateId(certificate.challengeId, "challengeId"),
    crown_id: certificateId(certificate.crownId, "crownId"),
    player_id: certificate.playerId,
    rules_version: certificate.rulesVersion,
    seed: certificate.seed,
    loadout_hash: certificate.loadoutHash,
    replay_hash: certificate.replayHash,
    final_state_hash: certificate.finalStateHash,
    score: certificate.score,
    issued_at_ms: certificate.issuedAtMs,
    expires_at_ms: certificate.expiresAtMs,
    verifier_key_version: certificate.verifierKeyVersion,
    signature: certificate.signature,
  };
}

function certificateId(value: string, name: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a decimal NEAR contract id`);
  return assertSafeId(Number(value), name);
}

function assertSafeId(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a safe non-negative integer`);
  return value;
}
export * from "./rpc.js";
export * from "./wallet-transport.js";

export * from "./economy.js";
