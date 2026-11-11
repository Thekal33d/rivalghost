import { describe, expect, it } from "vitest";
import { RUN_TICKS, RULES_VERSION } from "@rivalghost/game-data";
import { simulateArena, validateReplay, type ReplayInput } from "./arena.js";

const neutralReplay: ReplayInput = {
  rulesVersion: RULES_VERSION,
  seed: 42,
  runs: [{ direction: 0, ticks: RUN_TICKS }],
};

describe("deterministic arena core", () => {
  it("replays the same input to the same state and event stream", () => {
    const first = simulateArena(neutralReplay);
    const second = simulateArena(neutralReplay);

    expect(first).toEqual(second);
    expect(first.tick).toBe(RUN_TICKS);
    expect(first.shotsFired).toBeGreaterThan(0);
    expect(first.shotsFired).toBeLessThan(600);
    expect(first.enemiesDestroyed).toBeGreaterThan(0);
    expect(first.destroyedAtTick).not.toBeNull();
    expect(first.stateHash).toMatch(/^[a-f0-9]{8}$/);
  });

  it("normalizes movement through the same fixed movement cap", () => {
    const result = simulateArena({
      rulesVersion: RULES_VERSION,
      seed: 42,
      runs: [
        { direction: 3, ticks: 200 },
        { direction: 0, ticks: RUN_TICKS - 200 },
      ],
    });

    expect(result.player.x).toBe(360);
  });

  it("rejects replays that cannot be canonical", () => {
    expect(() => validateReplay({ ...neutralReplay, runs: [{ direction: 0, ticks: 12 }] })).toThrow(
      "Replay must cover exactly one run",
    );
    expect(() => validateReplay({ ...neutralReplay, runs: [{ direction: 0, ticks: 1800 }, { direction: 0, ticks: 1800 }] })).toThrow(
      "Adjacent runs must be merged",
    );
  });

  it("rewards four near-misses with one deterministic Surge", () => {
    const result = simulateArena({
      rulesVersion: RULES_VERSION,
      seed: 3,
      runs: [{ direction: 0, ticks: RUN_TICKS }],
    });

    expect(result.grazes).toBe(10);
    expect(result.surgeActivations).toBe(1);
    expect(result.events.filter((event) => event.type === "surge-started")).toHaveLength(1);
    expect(result.events.some((event) => event.type === "surge-ended")).toBe(true);
  });
});
