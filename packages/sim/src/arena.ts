import {
  DIRECTION_CODES,
  RIVAL_GHOST_RULES_V1,
  RULES_VERSION,
  RUN_TICKS,
  ENEMIES_V1,
  WAVE_SPAWNS_V1,
  type EnemyKind,
} from "@rivalghost/game-data";

export type DirectionCode = (typeof DIRECTION_CODES)[keyof typeof DIRECTION_CODES];

export interface InputRun {
  direction: DirectionCode;
  ticks: number;
}

export interface ReplayInput {
  rulesVersion: number;
  seed: number;
  runs: readonly InputRun[];
}

export interface ArenaEvent {
  tick: number;
  type:
    | "enemy-spawned"
    | "enemy-fired"
    | "auto-fired"
    | "enemy-destroyed"
    | "projectile-grazed"
    | "surge-started"
    | "surge-ended"
    | "player-damaged"
    | "run-ended";
  value?: number;
}

export interface ArenaResult {
  rulesVersion: number;
  seed: number;
  tick: number;
  player: { x: number; y: number; health: number };
  score: number;
  shotsFired: number;
  enemiesDestroyed: number;
  grazes: number;
  surgeActivations: number;
  destroyedAtTick: number | null;
  stateHash: string;
  events: readonly ArenaEvent[];
}

interface Enemy {
  id: number;
  kind: EnemyKind;
  health: number;
  laneX: number;
  shotsFired: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  damage: number;
  grazed: boolean;
}

const { arena, combat } = RIVAL_GHOST_RULES_V1;
const PLAYER_SHOT_DAMAGE = 1;
const PLAYER_HIT_HALF_SIZE = 10;
const GRAZE_HALF_SIZE = 20;
const PROJECTILE_SPEED_PER_TICK = 6;
const GRAZE_SCORE = 250;

const MOVEMENT: Record<DirectionCode, readonly [number, number]> = {
  0: [0, 0],
  1: [0, -3],
  2: [2, -2],
  3: [3, 0],
  4: [2, 2],
  5: [0, 3],
  6: [-2, 2],
  7: [-3, 0],
  8: [-2, -2],
};

/** Runs a fixed-tick, renderer-free combat simulation for a complete v1 replay. */
export function simulateArena(replay: ReplayInput): ArenaResult {
  validateReplay(replay);

  const directions = expandReplay(replay.runs);
  const player: { x: number; y: number; health: number } = {
    x: Math.floor(arena.width / 2),
    y: 560,
    health: combat.playerHealth,
  };
  const events: ArenaEvent[] = [];
  const enemies: Enemy[] = [];
  const projectiles: Projectile[] = [];
  let randomState = replay.seed >>> 0;
  let nextEnemyId = 1;
  let nextProjectileId = 1;
  let score = 0;
  let shotsFired = 0;
  let enemiesDestroyed = 0;
  let grazes = 0;
  let grazeMarks = 0;
  let surgeTicksRemaining = 0;
  let surgeActivations = 0;
  let destroyedAtTick: number | null = null;

  for (let tick = 0; tick < RUN_TICKS; tick += 1) {
    if (destroyedAtTick !== null) continue;

    const [deltaX, deltaY] = MOVEMENT[directions[tick]];
    player.x = clamp(player.x + deltaX, 0, arena.width);
    player.y = clamp(player.y + deltaY, 0, arena.height);

    const scheduledSpawns = WAVE_SPAWNS_V1.filter((spawn) => spawn.tick === tick);
    for (const spawn of scheduledSpawns) {
      randomState = xorshift32(randomState);
      const laneX = 24 + (randomState % (arena.width - 48));
      enemies.push({ id: nextEnemyId, kind: spawn.kind, health: ENEMIES_V1[spawn.kind].health, laneX, shotsFired: 0 });
      events.push({ tick, type: "enemy-spawned", value: nextEnemyId });
      nextEnemyId += 1;
    }

    for (const enemy of enemies) {
      const definition = ENEMIES_V1[enemy.kind];
      const spawnTick = WAVE_SPAWNS_V1[enemy.id - 1].tick;
      const fireTick = spawnTick + definition.fireDelayTicks + enemy.shotsFired * definition.burstIntervalTicks;
      if (enemy.health > 0 && enemy.shotsFired < definition.burstShots && tick === fireTick) {
        enemy.shotsFired += 1;
        events.push({ tick, type: "enemy-fired", value: enemy.id });
        projectiles.push({ id: nextProjectileId, x: enemy.laneX, y: 96, damage: definition.contactDamage, grazed: false });
        nextProjectileId += 1;
      }
    }

    for (const projectile of projectiles) {
      projectile.y += PROJECTILE_SPEED_PER_TICK;
      const xDistance = Math.abs(player.x - projectile.x);
      const yDistance = Math.abs(player.y - projectile.y);
      if (xDistance <= PLAYER_HIT_HALF_SIZE && yDistance <= PLAYER_HIT_HALF_SIZE) {
        player.health = Math.max(0, player.health - projectile.damage);
        grazeMarks = 0;
        if (surgeTicksRemaining > 0) {
          surgeTicksRemaining = 0;
          events.push({ tick, type: "surge-ended" });
        }
        projectile.y = arena.height + PROJECTILE_SPEED_PER_TICK;
        events.push({ tick, type: "player-damaged", value: projectile.damage });
      } else if (directions[tick] !== 0 && !projectile.grazed && xDistance <= GRAZE_HALF_SIZE && yDistance <= GRAZE_HALF_SIZE) {
        projectile.grazed = true;
        grazes += 1;
        grazeMarks += 1;
        score += GRAZE_SCORE;
        events.push({ tick, type: "projectile-grazed", value: projectile.id });
        if (grazeMarks >= combat.grazesToSurge && surgeActivations < combat.surgeActivationsPerRun) {
          surgeActivations += 1;
          surgeTicksRemaining = combat.surgeTicks;
          grazeMarks = 0;
          events.push({ tick, type: "surge-started" });
        }
      }
    }

    if (tick % combat.autoFireEveryTicks === 0) {
      const target = enemies.find((enemy) => enemy.health > 0);
      shotsFired += 1;
      events.push({ tick, type: "auto-fired" });
      if (target) {
        target.health -= PLAYER_SHOT_DAMAGE;
        if (target.health === 0) {
          score += ENEMIES_V1[target.kind].killScore * (surgeTicksRemaining > 0 ? 2 : 1);
          enemiesDestroyed += 1;
          events.push({ tick, type: "enemy-destroyed", value: target.id });
        }
      }
    }

    if (player.health === 0) {
      destroyedAtTick = tick;
      events.push({ tick, type: "run-ended" });
    }

    if (surgeTicksRemaining > 0) {
      surgeTicksRemaining -= 1;
      if (surgeTicksRemaining === 0) events.push({ tick, type: "surge-ended" });
    }
  }

  return {
    rulesVersion: replay.rulesVersion,
    seed: replay.seed >>> 0,
    tick: RUN_TICKS,
    player,
    score,
    shotsFired,
    enemiesDestroyed,
    grazes,
    surgeActivations,
    destroyedAtTick,
    stateHash: stateHash({ replay, player, score, shotsFired, enemiesDestroyed, grazes, surgeActivations, destroyedAtTick, events }),
    events,
  };
}

export function expandReplay(runs: readonly InputRun[]): DirectionCode[] {
  const directions: DirectionCode[] = [];
  for (const run of runs) {
    for (let tick = 0; tick < run.ticks; tick += 1) directions.push(run.direction);
  }
  return directions;
}

export function validateReplay(replay: ReplayInput): void {
  if (replay.rulesVersion !== RULES_VERSION) throw new Error("Unsupported rules version");
  if (!Number.isInteger(replay.seed) || replay.seed < 0 || replay.seed > 0xffff_ffff) {
    throw new Error("Seed must be an unsigned 32-bit integer");
  }
  if (replay.runs.length === 0 || replay.runs.length > RUN_TICKS) throw new Error("Invalid replay run count");

  let totalTicks = 0;
  let previousDirection: DirectionCode | null = null;
  for (const run of replay.runs) {
    if (!Number.isInteger(run.direction) || run.direction < 0 || run.direction > 8) {
      throw new Error("Invalid direction code");
    }
    if (!Number.isInteger(run.ticks) || run.ticks < 1 || run.ticks > RUN_TICKS) {
      throw new Error("Invalid input duration");
    }
    if (previousDirection === run.direction) throw new Error("Adjacent runs must be merged");
    previousDirection = run.direction;
    totalTicks += run.ticks;
  }
  if (totalTicks !== RUN_TICKS) throw new Error("Replay must cover exactly one run");
}

function xorshift32(value: number): number {
  let next = value || 0x6d2b79f5;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function stateHash(value: unknown): string {
  const encoded = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < encoded.length; index += 1) {
    hash ^= encoded.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
