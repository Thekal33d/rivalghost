# November 14 design alignment

Reference: https://claude.ai/artifact/RtcmN9yFhKVbrLVZYWeYm1#page-dcb81aee8d83

The published artboards were inspected in the browser. This pass integrates the existing local Flight Deck edits and addresses the largest differences in the flight arena, Signal Map and pause screen. It preserves the functioning wallet, economy, social screens and player journey instead of replacing them with static mock data.

## Implemented

- Shared authored jet geometry across the rig cards and live canvas: fuselage, cockpit, wing panels, engine flame and rig colors. Ghosts use the same silhouette in violet. Patrols now have distinct coral dart, purple weaver and circular turret silhouettes.
- A panoramic city stage fills the arena in portrait and landscape. Layered skyline, lit windows, gantries, spotlights and floor perspective follow the reference. Water, mirror towers, rail structures, ash stacks, machinery and dawn light retain district variation. Scenery reflects restoration and sector state without adding collision objects.
- Capsule bullets, real kill starbursts, larger score/chain feedback and retained boss damage flashes, numbers and health. No scoring, collision, replay or settlement rules change.
- A continuous ten-chapter route across three act regions, actual locks and medals, selected chapter marker, finale crown/HOUND and mission brief. Phones receive a vertical zigzag route.
- A framed pause card over the frozen scene, actual score/chain/time/couriers, chapter twist, resume, return and sound controls. Crown reservation deadlines continue to be disclosed. Escape and native keyboard button activation work; held controls clear while paused.
- Flight Deck keeps the user's meaningful HOUND progress, daily reset, objective, medal and rig-stat edits. FLY is now the primary launch label. Phone mission-card overlap and grid overflow are corrected.
- The flight footer fits the viewport. Workshop purchase-button contrast, focus outlines, mobile act labels and small-screen pause controls are corrected.

## Deliberate differences from static artboards

The live application shows actual inventory, session state, NPC availability and earned progress. Reference demo balances, obsolete wallet-pending states and invented rival values are not used. Chapter rescue objectives come from game data (Chapter 01's medal needs two of the three couriers). Onboarding and staged feature unlocks remain active for new pilots. The contract and on-chain CR/items are unchanged.

## Validation

- Workspace typecheck and 163 tests in 33 files passed; final frontend typecheck passed after the pause-control correction.
- Browser checks passed at 320×568, 390×844, 768×1024, 1024×768, 1440×900 and 844×390: lobby/map/workshop width, full flight footer, frozen pause stats, keyboard resume/pause and return to hangar; no uncaught browser errors.
- Onboarding regression passed: initial briefing, persisted skip, replay, actual movement/Pulse tutorial, hiding tips without resetting, feature gates, legacy access and operation pending/success/error behavior without duplicate requests.
- Production-bundle wallet regression passed with mocked server responses and actual cryptography: encrypted backup, acknowledgement, reload, signed login/delegated authorization, wrong-password retry and second-browser recovery. This is not a new live blockchain transaction. The Vite development server exposed an existing CommonJS NEAR SDK loading issue; production bundling passed this flow.
- All ten chapters were rendered from real deterministic simulation snapshots at tick 2650, including boss damage and reduced-motion rendering. CPU draw submission measured below 1 ms/frame in this local headless sample; this is not a device performance guarantee.

The production check additionally waits for fonts before measuring. It caught a nested mobile loadout grid expanding to its content width; the grid now uses an explicit zero-minimum column and reserves space for the angled launch button.

## Release evidence — 2026-11-14

- Application revision `bbaaa0a` is deployed at https://rivalghost.xyz/, incorporating implementation milestone `70c44e1`. Both commits are on GitHub main under Thekal33d.
- Final production-bundle checks passed at all six viewport sizes with fonts loaded before measuring.
- Public browser checks confirmed the deployed asset matches the release, all ten route nodes, the updated live flight, frozen pause stats, mobile pause layout and no uncaught browser errors.
- Public onboarding checks passed for welcome, locked Workshop explanation, replayable guided flight and persisted onboarding. API health, embedded wallet availability and on-chain spending remained enabled.
- Database/configuration backup: `design-20261114T104117Z`. No pending chain transactions existed at cutover. Runtime configuration was preserved. AI/HOUND automation remain disabled. No contract deployment, paid inference, wallet purchase or staking was performed.
