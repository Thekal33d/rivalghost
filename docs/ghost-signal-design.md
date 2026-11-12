# Ghost Signal: gameplay expansion

## Findings from comparable games

This is a design analysis of published mechanics, not a claim to have inspected proprietary code or played these games during this task.

| Reference | Published mechanic | RivalGhost adaptation |
| --- | --- | --- |
| [Sky Force Reloaded](https://store.steampowered.com/app/667600/Sky_Force_Reloaded/) | Rescue objectives, stage mastery, pickups, distinct aircraft, large bosses | Risk leaving a safe line to rescue couriers; collect weapon cells; clear named bosses and earn chapter medals |
| [Nova Drift](https://www.novadrift.io/) | Short runs with build experimentation and upgrade synergies | Three freely available ship rigs; collected cells visibly evolve the weapon during a run |
| [Hades](https://www.supergiantgames.com/blog/hades-faq/) | Varied builds and character-driven story discoveries across attempts | Ten short chapters across three acts with briefings, radio dialogue, and earned story reveals; failed attempts get contextual guidance |

The design hypothesis is that decisions and mastery will make retries compelling. Retention is unproven until players try it. No login streak penalties, paid power, or waiting timers are needed for this prototype.

## The hook

**Your best flight is being used to hunt people. Steal your ghost back.**

Ten chapters, each lasting at most 60 seconds, follow a stolen flight through three acts. HOUND starts as a threatening voice and becomes an ally. Breaking the first Ghost Engine reveals a wider network that edits rescues out of recorded flights and turns pilots into weapons. The finale frees those recordings. Briefings are short; replaying never requires a cutscene.

| Act | Chapters | Encounter focus |
| --- | --- | --- |
| The Stolen Flight | 01 Dead Air · 02 Glass Mile · 03 Crownline | Learn rescues, weapon cells, warned beams, and two-phase bosses |
| Follow the Original | 04 Black Tide · 05 Switchyard · 06 Mirror Lake | Pincer formations and crossing fire; narrow columns and aimed volleys; sweeping twin volleys |
| Bring Them Home | 07 Ashfall · 08 Null Choir · 09 Last Light · 10 Ghost Dawn | Denser formations, more frequent warned lanes, combined patterns, then Origin’s rotating attack repertoire |

Each chapter has a fixed seed, named boss, district palette, briefing, radio transmission, and earned ending. Bosses share the current illustrated chassis with chapter colors; ten bespoke boss artworks are not yet implemented. Later chapters use bounded damage and bullet speed, rather than multiplying difficulty by chapter number.

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
- **After the story:** master unearned medals and try another rig. The story resolves at chapter ten. Thirty medals and separate best ghosts for all thirty chapter/rig combinations provide mastery goals. There is no time gate on the next chapter.
- **RivalGhost-specific rematch:** the highest-scoring saved replay for the same mission, seed, and rig is re-simulated alongside the next flight. Its pale non-colliding craft and live score difference give the player a concrete line to beat. Daily ghosts are separated by UTC date.

## Replay and contract boundary

Expedition uses a separate **rules version 2** replay containing seed, chapter, rig, and compressed per-tick direction/pulse inputs. Legacy Crown v1 replay bytes and outcomes remain unchanged. Chapters 01–03 also retain their original expedition v2 physics; their replay outcomes and hashes have regression fixtures. Three-chapter saves expand to ten slots without discarding medals, attempts, or best ghosts. The daily challenge retains its chapter-three rules and separate UTC-date records. Local campaign progress can be edited by its owner and carries no monetary or competitive authority.

The contract and verifier now support separately bound competitive v2 missions alongside fixed-loadout Crown v1. A mission/rig/revision/seed fingerprint is computed by the contract; v2 certificates are bound to the testnet deployment. Story saves, pickups, medals and ordinary campaign combat stay off-chain. The browser campaign is not yet connected to a competitive gateway or deployed contract. Persistent story power never affects the competitive simulation. See [the integration runbook](verifier-runbook.md) for implemented boundaries and outstanding guest/relay work.

## Build steps

1. Add a versioned deterministic expedition simulator; preserve v1 and test replay parity, action validation, difficulty, and mechanics.
2. Render real formations, beams, player rounds, pickups, pulse, boss phases, and event feedback.
3. Add chapter selection, rigs, briefings, medals, local save recovery, daily signal, and immediate replay.
4. Verify complete runs, mobile controls/layout, save isolation, and the verifier boundary. Commit each completed step with the requested author identity.

## Playtest gates

Watch five new players without explaining the controls. Can they move, identify a rescue, and use pulse in their first run? Can they explain why a hit happened? Do they retry voluntarily? Track first rescue, first weapon upgrade, boss reach/clear, chosen rig, and voluntary second run with consent before drawing conclusions about engagement. Tune cadence and warnings from these observations rather than adding more systems by default.

## Implementation validation — November 12, 2026

- Full workspace type checking, 40 TypeScript tests, and production build pass.
- Input-only automated pilots clear all thirty chapter/rig combinations without mutating the game state; the chapter-three Fan route rescues three couriers, reaches weapon level three, and activates Surge more than once. This is an attainability check, not a substitute for human balance testing.
- Full browser flights exercised chapter-one clear, a failed rematch, medal persistence, chapter-two unlock, saved-ghost rendering and score comparison, pulse cooldown, pause/resume, and daily launch with Guard's shield.
- A portrait viewport check confirms no horizontal overflow and keeps Pulse reachable. Physical phone touch feel and audible sound quality still require human testing.
- The expanded chapter map was checked in the browser, including preserved progress, chapter selection, correct 01–10 numbering, locked destinations, and a phone-sized viewport without horizontal overflow. Automated progression tests cover the full unlock chain, save migration, all thirty best-record slots, and thirty-medal completion.
- Nine Rust contract tests pass, including signed mismatch rejection, Crown locks, expiry, duplicate settlement, and a certificate produced by the real TypeScript verifier. Cleanup, deployed end-to-end checks and broader threat review remain release gates.
- Campaign transactions remain unchanged. Competitive contract metadata now includes mission binding and a Crown lock; storage measurements remain outstanding. No deployment or funding was performed. Local progression and daily scores are not a trusted leaderboard.
