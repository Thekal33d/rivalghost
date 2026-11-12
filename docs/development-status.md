# RivalGhost development checkpoint

November 12, 2026

**Stage: playable local alpha.** Ghost Signal is playable in the local browser. RivalGhost is not yet an end-to-end NEAR game or a public hackathon release.

## What works now

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Game | Ten authored chapters across three acts; deterministic combat; distinct encounter configurations; two-phase bosses; pickups, rescues, Pulse, Graze, Surge and combos | Human difficulty and replay-motivation playtests; more distinct boss silhouettes and environmental art |
| Progression | Three free rigs; 30 medals; sequential unlocks; best ghosts for each chapter/rig; daily signal; old-save migration | Cross-device progress is not implemented; local saves are untrusted |
| Frontend | React/Canvas illustrated arcade UI, keyboard and drag controls, local results, replay download, pause/resume and responsive layouts | Physical-phone controls/performance testing and audible sound QA; competition board, settlement UI and proof drawer |
| Simulation | Crown v1 retained; separate expedition v2 with deterministic replay validation | Competitive v2 mission/rig binding and approved fixed configurations |
| Contract | Rust Crown v1 prototype: grants, challenge locks, signed win/loss settlement, defense and expiry methods | Broader adversarial tests; v2 compatibility; optimized Wasm, storage and gas measurements; testnet deployment |
| Verifier/client | Replay validation and signed-certificate core; injectable challenge source; typed contract client | Production HTTP route, real RPC transport, replay storage, authentication/rate limits and runtime wiring |
| Guest/relay | Workspace placeholder; relayer exports a service name only | Guest account bootstrap, NEP-366 delegation, method allowlist, quotas, sponsor accounting and circuit breaker |
| HOUND | Authored character, story dialogue and enemy echo | Autonomous agent with its own balance, policy-limited actions and real verified competing runs |
| Release | Local commits and build instructions | GitHub remote/push, hosted demo, fresh-clone checks, judge walkthrough, real captures and submission |

## Validation completed

- `pnpm check`: type checking, 28 TypeScript tests, and production build pass.
- Input-only automated pilots clear all 30 chapter/rig combinations; their replays reproduce results. This proves attainability, not human fun or retention.
- Regression fixtures preserve original chapters 01–03 outcomes and replay hashes.
- Save tests cover migration from three chapters, the entire unlock chain, thirty medals, all thirty personal-best slots, and separation of daily records.
- Browser checks confirm the ten-chapter map, retained local medal/best ghost, chapter selection, locked destinations and no horizontal overflow in a phone-sized viewport. Earlier full-run browser checks covered clear/fail results, personal ghosts, pause and daily play. New chapters have automated simulation coverage, not ten complete manual browser playthroughs.
- `cargo test --workspace`: four contract tests pass. Cargo reports a future-compatibility warning in the existing `wasmparser` dependency; no contract dependency changed in this expansion.

## Next implementation milestones

1. **Bind competitive expedition rules.** Define a canonical versioned mission/rig configuration, keep v1 separate, update the verifier and contract/client boundary, and reject mismatched configurations. Story medals and local upgrades must not grant competitive power.
2. **Complete one real challenge loop.** Implement verifier HTTP/RPC/replay storage, guest bootstrap and restricted relay; connect start → play → verify → settle → confirmed result. Preserve fast free play while services are unavailable. Commit and test each coherent step.
3. **Make HOUND compete.** Give it deterministic budget limits, real runs through the same verifier, a separate balance and factual pass/attack outcomes.
4. **Measure and deploy the testnet slice.** Measure optimized Wasm, state growth and method receipts; enforce sponsorship caps; deploy after the required deployment configuration is available. Test fresh-player success and failure paths on the deployed system.
5. **Validate and package.** Observe new players on desktop and real phones, tune readability and challenge, publish the demo and repository, then capture the actual game for the hackathon submission.

## Cost and UX boundary

Ten story chapters add **no contract transactions or on-chain state**: chapter data ships with the web app, and saves/replays remain local. The current cost model contains planning assumptions; measured deployment, storage and relay costs are still outstanding. Do not present those assumptions as actual bills or claim the relay caps are implemented.

Gameplay runs locally with no wallet prompt. Competitive confirmation should be asynchronous and truthful: show a local score immediately, then verification, then a confirmed settlement. Keep practice available during service failures.

## Configuration needed later

No Git remote is configured in this checkout. Publishing needs the intended repository URL and access. Testnet integration needs an operator/contract account, the approved sponsor budget, and a service-hosting choice. No funding, deployment or publishing occurred during this expansion.
