import { describe, expect, it } from "vitest";
import { WAVE_SPAWNS_V1 } from "./waves.js";

describe("v1 wave schedule", () => {
  it("keeps the authored sector counts and final Warden", () => {
    expect(WAVE_SPAWNS_V1).toHaveLength(98);
    expect(WAVE_SPAWNS_V1.filter((spawn) => spawn.sector === 1)).toHaveLength(18);
    expect(WAVE_SPAWNS_V1.filter((spawn) => spawn.sector === 2)).toHaveLength(26);
    expect(WAVE_SPAWNS_V1.filter((spawn) => spawn.sector === 3)).toHaveLength(31);
    expect(WAVE_SPAWNS_V1.filter((spawn) => spawn.sector === 4)).toHaveLength(23);
    expect(WAVE_SPAWNS_V1[0]).toMatchObject({ tick: 60, kind: "skitter", sector: 1 });
    expect(WAVE_SPAWNS_V1.at(-1)).toMatchObject({ tick: 3380, kind: "skitter", sector: 4 });
    expect(WAVE_SPAWNS_V1).toContainEqual({ tick: 3240, kind: "warden", sector: 4 });
  });
});
