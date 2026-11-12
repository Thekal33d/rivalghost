# Illustrated arcade design pass

Implemented November 12, 2026 for the local RivalGhost practice build.

## Visual direction

Warm ivory, ink outlines, vermilion HOUND armor, mint player armor, and crown gold. Original SVG pilots and canvas ships share mechanical shapes. No generated raster art is used. The lobby, combat frame, and results use the same palette and typography. Phone layouts bring the character illustration ahead of the play button.

## Playable changes

- The browser advances the shared deterministic simulation at 60 ticks per second. Rendering uses its actual player, enemy, projectile, health, score, and Surge state. It no longer draws unrelated hazards or calculates a future score while playing.
- Mouse/touch drag and WASD/arrows record the directions used by the simulator. Touch movement offsets the craft above the thumb. Input clears on focus loss; the run continues with neutral input while away.
- Three-count launch, aimed auto-fire traces, enemy health bars, destruction particles, damage feedback, graze callouts, four charge segments, and a gold Surge state communicate actual combat events.
- A solid square marks the collision range; a larger dashed square marks the graze range. Decorative wings do not enlarge the hitbox.
- Sound is optional and off by default. Reduced motion suppresses character bobbing, background scrolling, countdown animation, and screen shake, and reduces particles.
- Pup and HOUND are local score targets of 9,000 and 14,000. They use the same fixed practice arena. The UI does not claim they are live opponents or charge CR.
- Results show the exact score gap, grazes, Surge activations, takedowns, replay hash, and immediate retry. Personal best persists in local storage when available.

## Scope and follow-up

This pass preserves the existing v1 combat rules and replay outcomes. It adds no contract calls or deployment cost. Local replay hashes are not claims of server verification or on-chain settlement. The one-Surge-per-run rule remains visible in the flight manual.

Next, playtest close-pass readability, the time to first successful Surge, and whether players voluntarily retry. Use those observations before adding patterns or changing balance. Enemy movement patterns and a recorded rival trajectory would require a separate rules/replay compatibility pass; they are not simulated cosmetically here.

## Validation

`pnpm check` passes type checking, 17 tests, and the production build. The shared simulation tests compare incremental stepping with complete replay execution and retain a golden route score of 14,242. Browser checks cover the lobby, drag steering, live score and hull updates, portrait layout, results, retry, target selection, and persisted personal best. Physical touch-device playtesting and audio listening still need human validation.
