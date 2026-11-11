import { describe, expect, it } from "vitest";
import { RULES_VERSION, RUN_TICKS } from "@rivalghost/game-data";
import { simulateArena, type DirectionCode } from "./arena.js";
import {
  canonicalReplayJson,
  encodeDirections,
  replayHash,
  resultHash,
  sha256Hex,
} from "./replay.js";

describe("canonical replay protocol", () => {
  it("encodes a complete input stream into stable run-length bytes", () => {
    const directions: DirectionCode[] = [
      ...Array<DirectionCode>(120).fill(3),
      ...Array<DirectionCode>(RUN_TICKS - 120).fill(0),
    ];
    const replay = encodeDirections(RULES_VERSION, 7, directions);

    expect(replay.runs).toEqual([
      { direction: 3, ticks: 120 },
      { direction: 0, ticks: RUN_TICKS - 120 },
    ]);
    expect(canonicalReplayJson(replay)).toBe(
      `{"rulesVersion":1,"seed":7,"runs":[{"direction":3,"ticks":120},{"direction":0,"ticks":3480}]}`,
    );
  });

  it("uses SHA-256 for browser and verifier-safe replay and state hashes", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const replay = encodeDirections(RULES_VERSION, 7, Array<DirectionCode>(RUN_TICKS).fill(0));
    const first = simulateArena(replay);
    const second = simulateArena(replay);

    expect(await replayHash(replay)).toHaveLength(64);
    expect(await resultHash(first)).toEqual(await resultHash(second));
  });
});
