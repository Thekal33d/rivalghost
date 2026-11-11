import { describe, expect, it } from "vitest";
import { RULES_VERSION, RUN_TICKS } from "@rivalghost/game-data";
import { verifyReplay, type StoredChallenge } from "./index.js";

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
  it("binds hashes and score to the authoritative challenge", async () => {
    const verified = await verifyReplay(challenge, "player.testnet", replay, 1_000);

    expect(verified).toMatchObject({
      challengeId: "challenge-1",
      crownId: "crown-1",
      playerId: "player.testnet",
      score: 17_000,
    });
    expect(verified.replayHash).toHaveLength(64);
    expect(verified.finalStateHash).toHaveLength(64);
  });

  it("rejects a mismatched player, seed, rules version, or expired challenge", async () => {
    await expect(verifyReplay(challenge, "other.testnet", replay, 1_000)).rejects.toThrow("player");
    await expect(verifyReplay({ ...challenge, seed: 4 }, "player.testnet", replay, 1_000)).rejects.toThrow("seed");
    await expect(verifyReplay({ ...challenge, rulesVersion: 2 }, "player.testnet", replay, 1_000)).rejects.toThrow("rules");
    await expect(verifyReplay(challenge, "player.testnet", replay, 20_000)).rejects.toThrow("expired");
  });
});
