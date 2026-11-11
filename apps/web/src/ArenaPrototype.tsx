import { useEffect, useRef, useState } from "react";
import { RIVAL_GHOST_RULES_V1, WAVE_SPAWNS_V1, type EnemyKind } from "@rivalghost/game-data";

type ArenaStats = { score: number; health: number; seconds: number };

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
  const [hud, setHud] = useState<ArenaStats>({ score: 0, health: 100, seconds: RUN_SECONDS });

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
    let start = performance.now();
    let last = start;
    let frame = 0;
    let animation = 0;
    let complete = false;
    let previousHud = "";

    const movement = (delta: number) => {
      let horizontal = 0;
      let vertical = 0;
      if (pressed.has("ArrowLeft") || pressed.has("a")) horizontal -= 1;
      if (pressed.has("ArrowRight") || pressed.has("d")) horizontal += 1;
      if (pressed.has("ArrowUp") || pressed.has("w")) vertical -= 1;
      if (pressed.has("ArrowDown") || pressed.has("s")) vertical += 1;

      if (pointer.active) {
        horizontal = Math.sign(pointer.x - player.x);
        vertical = Math.sign(pointer.y - player.y);
      }

      const speed = 142 * delta;
      player.x = clamp(player.x + horizontal * speed, 18, arena.width - 18);
      player.y = clamp(player.y + vertical * speed, 112, arena.height - 18);
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

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

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

      const laneTick = Math.floor(elapsed * 60);
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
      context.fillText("YOUR SCORE", 226, 28);
      context.fillStyle = score > HOUND_SCORE ? "#e5c15d" : "#f7f0d1";
      context.font = "900 22px Arial Narrow, sans-serif";
      context.fillText(String(score).padStart(5, "0"), 226, 53);

      context.fillStyle = "#253343";
      context.fillRect(14, 82, 124, 7);
      context.fillStyle = player.health > 35 ? "#6fba9b" : "#e05f5f";
      context.fillRect(14, 82, Math.max(0, player.health * 1.24), 7);
      context.fillStyle = "#b7c5d3";
      context.font = "700 9px Arial Narrow, sans-serif";
      context.fillText(`HULL ${String(player.health).padStart(3, "0")}`, 14, 104);
      context.fillText(`${Math.max(0, Math.ceil(RUN_SECONDS - elapsed))} SEC`, 298, 104);
    };

    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = Math.min(RUN_SECONDS, (now - start) / 1000);
      movement(delta);

      const nearThreats = WAVE_SPAWNS_V1.filter((spawn) => {
        const age = elapsed * 60 - spawn.tick;
        const x = 26 + ((spawn.tick * 29) % 308);
        return age > 90 && age < 180 && Math.abs(x - player.x) < 20;
      }).length;
      if (frame % 18 === 0 && nearThreats > 0) player.health = Math.max(0, player.health - nearThreats * 4);
      const score = Math.min(22_300, Math.floor(elapsed * 372) + (player.health > 0 ? Math.floor(elapsed / 8) * 100 : 0));
      const stats = { score, health: player.health, seconds: Math.max(0, Math.ceil(RUN_SECONDS - elapsed)) };
      const hudKey = `${stats.score}-${stats.health}-${stats.seconds}`;
      if (frame % 6 === 0 && hudKey !== previousHud) {
        previousHud = hudKey;
        setHud(stats);
      }
      draw(elapsed, score);
      frame += 1;

      if ((elapsed >= RUN_SECONDS || player.health === 0) && !complete) {
        complete = true;
        onFinish(stats);
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
    };
  }, [onFinish]);

  return (
    <section className="arena-stage" aria-label="Unranked RivalGhost arena prototype">
      <div className="arena-chrome">
        <span>RUN // UNRANKED</span>
        <span>{hud.seconds.toString().padStart(2, "0")} SEC</span>
      </div>
      <canvas ref={canvasRef} className="arena-canvas" aria-label="Move with drag, mouse, WASD, or arrow keys" />
      <p className="arena-instruction">DRAG TO DODGE · AUTO-FIRE ENGAGED</p>
    </section>
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
