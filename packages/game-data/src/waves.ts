export type EnemyKind = "skitter" | "lance" | "bulwark" | "warden";

export interface EnemyDefinition {
  health: number;
  contactDamage: number;
  killScore: number;
  fireDelayTicks: number;
  hitHalfWidth: number;
}

export interface WaveSpawn {
  tick: number;
  kind: EnemyKind;
  sector: 1 | 2 | 3 | 4;
}

export const ENEMIES_V1: Readonly<Record<EnemyKind, EnemyDefinition>> = {
  skitter: { health: 1, contactDamage: 20, killScore: 100, fireDelayTicks: 3, hitHalfWidth: 18 },
  lance: { health: 2, contactDamage: 25, killScore: 250, fireDelayTicks: 4, hitHalfWidth: 22 },
  bulwark: { health: 6, contactDamage: 35, killScore: 700, fireDelayTicks: 12, hitHalfWidth: 26 },
  warden: { health: 12, contactDamage: 40, killScore: 1_500, fireDelayTicks: 18, hitHalfWidth: 30 },
};

export const WAVE_SPAWNS_V1: readonly WaveSpawn[] = [
  ...repeated(60, 70, 12, "skitter", 1),
  ...repeated(160, 110, 6, "lance", 1),
  ...repeated(920, 50, 16, "skitter", 2),
  ...repeated(980, 95, 8, "lance", 2),
  ...at([1200, 1570], "bulwark", 2),
  ...repeated(1820, 45, 18, "skitter", 3),
  ...repeated(1880, 75, 10, "lance", 3),
  ...at([2050, 2320, 2590], "bulwark", 3),
  ...repeated(2720, 60, 12, "skitter", 4),
  ...repeated(2780, 85, 8, "lance", 4),
  ...at([2880, 3150], "bulwark", 4),
  ...at([3240], "warden", 4),
].sort((left, right) => left.tick - right.tick || left.kind.localeCompare(right.kind));

function repeated(
  start: number,
  interval: number,
  count: number,
  kind: EnemyKind,
  sector: WaveSpawn["sector"],
): WaveSpawn[] {
  return Array.from({ length: count }, (_, index) => ({ tick: start + interval * index, kind, sector }));
}

function at(ticks: readonly number[], kind: EnemyKind, sector: WaveSpawn["sector"]): WaveSpawn[] {
  return ticks.map((tick) => ({ tick, kind, sector }));
}
