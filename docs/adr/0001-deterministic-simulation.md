# ADR 0001: Use a 60 Hz integer deterministic simulator

**Status:** accepted

## Decision

`packages/sim` is a pure TypeScript module with no DOM, Phaser, clock, storage, or network dependency. It advances one fixed tick at a time at 60 ticks per second. Positions, velocities, cooldowns, health, score, random state, collision checks, event order, and hashes use integers. The simulator receives only a rules version, a 32-bit seed, a fixed loadout identifier, and normalized direction input.

The renderer interpolates or drops visual frames when needed but never changes the number or order of simulation ticks. Every ranked replay contains exactly 3,600 logical input ticks, including neutral ticks after destruction.

## Consequences

- The browser and verifier can run identical fixtures and agree on final score, health, event sequence, and state hash.
- Float physics, wall-clock scoring, client FPS, and renderer-owned timers are prohibited in competitive state.
- Content changes require a new rules version; v1 remains available for unresolved or replayed v1 Crowns.
- The simulator may be less visually freeform than a physics-engine prototype, which is an acceptable trade for an auditable Ghost game.
