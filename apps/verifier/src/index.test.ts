import { describe, expect, it } from "vitest";
import { RULES_VERSION, RUN_TICKS } from "@rivalghost/game-data";
import { certificateMessage } from "@rivalghost/game-data";
import { encodeExpedition, type ReplayInput } from "@rivalghost/sim";
import {
  issueSettlementCertificate,
  verifyReplay,
  type StoredChallenge,
} from "./index.js";

const challenge: StoredChallenge = {
  id: "challenge-1",
  crownId: "crown-1",
  playerId: "player.testnet",
  seed: 3,
  rulesVersion: RULES_VERSION,
  loadoutHash: "a".repeat(64),
  expiresAtMs: 20_000,
};

const replay = {
  rulesVersion: RULES_VERSION,
  seed: 3,
  runs: [{ direction: 0 as const, ticks: RUN_TICKS }],
};

describe("replay verifier", () => {
  it("never certifies an expedition as a Crown v1 challenge", async () => {
    const expedition = encodeExpedition({seed:3,chapter:0,rig:"fan"},Array(3600).fill(0));
    await expect(verifyReplay(challenge,"player.testnet",expedition as unknown as ReplayInput,1000)).rejects.toThrow("rules");
    await expect(verifyReplay({...challenge,rulesVersion:2},"player.testnet",expedition as unknown as ReplayInput,1000)).rejects.toThrow("Unsupported rules");
  });
  it("binds hashes and score to the authoritative challenge", async () => {
    const verified = await verifyReplay(challenge, "player.testnet", replay, 1_000);

    expect(verified).toMatchObject({
      challengeId: "challenge-1",
      crownId: "crown-1",
      playerId: "player.testnet",
      score: 9_802,
    });
    expect(verified.replayHash).toHaveLength(64);
    expect(verified.finalStateHash).toHaveLength(64);
  });

  it("issues a signature over the complete verified result", async () => {
    const verified = await verifyReplay(challenge, "player.testnet", replay, 1_000);
    const keyPair = await globalThis.crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"],
    );
    const certificate = await issueSettlementCertificate(verified, 1_001, keyPair.privateKey, 4);

    expect(certificate.signature).toHaveLength(64);
    expect(new TextDecoder().decode(certificateMessage(certificate))).toBe(
      `RIVALGHOST-CERT-v1|challenge-1|crown-1|player.testnet|1|3|${"a".repeat(64)}|${certificate.replayHash}|${certificate.finalStateHash}|9802|1001|20000|4`,
    );
    await expect(globalThis.crypto.subtle.verify(
      { name: "Ed25519" },
      keyPair.publicKey,
      Uint8Array.from(certificate.signature),
      certificateMessage(certificate),
    )).resolves.toBe(true);
  });

  it("rejects a mismatched player, seed, rules version, or expired challenge", async () => {
    await expect(verifyReplay(challenge, "other.testnet", replay, 1_000)).rejects.toThrow("player");
    await expect(verifyReplay({ ...challenge, seed: 4 }, "player.testnet", replay, 1_000)).rejects.toThrow("seed");
    await expect(verifyReplay({ ...challenge, rulesVersion: 2 }, "player.testnet", replay, 1_000)).rejects.toThrow("rules");
    await expect(verifyReplay(challenge, "player.testnet", replay, 20_000)).rejects.toThrow("expired");
  });
});
