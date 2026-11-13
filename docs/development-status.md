# RivalGhost development checkpoint

November 13, 2026

**Stage: playable local alpha.** Ghost Signal is playable in the local browser. RivalGhost is not yet an end-to-end NEAR game or a public hackathon release.

## What works now

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Game | Ten authored chapters across three acts; deterministic combat; ten v3 encounter twists; changing vector environments; visible boss damage and two phases; pickups, rescues, Pulse, Graze, Surge and combos | Human difficulty and replay-motivation playtests; physical-device performance tuning |
| Progression | Three free rigs; 30 medals; sequential unlocks; best ghosts for each chapter/rig; daily signal; old-save migration | Cross-device progress is not implemented; local saves are untrusted |
| Frontend | React/Canvas illustrated arcade UI, keyboard and drag controls, local results, replay download, pause/resume, full-window landscape desktop flight and fitted portrait mobile play | Physical-phone controls/performance testing and audible sound QA; on-chain competition/receipt UI and proof drawer |
| Social | Editable unique usernames; 36 avatar combinations; server-shared replay-checked v3 boards; rival follows and shareable ghost challenges | Public hosting, multi-device validation, moderation/anti-bot policy, recovery; no live multiplayer or notifications |
| Simulation | Crown v1 retained; expedition v2 preserved; local v3 chapter remix with deterministic replay validation | Competition controller and deployed configuration selection |
| Contract | Rust Crown v1 and expedition v2: v2 mission/deployment binding, exclusive Crown locks, signed settlement, defense and expiry | 99,448-byte size gate passed; resolve legacy/supply findings, add v3 settlement and measure runtime/storage/gas before deployment |
| Verifier/client | Finalized RPC reads, internal authenticated HTTP verifier, bounded replay persistence, scoped wallet transport and pending-transaction recovery | Live gateway integration, browser controller, hosted infrastructure and real deployed integration |
| Guest/relay | Browser pilot keys and signed login; HttpOnly sessions; authenticated verification gateway; opt-in testnet account bootstrap with scoped keys and durable budgets | Real provisioning validation, NEP-366 delegation, relay quotas/accounting and circuit breaker |
| Economy / HOUND | Playable local Crown Pit; finite persistent CR ledger; NPC wallet, three input-only styles, autonomous policy-limited counterflights; replay receipts, defense, ranked expiry forfeiture and isolated seven-day workbench | Funded NEAR NPC wallet and sponsored execution, v3 protocol decision, stronger identity/anti-abuse, NEP-245 item custody and v3 settlement (local markets now implemented) |
| Living world | MOTH recovery jobs/exchange; craftable and tradeable cosmetic trails; HOUND commissions and raceable archive; ten shared restoration tracks | Public market/abuse validation and NEAR asset settlement |
| Compute | Server-only NEAR AI focus adapter, bounded/cached fallback; read-only farm reporting and Reactor UI | First paid inference test, attestation verification and later individual staking; funded account/key, live catalog preflight and $1 durable reservation cap are ready |
| Release | Local commits, build instructions and public GitHub repository `Thekal33d/rivalghost` | Hosted demo, fresh-clone checks, judge walkthrough, real captures and submission |

See [the living economy checkpoint](living-economy.md) for gameplay, parameters, compute setup and evidence. No NEAR funds have been spent.

## Validation completed

- `pnpm test` and `pnpm typecheck`: 103 TypeScript tests, type checking and production build pass.
- Input-only automated pilots clear all 30 chapter/rig combinations in both v2 and v3; their replays reproduce results. This proves attainability, not human fun or retention.
- Regression fixtures preserve original chapters 01–03 outcomes and replay hashes.
- Save tests cover migration from three chapters, the entire unlock chain, thirty medals, all thirty personal-best slots, and separation of daily records and v2/v3 bests.
- Browser checks confirm the ten-chapter map, retained local medal/best ghost, chapter selection, locked destinations and no horizontal overflow in a phone-sized viewport. Earlier full-run browser checks covered clear/fail results, personal ghosts, pause and daily play. New chapters have automated simulation coverage, not ten complete manual browser playthroughs.
- A shared fixture takes an actual expedition replay through TypeScript verification/signing and Rust contract settlement. RPC/HTTP tests use local or injected test sources; they are not live testnet transactions.
- `pnpm contract:check`: 19 contract tests pass, as do the 99,448-byte size gate and actual raw/optimized Wasm checks. Cargo reports a future-compatibility warning in the existing native-test `wasmparser` dependency.

- Guest checks cover one-use signatures, expiry, persistent sessions/budgets, duplicate setup, wrong key permissions, uncertain receipts, gas caps and authenticated HTTP verification. SDK doubles replace NEAR calls. Browser QA confirms the same saved pilot survives reload, prior medals/bests remain, and the panel fits a phone-sized viewport.
- Raw and optimized Wasm execute the same signed settlement and produce identical storage in the deterministic host smoke test. This is not a NEAR VM gas measurement.

- New browser checks cover full-window desktop play, a one-row phone HUD, chapter environment transitions, boss HP falling from 124 to 66 to 56/130, phase-two feedback, and complete local result screens. Camera tests cover portrait, landscape and ultrawide pointer mappings.

- Social tests verify authenticated posting, server-derived scores, stable ranking, rival follows and persistent profiles/replays. Browser checks cover avatar controls and mobile board/workshop layouts. The board is empty until real scores are explicitly posted; no public multi-device test has occurred.

## Next implementation milestones

1. **Complete the player-facing challenge loop.** The mission binding, verifier HTTP/RPC/store and wallet transport are implemented. Guest authentication and the bootstrap/gateway foundation are now implemented. Validate provisioning, add the restricted relay; mount competition start → play → verify → settle → confirmed result in the browser with persistent pending-transaction recovery.
2. **Close the contract release findings.** The optimized artifact is now 99,448 bytes and passes the strict 100,000-byte gate. Ranked expiry forfeiture is implemented. Resolve legacy deployment binding and finite supply/storage limits, then validate in the NEAR runtime and measure receipt costs. See [the contract review](contract-review.md).
3. **Promote HOUND’s local competition to NEAR.** The NPC now competes in the local Crown ledger with real replays, a separate balance, budget limits and factual pass/attack reasons. Bind the same policy to restricted signing, deployed settlement and measured sponsor limits; local v3 cannot use the existing v2 verifier unchanged.
4. **Measure and deploy the testnet slice.** Measure optimized Wasm, state growth and method receipts; enforce sponsorship caps; deploy after the required deployment configuration is available. Test fresh-player success and failure paths on the deployed system.
5. **Validate and package.** Observe new players on desktop and real phones, tune readability and challenge, publish the demo and repository, then capture the actual game for the hackathon submission.

## Cost and UX boundary

Ten story chapters add **no contract transactions or on-chain state**: chapter data ships with the web app, and saves/replays remain local. The optimized contract is 99,448 bytes and passes the original size ceiling. Deployment receipts, state-storage growth and relay costs are still unmeasured. Guest bootstrap reservations and attempt caps are implemented; competitive relay caps are not. Neither is a measured deployment bill.

Gameplay runs locally with no wallet prompt. Competitive confirmation should be asynchronous and truthful: show a local score immediately, then verification, then a confirmed settlement. Keep practice available during service failures.

## Configuration needed later

The repository is published at https://github.com/Thekal33d/rivalghost. Testnet operator `rivalghost-ops-thekal33d.testnet` is funded with 10 testnet NEAR, confirmed by finalized RPC at block 277514809. Protected service-signing configuration and an explicit testnet signing budget are still needed. No contract is deployed. The creator has a Hetzner CX23 (2 vCPU, 4 GB RAM, 40 GB disk) used by Trialoom; shared hosting is proposed pending actual resource/deployment inspection. Namecheap is domain-only; no game domain is chosen. The $5 total AI pilot is approved for planning, with no automatic top-ups and at most four shared decisions per day; no credits were purchased and no live paid requests enabled.

See [the guest onboarding runbook](guest-onboarding.md) and [contract build measurements](contract-build.md). Local authentication is running with provisioning disabled; no real account, grant or chain payout is claimed.

The browser campaign currently plays **local v3**. Competition remains v2; promoting the new mechanics requires explicit protocol versioning and new settlement fixtures. See [immersive flight](immersive-flight.md).

See [social play](social-play.md) for the new off-chain leaderboard and ghost-challenge loop.

The [NPC economy milestone](economy-npc.md) implements and tests the local credit loop. The contract now blocks empty-bounty challenges until a winner funds a valid defense. All 103 TypeScript and 19 Rust tests pass; optimized Wasm smoke verification and the unchanged size gate pass. Browser QA exercised grant → reserve → fly → replay-checked loss → 8/2 distribution.

## Selected sign-in provider

The creator selected **NEAR Auth**. The testnet compatibility adapter, OAuth callback, NEP-413 proof verification, identity linking and capped sponsorship are implemented and tested locally. The sign-in panel remains disabled until a sponsor and callback configuration are validated. Local device-key login remains functional. Live signing, second-device login and account provisioning have not been validated. See [the integration notes](near-auth-plan.md) and [operator setup guide](operator-setup.md).

Browser QA confirms local pilot reconnection, the honest disabled NEAR Auth state, a scrollable phone-sized account panel with its close action reachable, and the ranked deadline/forfeiture notice. The full application check passes 103 tests; 11 cover the new authentication boundary. External provider calls are mocked in those tests except for real local JWT cryptography.

## AI pilot preparation

The creator confirms at least $1 of Cloud credits and has privately configured the API key. The model catalog preflight passes for `Qwen/Qwen3-VL-30B-A3B-Instruct`. A durable $1 application allowance reserves $0.003 per attempt, with four attempts/day and fresh price checks before inference. Paid inference remains disabled. See [the AI pilot checkpoint](ai-pilot.md).
