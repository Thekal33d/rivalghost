import { describe, expect, it } from "vitest";
import { RULES_VERSION, RUN_TICKS, certificateMessage } from "@rivalghost/game-data";
import { ReplayVerificationService, type ChallengeSource } from "./service.js";

const storedChallenge = {
  id: "0",
  crownId: "0",
  playerId: "player.testnet",
  seed: 3,
  rulesVersion: RULES_VERSION,
  loadoutHash: "a".repeat(64),
  expiresAtMs: 20_000,
};

const source: ChallengeSource = {
  getChallenge: async (challengeId) => challengeId === "0" ? storedChallenge : null,
};

describe("replay verification service", () => {
  it("reads the stored Challenge and returns an independently signed certificate", async () => {
    const keyPair = await globalThis.crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"],
    );
    const service = new ReplayVerificationService(source, keyPair.privateKey, 2);

    const certificate = await service.verifyAndIssue({
      challengeId: "0",
      playerId: "player.testnet",
      replay: { rulesVersion: RULES_VERSION, seed: 3, runs: [{ direction: 0, ticks: RUN_TICKS }] },
    }, 1_000);

    expect(certificate).toMatchObject({ challengeId: "0", crownId: "0", score: 9_802, verifierKeyVersion: 2 });
    await expect(globalThis.crypto.subtle.verify(
      { name: "Ed25519" },
      keyPair.publicKey,
      Uint8Array.from(certificate.signature),
      certificateMessage(certificate),
    )).resolves.toBe(true);
  });

  it("does not issue a result for an unknown Challenge", async () => {
    const keyPair = await globalThis.crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"],
    );
    const service = new ReplayVerificationService(source, keyPair.privateKey);

    await expect(service.verifyAndIssue({
      challengeId: "404",
      playerId: "player.testnet",
      replay: { rulesVersion: RULES_VERSION, seed: 3, runs: [{ direction: 0, ticks: RUN_TICKS }] },
    }, 1_000)).rejects.toThrow("not found");
  });
});
