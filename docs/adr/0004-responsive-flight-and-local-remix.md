# ADR 0004: Responsive flight camera and local chapter remix

**Status:** accepted, November 12, 2026. Supersedes the desktop cabinet decision in ADR 0002 at the user's request.

## Responsive arena

Keep a deterministic 360 × 640 logical world. Portrait screens display it upright; landscape screens rotate the camera clockwise, producing a 640 × 360 flight with the ship firing right. The arena occupies the entire window with a compact top and bottom HUD. A fullscreen button is available where the browser supports it.

Use one uniform scale, never stretch or crop combat geometry. Extend environmental scenery into any remaining ultrawide/tall margins. Screen-relative keyboard directions and inverse-projected pointer coordinates become the same simulation inputs on both orientations. Resizing changes the camera, not the simulation, seed or replay. Landscape phones also work without a rotate prompt.

## Local rules v3

The ten new chapter mechanics change outcomes, so the browser campaign now explicitly requests expedition v3. Existing v2 behavior remains the default for old replays and the deployed-contract protocol under development. The verifier rejects v3 for v2 challenges. No contract or gas change is required for local campaign updates.

Store v3 personal bests under separate keys (`v3:chapter:rig`), retaining original v2 ghosts and all medals/unlocks. Daily records remain separate. Do not compare v2 and v3 scores or play a v2 ghost alongside a v3 session. Any future competitive v3 needs its own mission fingerprint, contract support and settlement fixtures before rewards can be enabled.

## Feedback and environments

The simulator emits actual damage, capped to remaining target health, with a target identifier. Rendering uses those events for short impact flashes, sparks and grouped damage numbers. Boss HP/percentage and phase appear in a persistent DOM health bar. Reduced-motion mode removes flash/shake and background movement while preserving warnings and health information.

Each chapter has authored terrain, three route sectors, an encounter twist and matching instructions. Environments use vector drawing, not generated bitmap art. Decorative architecture has no collision; dangerous lanes and impact circles come directly from simulator hazards and visibly warn before activation.

## Validation and limits

Automated input-only pilots clear all 30 chapter/rig combinations in both v2 and v3. Their replays reproduce outcomes. Original v2 hash fixtures remain unchanged. Tests also cover v3 rejection by the competitive verifier, separate saved records, damage totals and both camera input mappings.

Browser checks cover desktop and portrait mobile layouts, full runs, visible boss damage/phase changes, environment transitions, and preserved pilot/medal state. These are not physical-phone performance tests or evidence of human retention. Tune difficulty and readability from actual player sessions next.
