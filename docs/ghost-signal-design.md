# Ghost Signal: gameplay expansion

## Findings from comparable games

This is a design analysis of published mechanics, not a claim to have inspected proprietary code or played these games during this task.

| Reference | Published mechanic | RivalGhost adaptation |
| --- | --- | --- |
| [Sky Force Reloaded](https://store.steampowered.com/app/667600/Sky_Force_Reloaded/) | Rescue objectives, stage mastery, pickups, distinct aircraft, large bosses | Risk leaving a safe line to rescue couriers; collect weapon cells; clear named bosses and earn chapter medals |
| [Nova Drift](https://www.novadrift.io/) | Short runs with build experimentation and upgrade synergies | Three freely available ship rigs; collected cells visibly evolve the weapon during a run |
| [Hades](https://www.supergiantgames.com/blog/hades-faq/) | Varied builds and character-driven story discoveries across attempts | Three short chapters with briefings, radio dialogue, and earned story reveals; failed attempts get contextual guidance |

The design hypothesis is that decisions and mastery will make retries compelling. Retention is unproven until players try it. No login streak penalties, paid power, or waiting timers are needed for this prototype.

## The hook

**Your best flight is being used to hunt people. Steal your ghost back.**

Three 60-second chapters follow a repeating distress signal through the Relay Yard, the laser trench, and the Ghost Engine. HOUND starts as a threatening voice and becomes the pilot helping you destroy a weapon wearing his face. Briefings are short; replaying never requires a cutscene.

## Combat loop

1. Pick Needle (precision), Fan (spread), or Guard (one-hit shield, restored by a rescue).
2. Steer under moving enemy formations. Actual player rounds must hit a target.
3. Break formation to collect power cells or rescue falling courier pods. Two cells increase weapon level, up to three. A rescue repairs hull and adds points.
4. Graze four bullets while moving to trigger a repeatable three-second Surge. Keep kills flowing for a capped five-times combo; taking damage resets the combo.
5. Use a pulse with Space or the touch button: clear nearby bullets, damage nearby enemies, and gain a brief protected window. It recharges in eight seconds of simulation time.
6. Read laser warning lanes and fight a moving boss whose attack pattern changes at half health. Defeat it and survive a two-second extraction to clear the chapter. A mission lasts at most 60 seconds; early boss clears do not force an empty wait.

Enemy movement, shots, pickups, hazards, pulses, and outcomes all run in the shared deterministic simulator. The renderer adds no damaging objects of its own.

Escape or Pause freezes the local flight, ghost, and cooldowns. Leaving the window pauses automatically; resuming is explicit. Pauses add no simulation ticks, so the recorded active inputs still reproduce the outcome.

## Reasons to return

- **Within a run:** weapon evolution, combo preservation, repeatable Surge, rescue decisions, a boss climax.
- **Between runs:** unlock the next chapter; earn three medals per chapter (clear, two rescues, no hull damage); compare personal bests separately per chapter and rig.
- **On another day:** a UTC-date seeded signal, with a separate local best for each rig. It is a repeatable local challenge, not a claimed global leaderboard.
- **After the story:** master unearned medals and try another rig. The campaign ends honestly after chapter three.
- **RivalGhost-specific rematch:** the highest-scoring saved replay for the same mission, seed, and rig is re-simulated alongside the next flight. Its pale non-colliding craft and live score difference give the player a concrete line to beat. Daily ghosts are separated by UTC date.

## Replay and contract boundary

Expedition uses a separate **rules version 2** replay containing seed, chapter, rig, and compressed per-tick direction/pulse inputs. Legacy Crown v1 replay bytes and outcomes remain unchanged. Local campaign progress can be edited by its owner and carries no monetary or competitive authority.

The current contract supports fixed-loadout Crown v1. Campaign results must never be signed as v1 settlement certificates. Keep story saves, pickups, medals, and ordinary combat off-chain: no additional contract storage, transactions, or gas in this slice. A later competitive v2 deployment needs a canonical mission/rig configuration hash on the Crown and Challenge, verifier support for that hash, separate rules-version ladders, and tests for mismatched loadouts before enabling payouts. Persistent story power must never silently affect a Crown run.

## Build steps

1. Add a versioned deterministic expedition simulator; preserve v1 and test replay parity, action validation, difficulty, and mechanics.
2. Render real formations, beams, player rounds, pickups, pulse, boss phases, and event feedback.
3. Add chapter selection, rigs, briefings, medals, local save recovery, daily signal, and immediate replay.
4. Verify complete runs, mobile controls/layout, save isolation, and the verifier boundary. Commit each completed step with the requested author identity.

## Playtest gates

Watch five new players without explaining the controls. Can they move, identify a rescue, and use pulse in their first run? Can they explain why a hit happened? Do they retry voluntarily? Track first rescue, first weapon upgrade, boss reach/clear, chosen rig, and voluntary second run with consent before drawing conclusions about engagement. Tune cadence and warnings from these observations rather than adding more systems by default.

## Implementation validation — November 12, 2026

- Full workspace type checking, 25 tests, and production build pass.
- Input-only automated pilots clear all nine chapter/rig combinations without mutating the game state; the final-chapter Fan route rescues three couriers, reaches weapon level three, and activates Surge more than once. This is an attainability check, not a substitute for human balance testing.
- Full browser flights exercised chapter-one clear, a failed rematch, medal persistence, chapter-two unlock, saved-ghost rendering and score comparison, pulse cooldown, pause/resume, and daily launch with Guard's shield.
- A portrait viewport check confirms no horizontal overflow and keeps Pulse reachable. Physical phone touch feel and audible sound quality still require human testing.
- Contract storage and transactions are unchanged. No deployment or funding was performed. Local progression and daily scores are not a trusted leaderboard.
