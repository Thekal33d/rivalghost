# RivalGhost development checkpoint

November 12, 2026

**Stage: playable local alpha.** Ghost Signal is playable in the local browser. RivalGhost is not yet an end-to-end NEAR game or a public hackathon release.

## What works now

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Game | Ten authored chapters across three acts; deterministic combat; ten v3 encounter twists; changing vector environments; visible boss damage and two phases; pickups, rescues, Pulse, Graze, Surge and combos | Human difficulty and replay-motivation playtests; physical-device performance tuning |
| Progression | Three free rigs; 30 medals; sequential unlocks; best ghosts for each chapter/rig; daily signal; old-save migration | Cross-device progress is not implemented; local saves are untrusted |
| Frontend | React/Canvas illustrated arcade UI, keyboard and drag controls, local results, replay download, pause/resume, full-window landscape desktop flight and fitted portrait mobile play | Physical-phone controls/performance testing and audible sound QA; on-chain competition/receipt UI and proof drawer |
| Social | Editable unique usernames; 36 avatar combinations; server-shared replay-checked v3 boards; rival follows and shareable ghost challenges | Public hosting, multi-device validation, moderation/anti-bot policy, recovery; no live multiplayer or notifications |
| Simulation | Crown v1 retained; expedition v2 preserved; local v3 chapter remix with deterministic replay validation | Competition controller and deployed configuration selection |
| Contract | Rust Crown v1 and expedition v2: mission/deployment binding, exclusive Crown locks, signed settlement, defense and expiry | Resolve the failing 100 KB Wasm gate (current artifact 171,363 bytes); storage/gas measurements; fresh testnet deployment |
| Verifier/client | Finalized RPC reads, internal authenticated HTTP verifier, bounded replay persistence, scoped wallet transport and pending-transaction recovery | Live gateway integration, browser controller, hosted infrastructure and real deployed integration |
| Guest/relay | Browser pilot keys and signed login; HttpOnly sessions; authenticated verification gateway; opt-in testnet account bootstrap with scoped keys and durable budgets | Real provisioning validation, NEP-366 delegation, relay quotas/accounting and circuit breaker |
| Economy / HOUND | Playable local Crown Pit; finite persistent CR ledger; NPC wallet, three input-only styles, autonomous policy-limited counterflights; replay receipts, defense, refunds and isolated seven-day workbench | Funded NEAR NPC wallet and sponsored execution, v3 protocol decision, stronger identity/anti-abuse, player-owned item markets if selected |
| Release | Local commits and build instructions | GitHub remote/push, hosted demo, fresh-clone checks, judge walkthrough, real captures and submission |

## Validation completed

- `pnpm test` and `pnpm typecheck`: 75 TypeScript tests, type checking and production build pass.
- Input-only automated pilots clear all 30 chapter/rig combinations in both v2 and v3; their replays reproduce results. This proves attainability, not human fun or retention.
- Regression fixtures preserve original chapters 01–03 outcomes and replay hashes.
- Save tests cover migration from three chapters, the entire unlock chain, thirty medals, all thirty personal-best slots, and separation of daily records and v2/v3 bests.
- Browser checks confirm the ten-chapter map, retained local medal/best ghost, chapter selection, locked destinations and no horizontal overflow in a phone-sized viewport. Earlier full-run browser checks covered clear/fail results, personal ghosts, pause and daily play. New chapters have automated simulation coverage, not ten complete manual browser playthroughs.
- A shared fixture takes an actual expedition replay through TypeScript verification/signing and Rust contract settlement. RPC/HTTP tests use local or injected test sources; they are not live testnet transactions.
- `cargo test --workspace`: 12 contract tests pass. Cargo reports a future-compatibility warning in the existing `wasmparser` dependency; no contract dependency changed in this expansion.

- Guest checks cover one-use signatures, expiry, persistent sessions/budgets, duplicate setup, wrong key permissions, uncertain receipts, gas caps and authenticated HTTP verification. SDK doubles replace NEAR calls. Browser QA confirms the same saved pilot survives reload, prior medals/bests remain, and the panel fits a phone-sized viewport.
- Raw and optimized Wasm execute the same signed settlement and produce identical storage in the deterministic host smoke test. This is not a NEAR VM gas measurement.

- New browser checks cover full-window desktop play, a one-row phone HUD, chapter environment transitions, boss HP falling from 124 to 66 to 56/130, phase-two feedback, and complete local result screens. Camera tests cover portrait, landscape and ultrawide pointer mappings.

- Social tests verify authenticated posting, server-derived scores, stable ranking, rival follows and persistent profiles/replays. Browser checks cover avatar controls and mobile board/workshop layouts. The board is empty until real scores are explicitly posted; no public multi-device test has occurred.

## Next implementation milestones

1. **Complete the player-facing challenge loop.** The mission binding, verifier HTTP/RPC/store and wallet transport are implemented. Guest authentication and the bootstrap/gateway foundation are now implemented. Validate provisioning, add the restricted relay; mount competition start → play → verify → settle → confirmed result in the browser with persistent pending-transaction recovery.
2. **Resolve the deployment size gate.** The size-optimized release artifact is 171,363 bytes against the unchanged 100,000-byte ceiling. Reduce code size, then measure state growth and receipt costs before deployment. This is an additional release blocker, not a measured deployment bill.
3. **Promote HOUND’s local competition to NEAR.** The NPC now competes in the local Crown ledger with real replays, a separate balance, budget limits and factual pass/attack reasons. Bind the same policy to restricted signing, deployed settlement and measured sponsor limits; local v3 cannot use the existing v2 verifier unchanged.
4. **Measure and deploy the testnet slice.** Measure optimized Wasm, state growth and method receipts; enforce sponsorship caps; deploy after the required deployment configuration is available. Test fresh-player success and failure paths on the deployed system.
5. **Validate and package.** Observe new players on desktop and real phones, tune readability and challenge, publish the demo and repository, then capture the actual game for the hackathon submission.

## Cost and UX boundary

Ten story chapters add **no contract transactions or on-chain state**: chapter data ships with the web app, and saves/replays remain local. The optimized contract artifact has now been measured; it fails the original size ceiling. Deployment receipts, state-storage growth and relay costs are still unmeasured. Guest bootstrap reservations and attempt caps are implemented; competitive relay caps are not. Neither is a measured deployment bill.

Gameplay runs locally with no wallet prompt. Competitive confirmation should be asynchronous and truthful: show a local score immediately, then verification, then a confirmed settlement. Keep practice available during service failures.

## Configuration needed later

No Git remote is configured in this checkout. Publishing needs the intended repository URL and access. Testnet integration needs an operator/contract account, the approved sponsor budget, and a service-hosting choice. The user confirmed that the testnet account and hosting are not set up. No funding, deployment or publishing occurred during this integration.

See [the guest onboarding runbook](guest-onboarding.md) and [contract build measurements](contract-build.md). Local authentication is running with provisioning disabled; no real account, grant or chain payout is claimed.

The browser campaign currently plays **local v3**. Competition remains v2; promoting the new mechanics requires explicit protocol versioning and new settlement fixtures. See [immersive flight](immersive-flight.md).

See [social play](social-play.md) for the new off-chain leaderboard and ghost-challenge loop.

The [NPC economy milestone](economy-npc.md) implements and tests the local credit loop. The contract now blocks empty-bounty challenges until a winner funds a valid defense. All 75 TypeScript and 12 Rust tests pass; optimized Wasm smoke verification passes, while the unchanged size gate still fails. Browser QA exercised grant → reserve → fly → replay-checked loss → 8/2 distribution.
