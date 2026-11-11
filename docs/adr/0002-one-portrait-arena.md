# ADR 0002: Ship one portrait arena on phone and desktop

**Status:** accepted

## Decision

The game’s logical arena is 360 × 640 portrait units. On a phone it fills the safe viewport with a top HUD and a 48 px minimum action area. On desktop it is centered inside a rich arcade cabinet frame; surrounding areas may show Crown information and controls but do not alter combat geometry, enemies, or scores.

Touch drag maps from the Sentinel center to a normalized direction. Mouse movement uses the same mapping. Desktop also supports WASD and arrow keys. All input is capped and quantized into the shared direction codes before reaching the simulator. Automatic fire is always enabled in ranked play.

## Consequences

- A Ghost and its score mean the same thing on every supported screen.
- There is one combat scene to test, tune, record, and show in the demo.
- Landscape phone play is supported through a rotate prompt, not a separately balanced layout.
- The cabinet frame can improve the desktop presentation without creating a desktop-only advantage.
