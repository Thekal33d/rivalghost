import { useEffect, useRef, useState } from "react";
import {
  RIVAL_GHOST_RULES_V1,
  RULES_VERSION,
  RUN_TICKS,
  WAVE_SPAWNS_V1,
  type EnemyKind,
} from "@rivalghost/game-data";
import { encodeDirections, replayHash, simulateArena, type DirectionCode } from "@rivalghost/sim";

export type ArenaStats = {
  score: number;
  health: number;
  seconds: number;
  grazes: number;
  surgeActivations: number;
  enemiesDestroyed: number;
  replayHash: string;
};

type ArenaHud = Pick<ArenaStats, "score" | "health" | "seconds">;

const { arena } = RIVAL_GHOST_RULES_V1;
const RUN_SECONDS = 60;
const HOUND_SCORE = 14_000;

const ENEMY_COLORS: Record<EnemyKind, string> = {
  skitter: "#ef6f5e",
  lance: "#ffb347",
  bulwark: "#c84d72",
  warden: "#e5c15d",
};

export function ArenaPrototype({ onFinish }: { onFinish: (stats: ArenaStats) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<ArenaHud>({ score: 0, health: 100, seconds: RUN_SECONDS });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const scale = window.devicePixelRatio || 1;
    canvas.width = arena.width * scale;
    canvas.height = arena.height * scale;
    context.scale(scale, scale);
    context.imageSmoothingEnabled = false;

    const pressed = new Set<string>();
    const pointer = { active: false, x: arena.width / 2, y: 560 };
    const player = { x: arena.width / 2, y: 560, health: 100 };
    const starfield = Array.from({ length: 74 }, (_, index) => ({
      x: (index * 67) % arena.width,
      y: (index * 109) % arena.height,
      size: index % 9 === 0 ? 2 : 1,
    }));
    let last = performance.now();
    let accumulatedMs = 0;
    let tick = 0;
    let animation = 0;
    let complete = false;
    let projectedScore = 0;
    let projectedHealth = 100;
    const directions: DirectionCode[] = [];

    const movePlayer = (direction: DirectionCode) => {
      const [horizontal, vertical] = DIRECTION_VECTORS[direction];
      player.x = clamp(player.x + horizontal, 0, arena.width);
      player.y = clamp(player.y + vertical, 0, arena.height);
    };

    const toCanvasPoint = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * arena.width;
      pointer.y = ((event.clientY - bounds.top) / bounds.height) * arena.height;
    };

    const onPointerDown = (event: PointerEvent) => {
      pointer.active = true;
      toCanvasPoint(event);
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => toCanvasPoint(event);
    const onPointerUp = () => { pointer.active = false; };
    const onKeyDown = (event: KeyboardEvent) => pressed.add(event.key.toLowerCase());
    const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.key.toLowerCase());
    const onBlur = () => pressed.clear();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const draw = (elapsed: number, score: number) => {
      context.fillStyle = "#10151e";
      context.fillRect(0, 0, arena.width, arena.height);
      context.fillStyle = "#18202e";
      for (let y = 22; y < arena.height; y += 44) context.fillRect(0, y, arena.width, 1);
      for (const star of starfield) {
        const y = (star.y + elapsed * (14 + star.size * 5)) % arena.height;
        context.fillStyle = star.size === 2 ? "#e5c15d" : "#60738e";
        context.fillRect(star.x, y, star.size, star.size);
      }

      const laneTick = tick;
      const activeEnemies = WAVE_SPAWNS_V1.filter(
        (spawn) => spawn.tick <= laneTick && laneTick - spawn.tick < 270,
      ).slice(-18);
      activeEnemies.forEach((spawn, index) => {
        const waveTime = (laneTick - spawn.tick) / 60;
        const x = 26 + ((spawn.tick * 29 + index * 47) % 308);
        const y = 88 + waveTime * 108;
        const pulse = Math.floor(elapsed * 12 + index) % 2;
        context.fillStyle = ENEMY_COLORS[spawn.kind];
        context.fillRect(x - 8, y - 6, 16, 12);
        context.fillStyle = pulse ? "#fff1c4" : "#702946";
        context.fillRect(x - 3, y - 2, 6, 4);
        if (y > 122 && y < 585) {
          context.fillStyle = "#d45151";
          context.fillRect(x, y + 9 + ((elapsed * 90) % 46), 2, 10);
        }
      });

      const firePhase = Math.floor(elapsed * 10) % 2;
      context.fillStyle = firePhase ? "#f7d76b" : "#f49b4c";
      context.fillRect(player.x - 2, player.y - 34, 4, 25);
      context.fillStyle = "#e5c15d";
      context.fillRect(player.x - 11, player.y - 6, 22, 17);
      context.fillStyle = "#f7f0d1";
      context.fillRect(player.x - 4, player.y - 15, 8, 10);
      context.fillStyle = "#1a2633";
      context.fillRect(player.x - 3, player.y - 11, 6, 4);

      const ghostY = 122 + Math.sin(elapsed * 1.4) * 14;
      context.fillStyle = "#c97b93";
      context.fillRect(277, ghostY, 24, 14);
      context.fillStyle = "#f5d4c4";
      context.fillRect(283, ghostY + 4, 5, 4);
      context.fillStyle = "#742f50";
      context.fillRect(292, ghostY + 4, 5, 4);

      context.fillStyle = "#10151e";
      context.fillRect(10, 10, 340, 62);
      context.strokeStyle = "#46566b";
      context.lineWidth = 1;
      context.strokeRect(10.5, 10.5, 339, 61);
      context.fillStyle = "#b7c5d3";
      context.font = "600 10px Arial Narrow, sans-serif";
      context.fillText("HOUND // HOUND RUNG", 20, 28);
      context.fillStyle = "#e5c15d";
      context.font = "900 22px Arial Narrow, sans-serif";
      context.fillText(String(HOUND_SCORE), 20, 53);
      context.fillStyle = "#b7c5d3";
      context.font = "600 10px Arial Narrow, sans-serif";
      context.fillText("PROJECTED", 226, 28);
      context.fillStyle = score > HOUND_SCORE ? "#e5c15d" : "#f7f0d1";
      context.font = "900 22px Arial Narrow, sans-serif";
      context.fillText(String(score).padStart(5, "0"), 226, 53);

      context.fillStyle = "#253343";
      context.fillRect(14, 82, 124, 7);
      context.fillStyle = projectedHealth > 35 ? "#6fba9b" : "#e05f5f";
      context.fillRect(14, 82, Math.max(0, projectedHealth * 1.24), 7);
      context.fillStyle = "#b7c5d3";
      context.font = "700 9px Arial Narrow, sans-serif";
      context.fillText(`HULL ${String(projectedHealth).padStart(3, "0")}`, 14, 104);
      context.fillText(`${Math.max(0, Math.ceil((RUN_TICKS - tick) / 60))} SEC`, 298, 104);
    };

    const updateProjection = () => {
      const predictedDirections = directions.concat(Array<DirectionCode>(RUN_TICKS - directions.length).fill(0));
      const projected = simulateArena(encodeDirections(RULES_VERSION, 3, predictedDirections));
      projectedScore = projected.score;
      projectedHealth = projected.player.health;
      setHud({
        score: projected.score,
        health: projected.player.health,
        seconds: Math.max(0, Math.ceil((RUN_TICKS - tick) / 60)),
      });
    };

    const finishRun = async () => {
      const replay = encodeDirections(RULES_VERSION, 3, directions);
      const result = simulateArena(replay);
      onFinish({
        score: result.score,
        health: result.player.health,
        seconds: 0,
        grazes: result.grazes,
        surgeActivations: result.surgeActivations,
        enemiesDestroyed: result.enemiesDestroyed,
        replayHash: await replayHash(replay),
      });
    };

    const recordTick = () => {
      const direction = document.hidden ? 0 : inputDirection(pressed, pointer, player);
      directions.push(direction);
      movePlayer(direction);
      tick += 1;
      if (tick % 30 === 0 || tick === RUN_TICKS) updateProjection();
    };

    const loop = (now: number) => {
      accumulatedMs += now - last;
      last = now;
      while (accumulatedMs >= TICK_MS && tick < RUN_TICKS) {
        accumulatedMs -= TICK_MS;
        recordTick();
      }
      draw(tick / 60, projectedScore);

      if (tick === RUN_TICKS && !complete) {
        complete = true;
        void finishRun();
        return;
      }
      animation = requestAnimationFrame(loop);
    };
    animation = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animation);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [onFinish]);

  return (
    <section className="arena-stage" aria-label="Unranked RivalGhost arena prototype">
      <div className="arena-chrome">
        <span>RUN // UNRANKED</span>
        <span>{hud.seconds.toString().padStart(2, "0")} SEC</span>
      </div>
      <canvas ref={canvasRef} className="arena-canvas" aria-label="Move with drag, mouse, WASD, or arrow keys" />
      <p className="arena-instruction">DRAG TO DODGE · AUTO-FIRE ENGAGED · LOCAL REPLAY CAPTURING</p>
    </section>
  );
}

const TICK_MS = 1_000 / 60;
const DIRECTION_VECTORS: Record<DirectionCode, readonly [number, number]> = {
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

function inputDirection(
  pressed: Set<string>,
  pointer: { active: boolean; x: number; y: number },
  player: { x: number; y: number },
): DirectionCode {
  if (pointer.active) {
    const horizontal = pointer.x - player.x;
    const vertical = pointer.y - player.y;
    if (Math.abs(horizontal) < 12 && Math.abs(vertical) < 12) return 0;
    const sector = Math.round(Math.atan2(vertical, horizontal) / (Math.PI / 4));
    return [3, 4, 5, 6, 7, 8, 1, 2][(sector + 8) % 8] as DirectionCode;
  }

  const horizontal = Number(pressed.has("arrowright") || pressed.has("d")) - Number(pressed.has("arrowleft") || pressed.has("a"));
  const vertical = Number(pressed.has("arrowdown") || pressed.has("s")) - Number(pressed.has("arrowup") || pressed.has("w"));
  const key = `${horizontal},${vertical}`;
  return KEY_DIRECTIONS[key] ?? 0;
}

const KEY_DIRECTIONS: Record<string, DirectionCode> = {
  "0,-1": 1,
  "1,-1": 2,
  "1,0": 3,
  "1,1": 4,
  "0,1": 5,
  "-1,1": 6,
  "-1,0": 7,
  "-1,-1": 8,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
