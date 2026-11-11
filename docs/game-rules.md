# RivalGhost Game Rules v1

This document is the authoritative product rulebook for the first testnet vertical slice. The corresponding source constants live in `packages/game-data/src/rules.ts`; any intentional change requires a new rules version, fixtures, and a review of verifier and contract compatibility.

## Player promise

RivalGhost is a 60-second, single-screen arcade shooter. The player steers a Sentinel through a vertical arena while the weapon fires automatically. They are racing the score recorded by a Ghost, usually HOUND. Beat the Ghost to take its Crown and Bounty; fail or tie and that Crown grows.

CR means **testnet game credits** held in the game contract. CR has no cash value, is not transferable, and cannot be redeemed.

## Canonical vocabulary

| Term | Meaning |
| --- | --- |
| Sentinel | The player craft. |
| Ghost | A recorded, replayable eligible run. It is never presented as a live opponent. |
| Crown | A single active competitive record: Ghost, score to beat, current Bounty, holder, seed, and expiry. |
| Bounty | CR locked in a Crown. It can only move according to settlement rules. |
| Challenge | One 10 CR attempt against one Crown, locked for at most 120 seconds. |
| Graze | Passing a hostile projectile closely without being hit. Each projectile can graze once. |
| Surge | A three-second score state activated after four grazes. |
| HOUND | The game-operated rival with a separate bounded CR balance and public action policy. |

## Deterministic arena

- Rules version: `1`.
- Simulation clock: 60 fixed ticks per second; a run is exactly 3,600 ticks.
- Logical playfield: 360 by 640 units. Rendering can scale, letterbox, or lower effects without changing state.
- All positions, velocities, health, timers, hit tests, score, random values, and wave ordering use integers.
- The seeded PRNG is `xorshift32`. The same unsigned 32-bit round seed and rules version must reproduce the same waves and spawn order.
- The player begins at `(180, 560)` with 100 health. The arena clamps the craft inside its bounds.
- Movement has one normalized direction per tick and a maximum speed of 3 units per tick. Mouse, touch drag, and keyboard all become the same direction code before simulation.
- The Sentinel fires automatically every six ticks. A visual frame rate drop must never skip or add simulation ticks.
- A run ends at tick 3,600 or when health reaches zero. Frames after destruction are still represented as neutral input so every replay contains 3,600 ticks.

### Input protocol

An input log is run-length encoded. Each run holds a `direction` code and a positive number of ticks. Runs must total exactly 3,600 ticks and neighboring runs may not use the same direction.

| Code | Direction |
| ---: | --- |
| 0 | idle |
| 1 | up |
| 2 | up-right |
| 3 | right |
| 4 | down-right |
| 5 | down |
| 6 | down-left |
| 7 | left |
| 8 | up-left |

The browser hashes the canonical UTF-8 JSON bytes it submits. The verifier expands the runs, rejects malformed or oversized data, runs the simulation, and records the content hash. The client cannot choose the seed, loadout, final score, or settlement result.

### Focus and interruption

A competitive run never pauses. If the window loses focus, the client records neutral input for elapsed fixed ticks and shows the player that the timer is still live. A new challenge cannot be opened while one is unresolved. If the client cannot obtain a valid settlement certificate, the challenge remains unresolved until its 120-second expiry, then the documented expiry path returns the 10 CR entry; it is never shown as a loss.

## Combat and score

The single competitive loadout is fixed for every player and HOUND. There are no paid damage, health, score, or timing upgrades.

| Enemy | Health | Contact damage | Kill score | Role |
| --- | ---: | ---: | ---: | --- |
| Skitter | 1 | 20 | 100 | Fast low-value mover. |
| Lance | 2 | 25 | 250 | Telegraphs a direct lane attack. |
| Bulwark | 6 | 35 | 700 | Slow durable target that crowds routes. |
| Warden | 12 | 40 | 1,500 | Sector anchor with a readable burst pattern. |

Hostile projectile damage is 20. No score bonus is awarded for a collision, survival time, or client-reported combo. Kill score is awarded at the deterministic kill tick.

### Graze and Surge

- A projectile produces a Graze once when its center enters the outer 20-unit ring around the Sentinel but does not hit its inner 10-unit hitbox.
- Each unique projectile can award only one Graze, worth 50 score and one Graze mark.
- At four Graze marks, Surge starts immediately if it has not activated already in that run.
- Surge lasts 180 ticks (three seconds). Eligible enemy kill scores are multiplied by two; Graze score is unchanged.
- Damage immediately clears Graze marks and ends an active Surge. A run can activate Surge once.

### Wave schedule

The seed determines lane and horizontal offset only; this schedule fixes the ordering. `t` is the simulation tick.

| Sector | Ticks | Spawns | Purpose |
| --- | --- | --- | --- |
| 1: Signal | 0–899 | 12 Skitters at `t=60+70n`; 6 Lances at `t=160+110n` | Teaches movement and first grazes. |
| 2: Crossfire | 900–1,799 | 16 Skitters at `t=920+50n`; 8 Lances at `t=980+95n`; 2 Bulwarks at `t=1200, 1570` | Builds route choices. |
| 3: Pressure | 1,800–2,699 | 18 Skitters at `t=1820+45n`; 10 Lances at `t=1880+75n`; 3 Bulwarks at `t=2050, 2320, 2590` | Demands deliberate Graze timing. |
| 4: Crownline | 2,700–3,599 | 12 Skitters at `t=2720+60n`; 8 Lances at `t=2780+85n`; 2 Bulwarks at `t=2880, 3150`; 1 Warden at `t=3240` | Gives a climactic, replayable finish. |

## Crown rungs

HOUND offers exactly three honest fixed difficulties. Their score targets and seed Crown Bounties are not promises of a payout; the actual board always shows the live score and Bounty.

| Rung | Ghost target score | Seed Bounty | Description |
| --- | ---: | ---: | --- |
| Pup | 9,000 | 20 CR | A readable route with room to learn. |
| Hound | 14,000 | 40 CR | Requires clean routing and at least one good Surge. |
| Alpha | 19,000 | 70 CR | Requires controlled survival through the Warden sector. |

## Economy and settlement

### Guest grant and practice

Each eligible guest account receives one 100 CR grant. Practice has no CR movement, never changes a Crown, and may be started freely. An account has at most one unresolved funded Challenge.

### Crown lifecycle

1. A valid opening run creates a Crown with a Bounty of at least 20 CR and a 30-minute round expiry.
2. A player starts a Challenge by locking 10 CR against one open Crown. The contract records the Crown ID, player, rules version, seed, fixed loadout hash, entry amount, and a 120-second expiry.
3. The verifier accepts only a replay that matches that stored Challenge and issues one expiring, signed certificate.
4. Settlement consumes the certificate once. The contract, never the browser, moves CR and transfers the Crown.

### Settlement table

| Verified result | CR movement | Crown result |
| --- | --- | --- |
| Win: challenger score is strictly higher | Return the challenger’s 10 CR entry; transfer the entire pre-challenge Bounty to the challenger. | Challenger becomes holder. Their verified Ghost and score replace the prior record. |
| Loss or tie | Add 8 CR of the entry to the Bounty; credit 2 CR to the current holder. | Current holder and Ghost remain. |
| Challenge expires without a certificate | Return the entire 10 CR entry. | Crown remains unchanged. |
| Round expires | Credit the remaining Bounty to the current holder. | Crown closes permanently. |
| Documented verifier-service failure | Return the entire 10 CR entry through the narrowly authorized cancellation path. | Crown remains unchanged. |

The current holder may select **Defend · 20 CR** once during the original 30-minute round. This locks 20 CR into the current Bounty. It is an explicit action, never an automatic deduction, and it does not extend the round expiry.

## HOUND policy

HOUND uses the same entry, verifier, and settlement path as players. Its account is separate from the relayer budget. Before any model-generated line is displayed, code enforces these hard limits:

- Maintain a 20 CR liquid reserve.
- Risk at most 20 CR to open or defend one Crown.
- Add at most 30 CR in new commitments per round.
- Hold at most one unresolved Challenge.
- Never challenge its own Crown, mint credits, bypass settlement, or act after its policy cooldown.

HOUND can choose a legal revenge Challenge, another eligible Crown, a new Crown, a defense, or pass. Its optional explanation is factual, capped at 120 characters, and falls back to a template if it fails validation.

## User-facing failure states

| Event | Player-facing state | Economic handling |
| --- | --- | --- |
| Entry is pending | `Locking 10 CR…` | The run stays disabled until finality. |
| Replay upload/check is pending | `Checking replay…` | No payout animation appears. |
| Settlement is pending | `Settling Crown…` | Board waits for final contract state. |
| Certificate mismatch/expiry | `Replay could not be verified` with retry/support details | No loss is declared; expiry or authorized cancellation returns entry. |
| Chain/RPC outage | `Settlement delayed` | Challenge cannot be duplicated; refresh from contract state when available. |
| No CR | Explain the exact missing amount and offer free practice. | No automatic refill. |

The regular game flow uses Crown, Bounty, Ghost, score, and CR. Transaction identifiers, wallet terminology, and raw hashes belong only in the optional Proof drawer.
