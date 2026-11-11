import type { ArenaResult, DirectionCode, InputRun, ReplayInput } from "./arena.js";
import { validateReplay } from "./arena.js";

/** Compresses fixed-tick directions into the only replay representation v1 accepts. */
export function encodeDirections(
  rulesVersion: number,
  seed: number,
  directions: readonly DirectionCode[],
): ReplayInput {
  if (directions.length === 0) throw new Error("Cannot encode an empty replay");

  const runs: InputRun[] = [];
  for (const direction of directions) {
    const previous = runs.at(-1);
    if (previous?.direction === direction) {
      previous.ticks += 1;
    } else {
      runs.push({ direction, ticks: 1 });
    }
  }

  const replay = { rulesVersion, seed, runs };
  validateReplay(replay);
  return replay;
}

/** Serializes a replay without whitespace or unspecified key ordering. */
export function canonicalReplayJson(replay: ReplayInput): string {
  validateReplay(replay);
  const runs = replay.runs.map((run) => `{"direction":${run.direction},"ticks":${run.ticks}}`).join(",");
  return `{"rulesVersion":${replay.rulesVersion},"seed":${replay.seed >>> 0},"runs":[${runs}]}`;
}

export function replayBytes(replay: ReplayInput): Uint8Array {
  return new TextEncoder().encode(canonicalReplayJson(replay));
}

export async function replayHash(replay: ReplayInput): Promise<string> {
  return sha256Hex(replayBytes(replay));
}

/** Canonical certificate state includes the result and event sequence, never renderer data. */
export function canonicalResultJson(result: ArenaResult): string {
  const eventJson = result.events
    .map((event) => `{"tick":${event.tick},"type":"${event.type}"${event.value === undefined ? "" : `,"value":${event.value}`}}`)
    .join(",");
  const destroyedAtTick = result.destroyedAtTick === null ? "null" : result.destroyedAtTick.toString();

  return `{"rulesVersion":${result.rulesVersion},"seed":${result.seed},"tick":${result.tick},"player":{"x":${result.player.x},"y":${result.player.y},"health":${result.player.health}},"score":${result.score},"shotsFired":${result.shotsFired},"enemiesDestroyed":${result.enemiesDestroyed},"destroyedAtTick":${destroyedAtTick},"events":[${eventJson}]}`;
}

export async function resultHash(result: ArenaResult): Promise<string> {
  return sha256Hex(new TextEncoder().encode(canonicalResultJson(result)));
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is required for replay hashing");
  const input = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(input).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
