import { describe, expect, it } from "vitest";
import {
  RivalGhostClient,
  toContractCertificate,
  type NearContractTransport,
} from "./index.js";

const certificate = {
  certificateVersion: 1 as const,
  challengeId: "12",
  crownId: "4",
  playerId: "player.testnet",
  rulesVersion: 1,
  seed: 3,
  loadoutHash: "a".repeat(64),
  replayHash: "b".repeat(64),
  finalStateHash: "c".repeat(64),
  score: 14_001,
  issuedAtMs: 1_002,
  expiresAtMs: 121_001,
  verifierKeyVersion: 1,
  signature: Array.from({ length: 64 }, () => 7),
};

describe("RivalGhost contract client", () => {
  it("translates a signed browser certificate into the Rust contract ABI", () => {
    expect(toContractCertificate(certificate)).toMatchObject({
      certificate_version: 1,
      challenge_id: 12,
      crown_id: 4,
      player_id: "player.testnet",
      replay_hash: "b".repeat(64),
      signature: Array.from({ length: 64 }, () => 7),
    });
  });

  it("uses the configured transport and contract id for state changes", async () => {
    const calls: Array<{ methodName: string; args: Record<string, unknown> }> = [];
    const transport: NearContractTransport = {
      view: async <Result,>() => null as Result,
      change: async <Result,>(_contractId: string, methodName: string, args: Record<string, unknown>) => {
        calls.push({ methodName, args });
        return { challenge_id: 12, challenger_won: true } as Result;
      },
    };
    const client = new RivalGhostClient("rivalghost.testnet", transport);

    await client.startChallenge(4);
    await client.settleChallenge(certificate);

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ methodName: "start_challenge", args: { crown_id: 4 } });
    expect(calls[1]?.args).toMatchObject({
      certificate: expect.objectContaining({ challenge_id: 12, crown_id: 4 }),
    });
  });

  it("rejects unsafe or non-decimal identifiers before an RPC call", () => {
    expect(() => toContractCertificate({ ...certificate, challengeId: "12.5" })).toThrow("decimal");
    const client = new RivalGhostClient("rivalghost.testnet", {} as NearContractTransport);
    expect(() => client.startChallenge(Number.MAX_SAFE_INTEGER + 1)).toThrow("safe");
  });
});
