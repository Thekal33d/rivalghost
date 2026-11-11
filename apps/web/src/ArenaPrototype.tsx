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
      const sky = context.createLinearGradient(0, 0, 0, arena.height);
      sky.addColorStop(0, "#17152c");
      sky.addColorStop(.52, "#25204a");
      sky.addColorStop(1, "#121526");
      context.fillStyle = sky;
      context.fillRect(0, 0, arena.width, arena.height);
      context.fillStyle = "rgba(255, 143, 193, .13)";
      for (let y = 126; y < arena.height; y += 44) context.fillRect(0, y, arena.width, 1);
      for (const star of starfield) {
        const y = (star.y + elapsed * (14 + star.size * 5)) % arena.height;
        context.fillStyle = star.size === 2 ? "#ffe17b" : "#b6a7e8";
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
        drawEnemySprite(context, spawn.kind, x, y, pulse === 1);
        if (y > 122 && y < 585) {
          context.fillStyle = spawn.kind === "warden" ? "#ffe17b" : "#ff8bc1";
          context.fillRect(x - 1, y + 9 + ((elapsed * 90) % 46), 3, 10);
        }
      });

      drawPlayerShip(context, player.x, player.y, Math.floor(elapsed * 10) % 2 === 1);

      const ghostY = 122 + Math.sin(elapsed * 1.4) * 14;
      drawHoundGhost(context, 289, ghostY);

      context.fillStyle = "rgba(28, 24, 50, .92)";
      context.fillRect(10, 10, 340, 62);
      context.strokeStyle = "#8c7ac8";
      context.lineWidth = 1;
      context.strokeRect(10.5, 10.5, 339, 61);
      context.fillStyle = "#d9d1ed";
      context.font = "600 10px Arial Narrow, sans-serif";
      context.fillText("HOUND // HOUND RUNG", 20, 28);
      context.fillStyle = "#ffda79";
      context.font = "900 22px Arial Narrow, sans-serif";
      context.fillText(String(HOUND_SCORE), 20, 53);
      context.fillStyle = "#d9d1ed";
      context.font = "600 10px Arial Narrow, sans-serif";
      context.fillText("PROJECTED", 226, 28);
      context.fillStyle = score > HOUND_SCORE ? "#86efc3" : "#fff7df";
      context.font = "900 22px Arial Narrow, sans-serif";
      context.fillText(String(score).padStart(5, "0"), 226, 53);

      context.fillStyle = "#393057";
      context.fillRect(14, 82, 124, 7);
      context.fillStyle = projectedHealth > 35 ? "#86efc3" : "#ff789d";
      context.fillRect(14, 82, Math.max(0, projectedHealth * 1.24), 7);
      context.fillStyle = "#d9d1ed";
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

function drawEnemySprite(
  context: CanvasRenderingContext2D,
  kind: EnemyKind,
  x: number,
  y: number,
  blink: boolean,
): void {
  const color = ENEMY_COLORS[kind];
  context.fillStyle = "#2d2145";
  context.fillRect(x - 11, y - 7, 22, 16);
  context.fillStyle = color;

  if (kind === "skitter") {
    context.fillRect(x - 8, y - 5, 16, 10);
    context.fillRect(x - 12, y - 2, 5, 5);
    context.fillRect(x + 7, y - 2, 5, 5);
  } else if (kind === "lance") {
    context.fillRect(x - 7, y - 7, 14, 14);
    context.fillRect(x - 3, y - 11, 6, 4);
    context.fillRect(x - 12, y + 4, 24, 3);
  } else if (kind === "bulwark") {
    context.fillRect(x - 10, y - 7, 20, 14);
    context.fillRect(x - 14, y - 3, 4, 8);
    context.fillRect(x + 10, y - 3, 4, 8);
  } else {
    context.fillRect(x - 9, y - 8, 18, 16);
    context.fillRect(x - 3, y - 13, 6, 5);
    context.fillRect(x - 14, y + 6, 28, 4);
  }

  context.fillStyle = blink ? "#fff7df" : "#ffd879";
  context.fillRect(x - 4, y - 2, 8, 4);
}

function drawPlayerShip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  flame: boolean,
): void {
  context.fillStyle = flame ? "#ff8d76" : "#ffca71";
  context.fillRect(x - 3, y + 11, 6, 16);
  context.fillStyle = "#292142";
  context.fillRect(x - 13, y - 1, 26, 17);
  context.fillStyle = "#86efc3";
  context.fillRect(x - 10, y + 1, 20, 13);
  context.fillRect(x - 15, y + 7, 5, 5);
  context.fillRect(x + 10, y + 7, 5, 5);
  context.fillStyle = "#fff7df";
  context.fillRect(x - 4, y - 9, 8, 16);
  context.fillStyle = "#605584";
  context.fillRect(x - 3, y - 5, 6, 7);
  context.fillStyle = "#ff7baa";
  context.fillRect(x - 2, y + 14, 4, 4);
}

function drawHoundGhost(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.globalAlpha = .9;
  context.fillStyle = "#ef70a9";
  context.fillRect(x - 12, y - 7, 24, 16);
  context.fillRect(x - 8, y - 12, 16, 5);
  context.fillRect(x - 15, y + 9, 6, 5);
  context.fillRect(x + 9, y + 9, 6, 5);
  context.fillStyle = "#ffe0cc";
  context.fillRect(x - 6, y - 2, 12, 8);
  context.fillStyle = "#3b204a";
  context.fillRect(x - 3, y, 2, 3);
  context.fillRect(x + 2, y, 2, 3);
  context.fillStyle = "#ffdc78";
  context.fillRect(x - 6, y - 17, 12, 3);
  context.fillRect(x - 4, y - 21, 3, 4);
  context.fillRect(x + 1, y - 21, 3, 4);
  context.globalAlpha = 1;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
