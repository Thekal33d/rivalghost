# RivalGhost development checkpoint

November 13, 2026

**Stage: playable game with a deployed, integrated NEAR testnet economy.** Public hosting and the personal NEAR Auth login/signature return still need validation.

## Implemented

- Ten authored chapters, three free rigs, thirty medals, daily flights, deterministic ghosts, reactive environments and responsive desktop/mobile Canvas gameplay.
- Server profiles, avatars, replay-checked leaderboards, rivals and shareable ghosts. These social records and local campaign saves are not economic assets.
- Compact v3 contract: finite CR, salvage, daily verified jobs/commissions, MOTH exchange, cosmetic ownership/crafting/equipment, market escrow/fees, shared repairs, Crown purses/entry/payouts, HOUND budgets and roles.
- Actual testnet contract `game.rivalghost-ops-thekal33d.testnet`, **98,677-byte** Wasm. Two-player trade, verified rewards, repair and Crown settlement passed on real NEAR; balances preserved through final hardening upgrade.
- Sponsored NEP-366 session authorization; signed browser actions; durable transaction journal; finalized receipts; uncertain-result recovery; no local economy fallback when on-chain mode is enabled.
- Local HOUND worker now funds real on-chain Crown ghosts. Browser Workshop/Crown Pit display finalized contract state and explorer receipts.
- NEAR Auth identity and explicit 12-hour game-session consent. Shared provider accepts **http://localhost:3000** exactly; port 5173 and /auth/callback were rejected. The corrected game reaches the login form. Personal login and actual MPC signatures are pending user input.

## Evidence

`pnpm check`: 114 tests plus typechecks/builds pass. `pnpm economy:check`: 20 native Rust tests across crates, raw/optimized Wasm parity, 34 rejected calls per artifact and bounded repeated-job storage. Live testnet receipts and measured gas are in `docs/evidence/economy-v3-testnet.json`. See [contract review](contract-review.md).

The creator authorized up to 4 test NEAR; 3.3 allocated, plus approximately 0.035575 account-creation fees. No mainnet transfers. One paid NEAR AI decision succeeded in the earlier milestone; recurring inference stays disabled and no additional AI credit was used here.

## Next

1. Complete personal NEAR Auth login in the open browser, then authorize the game session. Validate first grant and a human browser job/claim; test logout and second-device recovery.
2. Choose the public hostname and provide an existing SSH alias/deployment method for the shared Hetzner server. Inspect capacity, isolate RivalGhost, back up SQLite/replays and register the exact hosted callback/origin.
3. Add the separately bounded operator path for AI decisions to update contract focus before calling inference-driven economic behavior live. Stake-to-compute remains future work.
4. Human difficulty/retention tests, real-phone performance and fresh-player public rehearsal; capture actual gameplay and receipts for judges.

The on-chain economy starts fresh; unverified demo balances are never imported. Old campaign saves remain in the old browser origin's storage. Switching from localhost:5173 to localhost:3000 does not automatically move local medals/ghosts. The deployed contract includes operator/verifier trust and does not claim an external token standard.
